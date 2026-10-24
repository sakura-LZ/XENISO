"use client";

/**
 * 装订册（BookSpread）：首页第二屏。
 *
 * 一摊开的线圈装订册：左页是一张 1568 年的公有领域解剖图版，右页是方向索引；
 * 把右页翻过去，背面是「为什么做成目录」，同时露出底下的 015 页（四类方向各一句话）。
 *
 * 交互都围绕「纸」本身，不是为了动而动：
 * 1. 掀角：指针靠近自由角时纸角按距离掀起，最大 176px，露出下一张纸的颜色。
 * 2. 跟手翻页：从右页往左拖，纸面绕书脊 1:1 跟随，松手按过没过一半决定翻不翻。
 * 3. 光学细节：翻动时纸面扫过一道斜光，底层页有投影跟着走，铁环随纸被拉出微微内移，
 *    丝带书签摆动。
 * 4. 键盘：纸面可聚焦，Enter / 空格 / 左右方向键可翻。
 *
 * 动画由一个 rAF 引擎驱动（不用 CSS transition，也不用 @property）：
 * 拖到一半松手和点一下走同一条缓动，行为可预期；系统开了减少动态效果时直接跳到位。
 */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { groups } from "@/lib/directions";

/* 环与孔共用同一组 y 坐标：铁环正好穿过打孔，不靠眼睛对 */
const RING_TOP = 52;
const RING_STEP = 54;
const RINGS = Array.from({ length: 9 }, (_, i) => RING_TOP + i * RING_STEP);

/* 每类方向一句话。键取 data 里的 group id，取不到就退回类目名，不会渲染空行 */
const GROUP_NOTE: Record<string, string> = {
  cs_ai: "把医学里的问题换一种解法：从数据、从系统、从模型。",
  biomed_eng: "器械、信号、影像——医学的问题最终要落在能摸到的东西上。",
  med_informatics: "医院里已经在跑的数据和流程，本身就是一门学科。",
  medicine: "不换行当也算一条路：往里走，走到更细的科室。",
};

/* 编号在模块层算好：数据是静态的，不参与渲染 */
const INDEX = (() => {
  let n = 0;
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    count: group.specializations.length,
    items: group.specializations.map((item) => {
      n += 1;
      return { id: item.id, no: String(n).padStart(2, "0"), name: item.name };
    }),
  }));
})();

function Holes({ side }: { side: "l" | "r" }) {
  return (
    <span className={`bk-holes bk-holes-${side}`} aria-hidden="true">
      {RINGS.map((y) => (
        <span key={y} className="bk-hole" style={{ top: y - 7 }} />
      ))}
    </span>
  );
}

