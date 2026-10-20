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
        const { default: readXlsx } = await import("read-excel-file/browser");
        rows = await readXlsx(file);
      } else throw new Error("只支持 CSV 和 XLSX 文件。");
      setPreview(coursesFromRows(rows)); setMessage("已在浏览器解析，请检查和修正后再确认。原始文件不会上传。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "解析失败。"); }
    finally { setBusy(false); }
  }
  function edit(index: number, key: keyof Course, value: string) {
    setPreview((items) => items.map((item, i) => i !== index ? item : { ...item, [key]: ["course_name", "semester"].includes(key) ? value : value === "" ? null : Number(value) }));
  }
  return <section className="mt-8 border-t border-slate-200 pt-6">
    <h3 className="text-lg font-semibold">可选成绩表</h3><p className="mt-2 text-sm muted">仅在本机解析。确认后只保存课程名、学分、成绩、满分和学期；无需上传也能继续。</p>
    <button type="button" className="mt-3 underline text-sm text-blue-700" onClick={() => download("LIMEN-成绩导入模板.csv", '\uFEFF课程名,学分,成绩,满分,学期\n', "text/csv;charset=utf-8")}>下载空白 CSV 模板</button>
    <label className="mt-4 block font-medium" htmlFor="transcript">选择文件（最多 2 MB / 500 门课程）</label>
    <input id="transcript" type="file" accept=".csv,.xlsx" disabled={busy} className="mt-3 max-w-full text-sm" onChange={(e) => { void parse(e.target.files?.[0]); e.target.value = ""; }} />
    <p role="status" className="mt-3 text-sm muted">{busy ? "正在本地解析…" : message}</p>
    {preview.length > 0 && <>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><caption className="pb-2 text-left">预览 {preview.length} 门课程，可直接纠错</caption><thead><tr>{["课程名", "学分", "成绩", "满分", "学期", "操作"].map((head) => <th key={head} className="border-b p-2 text-left">{head}</th>)}</tr></thead><tbody>
        {preview.map((course, index) => <tr key={index}>{(["course_name", "credit", "score", "score_scale", "semester"] as const).map((key) => <td key={key} className="border-b p-1"><input aria-label={`第 ${index + 1} 行 ${key}`} className={`border border-slate-300 px-2 py-2 ${key === "course_name" ? "w-36" : "w-20"}`} type={key === "course_name" || key === "semester" ? "text" : "number"} step="any" min="0" value={course[key] ?? ""} onChange={(e) => edit(index, key, e.target.value)} /></td>)}<td><button type="button" className="text-red-700 underline" onClick={() => setPreview((items) => items.filter((_, i) => i !== index))}>移除</button></td></tr>)}
      </tbody></table></div>
      <button type="button" className="button secondary mt-4" onClick={() => { const parsed = z.array(courseSchema).max(500).safeParse([...courses, ...preview]); if (!parsed.success) { setMessage(parsed.error.issues[0].message); return; } onChange(parsed.data); setPreview([]); setMessage("结构化课程已加入画像，原始附件未上传。请保存草稿。"); }}>确认加入画像</button>
    </>}
    <p className="mt-4 text-sm">画像已包含 {courses.length} 门课程。{courses.length > 0 && <button type="button" className="text-red-700 underline" onClick={() => onChange([])}>移除已导入课程</button>}</p>
  </section>;
}
