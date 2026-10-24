"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

export type FilingStep = {
  href: string;
  /** 序号，例如 "01"。缺省时按顺序补 01/02/03/04。 */
  no?: string;
  title: string;
  time: string;
  lede: string;
  output: string;
  /** 标签上的手绘图标，由调用方给（不传就只有编号）。 */
  icon?: ReactNode;
};

type FilingDrawerProps = {
  steps: FilingStep[];
  /** 默认拉开哪一格（0 起）。默认第一格，避免一进来四格全空。 */
  defaultOpen?: number;
  className?: string;
};

/**
 * 四步档案抽屉：一条横向抽屉柜，四个格各有一张纸标签。
 * 点标签把那一格拉出来（一次只开一格），再点同一张标签推回去。
 * 纯 React + CSS，只动 grid-template-rows / transform / opacity。
 */
export function FilingDrawer({ steps, defaultOpen = 0, className }: FilingDrawerProps) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpen);

  if (steps.length === 0) return null;

  return (
    <div className={className ? `fd-drawer ${className}` : "fd-drawer"}>
      <div className="fd-rail">
        <span className="fd-rail-title">流程说明</span>
        <span className="fd-rail-hint">点击步骤展开详情</span>
      </div>

      <ul className="fd-cells">
        {steps.map((step, index) => {
          const open = openIndex === index;
          const tabId = `${baseId}-tab-${index}`;
          const panelId = `${baseId}-panel-${index}`;
          const no = step.no ?? String(index + 1).padStart(2, "0");

          return (
            <li className="fd-cell" key={step.href} data-open={open ? "true" : "false"}>
              <button
                type="button"
                className="fd-tab"
                id={tabId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
              >
                <span className="fd-slip">
                  <span className="fd-no">{no}</span>
                  {step.icon ? <span className="fd-icon" aria-hidden="true">{step.icon}</span> : null}
                  <span className="fd-title">{step.title}</span>
                  <span className="fd-time">{step.time}</span>
                  <span className="fd-toggle" aria-hidden="true">{open ? "收起 −" : "展开 +"}</span>
                </span>
              </button>

              <div className="fd-well" id={panelId} role="region" aria-labelledby={tabId} inert={!open}>
                <div className="fd-well-inner">
                  <div className="fd-body">
                    <p className="fd-lede">{step.lede}</p>
                    <dl className="fd-kv">
                      <div>
                        <dt>产出</dt>
                        <dd>{step.output}</dd>
                      </div>
                    </dl>
                    {index === 0 ? <Link className="fd-go" href={step.href}>
                      从个人画像开始
                      <span aria-hidden="true">→</span>
                    </Link> : <p className="fd-prerequisite">{step.time}，在探索流程中继续。</p>}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
