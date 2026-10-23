"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * XENISO · 滚动场景控制器（唯一）
 * ---------------------------------------------------------------------------
 * 样式全部在 scroll-scenes.css，兜底在 reading-craft.css，这里只负责"什么时候动"。
 *
 * 和 xeniso-motion.tsx 的分工：
 *   xeniso-motion 管 [data-reveal] / [data-atlas-reveal] 的整块上浮，以及首屏视差、进度条；
 *   本组件管"标题以下的内容各自怎么被摆上去"——盖章、画表格线、滚数字、拉波浪线、
 *   逐行压字、抽图版。两套各看各的属性，互不重叠。
 *
 * 三条硬约定：
 *  1. **默认可见。** 只有"起始位置在视口下方"的元素才会被打上 data-scene-arm；
 *     已经在视野里的元素一律不碰。JS 不跑 = 没有 data-xn-scenes 标记 = 起始态
 *     一条都匹配不上，正文原样可读。
 *  2. **一定放得出来。** 除了 IntersectionObserver，还有两道路径：滚动时用武装时
 *     缓存的 top 判断"已经滚过去了"（不读布局），以及只对"已经该被看见"的元素生效
 *     的巡检。巡检不搞"到点全部放行"——那样整页往下滚就再没有动效了。
 *  3. **只播一次。** 播完即 unobserve，往回滚不重播、不闪。
 *
 * 性能：所有观察合并成一个 IntersectionObserver；滚动回调只排帧，帧里只写
 * CSS 变量和 transform，不读布局（位置在武装和 resize 时量好）。
 */

const REDUCE = "(prefers-reduced-motion: reduce)";
/** 顶边低于视口这个比例才算"还没滚到"，否则一律保持可见、不做入场 */
const ARM_LINE = 0.9;
/** 同一组内相邻两项最多错峰到第 8 个，长列表不至于拖到两秒 */
const STAGGER_CAP = 8;
/** 机械计数器滚到底的时长 */
const ROLL_MS = 620;
/** 章节标签随滚动位移的幅度：±6px（任务上限 12px，这里再收一半） */
const SHIFT_RANGE = 6;
/** 巡检间隔：只用来捞"该出现却还停在起始态"的元素 */
const SWEEP_MS = 1200;

type SceneKind = "stamp" | "rule" | "ink" | "lines" | "plate" | "count" | "shift";

/**
 * 自动作用于既有的语义选择器——不需要改任何既有 tsx。
 * 想给别的元素加效果时，手写 data-scene="kind" 即可（prepare 里第二段会读它）。
 */
const TARGETS: Array<[SceneKind, string[]]> = [
  /* 整段正文：按行压上去 */
  ["lines", [
    ".xr-body-text",
    ".xnlib-file-lede",
    ".xnlib-dossier-lead",
    ".xp-lede",
    ".atlas-band-head .t-lede",
    ".atlas-limits .atlas-cols-3 > div",
  ]],
  /* 图版：从档案袋里抽出来 */
  ["plate", [".xn-direction-art", "figure.xd-figure", "figure.pr-experience-outcome"]],
  /* 引用与手记：铅笔波浪线 */
  ["ink", ["p.atlas-hand", "blockquote.xnlib-quote"]],
  /* 表格：先画横线再填字 */
  ["rule", ["table.xd-table", "table.xnlib-compare"]],
  /* 数字：机械计数器 */
  ["count", [".xnlib-rail-count", ".xp-ledger-count"]],
  /* 章节标签：随翻阅做细微位移 */
  ["shift", [".xr-sec-tag"]],
  /* 条目：盖章落入 */
  ["stamp", [".xnlib-steps", ".xd-evidence", ".atlas-dir-list", ".xr-gap-list", ".chroma-legend"]],
];

const KINDS = new Set<string>(TARGETS.map(([kind]) => kind));