export function BookSpread() {
  const bookRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [linear, setLinear] = useState(false);
  const flippedRef = useRef(false);
  const reduceRef = useRef(false);

  const engine = useRef({
    flip: 0,
    target: 0,
    lift: 0,
    liftTarget: 0,
    raf: 0,
    dragging: false,
    startX: 0,
    startFlip: 0,
    width: 1,
    moved: 0,
  });

  const paint = useCallback(() => {
    const book = bookRef.current;
    const sheet = sheetRef.current;
    const st = engine.current;
    if (!book || !sheet) return;
    book.style.setProperty("--flip", st.flip.toFixed(4));
    book.style.setProperty("--lift", st.lift.toFixed(4));
    sheet.style.transform = `rotateY(${(-180 * st.flip).toFixed(3)}deg)`;
  }, []);

  const runEngine = useCallback(() => {
    const st = engine.current;
    if (st.raf) return;
    const step = () => {
      // 拖动时 1:1 跟随指针；松手后走同一条缓动收尾
      const k = st.dragging ? 1 : 0.16;
      st.flip += (st.target - st.flip) * k;
      st.lift += (st.liftTarget - st.lift) * 0.22;
      if (Math.abs(st.target - st.flip) < 0.0015) st.flip = st.target;
      if (Math.abs(st.liftTarget - st.lift) < 0.002) st.lift = st.liftTarget;
      paint();
      if (st.flip === st.target && st.lift === st.liftTarget) {
        st.raf = 0;
        return;
      }
      st.raf = requestAnimationFrame(step);
    };
    st.raf = requestAnimationFrame(step);
  }, [paint]);

  const commit = useCallback(
    (next: boolean) => {
      const st = engine.current;
      flippedRef.current = next;
      setFlipped(next);
      st.dragging = false;
      st.target = next ? 1 : 0;
      if (reduceRef.current) {
        st.flip = st.target;
        st.lift = 0;
        st.liftTarget = 0;
        paint();
        return;
      }
      runEngine();
    },
    [paint, runEngine],
  );

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 860px)");
    const update = () => setLinear(narrow.matches);
    update();
    narrow.addEventListener("change", update);
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* 把 ref 的值取出来：cleanup 跑到时 engine.current 可能已经换过 */
    const engineState = engine.current;
    paint();
    return () => {
      narrow.removeEventListener("change", update);
      if (engineState.raf) cancelAnimationFrame(engineState.raf);
      engineState.raf = 0;
    };
  }, [paint]);

  /* 掀角量：按指针到「当前自由角」的距离算。没翻时自由角在右下，翻过去在左下 */
  const trackLift = (clientX: number, clientY: number) => {
    const book = bookRef.current;
    const st = engine.current;
    if (!book || st.dragging) return;
    const rect = book.getBoundingClientRect();
    const cornerX = flippedRef.current ? rect.left : rect.right;
    const distance = Math.hypot(clientX - cornerX, clientY - rect.bottom);
    st.liftTarget = Math.max(0, Math.min(1, 1 - distance / 300));
    runEngine();
  };

  const onStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const st = engine.current;
    if (st.dragging) {
      st.moved = Math.max(st.moved, Math.abs(event.clientX - st.startX));
      const next = Math.max(0, Math.min(1, st.startFlip - (event.clientX - st.startX) / st.width));
      st.target = next;
      st.flip = next;
      paint();
      return;
    }
    trackLift(event.clientX, event.clientY);
  };

  const onStagePointerLeave = () => {
    const st = engine.current;
    if (st.dragging) return;
    st.liftTarget = 0;
    runEngine();
  };

  const onSheetPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const st = engine.current;
    const sheet = sheetRef.current;
    if (!sheet) return;
    /* 角落按钮自己处理点击。这里若也 setPointerCapture，pointerup 会被重定向到纸面，
       click 就不再落到按钮上，翻页会整个失效 */
    if (linear || (event.target as HTMLElement).closest("a, button")) return;
    st.dragging = true;
    st.moved = 0;
    st.startX = event.clientX;
    st.startFlip = st.flip;
    st.width = sheet.getBoundingClientRect().width || 1;
    st.target = st.startFlip;
    sheet.setPointerCapture(event.pointerId);
  };

  const onSheetPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const st = engine.current;
    if (!st.dragging) return;
    const sheet = sheetRef.current;
    if (sheet?.hasPointerCapture(event.pointerId)) sheet.releasePointerCapture(event.pointerId);
    st.dragging = false;
    if (st.moved < 6) {
      // 只是点了一下：不翻。翻页交给角落或键盘，免得点索引时误翻
      st.target = st.startFlip;
      runEngine();
      return;
    }
    commit(st.flip > 0.5);
  };

  return (
    <div className="bk-stage" onPointerMove={onStagePointerMove} onPointerLeave={onStagePointerLeave}>
      <div className="bk-shelf">
        <span className="bk-drop" aria-hidden="true" />

        <div className="bk-book" ref={bookRef} data-flipped={flipped ? "1" : "0"}>
          {/* ---------- 底层两页：图版页与 015 页 ---------- */}
          <div className="bk-base">
            <div className="bk-leaf bk-leaf-l">
              <Holes side="r" />
              <figure className="bk-plate">
                <Image
                  src="/generated/W5-hrjhqh8b.jpg"
                  alt="1568 年解剖图版：两具躯干与心脏、肺的插图，Vesalius / Becerra，Wellcome Collection 藏"
                  width={1057}
                  height={1600}
                  sizes="(max-width: 860px) 340px, 520px"
                />
              </figure>
            </div>
            <div className="bk-leaf bk-leaf-r">
              <Holes side="l" />
              <ul className="bk-notes">
                {INDEX.map((group) => (
                  <li key={group.id}>
                    <span className="bk-notes-name">{group.name}</span>
                    <span className="bk-notes-line">{GROUP_NOTE[group.id] ?? group.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <span className="bk-cast" aria-hidden="true" />

          {/* ---------- 可翻的那一张：正面索引，背面说明 ---------- */}
          <div
            className="bk-sheet"
            ref={sheetRef}
            onPointerDown={onSheetPointerDown}
            onPointerUp={onSheetPointerUp}
            onPointerCancel={onSheetPointerUp}
          >
            <div className="bk-face bk-face-front" inert={flipped && !linear}>
              <Holes side="l" />
              <ol className="bk-index">
                {INDEX.map((group) => (
                  <li key={group.id} className="bk-group">
                    <span className="bk-group-name">{group.name}</span>
                    <span className="bk-group-count">{group.count}</span>
                    <ol className="bk-items">
                      {group.items.map((item) => (
                        <li key={item.no}>
                          <span className="bk-no">{item.no}</span>
                          <Link className="bk-name" href={`/explore?direction=${encodeURIComponent(item.id)}`}>{item.name}<span aria-hidden="true"> ↗</span></Link>
                        </li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ol>
              <span className="bk-sweep" aria-hidden="true" />
              <span className="bk-curl" aria-hidden="true" />
              <button
                type="button"
                className="bk-corner bk-corner-r"
                aria-label="翻到背面"
                onPointerEnter={() => {
                  engine.current.liftTarget = 1;
                  runEngine();
                }}
                onClick={() => commit(true)}
              />
            </div>

            <div className="bk-face bk-face-back" inert={!flipped && !linear}>
              <Holes side="l" />
              <div className="bk-prose">
                <p>
                  目录包含继续医学与跨学科方向。每个方向的工作内容、所需基础与升学要求不同，
                  可以进入文库逐条查看来源。
                </p>
              </div>
              <span className="bk-sweep" aria-hidden="true" />
              <span className="bk-curl bk-curl-l" aria-hidden="true" />
              <button
                type="button"
                className="bk-corner bk-corner-l"
                aria-label="翻回方向索引"
                onPointerEnter={() => {
                  engine.current.liftTarget = 1;
                  runEngine();
                }}
                onClick={() => commit(false)}
              />
            </div>
          </div>

          <span className="bk-spine">
            <span className="bk-rings" aria-hidden="true">
              {RINGS.map((y) => (
                <span key={y} className="bk-ring" style={{ top: y - 17 }}>
                  <svg viewBox="0 0 62 34" focusable="false" aria-hidden="true">
                    <ellipse
                      cx="31" cy="17" rx="28.4" ry="14.4" fill="none"
                      stroke="#9b9281" strokeWidth="3.4" strokeDasharray="136 12"
                      strokeDashoffset="-42" strokeLinecap="round"
                    />
                    <ellipse
                      cx="31" cy="17" rx="28.4" ry="14.4" fill="none"
                      stroke="#ded7c4" strokeWidth="1.2" strokeDasharray="136 12"
                      strokeDashoffset="-42" strokeLinecap="round"
                      transform="translate(0,-1.2)" opacity="0.85"
                    />
                  </svg>
                </span>
              ))}
            </span>
          </span>

          <span className="bk-ribbon" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
