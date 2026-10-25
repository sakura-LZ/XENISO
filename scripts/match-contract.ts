import { mkdirSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { matchInputSchema, occupationSchema, admissionSchema, userSchema, skillLabels, skillStandard } from "../src/lib/match/contracts";

// 只导出运行期 Zod 契约的 JSON Schema 镜像，供外部审阅与手写数据录入校验。
// 跨字段不变量（证据、仿真隔离、去重）只在 Zod 里，JSON Schema 表达不了，不能替代运行期校验。
mkdirSync("data/match", { recursive: true });
for (const [name, schema] of Object.entries({ input: matchInputSchema, occupation: occupationSchema, admission: admissionSchema, user: userSchema })) {
  writeFileSync(`data/match/${name}.schema.json`, JSON.stringify(z.toJSONSchema(schema), null, 2) + "\n");
}
writeFileSync("data/match/skill-standard.json", JSON.stringify({ ...skillStandard, skills: skillLabels, status: "editorial_not_psychometrically_validated" }, null, 2) + "\n");
console.log(`Exported match-2 JSON Schemas (algorithm limen-match-v2.1) and ${skillStandard.version}. Runtime Zod validation is still required for cross-field invariants.`);
