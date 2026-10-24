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
 * 为什么是"洗牌"而不是"在固定环上取偏移"：早先用 (seed + index*3) % 8 取动作，
 * 这个式子只取决于 seed % 8——哈希模 8 同余的路由（/match、/account、/setup 都落在 6）
 * 会拿到**完全相同**的动作序列，读者一眼就看出来是同一页。现在按路由的完整哈希做一次
 * 确定性 Fisher–Yates：还是同一副 8 张牌，但每页的发牌顺序不同，相邻两场仍不重复。
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

/** 拆场门限：整块高过 1.2 个视口才值得拆；低于它，整块演一次更像"一页纸" */
const SPLIT_RATIO = 1.2;
/** 补场模式下的拆块门限。只在"正常规则认出来的场少于 MIN_ACTS"时启用：
 *  /assessment 只有 页眉 + 一整块 985px 的页面，按 1.2 门限不会拆，页面上就只剩两场戏。
 *  后面两档是继续放松的兜底：CSS 一直有人在改，块高会变，只试一档会偶尔退回 2 场。 */
const STARVE_RATIO = 0.9;
const STARVE_STEPS = [STARVE_RATIO, 0.75, 0.6];
/** 每个内页至少要有几场戏（含页眉）。不够就说明这页结构不在候选表里，换宽规则。 */
const MIN_ACTS = 3;
/** 真正"一分为多"的层数上限：两层 = 大块 → 章节 → 小节。再往下就是表单的每一行了 */
const SPLIT_DEPTH = 2;
/** 穿透"只有一个孩子"的 wrapper 的层数上限。
 *  这类层**不消耗拆场预算**：正文常被 section > form > fieldset 这样的空壳层层包着，
 *  如果按层数记预算，两层之后就会把 3500px 的整块表单当成一场戏——这正是
 *  /profile/basics 此前只动一次的原因。 */
const UNWRAP_DEPTH = 6;
/** 一层里最多认几个子块当场。再多说明它是一排列表行，拆了会变成"每一行都在动" */
const MAX_KIDS = 10;
/** 子块最小高度：更矮的小块留给子层动效（scroll-scenes），不在这一层当"场" */
const MIN_PIECE = 140;
/** 迟到内容补扫的最长巡检次数（之后只保留已武装区块的滚动静默兜底） */
const SWEEP_TICKS = 8;

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

/**
 * 按路由把 8 种动作洗成一个顺序（确定性：同一页每次刷新一致）。
 * 用完整哈希做种子，而不是拿它去模 8 —— 模 8 只有 8 种相位，几条路由撞上同一个
 * 余数就拿到同一套序列（/match、/account、/setup 此前都撞在 6）。
 * 洗牌后按序取用：相邻下标一定不同；跨过 8 回绕时，order[7] 与 order[0] 也一定不同
 * （排列里没有重复元素），所以"相邻两场动作不同"对任意场次数量都成立。
 */
function orderFor(seedValue: number): Array<(typeof KINDS)[number]> {
  const order = [...KINDS];
  let state = (seedValue % 100000) + 1;
  const next = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    const temp = order[index];
    order[index] = order[swap];
    order[swap] = temp;
  }
  return order;
}

