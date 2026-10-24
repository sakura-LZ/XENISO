"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * XENISO · 微交互控制器（唯一）
 * ---------------------------------------------------------------------------
 * 只做「反馈」与「理解」，不做装饰性循环。样式全部在 micro.css，这里只负责：
 *
 *   1  墨滴点击反馈        委托 pointerdown → 复用 4 个墨滴槽位
 *   2  荧光笔划线          .t-section 进视口后打 data-xn-mark
 *   3  铅字逐字浮现        拆字（只拆视口下方、纯文本的 h1/h2）
 *   4  纸张跟随鼠标倾斜     指针在 .atlas-hero-sheet 上 → 写 ±2.5deg 变量
 *   5  磁吸按钮            光标进 24px 感应区 → translate ≤6px
 *   6  装订线进度          滚动进度 → 孔位逐个点亮 + 穿线
 *   7  抽卡                悬停 .scene-card → 1.2% 放大 + ±1.8deg 随手摆动
 *   8  数字滚动            .scene-stamp 里的统计数随落章从 0 滚到目标值
 *   9  笔形光标            CSS cursor（micro.css）；点到哪里墨点落在哪里
 *  10  盖章落下            首屏统计章砸落 + 尘点 + 纸面 0.5px 抖动（CSS 驱动）
 *  11  段落压痕            区块交界接近视口中线时出现一道压痕
 *  12  路由墨迹转场        在 template.tsx 里
 *
 * 性能约定：
 *  - 只用一个 IntersectionObserver 管所有进视口目标，触发后立刻 unobserve。
 *  - 滚动与指针各记一个 dirty 位，合并到同一个 rAF；滚动回调里不读布局，
 *    要用的位置在 measure()（初始化 / resize / ResizeObserver）里提前量好。
 *  - 写入一律走 transform / translate / opacity / CSS 变量，不触发重排。
 *  - 全部效果在 prefers-reduced-motion: reduce 下不安装（不是逐条漏），
 *    运行中切换该偏好会整体重装。
 */

const HOVER_FINE = "(hover: hover) and (pointer: fine)";
const REDUCE = "(prefers-reduced-motion: reduce)";

/* 与 micro.css 里的 animation-delay 对齐：落章前的停顿、数字滚动的时长 */
const STAMP_DELAY = 720;
const ROLL_MS = 680;

const INK_DROPS = 4;
const MAGNET_ZONE = 24;
const MAGNET_PULL = 6;
const TILT_MAX = 2.5;
const PULL_ROT = 1.8;
const CREASE_WINDOW = 0.3;

const easeOutExpo = (value: number) => (value >= 1 ? 1 : 1 - Math.pow(2, -10 * value));
const clamp = (value: number, min = -1, max = 1) => Math.min(Math.max(value, min), max);

type Counter = { node: HTMLElement; value: number };

export function MicroInteractions() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia(REDUCE);
    const fine = window.matchMedia(HOVER_FINE);
    let stop: (() => void) | null = null;

    const boot = () => {
      stop?.();
      stop = reduce.matches || pathname === "/" ? null : install();
    };
    const restart = () => boot();

    reduce.addEventListener("change", restart);
    fine.addEventListener("change", restart);
    boot();

    return () => {
      reduce.removeEventListener("change", restart);
      fine.removeEventListener("change", restart);
      stop?.();
    };
  }, [pathname]);

  return null;
}

