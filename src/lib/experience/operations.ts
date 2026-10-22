import { getTemplate } from "./templates";

export type ChoiceState = [string | null, string | null, string | null];
export type OperationResult = { metrics: Record<string, string | number | null>; details: string[]; series?: { label: string; values: number[] }[]; pixels?: number[] };
export const sampleRows = [
  { id: "01", group: "A", value: 4 }, { id: "02", group: "A", value: null },
  { id: "02", group: "A", value: 6 }, { id: "03", group: "B", value: 10 },
  { id: "04", group: "B", value: 8 }, { id: "04", group: "B", value: 8 },
  { id: "05", group: "B", value: null }, { id: "06", group: "A", value: 2 },
];
const round = (value: number) => Math.round(value * 1000) / 1000;
const mse = (values: number[], reference: number[]) => round(values.reduce((sum, value, i) => sum + (value - reference[i]) ** 2, 0) / values.length);
export function validChoice(templateId: string, stage: number, value: unknown): value is string {
  const template = getTemplateById(templateId);
  return typeof value === "string" && !!template.stages[stage]?.options.some(option => option.value === value);
}
function getTemplateById(id: string) {
  // The public lookup also enforces direction-role association on saved outcomes.
  const direction = id.startsWith("medicine_") ? "medicine" : id === "medical_ai_pm" ? "health_systems" : id;
  return getTemplate(direction, id);
}
export function operationResult(templateId: string, choices: ChoiceState, stage: number): OperationResult {
  if (stage < 0 || stage > 2 || !Number.isInteger(stage) || choices.slice(0, stage + 1).some((value, i) => !validChoice(templateId, i, value))) throw new Error("请先完成当前与前面的操作。");
  const [a, b, c] = choices.map((value, i) => Number(i <= stage ? value ?? "0" : "0"));
  const template = getTemplateById(templateId);
  const selected = choices.slice(0, stage + 1).map((value, i) => `${template.stages[i].title}：${template.stages[i].options.find(option => option.value === value)!.label}`);
  const result = (metrics: OperationResult["metrics"], details: string[] = []): OperationResult => ({ metrics, details: [...selected, ...details] });
  if (templateId === "ml_cv") {
    let seed = 20261020 >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const rows = Array.from({ length: 100 }, (_, i) => {
      const group = i < 50 ? 0 : 1; const label = random() < .34;
      const score = round(Math.min(.99, (group === 0 ? label ? .4 : .05 : label ? .2 : .1) + random() * (group === 0 ? .55 : .75)));
      return { group, label, score };
    }).filter(row => a === 2 || row.group === a);
    const threshold = [.3, .5, .7][b];
    const tp = rows.filter(row => row.label && row.score >= threshold).length;
    const fp = rows.filter(row => !row.label && row.score >= threshold).length;
    const fn = rows.filter(row => row.label && row.score < threshold).length;
    return result({ 样本数: rows.length, 阈值: threshold, 真阳性: tp, 假阳性: fp, 假阴性: fn, 真阴性: rows.length - tp - fp - fn, 待人工复核: c === 1 ? rows.length : c === 0 ? tp + fp : rows.length - tp - fp }, ["计数来自固定合成记录，不能外推临床性能。"]);
  }
  if (templateId === "software") {
    const requests = [{ req: 1, id: 1, name: "甲", cancel: false }, { req: 1, id: 1, name: "甲", cancel: false }, { req: 2, id: 2, name: "", cancel: false }, { req: 3, id: 1, name: "甲", cancel: true }, { req: 4, id: 1, name: "甲", cancel: true }, { req: 5, id: 3, name: "丙", cancel: false }];
    const seen = new Set<number>(); const cancelled = new Set<number>(); let rejected = 0, replayed = 0, applied = 0;
    for (const row of requests) {
      if (a === 1 && !row.name) { rejected++; continue; }
      const key = b === 1 ? row.req : row.id;
      if (b > 0 && seen.has(key)) { replayed++; continue; } seen.add(key);
      if (row.cancel && cancelled.has(row.id)) { if (c === 0) rejected++; else replayed++; continue; }
      if (row.cancel) cancelled.add(row.id); applied++;
    }
    return result({ 请求数: requests.length, 应用操作: applied, 拒绝: rejected, 返回已有结果: replayed, 已取消预约: cancelled.size }, ["按预约ID去重会吞掉同一预约后续不同操作，请核对用途。"]);
  }
  if (templateId === "llm_agent") {
    const cases = [{ need: 1, manual: false }, { need: 2, manual: false }, { need: 9, manual: false }, { need: 9, manual: true }];
    const routes = cases.map(row => row.manual && c === 1 ? "人工" : row.need <= (a === 0 ? 1 : a === 1 ? 2 : 0) ? "有依据" : b === 1 ? "未知" : "无依据回答");
    return result({ 测试数: 4, 有依据回答: routes.filter(v => v === "有依据").length, 标为未知: routes.filter(v => v === "未知").length, 无依据回答: routes.filter(v => v === "无依据回答").length, 人工确认: routes.filter(v => v === "人工").length }, routes.map((route, i) => `教学问题 ${i + 1} → ${route}`));
  }
  if (templateId === "devices") {
    const points = [2, 5][a] + [1, 3][b];
    return result({ 教学预算: 6, 已用点数: points, 剩余点数: 6 - points, 覆盖用例: [1, 2, 3][c], 待补用例: 3 - [1, 2, 3][c] }, ["用例目录：正常输入、断连、异常边界。预算点数不是实际成本或功耗。"]);
  }
  if (templateId === "signals") {
    const rate = [16, 32, 64][a], window = [1, 3, 7][b];
    const reference = Array.from({ length: rate }, (_, i) => Math.sin(2 * Math.PI * 2 * i / rate));
    const raw = reference.map((value, i) => value + .35 * Math.sin(2 * Math.PI * 12 * i / rate));
    const processed = raw.map((_, i) => { const segment = raw.slice(Math.max(0, i - Math.floor(window / 2)), Math.min(raw.length, i + Math.floor(window / 2) + 1)); return segment.reduce((sum, value) => sum + value, 0) / segment.length; });
    const start = c === 1 ? Math.floor(rate / 4) : 0, end = c === 1 ? Math.floor(3 * rate / 4) : rate;
    return { ...result({ 采样率Hz: rate, 窗口点数: window, 比较点数: end - start, 处理前均方误差: mse(raw.slice(start, end), reference.slice(start, end)), 处理后均方误差: mse(processed.slice(start, end), reference.slice(start, end)) }, ["16Hz采样无法无混叠地表示12Hz噪声；平滑也可能损失参考信号。"]), series: [{ label: "参考", values: reference }, { label: "含噪", values: raw }, { label: "处理后", values: processed }] };
  }
  if (templateId === "imaging_eng") {
    const reference = Array.from({ length: 256 }, (_, i) => { const x = i % 16, y = Math.floor(i / 16); return x >= 4 && x < 12 && y >= 4 && y < 12 ? 180 : 40; });
    const noisy = reference.map((value, i) => Math.max(0, Math.min(255, value + ((i * 17) % 61) - 30)));
    const filtered = b === 0 ? noisy : noisy.map((_, i) => {
      const x = i % 16, y = Math.floor(i / 16); const neighbors: number[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx < 16 && y + dy >= 0 && y + dy < 16) neighbors.push(noisy[(y + dy) * 16 + x + dx]);
      return neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length;
    });
    const indices = reference.map((_, i) => i).filter(i => c === 0 || (c === 1) === (i % 16 >= 4 && i % 16 < 12 && Math.floor(i / 16) >= 4 && Math.floor(i / 16) < 12));
    const ceiling = [255, 180, 100][a];
    return { ...result({ 比较像素: indices.length, 降噪前均方误差: mse(indices.map(i => noisy[i]), indices.map(i => reference[i])), 降噪后均方误差: mse(indices.map(i => filtered[i]), indices.map(i => reference[i])), 显示截断像素: filtered.filter(value => value > ceiling).length }, ["误差针对降噪数据；显示窗口只改变显示，不改变用于误差比较的像素值。"]), pixels: filtered.map(value => Math.round(Math.min(1, value / ceiling) * 255)) };
  }
  if (templateId === "clinical_data") {
    let rows = [...sampleRows];
    if (a === 1) rows = rows.filter((row, i, all) => all.findIndex(other => other.id === row.id) === i);
    if (b === 1) rows = rows.filter(row => row.value !== null);
    rows = rows.filter(row => c === 0 || row.group === (c === 1 ? "A" : "B"));
    const valid = rows.flatMap(row => row.value === null ? [] : [row.value]);
    return result({ 记录数: rows.length, 非缺失数: valid.length, 缺失数: rows.length - valid.length, 均值: valid.length ? round(valid.reduce((sum, v) => sum + v, 0) / valid.length) : null }, rows.map(row => `${row.id} / ${row.group} / ${row.value ?? "缺失"}`));
  }
  if (templateId === "health_systems") {
    const events = [{ id: 1, department: true, ack: true }, { id: 1, department: true, ack: true }, { id: 2, department: false, ack: false }, { id: 3, department: true, ack: false }, { id: 4, department: false, ack: true }, { id: 5, department: true, ack: true }];
    let rows = events.filter(row => a === 0 || row.department);
    if (b === 1) rows = rows.filter((row, i, all) => all.findIndex(other => other.id === row.id) === i);
    return result({ 入队事件: rows.length, 退回核对: a === 1 ? 2 : 0, 已交接: rows.filter(row => c === 0 || row.ack).length, 待确认: c === 1 ? rows.filter(row => !row.ack).length : 0 }, ["原始事件ID：1、1、2、3、4、5；2、4缺少科室；3未收到确认。"]);
  }
  if (templateId === "med_nlp_kg") {
    const rows = [{ text: "教学句1：有咳嗽", entity: "咳嗽", kind: 0, neg: false, uncertain: false }, { text: "教学句2：无咳嗽", entity: "咳嗽", kind: 0, neg: true, uncertain: false }, { text: "教学句3：疑似发热", entity: "发热", kind: 0, neg: false, uncertain: true }, { text: "教学句4：记录检查甲", entity: "检查甲", kind: 1, neg: false, uncertain: false }].filter(row => a === 1 || row.kind === 0);
    return result({ 实体数: rows.length, 标记否定: b === 1 ? rows.filter(row => row.neg).length : 0, 保留不确定: c === 1 ? rows.filter(row => row.uncertain).length : 0 }, rows.map(row => `${row.text} → ${row.entity} / ${row.neg && b === 1 ? "否定" : row.uncertain && c === 1 ? "不确定" : "肯定"}`));
  }
  if (templateId.startsWith("medicine_")) return result({ 保留来源或冲突标记: a === 1 ? "是" : "否", 沟通核对记录: b === 1 ? "有" : "未安排", 待办责任人: c >= 1 ? "已记录" : "未记录", 跟进时点: c === 2 ? "已记录" : "未记录" }, ["教学资料共4项：本人表达、补充转述、文书记录、待核对事项。", "这些结果只反映你选择的交接结构，不判定临床能力，不构成科室准入或执业资格证明。"]);
  return result({ 涉及用户类别: a + 1, 首期功能: 2, 人工转接: b === 1 ? "已纳入" : "未纳入", 验证项目: c + 1 }, ["固定验证目录：任务完成、人工交接、失败案例。"]);
}
