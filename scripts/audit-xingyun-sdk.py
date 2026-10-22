"""Inspect an already downloaded public SDK. Never reads credentials or starts sessions."""
from pathlib import Path
import hashlib
import json
import re
import sys


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/audit-xingyun-sdk.py <public-sdk.js>")
    raw = Path(sys.argv[1]).read_bytes()
    source = raw.decode("utf-8")
    start = source.find("var XingyunAvatarAgent=")
    section = source[start:] if start >= 0 else ""
    methods = set(re.findall(r"n\.([A-Za-z0-9_]+)=function", section))
    required = {"init", "ask", "startASR", "stopASR", "interrupt", "destroy"}
    callbacks = ["onAgentStateChange", "onASRResult", "onConversationChange", "onLLMResponse", "onError"]
    missing = sorted(required - methods)
    missing += [name for name in callbacks if name not in section]
    checks = {
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "constructor_found": start >= 0,
        "required_methods": sorted(required & methods),
        "callbacks_found": [name for name in callbacks if name in section],
        "agent_callbacks_option": "e.agentCallbacks" in section,
        "browser_signer_found": "function headersNeedSign(" in source,
        "brain_config_passthrough": "brain_config:C" in section,
        "missing": missing,
        "scope": "static source inspection only; no browser/session/API acceptance",
    }
    print(json.dumps(checks, indent=2))
    if start < 0 or missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
