import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { extractionHandoff } from "../src/lib/match/knowledge-adapter";

const path = "data/knowledge/pilot.collected.json";
const content = readFileSync(path, "utf8");
const handoff = extractionHandoff(JSON.parse(content));
mkdirSync("work/match", { recursive: true });
writeFileSync("work/match/extraction-handoff.json", JSON.stringify({ ...handoff, input_sha256: createHash("sha256").update(content).digest("hex") }, null, 2));
console.log(JSON.stringify({ status: handoff.status, candidates: handoff.candidates.length, source_file: path, output: "work/match/extraction-handoff.json", mutations: "local_output_only" }));