function install(): () => void {
  if (typeof window.IntersectionObserver !== "function") return () => {};

  const root = document.documentElement;
  const cleanups: Array<() => void> = [];
  const timers = new Set<number>();
  const frames = new Set<number>();

  /** 收尾。浮尘和场次两层共用：从任何一条路退出都不会漏清定时器 */
  const teardown = () => {
    for (const cleanup of cleanups) cleanup();
    for (const id of timers) window.clearTimeout(id);
    for (const id of frames) window.cancelAnimationFrame(id);
    timers.clear();
    frames.clear();
  };

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  /* 常驻浮尘：纸面上的纤维与尘点。所有页面都有，它不是场次动作。
     放在 effect 里 createElement 而不是 render 出来：它纯粹是客户端装饰，
     SSR 阶段产出任何随机位置都会和客户端首帧对不上（React #418）。 */
  cleanups.push(mountMotes());

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
  /** 已经发过牌的区块。用 Set 而不是 WeakSet：补场时要把"被换掉的旧场"摘出来重发 */
  const touched = new Set<Element>();

  /* ------------------------------------------------------------------ *
   * 1. 找"场"：main 里的顶层区块
   * ------------------------------------------------------------------ */

  /** 整块包住整页的大 wrapper（例如 /profile 的 .xp-sheet）只给一个动作就太单薄，
   *  按高度拆成它的子块，让一页里有好几场戏、几种不同动作。
   *
   *  两个预算分开记，是这里的核心：
   *    splits  —— 真正的"一分为多"，最多 SPLIT_DEPTH 层，免得拆到表单每一行都在动；
   *    unwrap  —— 连续"只有一个孩子"的空壳（section.xp-sheet → form → fieldset），
   *               只是把外层包皮剥掉，不算拆了一场，否则包皮一多预算就花光、
   *               里面 3500px 的真内容反而永远拆不开。
   *  另外要求子块占满父块 85% 以上才继续往下穿：留白和装饰本身也是这一块戏的一部分。 */
  const pieceChildren = (el: HTMLElement): HTMLElement[] =>
    Array.from(el.children).filter((node): node is HTMLElement => {
      if (!(node instanceof HTMLElement)) return false;
      if (/^(H1|H2|H3|H4|P|SPAN|A|IMG|UL|OL|LI|BUTTON|LEGEND)$/.test(node.tagName)) return false;
      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (style.position === "absolute" || style.position === "fixed") return false;
      return node.getBoundingClientRect().height >= MIN_PIECE;
    });

  const split = (el: HTMLElement, splits: number, unwrap: number, ratio: number): HTMLElement[] => {
    const height = el.getBoundingClientRect().height;
    if (height < window.innerHeight * ratio) return [el];
    if (splits >= SPLIT_DEPTH || unwrap > UNWRAP_DEPTH) return [el];

    const kids = pieceChildren(el);
    if (!kids.length) return [el];

    if (kids.length === 1) {
      const only = kids[0];
      if (only.getBoundingClientRect().height < height * 0.85) return [el];
      return split(only, splits, unwrap + 1, ratio);
    }
    if (kids.length > MAX_KIDS) return [el];
    return kids.flatMap((kid) => split(kid, splits + 1, 0, ratio));
  };

  /** 补场用的候选：结构不在 ACT_SELECTOR 里的页面（/assessment 的两张纸、
   *  /report/plan 的页脚），按 main 里的"块"兜一层。
   *  先剥掉只含一个块级孩子的空壳（.xr-file 这种），最多剥两层，
   *  免得把正文里的每个段落都当成一场戏。 */
  const starveBlocks = (): HTMLElement[] => {
    const main = document.querySelector<HTMLElement>("main");
    if (!main) return [];
    const blocks: HTMLElement[] = [];
    const visit = (el: HTMLElement, depth: number) => {
      if (depth > 2) return;
      const kids = Array.from(el.children).filter((node): node is HTMLElement => {
        if (!(node instanceof HTMLElement)) return false;
        if (
          /^(H1|H2|H3|H4|H5|H6|P|SPAN|A|IMG|UL|OL|LI|BUTTON|LEGEND|I|B|STRONG|EM|SMALL|LABEL|INPUT|SELECT|TEXTAREA|CANVAS|SVG|BR|HR)$/.test(
            node.tagName,
          )
        ) {
          return false;
        }
        const style = window.getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (style.position === "absolute" || style.position === "fixed") return false;
        return node.getBoundingClientRect().height >= MIN_PIECE;
      });
      if (kids.length === 1 && depth < 2) {
        visit(kids[0], depth + 1);
        return;
      }
      blocks.push(...kids);
    };
    visit(main, 0);
    return blocks;
  };

  interface CollectOptions {
    ratio: number;
    extra: boolean;
  }

  const collect = (options: CollectOptions): HTMLElement[] => {
    const candidates = new Set<HTMLElement>();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(ACT_SELECTOR))) {
      if (el.closest("main") !== null) candidates.add(el);
    }
    if (options.extra) {
      for (const el of starveBlocks()) candidates.add(el);
    }
    // 按文档顺序排：动作是按场次顺序发的，顺序错了页眉之外的错峰会看起来是随机的
    const all = Array.from(candidates).sort((a, b) => {
      if (a === b) return 0;
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
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
      for (const piece of split(el, 0, 0, options.ratio)) {
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
   *    每个路由拿一副自己洗过的牌（见 orderFor），按场次顺序发牌。
   * ------------------------------------------------------------------ */
  const order = orderFor(hashRoute(window.location.pathname));

  const assign = (el: HTMLElement, index: number, forceHero: boolean) => {
    const kind = forceHero ? "hero" : order[index % order.length];
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

  /* 取场规则分两档：
     正常档按 1.2 视口门限拆块、只认候选表；
     如果这页只认出不到 MIN_ACTS 场（页眉 + 一整块），说明结构不在候选表里，
     依次放松门限（0.9 → 0.75 → 0.6）并剥掉单块空壳重算，直到够 3 场。
     取到的那一档会记进 chosen，之后 scan() 用同一档，保证"迟到区块"和首屏同规则。
     重算发生在 assign 之前，不会出现"先给外块发了动作、再给它的子块发一次"。 */
  const normalOptions: CollectOptions = { ratio: SPLIT_RATIO, extra: false };
  const pickActs = (): { options: CollectOptions; acts: HTMLElement[] } => {
    let options = normalOptions;
    let found = collect(options);
    if (found.length >= MIN_ACTS) return { options, acts: found };
    for (const ratio of STARVE_STEPS) {
      const candidate: CollectOptions = { ratio, extra: true };
      const next = collect(candidate);
      if (next.length > found.length) {
        options = candidate;
        found = next;
      }
      if (found.length >= MIN_ACTS) break;
    }
    return { options, acts: found };
  };

  let chosen = normalOptions;
  let acts: HTMLElement[] = [];
  {
    const picked = pickActs();
    chosen = picked.options;
    acts = picked.acts;
  }
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

  /** 一次性换一批场次：先摘掉不再属于这批的旧场，再给新出现的区块发牌。
   *
   *  为什么需要“换”而不是只“补”：首帧取场时版面往往还没排定（/assessment 的正文块
   *  从 475px 长到 985px 才定稿）。那会儿既拆不开块，补场候选又都落在“祖先已命中
   *  ACT_SELECTOR”的过滤里，只能先认出 2 场；等版面定了，父块已经带着 data-act，
   *  scan 的“父链上已有场次”规则又会把它的子块全部挡掉——于是这页永远停在 2 场。
   *  所以先摘掉旧的父块，再按新规则把它的子块发上牌，缺的那一场才补得回来。 */
  const apply = (next: HTMLElement[], options: CollectOptions) => {
    const keep = new Set(next);
    for (const el of Array.from(acts)) {
      if (keep.has(el)) continue;
      delete el.dataset.act;
      delete el.dataset.actKind;
      delete el.dataset.actState;
      el.style.removeProperty("--xn-act-delay");
      el.style.removeProperty("--xn-hero-i");
      played.delete(el);
      armed.delete(el);
      touched.delete(el);
      observer.unobserve(el);
    }
    const already = new Set(acts.filter((el) => keep.has(el)));
    chosen = options;
    acts = next;
    next.forEach((el, index) => {
      // 已经在演的场只换个下标（保持已播状态），不重新发牌，否则动作会重头播一遍
      if (already.has(el)) return;
      assign(el, index, index === 0);
    });
    next
      .filter((el) => !already.has(el))
      .filter((el) => el.getBoundingClientRect().top < window.innerHeight * ARM_LINE)
      .slice(0, 6)
      .forEach((el, index) => play(el, 60 + index * 80));
    for (const el of next) {
      if (played.has(el)) continue;
      arm(el);
    }
  };

  /** 场次不够就换更宽的规则重取；只有真能多认出几场才换，避免无谓重建 */
  const upgrade = () => {
    const alive = acts.filter((el) => el.isConnected).length;
    if (alive >= MIN_ACTS) return;
    const picked = pickActs();
    if (picked.acts.filter((el) => el.isConnected).length <= alive) return;
    apply(picked.acts, picked.options);
  };

  if (acts.length < MIN_ACTS) {
    // 首帧版面未定先补两次；再往后交给巡检（scan 里同样会走 upgrade）
    later(upgrade, 320);
    later(upgrade, 900);
  }

  /* ------------------------------------------------------------------ *
   * 5. 迟到的区块（异步读数据、点开工作台、报告出结果后才渲染出来的）
   *
   *    为什么不能只靠 MutationObserver：observer 只报"有 childList 变化"，而
   *    React 提交新内容时会一次性带上很多条记录。此前遇到第一条落在已有场次
   *    内部的记录就 break，同批里真正新增的区块就被当成"场次内部变化"跳过了。
   *    现在：批量记录逐条看，只要有一条不在场次内就排一次扫描；同时巡检也会
   *    补扫前若干轮，双保险。
   * ------------------------------------------------------------------ */
  let scanQueued = false;
  const scan = () => {
    scanQueued = false;
    // 页面的动态内容可能是"整块换掉"而不是"追加"（/report/plan 先渲染骨架、
    // 拿到数据后替换）。被换掉的旧场不会复活，活着的场掉到 MIN_ACTS 以下时
    // 就换成补场档重新取一次，把新内容接回来——否则这页会静悄悄退回 2 场。
    upgrade();
    // 已经认过的场、以及落在某个场内部的小块都不再认：场里面的内容交给 scroll-scenes，
    // 否则同一块内容会被两层动效各推一次。
    const fresh = collect(chosen).filter(
      (el) => !touched.has(el) && !el.parentElement?.closest("[data-act]"),
    );
    if (!fresh.length) return;
    const base = acts.length;
    fresh.forEach((el, index) => assign(el, base + index, false));
    acts.push(...fresh);
    // 迟到场次有两种运气：还在画面下方的照常武装、等滚动；已经落在画面里
    // （/match 点开工作台、报告出结果、切表单步骤）的没有"入场时机"可等，
    // 直接补一段错峰入场——否则它会带着 data-act 停在"无状态"，既没动作又不入兜底。
    fresh
      .filter((el) => el.getBoundingClientRect().top < window.innerHeight * ARM_LINE)
      .slice(0, 6)
      .forEach((el, index) => play(el, 60 + index * 80));
    for (const el of fresh) arm(el);
  };
  const mutations = new MutationObserver((records) => {
    if (scanQueued) return;
    for (const record of records) {
      // 场次内部的内容变化不算新场，继续看同批后面的记录
      if (record.target instanceof Element && record.target.closest("[data-act]")) continue;
      scanQueued = true;
      later(scan, 90);
      return;
    }
  });
  mutations.observe(document.body, { subtree: true, childList: true });
  cleanups.push(() => mutations.disconnect());

  /* ------------------------------------------------------------------ *
   * 6. 滚动兜底 + 巡检
   *    滚动兜底走武装时缓存的文档顶边（scroll 回调里不读布局，只有几个数字比较）；
   *    巡检用实时几何，兼作"缓存过期"（图片晚到把内容顶下去）和"迟到的区块没被
   *    observer 报到"的两用兜底。前 SWEEP_TICKS 轮顺手补扫 DOM，之后只兜武装项，
   *    免得整页寿命里一直 querySelectorAll。
   * ------------------------------------------------------------------ */
  const checkArmed = () => {
    if (!armed.size) return;
    const limit = window.scrollY + window.innerHeight;
    for (const [el, top] of Array.from(armed.entries())) {
      if (top < limit) play(el);
    }
  };
  const sweepArmed = () => {
    if (!armed.size) return;
    for (const el of Array.from(armed.keys())) {
      if (!el.isConnected) {
        armed.delete(el);
        continue;
      }
      if (el.getBoundingClientRect().top < window.innerHeight) play(el);
    }
  };
  let ticks = 0;
  const sweep = () => {
    checkArmed();
    sweepArmed();
    if (ticks < SWEEP_TICKS) {
      ticks += 1;
      scan();
      later(sweep, SWEEP_MS);
      return;
    }
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
   * 7. 收尾
   * ------------------------------------------------------------------ */
  return () => {
    teardown();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-act]"))) {
      delete el.dataset.act;
      delete el.dataset.actKind;
      delete el.dataset.actState;
      el.style.removeProperty("--xn-act-delay");
      el.style.removeProperty("--xn-hero-i");
    }
  };
}

/**
 * 常驻浮动：纸面上一直在飘的纤维与尘点。返回清理函数。
 * 只在 effect 里创建 DOM，不参与首帧渲染：位置来自伪随机数，服务端不可能和客户端
 * 算出同一组值，渲染进 JSX 就会水合不匹配（React #418）。
 * 减少动态效果 / 打印时由 theatre.css 隐藏。
 */
function mountMotes(): () => void {
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
  return () => ambient.remove();
}
