"use client";

import { Children, useEffect, useState, type ReactNode } from "react";

type Item = { id: string; label: string };

/** Keep panels mounted so switching never discards an in-progress explanation. */
export function ReportSections({ items, children, defaultId }: { items: Item[]; children: ReactNode; defaultId: string }) {
  const [selected, setSelected] = useState(defaultId);
  const signature = items.map(item => item.id).join("|");
  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setSelected(defaultId);
        return;
      }
      const target = document.getElementById(hash);
      const panelId = target?.closest<HTMLElement>("[data-report-panel]")?.dataset.reportPanel;
      if (panelId && signature.split("|").includes(panelId)) {
        setSelected(panelId);
        requestAnimationFrame(() => target?.scrollIntoView({ block: "start" }));
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [signature, defaultId]);
  function select(id: string) {
    setSelected(id);
    window.history.replaceState(window.history.state, "", `#${id}`);
    if (window.matchMedia("(min-width: 821px)").matches) {
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    }
  }
  return <div className="report-sections" onClick={event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const target = document.getElementById(link.hash.slice(1));
    const panelId = target?.closest<HTMLElement>("[data-report-panel]")?.dataset.reportPanel;
    if (!target || !panelId || !items.some(item => item.id === panelId)) return;
    event.preventDefault();
    setSelected(panelId);
    window.history.pushState(window.history.state, "", link.hash);
    requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  }}>
    <nav className="report-section-nav" aria-label="规划栏目">
      <p>行动规划</p>
      {items.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} aria-controls={`panel-${item.id}`} onClick={() => select(item.id)}>{item.label}<span aria-hidden="true">→</span></button>)}
    </nav>
    <div className="xr-body">
      {Children.toArray(children).map((child, index) => {
        const item = items[index];
        return item ? <div key={item.id} id={`panel-${item.id}`} data-report-panel={item.id} hidden={selected !== item.id}>{child}</div> : null;
      })}
    </div>
  </div>;
}
