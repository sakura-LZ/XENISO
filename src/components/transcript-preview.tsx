"use client";
import { useState } from "react";
import { z } from "zod";
import { courseSchema, type Course } from "@/lib/profile";
import { coursesFromRows, parseCsv } from "@/lib/transcript";
import { download } from "@/lib/download";

export function TranscriptPreview({ courses, onChange }: { courses: Course[]; onChange: (courses: Course[]) => void }) {
  const [preview, setPreview] = useState<Course[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function parse(file?: File) {
    if (!file) return;
    setBusy(true); setMessage(""); setPreview([]);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("请使用不超过 2 MB 的 CSV 或 XLSX 文件。");
      let rows: unknown[][];
      if (/\.csv$/i.test(file.name)) rows = parseCsv(await file.text());
      else if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        rows = await readSheet(file, 1);
      } else throw new Error("只支持 CSV 和 XLSX 文件。");
      const parsedCourses = coursesFromRows(rows);
      setPreview(parsedCourses); setMessage(parsedCourses.length ? "读取完成，请核对下方课程。" : "未找到课程，请检查表头或使用导入模板。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "解析失败。"); }
    finally { setBusy(false); }
  }
  function edit(index: number, key: keyof Course, value: string) {
    setPreview((items) => items.map((item, i) => i !== index ? item : { ...item, [key]: ["course_name", "semester"].includes(key) ? value : value === "" ? null : Number(value) }));
  }
  return <details className="form-section">
    <summary className="cursor-pointer font-medium">导入课程成绩 <span className="ml-2 t-meta font-normal muted">{courses.length ? `已添加 ${courses.length} 门` : "可稍后补充"}</span></summary>
    <p className="mt-3 t-small leading-6 muted">原始文件仅在本机读取。核对后，课程信息随画像保存。</p>
    <div className="mt-4 rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] p-5"><label className="block font-medium" htmlFor="transcript">选择成绩单</label><p id="transcript-help" className="mt-1 t-meta muted">CSV / XLSX · 最多 2 MB、500 门课程</p>
    <input id="transcript" type="file" accept=".csv,.xlsx" aria-describedby="transcript-help" disabled={busy} className="mt-4 max-w-full t-small file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-[var(--green)]" onChange={(e) => { void parse(e.target.files?.[0]); e.target.value = ""; }} />
    <button type="button" className="mt-4 block t-small text-[var(--green)] underline underline-offset-4" onClick={() => download("LIMEN-成绩导入模板.csv", '\uFEFF课程名,学分,成绩,满分,学期\n', "text/csv;charset=utf-8")}>下载填写模板</button></div>
    {(busy || message) && <p role="status" className="mt-3 t-small muted">{busy ? "正在读取课程…" : message}</p>}
    {preview.length > 0 && <>
      <div className="mt-4 overflow-x-auto"><table className="w-full t-small"><caption className="pb-2 text-left">预览 {preview.length} 门课程，可直接纠错</caption><thead><tr>{["课程名", "学分", "成绩", "满分", "学期", "操作"].map((head) => <th key={head} className="border-b p-2 text-left">{head}</th>)}</tr></thead><tbody>
        {preview.map((course, index) => <tr key={index}>{(["course_name", "credit", "score", "score_scale", "semester"] as const).map((key) => <td key={key} className="border-b p-1"><input aria-label={`第 ${index + 1} 行 ${key}`} className={`border border-slate-300 px-2 py-2 ${key === "course_name" ? "w-36" : "w-20"}`} type={key === "course_name" || key === "semester" ? "text" : "number"} step="any" min="0" value={course[key] ?? ""} onChange={(e) => edit(index, key, e.target.value)} /></td>)}<td><button type="button" className="text-red-700 underline" onClick={() => setPreview((items) => items.filter((_, i) => i !== index))}>移除</button></td></tr>)}
      </tbody></table></div>
      <button type="button" className="button secondary mt-4" onClick={() => { const parsed = z.array(courseSchema).max(500).safeParse([...courses, ...preview]); if (!parsed.success) { setMessage(parsed.error.issues[0].message); return; } onChange(parsed.data); setPreview([]); setMessage("课程已加入，请保存画像。"); }}>确认加入画像</button>
    </>}
    {courses.length > 0 && <p className="mt-4 flex flex-wrap gap-3 t-small"><span>已添加 {courses.length} 门课程</span><button type="button" className="text-red-700 underline" onClick={() => { onChange([]); setMessage("课程已移除，请保存画像。"); }}>移除已导入课程</button></p>}
  </details>;
}
