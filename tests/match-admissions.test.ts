import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  admissionSchema, matchInputSchema, known,
  type Admission, type Evidence, type MatchUser,
} from "../src/lib/match/contracts";
import { matchAdmissions, MATCH_ADMISSIONS_PATH } from "../src/lib/match/admissions-catalog";
import { matchOccupations } from "../src/lib/match/catalog.official";
import { match } from "../src/lib/match/engine";
import { adaptProfile } from "../src/lib/match/adapters";
import { emptyProfile } from "../src/lib/profile";

const NOW = new Date("2026-10-23T12:00:00Z");
const APP_OCCUPATION_IDS = new Set(["ml_cv", "software", "llm_agent", "devices", "signals", "imaging_eng", "clinical_data", "health_systems", "med_nlp_kg", "medicine"]);
const admissions = matchAdmissions();
const raw = JSON.parse(readFileSync(MATCH_ADMISSIONS_PATH, "utf8")) as { generated_at: string; admission_count: number; corpus: { admissions_records: number } };

/** 语料里被引用到的记录，用来复核 locator 是否还能对回原文（不读快照文本，只核对记录里的 quote/偏移/哈希）。 */
type CorpusRecord = { id: string; source_id: string; content_hash: string; collected_at: string; facts: { field: string; value: string; quote: string; start: number; end: number }[] };
type CorpusSource = { id: string; url: string; published_at: string | null };
function loadCorpusIndex() {
  const records = new Map<string, CorpusRecord>();
  const sources = new Map<string, CorpusSource>();
  for (const file of readdirSync("data/knowledge").filter(name => name.endsWith(".collected.json"))) {
    const bundle = JSON.parse(readFileSync(join("data/knowledge", file), "utf8")) as { sources?: CorpusSource[]; records?: CorpusRecord[] };
    if (Array.isArray(bundle)) continue;
    for (const source of bundle.sources ?? []) if (!sources.has(source.id)) sources.set(source.id, source);
    for (const record of bundle.records ?? []) if (!records.has(record.id)) records.set(record.id, record);
  }
  return { records, sources };
}

const LOCATOR = /^sha256:([a-f0-9]{64}) \[(\d+),(\d+)\) ([\s\S]+)$/;

function officialEvidenceOf(admission: Admission): Evidence[] {
  const facts = [admission.exam_subjects, admission.cross_major, admission.hard_requirements, admission.research_directions];
  return [...admission.mapping_evidence, ...facts.flatMap(fact => fact.evidence)];
}

/** 示例画像：真实模式（simulation=false），资格项是「自述」，只能用来驱动规则，不能当成官方标准。 */
const selfEvidence = (field: string): Evidence => ({
  ref: `test-profile.${field}`, source_kind: "self_report", url: null, published_at: null,
  retrieved_at: "2026-10-23T00:00:00.000Z", verification: "self_reported", locator: `测试画像自述：${field}`,
});
function user(spec: { target_year: number; study_intent: "统考" | "推免"; major: string; qualification_pathway: string }): MatchUser {
  const result = adaptProfile({ ...emptyProfile, major: spec.major }, null, null, "2026-10-23T00:00:00.000Z");
  result.qualifications = {
    major: known(spec.major, selfEvidence("major")),
    degree: known("学士学位", selfEvidence("degree")),
    graduation_year: known("2026", selfEvidence("graduation_year")),
    pathway: known(spec.qualification_pathway, selfEvidence("pathway")),
    recommendation_eligible: known("是", selfEvidence("recommendation_eligible")),
  };
  result.study_intent = known(spec.study_intent, selfEvidence("study_intent"));
  result.target_year = spec.target_year;
  return result;
}
function programsFor(spec: Parameters<typeof user>[0], list: Admission[] = admissions) {
  const report = match({ user: user(spec), occupations: matchOccupations, admissions: list }, NOW);
  const programs = new Map<string, (typeof report.results)[number]["programs"][number]>();
  for (const result of report.results) for (const program of result.programs) if (!programs.has(program.id)) programs.set(program.id, program);
  return programs;
}

