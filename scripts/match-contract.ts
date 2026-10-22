import { mkdirSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { matchInputSchema, occupationSchema, admissionSchema, userSchema, skillLabels, skillStandard } from "../src/lib/match/contracts";

mkdirSync("data/match", { recursive: true });
for (const [name, schema] of Object.entries({ input: matchInputSchema, occupation: occupationSchema, admission: admissionSchema, user: userSchema })) {
  writeFileSync(`data/match/${name}.schema.json`, JSON.stringify(z.toJSONSchema(schema), null, 2) + "\n");
}
writeFileSync("data/match/skill-standard.json", JSON.stringify({ ...skillStandard, skills: skillLabels, status: "editorial_not_psychometrically_validated" }, null, 2) + "\n");
console.log("Exported match-1 JSON Schemas and limen-skills-1. Runtime Zod validation is still required for cross-field invariants.");
