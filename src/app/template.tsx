"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MicroInteractions } from "@/components/micro-interactions";
import { isJourneyRoute } from "@/lib/journey";
import "./micro.css";

/**
 * 路由级翻页 + 全站微交互挂载点。
 * ---------------------------------------------------------------------------
 * Next.js 的 template 在每次站内导航时重新挂载，这里不需要手写 key：
 * 挂载 = 一次新的页面进入。上一页地址记在模块变量里（同一文档内有效，整页刷新归零）。
 *
 * 翻页是四层，样式在 theatre.css 第 3b 节，这里只负责把结构摆好、在导航时打上
 * .is-play：
 *   a 纸幕本体 .xn-route-veil —— 一整张纸被捏住上沿提起来、加速抽走（480ms）
 *   b 书脊     .xn-veil-spine  —— 左起一道竖线，像把整本书翻开
 *   c 折角     .xn-veil-fold   —— 右下角翻起的一角纸片
 *   d 反光     .xn-turn-sheen  —— 纸面被掀起时斜扫过去的一道柔光
 * 四层都收在纸幕离场之前，不会在新页上留残影。
 *
 * 只在「异域探索」的四步之间播（清单在 src/lib/journey.ts）：
 *   这四步是站内唯一一条有前后顺序的路径（个人画像 → 初步评价 → 职业体验 →
 *   行动规划），读者是"往下走"，翻一页纸和这个方向感一致。
 *   首页 / 信息文库 / 交流社区 / 我的资料是并列的目的地，进出它们只是普通跳转，
 *   每次都盖一层整屏纸幕会把页面自己的场次入场压掉，连续横跳时也显得吵。
 *
 * 不播的情况：
 *   1. 不在四步之间（见 journey.ts）；
 *   2. 首屏（700ms 窗口内）—— 首屏是"打开一本书"，不是"翻一页"；
 *   3. 同一页重复触发（StrictMode 双挂、连点）—— 用 400ms 去抖挡住；
 *   4. prefers-reduced-motion —— 整层由 CSS 隐藏，这里直接早退。
 */

const FIRST_LOAD_WINDOW = 700;
/** 纸幕 480ms、反光 90ms 延迟 + 360ms = 450ms 终点，留余量到 1100ms。
 *  到点把 .is-play 摘掉，避免一块全屏 fixed 层长期参与合成。 */
const TURN_CLEAN_MS = 1100;
/** 同一页连续触发的去抖：StrictMode 双挂与连点都会在极短时间里跑两次 effect */
const REPLAY_GUARD_MS = 400;

/* 模块级：同一文档内记录，整页刷新时归零 */
let previousPath: string | null = null;
let playedAt = 0;
let firstMountAt = 0;

export default function Template({ children }: Readonly<{ children: ReactNode }>) {
  const veil = useRef<HTMLDivElement>(null);
  const sheen = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const veilNode = veil.current;
    const sheenNode = sheen.current;
    // 先记账再判断：早退也要让下一次导航拿到正确的"从哪来"。
    const from = previousPath;
    previousPath = pathname;

    if (!veilNode) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const now = performance.now();
    if (!firstMountAt) firstMountAt = now;
    if (now - firstMountAt < FIRST_LOAD_WINDOW) return;
    if (!from || from === pathname) return;
    // 只有两头都落在异域探索的流程里才翻页：从并列目的地进出只是普通跳转
    if (!isJourneyRoute(from) || !isJourneyRoute(pathname)) return;
    if (now - playedAt < REPLAY_GUARD_MS) return;
    playedAt = now;

    veilNode.classList.add("is-play");
    sheenNode?.classList.add("is-play");
    /* 告诉样式层"这一跳有纸幕"：页眉错峰的基准延迟要靠它决定
       （有纸幕时标题区要等纸撤走才露出来，没纸幕时不必白等）。
       template 的 effect 先于 layout 里 PageTheatre 的 effect 执行，
       所以场次开播时这个标记已经在了。 */
    document.documentElement.dataset.xnTurn = "1";

    const id = window.setTimeout(() => {
      veilNode.classList.remove("is-play");
      sheenNode?.classList.remove("is-play");
      delete document.documentElement.dataset.xnTurn;
    }, TURN_CLEAN_MS);
    return () => {
      // 卸载/重挂时也要把痕迹清干净：只清定时器的话，连着跳两次页会让
      // data-xn-turn 永久留在 <html> 上，之后非流程页的页眉也按 280ms 白等。
      window.clearTimeout(id);
      veilNode.classList.remove("is-play");
      sheenNode?.classList.remove("is-play");
      delete document.documentElement.dataset.xnTurn;
    };
  }, [pathname]);

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
