import { createHash } from "node:crypto";

type ReportKind = "R1" | "R2";
type Fingerprints = { profile: string; assessment: string; experience?: string };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function fingerprint(value: unknown) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function reportInputsFresh(report: { kind: ReportKind; input_fingerprints?: Partial<Fingerprints> }, current: { profile?: unknown; assessment?: unknown; experience?: unknown }) {
  const saved = report.input_fingerprints;
  if (!saved || current.profile == null || current.assessment == null) return false;
  if (saved.profile !== fingerprint(current.profile) || saved.assessment !== fingerprint(current.assessment)) return false;
  if (report.kind === "R2") return current.experience != null && saved.experience === fingerprint(current.experience);
  return true;
}
