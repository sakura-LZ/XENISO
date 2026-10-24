"use client";

/**
 * 对版台（RegisterPress）
 * ---------------------------------------------------------------------------
 * 首页那一屏的第三次尝试。前两版：随鼠标变形的水墨画布（抽象，和网站无关）、
 * 一张逐条核对的表格（清楚，但没劲）。这一版换的是**动作**而不是信息密度。
 *
 * 隐喻取的是印刷里的「对版」：同一张图分两版印，没对准时字是虚的、边是双的，
 * 对准了才实。这正好是这站在做的事——把你的经历和目标领域的要求印到同一张纸上，
 * 对得上的那几条才是实的，对不上的留成缺口。
 *
 * 所以这一屏不给结论，给一个可以亲手做的动作：拖滑块，把墨绿那一版挪到赭石那版上。
 * 对准的瞬间，双线合成单线，每个节点亮起勾环，右上角落下「已对版」的章。
 *
 * 内容是真的：五个节点是同一副骨架的两套叫法（问诊/用户访谈 这类），两处缺口
 * 分别是「只有医学有」和「只有那边要」——能带走的东西和补不上的东西同时在场。
 * 骨架只画一次，两版共用同一组坐标，所以永远对得上；挪动的是印张，不是内容。
 */

import { useState } from "react";

/** 同一副骨架的两套叫法。坐标共用，只有印张在动。 */
const NODES = [
  { x: 78, y: 168, med: "问诊", other: "用户访谈" },
  { x: 186, y: 132, med: "查体", other: "现场观察" },
  { x: 294, y: 176, med: "病历书写", other: "结构化记录" },
  { x: 402, y: 136, med: "文献综述", other: "证据分级" },
  { x: 500, y: 170, med: "复核签字", other: "质控校验" },
];

/** 骨架连线：节点之间的手写弧线，两版共用 */
const LINKS = [
  "M78,168 C110,160 150,138 186,132",
  "M186,132 C224,138 258,170 294,176",
  "M294,176 C330,170 366,142 402,136",
  "M402,136 C438,142 470,164 500,170",
];

/** 未对版时墨绿那一版的偏移量（对版后归零） */
const OFF_X = 16;
const OFF_Y = 12;

/** 对版完成的门槛：到这里才亮勾、落章 */
const SNAP = 0.92;

