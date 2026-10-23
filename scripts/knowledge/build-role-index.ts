/**
 * 把知识库事实按「App 面向用户的职业」重新聚合，产出网页可直接调用的结构化索引。
 *
 * 解决的问题：match catalog 用 clinical_data_analyst / medical_ml_engineer，
 * 而知识库事实挂在 guide_clinical_data / guide_ml_cv 上，两者 id 对不上，
 * 导致 UI 无法 join 到任何知识数据。
 *
 * 输出 data/knowledge/role-index.json：
 *   roles[appRoleId] = {
 *     canonical_name, knowledge_role_ids, basis,
 *     by_category: { occupation|admissions|recruitment|industry|learning: Fact[] },
 *     sources: [{ id, organization, url, published_at }],
 *     counts: { total, by_category }
 *   }
 *
 * 每条 Fact 保留可回溯信息：record_id / field / value(=quote) / source_url / locator。
 * 用法：npx tsx scripts/knowledge/build-role-index.ts
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Fact = {
  record_id: string;
  record_title: string;
  role_id: string;
  category: string;
  field: string;
  value: string;
  source_id: string;
  source_organization: string;
  source_url: string;
  published_at: string | null;
  locator: string | null;
};

const KNOWLEDGE_DIR = "data/knowledge";
const CATEGORIES = ["occupation", "admissions", "recruitment", "industry", "learning"] as const;

function main() {
  const aliasPath = join(KNOWLEDGE_DIR, "role-aliases.json");
  const aliases = JSON.parse(readFileSync(aliasPath, "utf8")) as {
    aliases: Record<string, { canonical_name: string; knowledge_role_ids: string[]; basis: string }>;
  };

  const manifests = readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".manifest.json"));

  // knowledge role id -> facts
  const factsByRole = new Map<string, Fact[]>();
  const sourceById = new Map<string, { id: string; organization: string; url: string; published_at: string | null }>();

  for (const file of manifests) {
    const entries = JSON.parse(readFileSync(join(KNOWLEDGE_DIR, file), "utf8")) as Array<{
      source: { id: string; organization: string; url: string; published_at: string | null };
      record: { id: string; title: string; role_id: string; category: string; context?: Record<string, unknown> };
      extracts: Array<{ field: string; pattern?: string; quote?: string; value?: string; locator?: string }>;
    }>;

    for (const entry of entries) {
      const src = entry.source;
      sourceById.set(src.id, {
        id: src.id,
        organization: src.organization,
        url: src.url,
        published_at: src.published_at ?? null,
      });

      const list = factsByRole.get(entry.record.role_id) ?? [];
      for (const ex of entry.extracts ?? []) {
        // manifest 里 literal 存在 pattern 字段（collect 阶段的正则字面量来源）
        const value = ex.pattern ?? ex.quote ?? ex.value ?? "";
        if (!value) continue;
        list.push({
          record_id: entry.record.id,
          record_title: entry.record.title,
          role_id: entry.record.role_id,
          category: entry.record.category,
          field: ex.field,
          value,
          source_id: src.id,
          source_organization: src.organization,
          source_url: src.url,
          published_at: src.published_at ?? null,
          locator: ex.locator ?? null,
        });
      }
      factsByRole.set(entry.record.role_id, list);
    }
  }

  const roles: Record<string, unknown> = {};
  const globalSourceIds = new Set<string>();

  for (const [appRoleId, spec] of Object.entries(aliases.aliases)) {
    const byCategory: Record<string, Fact[]> = {};
    const seen = new Set<string>();
    let total = 0;

    for (const knowledgeRoleId of spec.knowledge_role_ids) {
      for (const fact of factsByRole.get(knowledgeRoleId) ?? []) {
        // 同一条事实可能通过多个 knowledge role 命中，按 record+field+value 去重
        const key = `${fact.record_id}::${fact.field}::${fact.value.slice(0, 60)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        (byCategory[fact.category] ??= []).push(fact);
        total += 1;
      }
    }

    for (const cat of CATEGORIES) byCategory[cat] ??= [];
    for (const list of Object.values(byCategory)) {
      for (const f of list) globalSourceIds.add(f.source_id);
    }

    const sourceIds = new Set<string>();
    for (const list of Object.values(byCategory)) for (const f of list) sourceIds.add(f.source_id);

    roles[appRoleId] = {
      canonical_name: spec.canonical_name,
      knowledge_role_ids: spec.knowledge_role_ids,
      basis: spec.basis,
      counts: {
        total,
        by_category: Object.fromEntries(CATEGORIES.map((c) => [c, byCategory[c].length])),
      },
      sources: [...sourceIds].map((id) => sourceById.get(id)).filter(Boolean),
      by_category: byCategory,
    };
  }

  const out = {
    schema_version: "role-index-1",
    generated_at: new Date().toISOString(),
    note: "LIMEN 编辑性聚合索引。role 等价关系见 role-aliases.json，不属于官方职业分类结论。每条事实保留 source_url 与 locator，可逐字回溯。",
    manifests_scanned: manifests.length,
    roles,
    unmapped_knowledge_roles: (aliases as unknown as { unmapped_knowledge_roles?: string[] }).unmapped_knowledge_roles ?? [],
  };

  const outPath = join(KNOWLEDGE_DIR, "role-index.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

  console.log(`写入 ${outPath}`);
  console.log(`扫描 ${manifests.length} 份清单`);
  for (const [id, v] of Object.entries(roles)) {
    const r = v as { counts: { total: number; by_category: Record<string, number> } };
    const detail = CATEGORIES.map((c) => `${c}=${r.counts.by_category[c]}`).join(" ");
    console.log(`  ${id.padEnd(24)} 共 ${String(r.counts.total).padStart(3)} 条  ${detail}`);
  }
}

main();