test("Admissions: 结构化招生条目全部通过 match-2 契约且规模达标", () => {
  assert.ok(admissions.length >= 6, `至少 6 条可核实条目，实际 ${admissions.length}`);
  assert.equal(raw.admission_count, admissions.length);
  const ids = new Set<string>();
  for (const admission of admissions) {
    assert.equal(admissionSchema.safeParse(admission).success, true, `${admission.id} 应符合 admissionSchema`);
    assert.equal(admission.schema_version, "match-2");
    assert.equal(admission.simulation, false, "真实招生标准不得标记为 simulation");
    assert.equal(ids.has(admission.id), false, `重复 id ${admission.id}`);
    ids.add(admission.id);
    assert.ok(admission.year >= 2026 && admission.year <= 2100);
    assert.ok(["统考", "推免", "申请制"].includes(admission.pathway));
    assert.ok(admission.major_code.length > 0 && admission.major_name.length > 0 && admission.university.length > 0);
    for (const occupationId of admission.occupation_ids) assert.ok(APP_OCCUPATION_IDS.has(occupationId), `未知职业 ${occupationId}`);
  }
  // 至少 3 条落在三个岗位映射到的方向（生物医学工程 / 计算机 / 电子信息）。
  const targetDirection = admissions.filter(admission => /生物医学工程|计算机|软件工程|电子信息/.test(admission.major_name));
  assert.ok(targetDirection.length >= 3, `方向相关条目应 ≥3，实际 ${targetDirection.length}`);
});

test("Admissions: 每条证据都是可核实的 https 官方来源，且 locator 能对回语料原文", () => {
  const { records, sources } = loadCorpusIndex();
  for (const admission of admissions) {
    const official = admission.mapping_evidence.filter(evidence => evidence.source_kind === "official");
    assert.ok(official.length >= 1, `${admission.id} 至少一条 official mapping_evidence`);
    for (const evidence of officialEvidenceOf(admission)) {
      assert.equal(evidence.verification, "verified", `${evidence.ref} 必须是 verified`);
      assert.ok(Date.parse(evidence.retrieved_at) > 0, `${evidence.ref} 缺少有效 retrieved_at`);
      // 编辑性映射证据在这里只校验「明确标 editorial 且不带 URL」，见下面的独立断言。
      if (evidence.source_kind === "editorial") continue;
      const match_ = LOCATOR.exec(evidence.locator);
      assert.ok(match_, `${evidence.ref} locator 必须形如 sha256:<hash> [start,end) <原文>`);
      const [, hash, startRaw, endRaw, quote] = match_;
      const [prefix, recordId, field] = evidence.ref.split(":");
      assert.equal(prefix, "kb", `${evidence.ref} 必须以 kb:<record_id>:<field> 指向知识库`);
      const record = records.get(recordId);
      assert.ok(record, `${evidence.ref} 指向的记录不存在`);
      assert.equal(record.content_hash, hash, `${evidence.ref} 的 sha256 与语料记录不一致`);
      assert.equal(record.collected_at, evidence.retrieved_at, `${evidence.ref} 的 retrieved_at 必须与采集时间一致`);
      const fact = record.facts.find(item => item.field === field);
      assert.ok(fact, `${evidence.ref} 指向的字段不存在`);
      assert.equal(fact.quote, quote, `${evidence.ref} 的原文摘录与语料不一致`);
      assert.equal(fact.start, Number(startRaw), `${evidence.ref} 的区间起点与语料不一致`);
      assert.equal(fact.end, Number(endRaw), `${evidence.ref} 的区间终点与语料不一致`);
      assert.ok(evidence.url, `${evidence.ref} official 证据必须有 URL`);
      const url = new URL(evidence.url);
      assert.equal(url.protocol, "https:", `${evidence.ref} 必须是 https`);
      assert.equal(url.username, "", `${evidence.ref} 不得带凭据`);
      const source = sources.get(record.source_id);
      assert.ok(source, `${evidence.ref} 的来源 ${record.source_id} 缺失`);
      assert.equal(source.url, evidence.url, `${evidence.ref} 的 URL 必须与采集来源一致`);
      assert.equal(source.published_at, evidence.published_at, `${evidence.ref} 的 published_at 必须与来源一致`);
    }
    // 编辑性出口映射必须显式标 editorial 且不带 URL，不能伪装成官方结论。
    for (const evidence of admission.mapping_evidence.filter(item => item.source_kind === "editorial")) {
      assert.equal(evidence.url, null);
      assert.match(evidence.locator, /LIMEN 编辑性/);
    }
  }
});

