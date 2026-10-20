import { courseSchema, type Course } from "./profile";

// Small RFC4180-style parser, including quoted commas, escaped quotes and CRLF.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || field.length === 0) quoted = !quoted;
      else throw new Error("CSV 引号格式不正确。");
    } else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field); if (row.some((cell) => cell.trim())) rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("CSV 中存在未闭合的引号。");
  row.push(field); if (row.some((cell) => cell.trim())) rows.push(row);
  if (rows.length > 501) throw new Error("一次最多导入 500 门课程。");
  return rows;
}

export function coursesFromRows(rows: unknown[][]): Course[] {
  if (rows.length < 2 || rows.length > 501) throw new Error("成绩表须含表头与 1–500 行课程。");
  const header = rows[0].map((cell) => String(cell ?? "").trim());
  const find = (...names: string[]) => header.findIndex((cell) => names.includes(cell));
  const nameIndex = find("课程名", "课程名称", "course_name");
  const scoreIndex = find("成绩", "分数", "score");
  const creditIndex = find("学分", "credit");
  const scaleIndex = find("满分", "成绩满分", "score_scale");
  const semesterIndex = find("学期", "semester");
  if (nameIndex < 0) throw new Error("未找到“课程名”列，请使用提供的模板或调整表头。");
  const numberAt = (row: unknown[], index: number): number | null => {
    const value = index < 0 ? "" : String(row[index] ?? "").trim();
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error("成绩、学分和满分须为数值，非数值成绩请在预览中留空后手动补充。");
    return parsed;
  };
  return rows.slice(1).map((row, index) => {
    const parsed = courseSchema.safeParse({ course_name: String(row[nameIndex] ?? "").trim(), credit: numberAt(row, creditIndex), score: numberAt(row, scoreIndex), score_scale: numberAt(row, scaleIndex), semester: semesterIndex < 0 ? "" : String(row[semesterIndex] ?? "").trim() });
    if (!parsed.success) throw new Error(`第 ${index + 2} 行：${parsed.error.issues[0].message}`);
    return parsed.data;
  });
}
