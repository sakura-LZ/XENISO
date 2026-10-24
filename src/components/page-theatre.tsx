"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * XENISO · 翻页剧场控制器（唯一）
 * ---------------------------------------------------------------------------
 * 样式全在 theatre.css，这一层只决定"每一页的每一场戏用哪种动作、什么时候演"。
 *
 * 和已有两套动效的分工（互不重叠）：
 *   xeniso-motion     [data-reveal] / [data-atlas-reveal] 的整块淡入（保留不动）
 *   scroll-scenes     标题以下的细节：画表格线、盖章、滚数字、铅笔波浪线
 *   page-theatre  ←   顶层区块的"场次动作"（掀角/展卷/上推/浮起/晕开/侧推/发牌/翻面），
 *                     以及整页翻页进来时的页眉错峰
 *
 * 为什么按路由分配动作：用户要的是"各个内页都有、而且不止一种"。如果所有页面
 * 用同一套顺序，翻到第二页就腻了。所以用 pathname 做种子，让每页的动作序列不同，
 * 但顺序里保证相邻两场不重复。
 *
 * 内容永远不会因为这一层而消失：
 *   1. 起始态只写在 html[data-xn-theatre="1"] 下，JS 没接管 = 没有起始态；
 *   2. 只武装"顶边在视口下方"的区块，已经在画面里的区块一律不碰；
 *   3. IntersectionObserver + 滚动位置兜底 + 定时巡检，三路放行；
 *   4. 抛错 → html[data-xn-theatre="panic"]，CSS 强制全部到位；
 *   5. 减少动态效果 / 打印 → 整层不安装 / 全部到位。
 */

const REDUCE = "(prefers-reduced-motion: reduce)";

/** 顶层区块的候选：各页结构不同，用并集认，再去掉被别的候选包住的内层 */
const ACT_SELECTOR = [
  "main header",
  "main > section",
  "main section",
  "main .atlas-sheet",
  "main .xp-sec",
  "main .xp-entry",
  "main .xnlib-chapter",
  "main .xnlib-howto",
  "main .xd-main",
  "main .xd-task",
  "main .community-slip",
  "main .community-rail-card",
  "main .xr-sec",
  "main .account-section",
  "main .match-input",
  "main .match-results",
].join(", ");

const KINDS = ["peel", "unfold", "wipe", "rise", "bloom", "slide", "stack", "flip"] as const;

/** 顶边低于视口这个比例才算"还没滚到"，否则一律保持可见、不做入场 */
const ARM_LINE = 0.92;
/** 场次动作的落定时间：之后清掉 clip-path，避免给内部 fixed 元素造出包含块。
    必须大于「最长过渡 840ms + 最大延迟 220ms」，否则会在过渡中途把遮罩掐掉。 */
const SETTLE_MS = 1150;
/** 巡检间隔：只捞"该出现却还停在起始态"的区块 */
const SWEEP_MS = 1200;
/** 首次加载窗口：这段时间内的挂载算"首屏"而非"翻页"，页眉不做透明起步 */
const FIRST_LOAD_WINDOW = 900;
/** 一个页面最多接多少场戏，避免超长列表把观察器塞满 */
const ACT_CAP = 48;

/* 模块级：整篇文档只记一次，整页刷新会归零 */
let bootAt = 0;

