import Link from "next/link";
import type { ReactNode } from "react";

/** 本步说明：一行的可选帮助条，展开后就地给最短要点，全文在 /guide 的固定锚点。 */
export function PageHelp({ topic, children }: { topic: string; children: ReactNode }) {
  return <details className="page-help">
    <summary>
      <span className="page-help-mark" aria-hidden="true">?</span>
      <span className="page-help-label">本步说明</span>
      <span className="page-help-plus" aria-hidden="true">+</span>
    </summary>
    <div className="page-help-body">{children}<Link className="page-help-more" href={`/guide#${topic}`}>查看完整指南 →</Link></div>
  </details>;
}
