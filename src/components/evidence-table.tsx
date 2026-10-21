import type { skillEvidence } from "@/lib/reports";
export function EvidenceTable({ rows }: { rows: ReturnType<typeof skillEvidence> }) {
  if (!rows.length) return <p className="mt-4 muted">尚无技能、课程或项目记录。可以继续探索，暂不推断能力。</p>;
  return <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr><th className="pb-3">经历 / 技能</th><th>证据与状态</th></tr></thead><tbody>{rows.map((row) => <tr className="border-t align-top" key={row.ref}><th className="w-1/3 py-4 pr-4 font-medium">{row.skill}</th><td className="py-4 leading-6"><details><summary className="cursor-pointer">{row.status}</summary><p className="mt-2 whitespace-pre-wrap">{row.evidence}</p><code className="break-all text-xs muted">{row.ref}</code></details></td></tr>)}</tbody></table></div>;
}