export function PageTheatre() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia(REDUCE);
    let stop: (() => void) | null = null;

    const boot = () => {
      stop?.();
      stop = null;
      if (reduce.matches) return;
      try {
        stop = install();
      } catch {
        // 装不上就明说：CSS 会把一切强制到位
        document.documentElement.dataset.xnTheatre = "panic";
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

function hashRoute(pathname: string): number {
  let hash = 0;
  for (let index = 0; index < pathname.length; index += 1) {
    hash = (hash * 31 + pathname.charCodeAt(index)) % 100000;
  }
  return hash;
}

function install(): () => void {
  if (typeof window.IntersectionObserver !== "function") return () => {};

  const root = document.documentElement;
  const cleanups: Array<() => void> = [];
  const timers = new Set<number>();
  const frames = new Set<number>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        play(el);
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.04 },
  );
  cleanups.push(() => observer.disconnect());

  /** 已武装的区块 → 武装时缓存的文档顶边（滚动兜底用，不读布局） */
  const armed = new Map<HTMLElement, number>();
  const played = new WeakSet<Element>();
  const touched = new WeakSet<Element>();

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  /* ------------------------------------------------------------------ *
   * 0. 幂等：StrictMode 会挂载两次，先清掉上一轮留下的状态
   * ------------------------------------------------------------------ */
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-act]"))) {
    delete el.dataset.act;
    delete el.dataset.actKind;
    delete el.dataset.actState;
    el.style.removeProperty("--xn-act-delay");
    el.style.removeProperty("--xn-hero-i");
  }

  const previousEnter = root.dataset.xnTheatre;
  root.dataset.xnTheatre = "1";
  cleanups.push(() => {
    if (previousEnter) root.dataset.xnTheatre = previousEnter;
    else delete root.dataset.xnTheatre;
  });

  /* ------------------------------------------------------------------ *
   * 1. 找"场"：main 里的顶层区块
   * ------------------------------------------------------------------ */

  /** 整块包住整页的大 wrapper（例如 /profile 的 .xp-sheet）只给一个动作就太单薄，
   *  按高度拆成它的子块，让一页里有好几场戏、几种不同动作。
   *  只拆两层、要求子块够高、并且子块数量合理，免得拆到表单每一行都在动。 */
  const split = (el: HTMLElement, depth: number): HTMLElement[] => {
    if (depth >= 2) return [el];
    if (el.getBoundingClientRect().height < window.innerHeight * 1.2) return [el];
    const kids = Array.from(el.children).filter((node): node is HTMLElement => {
      if (!(node instanceof HTMLElement)) return false;
      if (/^(H1|H2|H3|H4|P|SPAN|A|IMG|UL|OL|LI|BUTTON)$/.test(node.tagName)) return false;
      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (style.position === "absolute" || style.position === "fixed") return false;
      return node.getBoundingClientRect().height >= 140;
    });
    if (kids.length === 1) return split(kids[0], depth + 1);
    if (kids.length < 2 || kids.length > 8) return [el];
    return kids.flatMap((kid) => split(kid, depth + 1));
  };

  const collect = (): HTMLElement[] => {
    const all = Array.from(document.querySelectorAll<HTMLElement>(ACT_SELECTOR)).filter(
      (el) => el.closest("main") !== null,
    );
    const visited = new Set<HTMLElement>();
    const acts: HTMLElement[] = [];
    for (const el of all) {
      if (visited.has(el)) continue;
      visited.add(el);
      // 被另一个候选包住的内层不是"一场戏"，交给子层动效
      if (el.parentElement?.closest(ACT_SELECTOR)) continue;
      if (el.closest("details:not([open])")) continue;
      if (el.hasAttribute("data-act-skip")) continue;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.position === "fixed" || style.position === "sticky") continue;
      const rect = el.getBoundingClientRect();
      if (rect.height < 56) continue;
      for (const piece of split(el, 0)) {
        if (visited.has(piece) && piece !== el) continue;
        visited.add(piece);
        acts.push(piece);
        if (acts.length >= ACT_CAP) break;
      }
      if (acts.length >= ACT_CAP) break;
    }
    return acts;
  };

  /* ------------------------------------------------------------------ *
   * 2. 分配动作
   * ------------------------------------------------------------------ */
  const seed = hashRoute(window.location.pathname);

  const assign = (el: HTMLElement, index: number, forceHero: boolean) => {
    const kind = forceHero ? "hero" : KINDS[(seed + index * 3) % KINDS.length];
    el.dataset.act = "1";
    el.dataset.actKind = kind;
    if (kind === "hero") {
      Array.from(el.children).forEach((child, childIndex) => {
        if (child instanceof HTMLElement) child.style.setProperty("--xn-hero-i", String(Math.min(childIndex, 8)));
      });
    }
    touched.add(el);
  };

  /* ------------------------------------------------------------------ *
   * 3. 播放
   * ------------------------------------------------------------------ */
  const settle = (el: HTMLElement) => {
    later(() => {
      if (!el.isConnected) return;
      el.dataset.actState = "done";
    }, SETTLE_MS);
  };

  const play = (el: HTMLElement, delay = 0) => {
    if (played.has(el)) return;
    played.add(el);
    armed.delete(el);
    if (delay) el.style.setProperty("--xn-act-delay", `${delay}ms`);
    el.dataset.actState = "arm";
    // 强制一次同步布局：先让浏览器认下起始态，再切到位态，transition 才会跑；
    // 否则同一帧内的两次属性写入会被合并，动作直接跳到终点。
    void el.offsetHeight;
    el.dataset.actState = "play";
    settle(el);
  };

  const arm = (el: HTMLElement) => {
    if (played.has(el) || el.dataset.actState !== undefined) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * ARM_LINE) return;
    el.dataset.actState = "arm";
    armed.set(el, rect.top + window.scrollY);
    observer.observe(el);
  };

  /* ------------------------------------------------------------------ *
   * 4. 首次加载 vs 站内翻页
   *    首屏：页眉不做透明起步（LCP），其余"已经在视口里"的区块也照常入场，
   *          但要晚一点起手——否则读者第一眼看到的是一组正在播的动作。
   *          这正是此前"下面的新部分出现没有效果"的根因：落在首屏里的区块
   *          被当成"已经在画面里"直接放过，永远没有入场。
   *    翻页：页眉与紧随其后的几场按 60ms 一档错峰，像新页被一叠叠摆上来。
   * ------------------------------------------------------------------ */
  const now = performance.now();
  if (!bootAt) bootAt = now;
  const isNav = now - bootAt > FIRST_LOAD_WINDOW;

  const acts = collect();
  acts.forEach((el, index) => assign(el, index, index === 0));

  const inFirstScreen = acts.filter(
    (el) => el.getBoundingClientRect().top < window.innerHeight * ARM_LINE,
  );

  if (isNav) {
    inFirstScreen.slice(0, 6).forEach((el, index) => play(el, 60 + index * 80));
  } else {
    // 首屏：页眉直接落定，不走透明起步；其下已经在画面里的区块补上入场
    if (acts[0]) {
      played.add(acts[0]);
      acts[0].dataset.actState = "done";
    }
    inFirstScreen
      .filter((el) => el !== acts[0])
      .slice(0, 5)
      .forEach((el, index) => play(el, 160 + index * 90));
  }

  for (const el of acts) {
    if (played.has(el)) continue;
    arm(el);
  }

  /* ------------------------------------------------------------------ *
   * 5. 迟到的区块（异步读数据后才渲染出来的）
   * ------------------------------------------------------------------ */
  let scanQueued = false;
  const scan = () => {
    scanQueued = false;
    const fresh = collect().filter((el) => !touched.has(el));
    if (!fresh.length) return;
    const base = acts.length;
    fresh.forEach((el, index) => {
      assign(el, base + index, false);
      arm(el);
    });
  };
  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      if (record.target instanceof Element && record.target.closest("[data-act]")) {
        // 场次内部的内容变化不算新场，交给 scroll-scenes
        continue;
      }
      if (!scanQueued) {
        scanQueued = true;
        later(scan, 90);
      }
      break;
    }
  });
  mutations.observe(document.body, { subtree: true, childList: true });
  cleanups.push(() => mutations.disconnect());

  /* ------------------------------------------------------------------ *
   * 6. 滚动兜底 + 巡检
   * ------------------------------------------------------------------ */
  const checkArmed = () => {
    if (!armed.size) return;
    const limit = window.scrollY + window.innerHeight;
    for (const [el, top] of Array.from(armed.entries())) {
      if (top < limit) play(el);
    }
  };
  const sweep = () => {
    checkArmed();
    if (armed.size) later(sweep, SWEEP_MS);
  };

  const onScroll = () => checkArmed();
  window.addEventListener("scroll", onScroll, { passive: true });
  cleanups.push(() => window.removeEventListener("scroll", onScroll));

  window.addEventListener("pagehide", checkArmed);
  cleanups.push(() => window.removeEventListener("pagehide", checkArmed));

  later(checkArmed, 620);
  later(sweep, SWEEP_MS);

  /* ------------------------------------------------------------------ *
   * 7. 常驻浮动：纸面上一直在飘的纤维与尘点
   * ------------------------------------------------------------------ */
  const ambient = document.createElement("div");
  ambient.className = "xn-ambient";
  ambient.setAttribute("aria-hidden", "true");
  // 固定种子的伪随机：每次刷新位置一致，不会让页面看起来在"重排"
  let seedValue = 20261023;
  const rand = () => {
    seedValue = (seedValue * 1103515245 + 12345) % 2147483648;
    return seedValue / 2147483648;
  };
  for (let index = 0; index < 16; index += 1) {
    const mote = document.createElement("i");
    const fiber = index % 3 === 0;
    if (fiber) {
      mote.dataset.fiber = "1";
      mote.style.setProperty("--len", `${10 + Math.round(rand() * 12)}px`);
      mote.style.setProperty("--tilt", `${Math.round(rand() * 90 - 45)}deg`);
    }
    mote.style.left = `${(rand() * 100).toFixed(2)}%`;
    mote.style.top = `${(78 + rand() * 26).toFixed(2)}%`;
    mote.style.setProperty("--dur", `${(26 + rand() * 22).toFixed(1)}s`);
    mote.style.setProperty("--delay", `${(-rand() * 40).toFixed(1)}s`);
    ambient.appendChild(mote);
  }
  document.body.appendChild(ambient);
  cleanups.push(() => ambient.remove());

  /* ------------------------------------------------------------------ *
   * 8. 收尾
   * ------------------------------------------------------------------ */
  return () => {
    for (const cleanup of cleanups) cleanup();
    for (const id of timers) window.clearTimeout(id);
    for (const id of frames) window.cancelAnimationFrame(id);
    timers.clear();
    frames.clear();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-act]"))) {
      delete el.dataset.act;
      delete el.dataset.actKind;
      delete el.dataset.actState;
      el.style.removeProperty("--xn-act-delay");
      el.style.removeProperty("--xn-hero-i");
    }
  };
}