export function ScrollScenes() {
  const pathname = usePathname();

  useEffect(() => {
    // 减少动态效果时整层不安装：html 上没有 data-xn-scenes 标记，
    // scroll-scenes.css 里所有起始态都匹配不上，正文自然全在。
    const reduce = window.matchMedia(REDUCE);
    let stop: (() => void) | null = null;

    const boot = () => {
      stop?.();
      if (reduce.matches) {
        stop = null;
        return;
      }
      try {
        stop = install();
      } catch {
        // 装不上就明说：把标记打成 panic，reading-craft.css 会把一切强制到位
        document.documentElement.dataset.xnScenes = "panic";
        stop = null;
      }
    };
    const restart = () => boot();

    reduce.addEventListener("change", restart);
    boot();

    return () => {
      reduce.removeEventListener("change", restart);
      stop?.();
    };
  }, [pathname]);

  return null;
}

function install(): () => void {
  if (typeof window.IntersectionObserver !== "function") return () => {};

  const root = document.documentElement;
  const cleanups: Array<() => void> = [];
  const timers = new Set<number>();
  const frames = new Set<number>();

  /** 武装中的元素 → 武装时缓存的文档顶部（滚动与巡检都用它判断，不再读布局） */
  const armed = new Map<HTMLElement, number>();
  const played = new WeakSet<Element>();
  const shiftItems: Array<{ el: HTMLElement; top: number; height: number }> = [];
  const shiftSeen = new Set<HTMLElement>();
  const countSeen = new Set<HTMLElement>();

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  const frame = (fn: (now: number) => void) => {
    const id = window.requestAnimationFrame((now) => {
      frames.delete(id);
      fn(now);
    });
    frames.add(id);
  };

  /* ------------------------------------------------------------------ *
   * 0. 幂等：StrictMode 会把整层挂载两次，先把上一轮留下的状态清掉
   * ------------------------------------------------------------------ */
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-scene-kind]"))) {
    delete el.dataset.sceneArm;
    delete el.dataset.scenePlay;
    delete el.dataset.sceneWatch;
  }

  root.dataset.xnScenes = "1";
  cleanups.push(() => {
    // 摘掉标记 = 所有起始态失效，清理途中停在半路的元素也立刻可见
    delete root.dataset.xnScenes;
  });

  /* ------------------------------------------------------------------ *
   * 1. 机械计数器：高位先停、末位后停，落定前轻微抖动
   * ------------------------------------------------------------------ */
  const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const spin = (target: number, progress: number, stamp: number) => {
    const text = String(target);
    if (progress >= 1) return group(text);
    let out = "";
    for (let index = 0; index < text.length; index += 1) {
      const place = text.length - 1 - index;
      // 末位最后停：place=0 要到 1.0 才锁定，最高位 0.5 就锁定
      const lock = 0.5 + 0.5 * (place / Math.max(1, text.length - 1));
      if (progress >= lock) {
        out += text[index];
        continue;
      }
      const digit = (stamp + place * 3 + target + index) % 10;
      // 最高位不从 0 起跳，免得出现 "012" 这种看着像出错的数
      out += String(place === text.length - 1 && text.length > 1 ? (digit % 9) + 1 : digit);
    }
    return group(out);
  };

  const roll = (el: HTMLElement) => {
    const source = el.dataset.sceneText ?? el.textContent ?? "";
    const parts = source.split(/(\d+)/);
    const numbers = parts.map(part => (/^\d+$/.test(part) ? Number(part) : null));
    if (!numbers.some(value => value !== null)) return;
    const started = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - started) / ROLL_MS, 1);
      const stamp = Math.floor(now / 55);
      let text = "";
      for (let index = 0; index < parts.length; index += 1) {
        const target = numbers[index];
        text += target === null ? parts[index] : spin(target, progress, stamp);
      }
      el.textContent = text;
      // 抖动只有 ±0.35px，按 70ms 一档跳，不是每帧乱抖
      el.style.transform =
        progress >= 1 ? "" : `translate3d(0, ${Math.floor(now / 70) % 2 === 0 ? 0.35 : -0.3}px, 0)`;
      if (progress < 1) frame(step);
      else {
        el.textContent = source;
        el.style.transform = "";
      }
    };
    frame(step);
  };

  /* ------------------------------------------------------------------ *
   * 2. 逐行浮现：按 高度 ÷ 行高 把连续揭开切成 N 段
   * ------------------------------------------------------------------ */
  const prepareLines = (el: HTMLElement) => {
    const style = window.getComputedStyle(el);
    const fontSize = Number.parseFloat(style.fontSize) || 16;
    const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.7;
    const height = el.getBoundingClientRect().height || lineHeight;
    const lines = Math.min(12, Math.max(2, Math.round(height / lineHeight)));
    el.style.setProperty("--xn-lines", String(lines));
    el.style.setProperty("--xn-lines-dur", `${Math.min(1100, Math.max(420, lines * 105))}ms`);
  };

  /* ------------------------------------------------------------------ *
   * 3. 播放
   * ------------------------------------------------------------------ */
  const play = (el: HTMLElement) => {
    if (played.has(el)) return;
    played.add(el);
    armed.delete(el);
    const kind = el.dataset.sceneKind as SceneKind | undefined;
    if (kind === "lines") prepareLines(el);
    delete el.dataset.sceneArm;
    el.dataset.scenePlay = "1";
    if (kind === "count") roll(el);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        play(el);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
  );
  cleanups.push(() => observer.disconnect());

  /** 把还停在起始态的元素全部放出来（只用于 pagehide / 卸载这类整体收尾） */
  const release = () => {
    for (const el of Array.from(armed.keys())) play(el);
  };

  /* ------------------------------------------------------------------ *
   * 4. 标记与预处理
   * ------------------------------------------------------------------ */
  const markStagger = (items: ArrayLike<Element>) => {
    Array.from(items).forEach((item, index) => {
      (item as HTMLElement).style.setProperty("--xn-i", String(Math.min(index, STAGGER_CAP)));
    });
  };

  const measureShift = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    shiftItems.push({ el, top: rect.top + window.scrollY, height: rect.height });
  };

  const apply = (el: HTMLElement, kind: SceneKind) => {
    el.dataset.sceneKind = el.dataset.sceneKind || kind;
    if (kind === "stamp") markStagger(el.children);
    else if (kind === "rule") markStagger(el.querySelectorAll("tbody tr"));
    else if (kind === "shift") {
      if (shiftSeen.has(el)) return;
      shiftSeen.add(el);
      measureShift(el);
    } else if (kind === "count") {
      if (countSeen.has(el)) return;
      countSeen.add(el);
      // 记下真值：动效只是把这段文字从 0 滚上来，文本本身始终是真值
      el.dataset.sceneText = el.textContent ?? "";
    }
  };

  const prepare = () => {
    const seen = new Set<Element>();

    for (const [kind, selectors] of TARGETS) {
      for (const selector of selectors) {
        for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
          if (seen.has(el)) continue;
          seen.add(el);
          apply(el, kind);
        }
      }
    }

    // 作者显式标注：<p data-scene="lines">、<ul data-scene="stamp"> …
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"))) {
      if (seen.has(el)) continue;
      const kind = el.dataset.scene;
      if (!kind || !KINDS.has(kind)) continue;
      seen.add(el);
      apply(el, kind as SceneKind);
    }
  };

  /* ------------------------------------------------------------------ *
   * 5. 武装 / 扫描
   * ------------------------------------------------------------------ */
  const arm = (el: HTMLElement) => {
    if (played.has(el) || el.dataset.sceneArm === "1") return;
    const rect = el.getBoundingClientRect();
    // 已经在视野里：保持原样，不给它做入场（首屏和刚滚到的内容都不闪）
    if (rect.top < window.innerHeight * ARM_LINE) return;
    el.dataset.sceneArm = "1";
    armed.set(el, rect.top + window.scrollY);
    observer.observe(el);
  };

  const scan = () => {
    prepare();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-scene-kind]"))) {
      if (played.has(el)) continue;
      const kind = el.dataset.sceneKind as SceneKind;
      if (kind === "shift") continue;
      if (kind === "count") {
        // 数字不需要藏：它一直是真值，滚到就滚一下
        if (el.dataset.sceneWatch === "1") continue;
        el.dataset.sceneWatch = "1";
        observer.observe(el);
        continue;
      }
      arm(el);
    }
  };

  /* ------------------------------------------------------------------ *
   * 6. 滚动路径：一个 rAF，只写不读
   * ------------------------------------------------------------------ */
  let frameId = 0;
  let scrollDirty = false;
  let scanDirty = false;

  const paint = () => {
    frameId = 0;
    if (scanDirty) {
      scanDirty = false;
      scan();
    }
    if (!scrollDirty) return;
    scrollDirty = false;

    const y = window.scrollY;
    const viewport = window.innerHeight;

    // 兜底一：用武装时缓存的 top 判断"已经滚过去了"。快速跳转、锚点直达、
    // IO 因为 rootMargin 没命中的情况，都由这一条放行。
    if (armed.size) {
      const limit = y + viewport * 0.94;
      for (const [el, top] of Array.from(armed.entries())) {
        if (top < limit) play(el);
      }
    }

    // 章节标签的细微位移：只由滚动位置决定，往回滚自然倒放
    for (const item of shiftItems) {
      if (!item.el.isConnected) continue;
      const progress = (y + viewport - item.top) / (viewport + item.height);
      const clamped = Math.min(Math.max(progress, 0), 1);
      const value = Math.round((clamped - 0.5) * SHIFT_RANGE * 2 * 10) / 10;
      const next = `${value}px`;
      if (item.el.style.getPropertyValue("--xn-shift") === next) continue;
      item.el.style.setProperty("--xn-shift", next);
    }
  };

  const schedule = () => {
    if (!frameId) frameId = window.requestAnimationFrame(paint);
  };

  /**
   * 兜底二：巡检。只放行"已经该被看见"的元素——顶边已经越过视口底部，
   * 说明它此刻要么在画面里、要么已经被滚过去了，还停在起始态就是卡住了。
   * 不搞"到点全部放行"，否则整页往下滚就再也没有动效。
   */
  const sweep = () => {
    if (!armed.size) return;
    const limit = window.scrollY + window.innerHeight * 0.94;
    for (const [el, top] of Array.from(armed.entries())) {
      if (top < limit) play(el);
    }
    if (armed.size) later(sweep, SWEEP_MS);
  };

  /* ------------------------------------------------------------------ *
   * 7. 启动
   * ------------------------------------------------------------------ */
  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      const target = record.target;
      // 计数器自己在改文字，别把它当成"页面结构变了"
      if (target instanceof Element && target.closest('[data-scene-kind="count"]')) continue;
      scanDirty = true;
      break;
    }
    if (scanDirty) schedule();
  });
  mutations.observe(document.body, { subtree: true, childList: true });
  cleanups.push(() => mutations.disconnect());

  const onScroll = () => {
    scrollDirty = true;
    schedule();
  };
  const onResize = () => {
    shiftItems.length = 0;
    shiftSeen.clear();
    scanDirty = true;
    scrollDirty = true;
    schedule();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("pagehide", release);
  cleanups.push(() => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pagehide", release);
  });

  scan();
  scrollDirty = true;
  schedule();
  later(sweep, SWEEP_MS);

  return () => {
    for (const cleanup of cleanups) cleanup();
    if (frameId) window.cancelAnimationFrame(frameId);
    for (const id of frames) window.cancelAnimationFrame(id);
    frames.clear();
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
    // 计数器可能停在半路：文字恢复真值
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-scene-kind="count"]'))) {
      if (el.dataset.sceneText !== undefined) el.textContent = el.dataset.sceneText;
      el.style.transform = "";
    }
    for (const item of shiftItems) item.el.style.removeProperty("--xn-shift");
  };
}