function install(): () => void {
  const cleanups: Array<() => void> = [];
  const timers = new Set<number>();
  const frames = new Set<number>();
  const root = document.documentElement;
  const finePointer = window.matchMedia(HOVER_FINE).matches;

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  const listen = (
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };

  root.dataset.xnMicro = "1";
  cleanups.push(() => {
    delete root.dataset.xnMicro;
  });

  /* ------------------------------------------------------------------ *
   * 0. 一个 rAF：滚动 / 指针各一个 dirty 位
   * ------------------------------------------------------------------ */
  let frame = 0;
  let scrollDirty = false;
  let pointerDirty = false;
  let pointerX = 0;
  let pointerY = 0;

  const flush = () => {
    frame = 0;
    if (scrollDirty) {
      scrollDirty = false;
      paintScroll();
    }
    if (pointerDirty) {
      pointerDirty = false;
      paintPointer();
    }
  };
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(flush);
  };
  cleanups.push(() => {
    if (frame) window.cancelAnimationFrame(frame);
    for (const id of frames) window.cancelAnimationFrame(id);
    frames.clear();
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
  });

  /* ------------------------------------------------------------------ *
   * 1. 墨滴点击反馈（槽位复用，不每次新建节点）
   * ------------------------------------------------------------------ */
  const inkLayer = document.createElement("div");
  inkLayer.className = "xn-fx-layer";
  inkLayer.setAttribute("aria-hidden", "true");
  const inkDrops: HTMLElement[] = [];
  for (let index = 0; index < INK_DROPS; index += 1) {
    const drop = document.createElement("span");
    drop.className = "xn-ink-drop";
    inkLayer.appendChild(drop);
    inkDrops.push(drop);
  }
  document.body.appendChild(inkLayer);
  cleanups.push(() => inkLayer.remove());

  let inkIndex = 0;
  listen(
    document,
    "pointerdown",
    (raw) => {
      const event = raw as PointerEvent;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (!(event.target instanceof Element)) return;
      const host = event.target.closest<HTMLElement>(".atlas-btn, a.scene-card, a.atlas-step, .fd-tab");
      if (!host) return;
      const drop = inkDrops[inkIndex];
      inkIndex = (inkIndex + 1) % inkDrops.length;
      if (!drop) return;
      // 深色主按钮上用纸色墨，浅色纸面上用墨色
      drop.dataset.tone = host.classList.contains("atlas-btn-primary") ? "paper" : "ink";
      drop.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      // is-a / is-b 交替赋名即可重放动画，不需要读布局强制重排
      const next = drop.classList.contains("is-a") ? "is-b" : "is-a";
      drop.classList.remove(next === "is-a" ? "is-b" : "is-a");
      drop.classList.add(next);
    },
    { passive: true },
  );

  /* ------------------------------------------------------------------ *
   * 6. 装订线进度
   * ------------------------------------------------------------------ */
  const bindingDots: HTMLElement[] = [];
  let bindingFill: HTMLElement | null = null;
  let bindingLit = -1;
  const binding = document.createElement("div");
  binding.className = "xn-binding";
  binding.setAttribute("aria-hidden", "true");

  /* ------------------------------------------------------------------ *
   * 测量：只在初始化 / resize / 尺寸变化时读布局
   * ------------------------------------------------------------------ */
  let bandEls: HTMLElement[] = [];
  let bandTops: number[] = [];
  let maxScroll = 1;
  let primaryButtons: HTMLElement[] = [];
  const primaryRects = new Map<HTMLElement, DOMRect>();

  const measure = () => {
    maxScroll = Math.max(root.scrollHeight - window.innerHeight, 1);
    bandEls = Array.from(document.querySelectorAll<HTMLElement>(".atlas-band"));
    bandTops = bandEls.map((el) => el.getBoundingClientRect().top + window.scrollY);
    primaryButtons = Array.from(document.querySelectorAll<HTMLElement>(".atlas-btn-primary")).filter(el => !el.closest(".home-clarity"));
    primaryRects.clear();
    for (const el of primaryButtons) {
      // 常驻标记：micro.css 只对带标记的主按钮启用 translate 过渡，
      // 这样 hover 吸附与离开回弹用的是同一套 transition，不用内联样式去抢。
      el.dataset.xnMagnetic = "1";
      primaryRects.set(el, el.getBoundingClientRect());
    }
  };
  cleanups.push(() => {
    for (const el of primaryButtons) delete el.dataset.xnMagnetic;
  });

  const buildBinding = () => {
    // 窄屏没有装订线的位置（内容区从 48px 起），干脆不建节点
    if (!root.ownerDocument.defaultView?.matchMedia("(min-width: 1200px)").matches) return;
    const sections = document.querySelectorAll("main section");
    if (sections.length < 3 || root.scrollHeight < window.innerHeight * 1.25) return;
    const count = Math.min(sections.length, 8);
    const track = document.createElement("span");
    track.className = "xn-binding-track";
    bindingFill = document.createElement("span");
    bindingFill.className = "xn-binding-fill";
    binding.append(track, bindingFill);
    for (let index = 0; index < count; index += 1) {
      const dot = document.createElement("i");
      dot.className = "xn-binding-dot";
      dot.dataset.on = "0";
      binding.appendChild(dot);
      bindingDots.push(dot);
    }
    document.body.appendChild(binding);
    cleanups.push(() => binding.remove());
  };

  /* ------------------------------------------------------------------ *
   * 11. 段落压痕 + 6. 装订线：滚动路径（只读 scrollY，位置用缓存）
   * ------------------------------------------------------------------ */
  let creaseIndex = -1;

  function paintScroll() {
    const y = window.scrollY;
    const viewport = window.innerHeight;

    if (bindingDots.length) {
      const progress = Math.min(Math.max(y / maxScroll, 0), 1);
      const lit = Math.round(progress * (bindingDots.length - 1));
      if (lit !== bindingLit) {
        bindingLit = lit;
        bindingDots.forEach((dot, index) => {
          dot.dataset.on = index <= lit ? "1" : "0";
        });
      }
      if (bindingFill) bindingFill.style.transform = `scaleY(${progress.toFixed(3)})`;
    }

    if (!bandTops.length) return;
    const center = y + viewport * 0.5;
    let nearest = -1;
    let best = Number.POSITIVE_INFINITY;
    for (let index = 0; index < bandTops.length; index += 1) {
      const distance = Math.abs(bandTops[index] - center);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    }
    const next = best < viewport * CREASE_WINDOW ? nearest : -1;
    if (next === creaseIndex) return;
    if (creaseIndex >= 0) {
      const previous = bandEls[creaseIndex];
      if (previous) delete previous.dataset.xnCrease;
    }
    creaseIndex = next;
    if (next >= 0) {
      const current = bandEls[next];
      if (current) current.dataset.xnCrease = "1";
    }
  }

  /* ------------------------------------------------------------------ *
   * 4 / 5 / 7 / 9：指针路径
   * ------------------------------------------------------------------ */
  let tiltSheet: HTMLElement | null = null;
  let tiltRect: DOMRect | null = null;
  let tiltX = 0;
  let tiltY = 0;

  let pullCard: HTMLElement | null = null;
  let pullRect: DOMRect | null = null;
  let pullRotation = 0;

  const resetMagnet = (button: HTMLElement) => {
    if (button.dataset.xnMag !== "1") return;
    button.dataset.xnMag = "0";
    button.style.setProperty("--xn-mx", "0px");
    button.style.setProperty("--xn-my", "0px");
  };

  const paintMagnet = (x: number, y: number) => {
    for (const button of primaryButtons) {
      let rect = primaryRects.get(button);
      if (!rect) continue;
      const near =
        x > rect.left - 140 && x < rect.right + 140 && y > rect.top - 140 && y < rect.bottom + 140;
      if (near) {
        // 只有光标靠近时才读一次真实位置：滚动/视差会让缓存过期，但滚动路径本身不读布局
        rect = button.getBoundingClientRect();
        primaryRects.set(button, rect);
      }
      const dx = x - (rect.left + rect.width / 2);
      const dy = y - (rect.top + rect.height / 2);
      const outside = Math.hypot(
        Math.max(Math.abs(dx) - rect.width / 2, 0),
        Math.max(Math.abs(dy) - rect.height / 2, 0),
      );
      if (outside > MAGNET_ZONE) {
        resetMagnet(button);
        continue;
      }
      const length = Math.hypot(dx, dy) || 1;
      const pull = (1 - outside / MAGNET_ZONE) * MAGNET_PULL;
      button.dataset.xnMag = "1";
      button.style.setProperty("--xn-mx", `${((dx / length) * pull).toFixed(2)}px`);
      button.style.setProperty("--xn-my", `${((dy / length) * pull).toFixed(2)}px`);
    }
  };

  function paintPointer() {
    const x = pointerX;
    const y = pointerY;

    if (tiltSheet && tiltRect) {
      const nx = clamp(((x - tiltRect.left) / Math.max(tiltRect.width, 1)) * 2 - 1);
      const ny = clamp(((y - tiltRect.top) / Math.max(tiltRect.height, 1)) * 2 - 1);
      const nextX = Number((-ny * TILT_MAX).toFixed(2));
      const nextY = Number((nx * TILT_MAX).toFixed(2));
      if (nextX !== tiltX) {
        tiltX = nextX;
        tiltSheet.style.setProperty("--xn-tilt-x", `${nextX}deg`);
      }
      if (nextY !== tiltY) {
        tiltY = nextY;
        tiltSheet.style.setProperty("--xn-tilt-y", `${nextY}deg`);
      }
    }

    if (pullCard && pullRect) {
      const nx = clamp(((x - pullRect.left) / Math.max(pullRect.width, 1)) * 2 - 1);
      const next = Number((nx * PULL_ROT).toFixed(2));
      if (next !== pullRotation) {
        pullRotation = next;
        pullCard.style.setProperty("--xn-c-rot", `${next}deg`);
      }
    }

    if (primaryButtons.length) paintMagnet(x, y);
  }

  const endTilt = () => {
    if (!tiltSheet) return;
    const sheet = tiltSheet;
    tiltSheet = null;
    tiltRect = null;
    tiltX = 0;
    tiltY = 0;
    sheet.style.setProperty("--xn-tilt-x", "0deg");
    sheet.style.setProperty("--xn-tilt-y", "0deg");
    delete sheet.dataset.xnTilting;
  };

  const endPull = () => {
    if (!pullCard) return;
    const card = pullCard;
    pullCard = null;
    pullRect = null;
    pullRotation = 0;
    card.style.setProperty("--xn-c-rot", "0deg");
    delete card.dataset.xnPulled;
  };

  if (finePointer) {
    listen(
      document,
      "pointermove",
      (raw) => {
        const event = raw as PointerEvent;
        pointerX = event.clientX;
        pointerY = event.clientY;
        pointerDirty = true;
        schedule();
      },
      { passive: true },
    );
    listen(
      document,
      "pointerover",
      (raw) => {
        const event = raw as PointerEvent;
        if (!(event.target instanceof Element)) return;
        if (!tiltSheet) {
          const sheet = event.target.closest<HTMLElement>(".atlas-hero-sheet");
          if (sheet && !sheet.closest(".home-clarity")) {
            tiltSheet = sheet;
            tiltRect = sheet.getBoundingClientRect();
            sheet.dataset.xnTilt = "1";
            sheet.dataset.xnTilting = "1";
          }
        }
        if (!pullCard) {
          const card = event.target.closest<HTMLElement>("a.scene-card");
          if (card && card.closest(".hero-scene")) {
            pullCard = card;
            pullRect = card.getBoundingClientRect();
            card.dataset.xnPulled = "1";
          }
        }
      },
      { passive: true },
    );
    listen(
      document,
      "pointerout",
      (raw) => {
        const event = raw as PointerEvent;
        const next = event.relatedTarget;
        const inside = (host: HTMLElement | null) =>
          host !== null && next instanceof Node && host.contains(next);
        if (tiltSheet && !inside(tiltSheet)) endTilt();
        if (pullCard && !inside(pullCard)) endPull();
      },
      { passive: true },
    );
    listen(document, "pointerleave", () => {
      endTilt();
      endPull();
      for (const button of primaryButtons) resetMagnet(button);
    });
    listen(window, "blur", () => {
      endTilt();
      endPull();
      for (const button of primaryButtons) resetMagnet(button);
    });
  }

  /* ------------------------------------------------------------------ *
   * 3 / 8 / 10 / 2：一个 IntersectionObserver 管全部进视口目标
   * ------------------------------------------------------------------ */
  const counters = new Map<HTMLElement, Counter[]>();

  const wrapCounters = (host: HTMLElement): Counter[] => {
    // 幂等：StrictMode 会把整层挂载两次；已经包过的只取回现有节点，不再套一层
    if (host.dataset.xnWrapped === "1") {
      return Array.from(host.querySelectorAll<HTMLElement>(".xn-num")).map((node) => ({
        node,
        value: Number((node.textContent ?? "").replace(/[^\d]/g, "")) || 0,
      }));
    }
    host.dataset.xnWrapped = "1";
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    const found: Counter[] = [];
    for (const textNode of textNodes) {
      const source = textNode.nodeValue ?? "";
      const match = /\d+/.exec(source);
      if (!match) continue;
      const value = Number(match[0]);
      if (!Number.isFinite(value) || value < 1) continue;
      const span = document.createElement("span");
      span.className = "xn-num";
      span.textContent = match[0];
      const fragment = document.createDocumentFragment();
      if (match.index > 0) fragment.appendChild(document.createTextNode(source.slice(0, match.index)));
      fragment.appendChild(span);
      const rest = source.slice(match.index + match[0].length);
      if (rest) fragment.appendChild(document.createTextNode(rest));
      textNode.replaceWith(fragment);
      found.push({ node: span, value });
    }
    return found;
  };

  const rollCounters = (list: Counter[], delay: number) => {
    if (!list.length) return;
    later(() => {
      const started = performance.now();
      for (const counter of list) counter.node.textContent = "0";
      const step = (now: number) => {
        const progress = Math.min((now - started) / ROLL_MS, 1);
        const eased = easeOutExpo(progress);
        for (const counter of list) counter.node.textContent = String(Math.round(counter.value * eased));
        if (progress < 1) {
          frames.add(window.requestAnimationFrame(step));
        } else {
          for (const counter of list) counter.node.textContent = String(counter.value);
        }
      };
      frames.add(window.requestAnimationFrame(step));
    }, delay);
  };

  const startMark = (el: HTMLElement) => {
    if (el.dataset.xnMark === "1") return;
    el.dataset.xnMark = "1";
    /* 色带宽度必须跟着文字走。
       原来 CSS 写死 width: min(100%, 13em)，在 27px 字号下恒等于 350px，
       于是短标题后面挂一条空绿条——实测「删除资料」文字 108px、色带 350px，
       过出 243px；「身份与访问」135 vs 350，过出 216px。那读起来像加载条/占位条，
       不像马克笔划线。盲审把它判为"新的凑数装饰"，判断是对的。
       这里量真实文字墨迹宽度写进 --xn-mark-w，出锋给 0.16em（笔尖拖出的一点点）。 */
    const em = Number.parseFloat(getComputedStyle(el).fontSize) || 16;
    const range = document.createRange();
    range.selectNodeContents(el);
    const textWidth = range.getBoundingClientRect().width;
    if (textWidth > 0) el.style.setProperty("--xn-mark-w", `${Math.round(textWidth + em * 0.16)}px`);
  };

  const startType = (el: HTMLElement) => {
    if (el.dataset.xnSplit === "1") {
      if (el.dataset.xnMarkTarget === "1") startMark(el);
      return;
    }
    const text = (el.textContent ?? "").trim();
    const characters = Array.from(text);
    if (characters.length < 2) {
      if (el.dataset.xnMarkTarget === "1") startMark(el);
      return;
    }
    // 读屏只读一遍原文：标题给 aria-label，逐字 span 全部 aria-hidden
    el.setAttribute("aria-label", text);
    const fragment = document.createDocumentFragment();
    let animated = 0;
    for (const character of characters) {
      if (/\s/.test(character)) {
        fragment.appendChild(document.createTextNode(character));
        continue;
      }
      const span = document.createElement("span");
      span.className = "xn-lead";
      span.setAttribute("aria-hidden", "true");
      span.style.setProperty("--xn-ci", String(animated));
      span.style.setProperty("--xn-cr", animated % 2 === 0 ? "-.35deg" : ".4deg");
      span.textContent = character;
      fragment.appendChild(span);
      animated += 1;
    }
    el.textContent = "";
    el.appendChild(fragment);
    el.dataset.xnSplit = "1";
    // 120ms 让区块自身的入场先起步，随后逐字压印
    el.style.setProperty("--xn-cdelay", "120ms");
    el.classList.add("is-typing");
    if (el.dataset.xnMarkTarget === "1" && animated > 0) {
      // 压印接近落定时，荧光笔才从标题下沿扫过去：前一段的终点是下一段的起点
      later(() => startMark(el), 120 + (animated - 1) * 18 + 400);
    }
  };

  const startStamp = (host: HTMLElement) => {
    const stamp = host.querySelector<HTMLElement>(".scene-stamp");
    if (!stamp || stamp.dataset.xnStamp === "1") return;
    stamp.dataset.xnStamp = "1";
    // 落章的 CSS 动画自带 720ms 停顿；数字在同一时刻开始滚，落到纸上时正好停稳
    rollCounters(counters.get(stamp) ?? [], STAMP_DELAY);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        if (el.dataset.xnType === "1") startType(el);
        else if (el.dataset.xnMarkTarget === "1") startMark(el);
        else if (el.dataset.xnIo === "stamp") startStamp(el);
        else if (el.dataset.xnCount === "1") rollCounters(counters.get(el) ?? [], 0);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  cleanups.push(() => observer.disconnect());

  /* 2. 荧光笔：所有区块标题 */
  /**
   * 内页接线：把"区块标题"自动认成 .t-section。
   *
   * 背景：荧光笔划线、铅字拆分这些效果早就做好了，但它们的宿主类 .t-section
   * 之前只写在首页的 tsx 上。实测首页 5/5 个 h2 带、内页 26 个 h2 里 0 个带，
   * 所以 42 个 keyframes 和 12 个微交互在内页的可见表现是零——用户说的
   * "内页没有特效"其实是"没接线"，不是"没做"。
   *
   * 这里不改任何 tsx、也不写新效果，只按语义认宿主：main 里作为区块标题的
   * h2（父级是 section / header / 已知的分区标题容器），且自身没被卡片包一层。
   * 首页本来就有 .t-section，重复命中会被下面的 Set 去重。
   */
  const SECTION_HEAD_HOSTS = "section, header, .xr-sec-head, .atlas-band-head, .r1-head";
  for (const heading of Array.from(document.querySelectorAll<HTMLElement>("main h2"))) {
    if (heading.classList.contains("t-section")) continue;
    // .t-block 本身就是站内的"区块标题"类（首页也在用），直接认
    if (heading.classList.contains("t-block")) { heading.classList.add("t-section"); continue; }
    // 其余按结构认：区块标题通常是「section > header > div > h2」这类，
    // 父级不一定直接是 section/header。往上最多两级能碰到区块容器才算。
    const host = heading.parentElement?.closest(SECTION_HEAD_HOSTS);
    if (!host) continue;
    let depth = 0;
    for (let node: HTMLElement | null = heading.parentElement; node && node !== host; node = node.parentElement) depth += 1;
    if (depth > 2) continue;
    heading.classList.add("t-section");
  }

  /**
   * 内页接线之二（本轮撤掉）：列表错峰不再由这里补 data-reveal。
   *
   * 这条自动接线曾让内页列表多一层"滚进来就淡入上移"，但它和 page-theatre 的
   * 区块动作落在同一个滚动时刻，正是用户说的"滚动入场堆叠"。现在内页的区块
   * 入场只有一个来源：page-theatre 的场次动作；块内细节跟着 xn:actplay 进来，
   * 列表自己的节奏由 scroll-scenes 的内容场景（盖章 / 数据行 / 时间轴）承担。
   * 保留本段注释，避免以后有人以为"内页列表没有错峰"是漏接线。
   */

  const observe = new Set<HTMLElement>();
  // .t-block 与 .t-section 是站内两套并存的"区块标题"宿主类（micro.css 已让它们
  // 共享同一套划线样式），这里一并挂观察器，否则 t-block 那套永远不触发。
  //
  // 另外把内页的裸 h2 也接上：实测内页 animationName 种类普遍只有 1 种
  // （/explore 1、/profile 1、/assessment 1、/account 1、/experience 1），
  // 首页是 8 种——"内页没特色"最直接的一条就是这个。内页的区块标题大多是裸 <h2>
  // 而不是 .t-block，所以划线效果一直没落到它们身上。
  // 首页排除：那边 h2 是封面式大标题，已经有胶带/印章/纸片那一套，再叠划线会打架。
  const isHome = window.location.pathname === "/";
  /* 注册 mark 目标。
     坑一：迟到的标题（条件渲染的块）在补挂观察器时，如果用户已经把它滚过去了，
     IntersectionObserver 不会再回调 isIntersecting，那个标题就永远拿不到
     data-xn-mark="1" —— 实测 /report/plan 唯一 h2 永远不触发、
     /report/initial 2/6 不触发，且同页不同视口在 2/6–6/6 间抖动。
     所以元素顶边已在视口上方时直接触发，不等回调。
     坑二（更隐蔽，我第一版改法就踩了）：下面那个 observe 是个 Set，真正调
     observer.observe() 的遍历只在初始化时跑一次。迟到元素 registerMark 时
     再 observe.add() 已经没人去遍历它了——等于永远不观察。所以这里必须
     直接 observer.observe(el)，不能只塞进 Set。 */
  const registerMark = (el: HTMLElement) => {
    el.dataset.xnMarkTarget = "1";
    if (el.getBoundingClientRect().top < 0) startMark(el);
    else observer.observe(el);
  };

  const markSelector = isHome
    ? ".t-section, main .t-block"
    : ".t-section, main .t-block, main h2:not(.atlas-label):not([data-xn-mark-skip])";
  for (const heading of Array.from(document.querySelectorAll<HTMLElement>(markSelector))) {
    registerMark(heading);
  }

  /* 2b. 迟到的区块标题兜底
     有些页面的 .t-block 标题要等一次状态更新才进 DOM（实测 /assessment 的
     "职业兴趣问卷 · 30 项工作语言"在 install 时还拿不到），一次性扫描会漏。
     这里挂一个 MutationObserver，新出现的 .t-block 补挂观察器；已处理过的打标记跳过。 */
  const lateObserver = new MutationObserver(() => {
    // 内页裸 h2 也要补：实测 /report/plan 的 h2 全是条件渲染的空态块，
    // install 时一个都不存在，一上来扫到的 mark 目标是 0。
    for (const heading of Array.from(document.querySelectorAll<HTMLElement>(markSelector.replace(/([^,]+)/g, "$1:not([data-xn-mark-target])")))) {
      registerMark(heading);
    }
  });
  lateObserver.observe(document.body, { childList: true, subtree: true });
  cleanups.push(() => lateObserver.disconnect());

  /* 3. 铅字：只拆视口下方、纯文本的 h1/h2（首屏标题不拆） */
  const fold = window.innerHeight * 0.92;
  for (const heading of Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2"))) {
    if (heading.childElementCount > 0) continue;
    const text = (heading.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text.length < 4 || text.length > 42) continue;
    if (heading.getBoundingClientRect().top < fold) continue;
    heading.dataset.xnType = "1";
    observe.add(heading);
  }

  /* 8. 数字滚动：支持 data-count，另外把首屏统计章的两个数也接管 */
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-count]"))) {
    const list = wrapCounters(el);
    const explicit = Number(el.dataset.count);
    if (Number.isFinite(explicit) && list[0]) list[0].value = explicit;
    counters.set(el, list);
    el.dataset.xnCount = "1";
    observe.add(el);
  }

  const scene = document.querySelector<HTMLElement>(".hero-scene");
  if (scene) {
    const stamp = scene.querySelector<HTMLElement>(".scene-stamp");
    if (stamp) counters.set(stamp, wrapCounters(stamp));
    scene.dataset.xnIo = "stamp";
    observe.add(scene);
  }

  for (const el of observe) observer.observe(el);

  /* ------------------------------------------------------------------ *
   * 启动
   * ------------------------------------------------------------------ */
  measure();
  buildBinding();
  paintScroll();

  const sizes = new ResizeObserver(() => {
    measure();
    scrollDirty = true;
    schedule();
  });
  sizes.observe(root);
  cleanups.push(() => sizes.disconnect());

  listen(
    window,
    "scroll",
    () => {
      scrollDirty = true;
      schedule();
    },
    { passive: true },
  );
  listen(window, "resize", () => {
    measure();
    scrollDirty = true;
    schedule();
  });

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
