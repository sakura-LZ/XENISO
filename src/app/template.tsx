"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { MicroInteractions } from "@/components/micro-interactions";
import "./micro.css";

/**
 * 路由级翻页转场 + 全站微交互挂载点。
 * ---------------------------------------------------------------------------
 * Next.js 的 template 在每次站内导航时重新挂载，所以这里不需要手写 key：
 * 挂载 = 一次新的页面进入。
 *
 * 翻页转场（样式在 theatre.css）由四层叠出来，总长 560ms：
 *   纸页本体  从盖住整屏开始，带一点透视倾斜向上提起，下沿留一道墨色渐隐（纸的厚度）
 *   书脊      左起一道竖线从上往下走一遍，像把整本书翻开
 *   折角      右下角翻起的一小块纸片
 *   反光      纸面被掀起时斜扫过去的一道柔光
 * 新页内容不在这里动——页眉错峰由 page-theatre.tsx 负责，两件事各管各的。
 * 转场不等待数据、也不阻塞点击（pointer-events: none），退出不做动画——「离开比进入快」。
 *
 * 两种不播的情况：
 *   1. prefers-reduced-motion: reduce —— 直接不播，遮罩由 CSS 隐藏；
 *   2. 首次加载与 React StrictMode 的重挂 —— 遮住首屏会拖慢 LCP，
 *      用一个 700ms 的窗口把这两种情况排除，只有真正的站内导航才播。
 */

const FIRST_LOAD_WINDOW = 700;
/** 与 theatre.css 里 xn-turn-lift 560ms 对齐，多留一点给反光收尾 */
const TURN_CLEAN_MS = 1400;

/* 模块级时间戳：同一文档内重置，整页刷新时归零 */
let firstMountAt = 0;

export default function Template({ children }: Readonly<{ children: ReactNode }>) {
  const veil = useRef<HTMLDivElement>(null);
  const sheen = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = veil.current;
    const glow = sheen.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = performance.now();
    if (!firstMountAt) firstMountAt = now;
    if (now - firstMountAt < FIRST_LOAD_WINDOW) return;

    node.classList.add("is-play");
    glow?.classList.add("is-play");

    // 动画结束后摘掉类名：留着会让 fixed 遮罩一直参与合成
    const id = window.setTimeout(() => {
      node.classList.remove("is-play");
      glow?.classList.remove("is-play");
    }, TURN_CLEAN_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      <div className="xn-route-veil" ref={veil} aria-hidden="true">
        <span className="xn-veil-spine" />
        <span className="xn-veil-fold" />
      </div>
      <div className="xn-turn-sheen" ref={sheen} aria-hidden="true" />
      {children}
      <MicroInteractions />
    </>
  );
}
