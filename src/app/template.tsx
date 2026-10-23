"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { MicroInteractions } from "@/components/micro-interactions";
import "./micro.css";

/**
 * 路由级墨迹转场（ink wipe）+ 全站微交互挂载点。
 * ---------------------------------------------------------------------------
 * Next.js 的 template 在每次站内导航时重新挂载，所以这里不需要手写 key：
 * 挂载 = 一次新的页面进入，CSS 动画随挂载重放。
 *
 * 转场设计（遮罩式，oil-ui-pro「整页转场的稳定性取舍」里最稳的一类）：
 *   纸色遮罩从"盖住整屏"开始，320ms 向上擦除，露出一道墨色渐隐的边；
 *   旧页先卸、新页先渲染，转场不等待数据、也不阻塞点击（pointer-events: none），
 *   退出不做动画——「离开比进入快」。
 *
 * 两种不播的情况：
 *   1. prefers-reduced-motion: reduce —— 直接不播，遮罩由 CSS 隐藏；
 *   2. 首次加载与 React StrictMode 的重挂 —— 遮住首屏会拖慢 LCP，
 *      用一个 700ms 的窗口把这两种情况排除，只有真正的站内导航才播。
 */

const FIRST_LOAD_WINDOW = 700;

/* 模块级时间戳：同一文档内重置，整页刷新时归零 */
let firstMountAt = 0;

export default function Template({ children }: Readonly<{ children: ReactNode }>) {
  const veil = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = veil.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = performance.now();
    if (!firstMountAt) firstMountAt = now;
    if (now - firstMountAt < FIRST_LOAD_WINDOW) return;
    node.classList.add("is-play");
  }, []);

  return (
    <>
      <div className="xn-route-veil" ref={veil} aria-hidden="true" />
      {children}
      <MicroInteractions />
    </>
  );
}
