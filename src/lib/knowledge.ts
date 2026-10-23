import { z } from "zod";
import { directions } from "./directions";
import roleData from "../../data/knowledge/roles.json";

export const categories = ["occupation", "recruitment", "admissions", "industry", "learning"] as const;
export const categorySchema = z.enum(categories);
// 引用来源默认必须是公开 HTTPS。唯一例外：政府站点（*.gov.cn）在 HTTPS
// 通道不可用时只提供 http 版本（实测湖南省统计局 https 报 TLS 错误）。
// 例外仍要求是正式政府域名，不接受裸 IP 地址，且导入侧必须披露取得方式。
const publicUrl = z.url().refine(value => {
  const url = new URL(value);
  const hostOk = url.hostname.includes(".") && !/^[\d.]+$/.test(url.hostname) && !url.hostname.endsWith(".local") && !url.hostname.endsWith(".localhost") && url.hostname !== "localhost";
  const protocolOk = url.protocol === "https:" || (url.protocol === "http:" && url.hostname.endsWith(".gov.cn"));
  return protocolOk && !url.username && !url.password && (!url.hash || url.hash.startsWith("#/")) && hostOk;
}, "Requires a public HTTPS source without credentials or fragment");
export const roleSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,49}$/), name: z.string().min(1), aliases: z.array(z.string()),
  direction_ids: z.array(z.string().refine(id => directions.some(direction => direction.id === id))),
  mapping_basis: z.string().min(1), scope: z.string().min(1),
}).strict();
export const knowledgeRoles = z.array(roleSchema).parse(roleData.roles);
export const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,80}$/), url: publicUrl, organization: z.string().min(1).max(160),
  title: z.string().min(1).max(250), jurisdiction: z.enum(["CN", "US", "global"]),
  source_tier: z.literal("primary"), published_at: z.iso.date().nullable(),
  // 发布日期缺失时的披露说明：需要容纳「颁布文号 + 通知页链接 + 取得通道」
  // 这类合规说明（实测人社部标准的披露需 306 字符），过窄会误杀合法来源。
  publication_date_note: z.string().min(1).max(600),
}).strict();
export const factSchema = z.object({
  field: z.string().regex(/^[a-z][a-z0-9_]{1,59}$/), value: z.string().min(1).max(1600),
  quote: z.string().min(10).max(1600), start: z.number().int().nonnegative(), end: z.number().int().positive(),
}).strict();
// Index metadata is editorial; official assertions must remain in facts[].quote.
export const contextSchema = z.object({
  institution: z.string().max(100).optional(), college: z.string().max(120).optional(),
  program: z.string().max(160).optional(), admission_year: z.number().int().min(2000).max(2100).optional(),
  region: z.string().max(80).optional(), medical_topic: z.string().max(80).optional(),
  medical_department: z.string().max(80).optional(), department_type: z.enum(["clinical", "medical_technology"]).optional(),
  statistic_scope: z.string().max(600).optional(), evidence_locator: z.string().max(240).optional(),
}).strict();
export const recordSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,120}$/), source_id: z.string(), role_id: z.string().refine(id => knowledgeRoles.some(role => role.id === id)),
  category: categorySchema, title: z.string().min(1).max(250), summary: z.string().min(1).max(600),
  applicability: z.string().min(1).max(700), relation: z.enum(["direct", "related", "context"]),
  tags: z.array(z.string().min(1).max(80)).max(30), facts: z.array(factSchema).min(1).max(200),
  missing_fields: z.array(z.string().min(1).max(100)).max(30),
  verification: z.literal("quote_verified"), content_hash: z.string().regex(/^[a-f0-9]{64}$/),
  collected_at: z.iso.datetime({ offset: true }), verified_at: z.iso.datetime({ offset: true }),
  valid_through: z.iso.date().nullable(), freshness_days: z.number().int().min(1).max(730),
  context: contextSchema.optional(),
}).strict();
export type KnowledgeSource = z.infer<typeof sourceSchema>;
export type KnowledgeRecord = z.infer<typeof recordSchema>;
export type KnowledgeHit = KnowledgeRecord & { source: KnowledgeSource; citation: string; score: number; historical: boolean };
export const searchSchema = z.object({
  role_id: z.string().max(50).optional(), direction_id: z.string().max(50).optional(),
  category: categorySchema.optional(), q: z.string().trim().max(160).default(""),
  domain: z.enum(["interdisciplinary", "medicine", "all"]).default("all"),
  institution: z.string().trim().max(100).optional(), admission_year: z.coerce.number().int().min(2000).max(2100).optional(),
  medical_topic: z.string().max(80).optional(), medical_department: z.string().max(80).optional(), offset: z.coerce.number().int().min(0).max(10000).default(0),
  jurisdiction: z.enum(["CN", "US", "global", "all"]).default("CN"),
  limit: z.coerce.number().int().min(1).max(20).default(8), include_historical: z.boolean().default(false),
}).strict().superRefine((value, ctx) => {
  if (value.role_id && !knowledgeRoles.some(role => role.id === value.role_id)) ctx.addIssue({ code: "custom", message: "Unknown role", path: ["role_id"] });
  if (value.direction_id && !directions.some(direction => direction.id === value.direction_id)) ctx.addIssue({ code: "custom", message: "Unknown direction", path: ["direction_id"] });
});
export type KnowledgeQuery = z.infer<typeof searchSchema>;
export function roleMatchesQuery(role: z.infer<typeof roleSchema>, query: KnowledgeQuery) {
  const medicine = role.direction_ids.length === 0;
  return (!query.role_id || role.id === query.role_id)
    && (!query.direction_id || (query.direction_id === "medicine" ? medicine : role.direction_ids.includes(query.direction_id)))
    && (query.domain === "all" || (query.domain === "medicine" ? medicine : !medicine));
}

export function normalizeSourceUrl(value: string) {
  const url = new URL(value);
  if (!url.hash.startsWith("#/")) url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return publicUrl.parse(url.href);
}
export function verifyQuotes(record: KnowledgeRecord, text: string) {
  return record.facts.every(fact => fact.value === fact.quote && text.slice(fact.start, fact.end) === fact.quote);
}
export function isHistorical(record: KnowledgeRecord, now = new Date()) {
  const expires = Date.parse(record.collected_at) + record.freshness_days * 86400000;
  return now.getTime() > expires || (record.valid_through !== null && now.toISOString().slice(0, 10) > record.valid_through);
}