test("Admissions: 有效期按捕获窗口计算，生成时不得已过期", () => {
  const generatedAt = raw.generated_at.slice(0, 10);
  for (const admission of admissions) {
    assert.match(admission.valid_through, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(admission.valid_through >= generatedAt, `${admission.id} 生成时即已过期（valid_through=${admission.valid_through}）`);
  }
});

test("Admissions: unknown 字段保持 unknown，不会被当成 false 或已满足", () => {
  const unknownExam = admissions.filter(admission => admission.exam_subjects.status !== "known");
  assert.ok(unknownExam.length > 0, "至少有一条缺初试科目的条目，用于区分 unknown 与 no");
  for (const admission of unknownExam) {
    assert.equal(admission.exam_subjects.value, null, "unknown 字段不得携带值");
    assert.equal(admission.exam_subjects.evidence.length, 0, "unknown 字段不得携带证据");
  }
  // 同一年份/路径、但缺初试科目的条目必须判为 unknown（待确认），不能判 met 也不能判 not_met。
  const pending = [...programsFor({ target_year: 2026, study_intent: "推免", major: "生物医学工程", qualification_pathway: "推免" }).values()];
  const unknownPrograms = pending.filter(program => program.status === "unknown");
  assert.ok(unknownPrograms.length > 0, "缺科目证据的项目应落在 unknown");
  assert.ok(unknownPrograms.some(program => program.major.includes("生物医学工程")));
  // 「未知」不得被算成不满足：state 里没有任何 not_met 归因于缺字段的条目。
  for (const program of unknownPrograms) assert.notEqual(program.status, "not_met");
  // 同理，未结构化的研究方向字段不得被当成「无条件」。
  for (const admission of admissions) assert.equal(admission.research_directions.value, null);
});

test("Admissions: 过期 / 年份不符 / 路径不符 三种状态互不混淆", () => {
  const base = admissions.find(admission => admission.pathway === "推免" && admission.year === 2027);
  assert.ok(base, "需要一条 2027 推免条目做状态用例");
  const clone = (patch: Partial<Admission>): Admission => admissionSchema.parse({ ...structuredClone(base), ...patch });

  // 年份不符：目标年度不同 → plan_mismatch
  const wrongYear = programsFor({ target_year: base.year - 1, study_intent: "推免", major: "计算机技术", qualification_pathway: "推免" }, [clone({})]);
  assert.equal(wrongYear.get(base.id)?.status, "plan_mismatch");
  // 路径不符：意向路径不同 → plan_mismatch（与年份不符同一状态，但两者都不是 met/unknown）
  const wrongPlan = programsFor({ target_year: base.year, study_intent: base.pathway === "推免" ? "统考" : "推免", major: "计算机技术", qualification_pathway: "推免" }, [clone({})]);
  assert.equal(wrongPlan.get(base.id)?.status, "plan_mismatch");
  // 过期：有效期已过 → expired（优先于 unknown）
  const expired = programsFor({ target_year: base.year, study_intent: "推免", major: "计算机技术", qualification_pathway: "推免" }, [clone({ valid_through: "2020-01-01" })]);
  assert.equal(expired.get(base.id)?.status, "expired");
  // 明确不符：同年度同路径但资格条款不满足 → not_met
  const mismatch = programsFor({ target_year: 2026, study_intent: "统考", major: "临床医学", qualification_pathway: "统考" }, admissions);
  const regular = mismatch.get("adm-ustc-2026-085405-software-regular");
  assert.ok(regular);
  assert.equal(regular.status, "not_met");
  // 满足：同年度同路径且条款全部成立 → met
  const met = programsFor({ target_year: 2026, study_intent: "统考", major: "软件工程", qualification_pathway: "统考" }, admissions);
  assert.equal(met.get("adm-ustc-2026-085405-software-regular")?.status, "met");
  // 三种状态确实互斥：同一批数据里不会同时出现两种结论
  const statuses = [...met.values()].map(program => program.status);
  assert.equal(new Set(statuses).size > 1, true);
});

test("Admissions: 契约表达不了的条款留在 cross_major，不被写成硬条件", () => {
  const tongji = admissions.find(admission => admission.id === "adm-tongji-2027-077700-bme");
  assert.ok(tongji);
  // 原文的「不接收同等学力考生」映射不到 major/degree/graduation_year/pathway/recommendation_eligible，
  // 因此 hard_requirements 必须保持 unknown，而不是写成 known([]) 假装没有限制。
  assert.equal(tongji.hard_requirements.status, "unknown");
  assert.equal(tongji.hard_requirements.value, null);
  assert.match(String(tongji.cross_major.value), /不接收同等学力考生/);
  // 反过来：原文明确写路径的条目，硬条件必须写出来，不能留空。
  const sysu = admissions.find(admission => admission.id === "adm-sysu-2027-085404-cs-670");
  assert.ok(sysu);
  assert.equal(sysu.hard_requirements.status, "known");
  assert.deepEqual(sysu.hard_requirements.value?.map(rule => [rule.field, rule.allowed]), [["pathway", ["推免"]]]);
});

test("Admissions: 文件缺失或为空时返回空数组而不是抛错", () => {
  const dir = mkdtempSync(join(tmpdir(), "limen-admissions-"));
  assert.deepEqual(matchAdmissions({ path: join(dir, "missing.json") }), []);
  const empty = join(dir, "empty.json");
  writeFileSync(empty, "", "utf8");
  assert.deepEqual(matchAdmissions({ path: empty }), []);
  const blank = join(dir, "blank.json");
  writeFileSync(blank, "   \n", "utf8");
  assert.deepEqual(matchAdmissions({ path: blank }), []);
  // 空招生列表仍是合法的 match 输入：引擎给出「尚无结构化关联招生项目」，而不是崩掉。
  const report = match({ user: user({ target_year: 2027, study_intent: "统考", major: "临床医学", qualification_pathway: "统考" }), occupations: matchOccupations, admissions: [] }, NOW);
  assert.equal(matchInputSchema.safeParse({ user: user({ target_year: 2027, study_intent: "统考", major: "临床医学", qualification_pathway: "统考" }), occupations: matchOccupations, admissions: [] }).success, true);
  for (const result of report.results) {
    assert.equal(result.admissions.score, null);
    assert.ok(result.admissions.missing.includes("尚无结构化关联招生项目"));
  }
});

test("Admissions: 损坏或不合契约的文件显式报错，不静默当成没有数据", () => {
  const dir = mkdtempSync(join(tmpdir(), "limen-admissions-bad-"));
  const invalidJson = join(dir, "invalid.json");
  writeFileSync(invalidJson, "{ not json", "utf8");
  assert.throws(() => matchAdmissions({ path: invalidJson }), /不是合法 JSON/);
  const wrongSchema = join(dir, "wrong.json");
  writeFileSync(wrongSchema, JSON.stringify({ admissions: [{ id: "x" }] }), "utf8");
  assert.throws(() => matchAdmissions({ path: wrongSchema }), /不符合 match-2 契约/);
  const noList = join(dir, "nolist.json");
  writeFileSync(noList, JSON.stringify({ schema_version: "match-admissions-1" }), "utf8");
  assert.throws(() => matchAdmissions({ path: noList }), /缺少 admissions 数组/);
});