export function RegisterPress() {
  /* 0 = 完全没对准，1 = 对上了。默认留一点错位，一眼能看出"这是两版" */
  const [register, setRegister] = useState(0.18);
  const aligned = register >= SNAP;
  const dx = (1 - register) * OFF_X;
  const dy = (1 - register) * OFF_Y;

  return (
    <div className="rp" data-atlas-reveal>
      <div className="atlas-sheet raised rp-sheet">
        <span className="atlas-tape tr" aria-hidden="true" />

        <header className="rp-head">
          <p className="atlas-label">对版台 · 两版印张</p>
          <p className="rp-spec">
            <span className="rp-swatch" data-ink="med" aria-hidden="true" />
            第一版 · 医学
            <span className="rp-swatch" data-ink="target" aria-hidden="true" />
            第二版 · 目标领域
          </p>
        </header>

        <div className="rp-plate">
          <svg className="rp-art" viewBox="0 0 560 380" aria-hidden="true" data-aligned={aligned ? "1" : "0"}>
            {/* 对位标：四角十字 + 圈，印刷厂用来对版的那套标记 */}
            {[
              [26, 26],
              [534, 26],
              [26, 354],
              [534, 354],
            ].map(([cx, cy]) => (
              <g className="rp-mark" key={`${cx}-${cy}`}>
                <circle cx={cx} cy={cy} r="7" />
                <path d={`M${cx - 11},${cy} H${cx + 11} M${cx},${cy - 11} V${cy + 11}`} />
              </g>
            ))}

            {/* 第一版：赭石，不动 */}
            <g className="rp-imp rp-imp-med">
              {LINKS.map((d) => (
                <path key={d} d={d} />
              ))}
              {NODES.map((node) => (
                <circle key={`m-${node.med}`} cx={node.x} cy={node.y} r="6" />
              ))}
              {NODES.map((node) => (
                <text key={`mt-${node.med}`} x={node.x} y={node.y - 26} textAnchor="middle">
                  {node.med}
                </text>
              ))}
            </g>

            {/* 第二版：墨绿，跟着滑块挪。同一组坐标，只是印张偏了 */}
            <g
              className="rp-imp rp-imp-target"
              style={{ transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)` }}
            >
              {LINKS.map((d) => (
                <path key={d} d={d} />
              ))}
              {NODES.map((node) => (
                <circle key={`t-${node.other}`} cx={node.x} cy={node.y} r="6" />
              ))}
              {NODES.map((node) => (
                <text key={`tt-${node.other}`} x={node.x} y={node.y + 32} textAnchor="middle">
                  {node.other}
                </text>
              ))}
            </g>

            {/* 对上之后每个节点亮一圈勾：这一刻才"实" */}
            <g className="rp-ticks">
              {NODES.map((node) => (
                <g key={`tick-${node.med}`} transform={`translate(${node.x}, ${node.y})`}>
                  <circle r="14" />
                  <path d="M-4.6 0.4 L-1.4 3.6 L4.8 -3.4" />
                </g>
              ))}
            </g>

            {/* 两处缺口：一边独有，永远合不上，所以单独放在纸面下方 */}
            <g className="rp-gap" data-side="med">
              <rect x="56" y="286" width="200" height="56" rx="2" />
              <text className="rp-gap-tag" x="70" y="307">
                只有医学有
              </text>
              <text className="rp-gap-word" x="70" y="330">
                处方权
              </text>
            </g>
            <g className="rp-gap" data-side="target">
              <rect x="304" y="286" width="200" height="56" rx="2" />
              <text className="rp-gap-tag" x="318" y="307">
                只有那边要
              </text>
              <text className="rp-gap-word" x="318" y="330">
                编程
              </text>
            </g>
          </svg>

          <p className="atlas-stamp ochre rp-stamp" aria-hidden="true" data-on={aligned ? "1" : "0"}>
            已对版
          </p>
        </div>

        {/* 给读屏的同一份内容：图里那两个名字对，这里一条条写出来 */}
        <ul className="sr-only">
          {NODES.map((node) => (
            <li key={`sr-${node.med}`}>
              {node.med} —— 那边叫 {node.other}
            </li>
          ))}
          <li>只有医学有：处方权</li>
          <li>只有那边要：编程</li>
        </ul>

        <div className="rp-control">
          <label htmlFor="rp-range">对版</label>
          <input
            id="rp-range"
            type="range"
            min={0}
            max={100}
            value={Math.round(register * 100)}
            onChange={(event) => setRegister(Number(event.target.value) / 100)}
            aria-describedby="rp-hint"
          />
          <output htmlFor="rp-range" className="rp-readout" data-on={aligned ? "1" : "0"}>
            {aligned ? "已对上" : `偏移 ${Math.round(dx)}px`}
          </output>
          <button type="button" className="atlas-btn rp-snap" onClick={() => setRegister(1)}>
            对准
          </button>
        </div>
        <p className="rp-hint" id="rp-hint">
          没对准时两条边是双的、字是虚的；拖到底，双线合成一条，才算对上。
        </p>
      </div>
    </div>
  );
}

/** 左栏：把「对版」这个动作讲清楚，不解释实现。 */
export function RegisterPressCopy() {
  return (
    <div className="rp-copy" data-atlas-reveal>
      <p className="atlas-label">异域同构 · 对版</p>
      <h2 className="t-section">换个领域，一半的动词还是同一个</h2>
      <p>
        印刷上管这叫对版：同一张图分两版印，没对准时边是双的、字是虚的，对准了才实。
        你现在手上的经历也是这样——把它和目标领域的要求印到同一张纸上，对得上的那几条才站得住。
      </p>
      <p>
        右边是同一副骨架的两版：赭石是你学过的，墨绿是那边怎么叫。拖动它，看哪些能合成一条。
      </p>

      <ul className="rp-key">
        <li>
          <b>合上</b>
          <span>两个名字落在同一个节点上：这件事你已经在做了，只是叫法不同。</span>
        </li>
        <li>
          <b>缺口</b>
          <span>只有一边有的，永远合不上。要么补，要么承认它不在你的牌里。</span>
        </li>
      </ul>

      <div className="rp-actions">
        <a className="atlas-btn atlas-btn-primary" href="/explore">
          进文库看要求
        </a>
        <a className="atlas-btn" href="/profile">
          先做一次盘点
        </a>
      </div>
    </div>
  );
}
