"use client";

import { useEffect } from "react";

/**
 * 首页首屏右侧「档案夹」的指针微交互（唯一一层，只作用于 .hero-scene）。
 *
 * 用户在 2026-10-24 问："首页原来右面有那种可以微交互的动效，鼠标放在上面
 * 各个部分会浮动或者躲避" —— 指的是这一块。它原来由 micro-interactions 的
 * 第 4/7 条承担（纸张倾斜 + 抽卡），但那一轮「首页收敛」把整层在 / 上停装了
 * （见 micro-interactions.tsx 的 pathname === "/" 判断），右侧只剩入场动画。
 *
 * 这里按现在的版式单独恢复，并换成更适合"一叠纸"的写法：
 *
 *   1. 整叠档案随指针倾斜 ≤2.2°（perspective + rotateX/rotateY），纸片之间
 *      再按 --hs-depth 做 2.6–8px 的错位 —— 近的走得多、远的走得少，
 *      于是"各个部分"会一起动但幅度不同，就是"浮动"的观感。
 *   2. 指针靠近某张卡时，卡片沿"远离指针"的方向让开 ≤7px —— "躲避"。
 *
 * 为什么单独一层而不是重新打开 micro-interactions：
 *   - 那一层是整站共用的（墨滴、荧光笔、磁吸按钮、装订线……），首页收敛是
 *     有理由的；这次只补用户点名的右侧档案夹，别的悬停保持现状。
 *   - 卡片现在是说明块、不是链接，所以这里不做悬停抬升/阴影加强，避免把
 *     静态说明画成可点按钮。
 *
 * 性能/降级约定：
 *   - 只在 (hover:hover) and (pointer:fine) 且 ≥1025px 且非 reduced-motion 下安装；
 *     不满足时 .hero-scene 上没有 data-hs-motion，scene-motion.css 里的 transform
 *     全部匹配不上，页面维持 home.css 的静态版式。
 *   - 指针事件只记目标值，写 DOM 全部在同一个 rAF 里；位置只在安装/resize 时量一次
 *     （存成页面坐标，滚动不影响），rAF 里不读布局。
 *   - 归零就撤：指针离开后平滑回位，回位完成即移除 data-hs-motion 并停掉 rAF，
 *     静止时页面不留任何额外合成层。
 */

const FINE = "(hover: hover) and (pointer: fine)";
const WIDE = "(min-width: 1025px)";
const REDUCE = "(prefers-reduced-motion: reduce)";

/* 倾斜上限：左右 2.2°、上下 1.5°。再大就会晃到影响读标题。 */
const TILT_X = 2;
const TILT_Y = 3;

/* 指针靠近卡片多远开始让位、最多让多少 */
const REPEL_ZONE = 96;
const REPEL_MAX = 7;

/* 跟手速度：0.16/帧 ≈ 100ms 到位，慢一点才像纸，不像鼠标指针。 */
const LERP = 0.16;
/* 归零判定：小于这个值就当已经停了 */
const EPSILON = 0.06;

type Box = { left: number; top: number; width: number; height: number };

type Layer = {
  el: HTMLElement;
  depth: number;
  card: boolean;
  box: Box | null;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  sway: number;
};

export function HomeSceneMotion() {
  useEffect(() => {
    const fine = window.matchMedia(FINE);
    const wide = window.matchMedia(WIDE);
    const reduce = window.matchMedia(REDUCE);

    let stop: (() => void) | null = null;
    const boot = () => {
      stop?.();
      stop = fine.matches && wide.matches && !reduce.matches ? install() : null;
    };

    fine.addEventListener("change", boot);
    wide.addEventListener("change", boot);
    reduce.addEventListener("change", boot);
    boot();

    return () => {
      fine.removeEventListener("change", boot);
      wide.removeEventListener("change", boot);
      reduce.removeEventListener("change", boot);
      stop?.();
    };
  }, []);

  return null;
}

function install(): () => void {
  const scene = document.querySelector<HTMLElement>(".hero-scene");
  if (!scene) return () => {};

  const layers: Layer[] = [];
  for (const el of Array.from(scene.querySelectorAll<HTMLElement>("[data-hs-depth]"))) {
    const depth = Number.parseFloat(el.dataset.hsDepth ?? "");
    if (!Number.isFinite(depth) || depth <= 0) continue;
    layers.push({
      el,
      depth,
      card: el.classList.contains("scene-card"),
      box: null,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      sway: 0,
    });
  }
  if (!layers.length) return () => {};

  const cleanups: Array<() => void> = [];
  const listen = (
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };

  let active = false;
  const restoreFrames: number[] = [];

  /* ---------------- 测量：只在安装 / resize 时读布局 ----------------
     量的时候先把 data-hs-motion 摘掉：否则 scene 自身带着倾斜，
     getBoundingClientRect 拿到的是倾斜后的包围盒，卡片坐标会跟着漂。
     读一次 rect 会强制样式重算，所以摘掉属性后立刻量就是未变换的位置。 */
  let scenePage: Box = { left: 0, top: 0, width: 1, height: 1 };

  const measure = () => {
    const wasActive = active;
    if (wasActive) delete scene.dataset.hsMotion;
    const rect = scene.getBoundingClientRect();
    scenePage = {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
      width: Math.max(rect.width, 1),
      height: Math.max(rect.height, 1),
    };
    for (const layer of layers) {
      const box = layer.el.getBoundingClientRect();
      // 卡片/图版自带基础旋转，包围盒比布局盒略大；这里只要中心点，
      // 用包围盒中心就够（误差 < 1px，不影响 ±7px 的让位）。
      layer.box = {
        left: box.left + window.scrollX,
        top: box.top + window.scrollY,
        width: box.width,
        height: box.height,
      };
    }
    if (wasActive) scene.dataset.hsMotion = "1";
  };

  /* ---------------- 指针状态 ---------------- */
  let pointerX = 0;
  let pointerY = 0; // 页面坐标
  let nx = 0;
  let ny = 0; // -1..1，相对场景中心
  let inside = false;
  // 指针正压在哪张卡上：这张卡不跟着视差跑（不然它会从指针底下滑走），
  // 只做一点"被按住"的下沉；其余卡片照常分层位移 + 让位。
  let hovered: HTMLElement | null = null;
  let frame = 0;

  const activate = () => {
    if (active) return;
    active = true;
    scene.dataset.hsMotion = "1";
  };

  const deactivate = () => {
    if (!active) return;
    active = false;
    /* 摘掉属性后，atlas.css 的 [data-atlas-reveal] 620ms transform 过渡会回来，
       把一个恒等 matrix3d 再"演"一遍（看不见，但会多占 0.62s 合成层）。
       关掉过渡两帧，等 transform 落回 none 再把它还给入场规则。 */
    scene.style.transition = "none";
    delete scene.dataset.hsMotion;
    const first = window.requestAnimationFrame(() => {
      const second = window.requestAnimationFrame(() => {
        scene.style.removeProperty("transition");
      });
      restoreFrames.push(second);
    });
    restoreFrames.push(first);
  };

  const clearVars = () => {
    scene.style.removeProperty("--hs-rx");
    scene.style.removeProperty("--hs-ry");
    for (const layer of layers) {
      layer.el.style.removeProperty("--hs-dx");
      layer.el.style.removeProperty("--hs-dy");
      layer.el.style.removeProperty("--hs-sway");
    }
  };

  /* 让位量：指针到卡片矩形外沿的距离，越近推得越远；指针已经在卡片里就不推。 */
  const repel = (layer: Layer): { x: number; y: number } => {
    if (!layer.card || !layer.box || !inside) return { x: 0, y: 0 };
    const cx = layer.box.left + layer.box.width / 2;
    const cy = layer.box.top + layer.box.height / 2;
    const dx = pointerX - cx;
    const dy = pointerY - cy;
    const outside = Math.hypot(
      Math.max(Math.abs(dx) - layer.box.width / 2, 0),
      Math.max(Math.abs(dy) - layer.box.height / 2, 0),
    );
    if (outside <= 0.5 || outside >= REPEL_ZONE) return { x: 0, y: 0 };
    const strength = (1 - outside / REPEL_ZONE) * REPEL_MAX;
    const length = Math.hypot(dx, dy) || 1;
    return { x: (-dx / length) * strength, y: (-dy / length) * strength };
  };

  const paint = () => {
    frame = 0;
    let busy = false;

    // 整叠倾斜
    scene.style.setProperty("--hs-rx", `${(-ny * TILT_X).toFixed(3)}deg`);
    scene.style.setProperty("--hs-ry", `${(nx * TILT_Y).toFixed(3)}deg`);

    for (const layer of layers) {
      const held = layer.card && layer.el === hovered;
      if (held) {
        layer.el.dataset.hsPress = "1";
      } else if (layer.el.dataset.hsPress) {
        delete layer.el.dataset.hsPress;
      }

      const push = held ? { x: 0, y: 0 } : repel(layer);
      layer.targetX = held ? 0 : nx * layer.depth + push.x;
      // 被按住的那张纸压下去 1.4px，其他纸照常分层位移
      layer.targetY = held ? 1.4 : ny * layer.depth * 0.68 + push.y;

      // 按住时纸随指针横向位置轻摆（±1.6°），松手回正
      let swayTarget = 0;
      if (held && layer.box) {
        const local = Math.min(Math.max((pointerX - layer.box.left) / layer.box.width, 0), 1);
        swayTarget = (local * 2 - 1) * 1.6;
      }
      layer.sway += (swayTarget - layer.sway) * LERP;
      if (Math.abs(swayTarget - layer.sway) < 0.02) layer.sway = swayTarget;
      if (layer.sway !== swayTarget) busy = true;

      layer.x += (layer.targetX - layer.x) * LERP;
      layer.y += (layer.targetY - layer.y) * LERP;
      if (Math.abs(layer.targetX - layer.x) < EPSILON) layer.x = layer.targetX;
      if (Math.abs(layer.targetY - layer.y) < EPSILON) layer.y = layer.targetY;
      if (layer.x !== layer.targetX || layer.y !== layer.targetY) busy = true;

      layer.el.style.setProperty("--hs-dx", `${layer.x.toFixed(2)}px`);
      layer.el.style.setProperty("--hs-dy", `${layer.y.toFixed(2)}px`);
      layer.el.style.setProperty("--hs-sway", `${layer.sway.toFixed(2)}deg`);
    }

    // 已经回位、指针也不在场景里：撤掉 transform 与合成层，页面回到静止态。
    if (!busy && !inside) {
      clearVars();
      deactivate();
      return;
    }

    if (busy) frame = window.requestAnimationFrame(paint);
  };

  const ensureFrame = () => {
    if (!frame) frame = window.requestAnimationFrame(paint);
  };

  const updatePointer = (event: PointerEvent) => {
    pointerX = event.clientX + window.scrollX;
    hovered = event.target instanceof Element ? (event.target.closest<HTMLElement>(".scene-card")) : null;
    pointerY = event.clientY + window.scrollY;
    nx = Math.min(Math.max(((pointerX - scenePage.left) / scenePage.width) * 2 - 1, -1), 1);
    ny = Math.min(Math.max(((pointerY - scenePage.top) / scenePage.height) * 2 - 1, -1), 1);
  };

  const reset = () => {
    inside = false;
    hovered = null;
    nx = 0;
    ny = 0;
    for (const layer of layers) delete layer.el.dataset.hsPress;
    ensureFrame();
  };

  /* ---------------- 事件 ---------------- */
  listen(scene, "pointerenter", (raw) => {
    updatePointer(raw as PointerEvent);
    inside = true;
    activate();
    ensureFrame();
  }, { passive: true });

  listen(scene, "pointermove", (raw) => {
    updatePointer(raw as PointerEvent);
    inside = true;
    activate();
    ensureFrame();
  }, { passive: true });

  listen(scene, "pointerleave", reset, { passive: true });
  listen(window, "blur", reset);
  listen(document, "visibilitychange", () => {
    if (document.hidden) reset();
  });
  listen(window, "resize", () => {
    measure();
    reset();
  });

  cleanups.push(() => {
    if (frame) window.cancelAnimationFrame(frame);
    deactivate();
    for (const restore of restoreFrames) window.cancelAnimationFrame(restore);
    scene.style.removeProperty("transition");
    clearVars();
    for (const layer of layers) delete layer.el.dataset.hsPress;
  });

  /* ---------------- 启动 ---------------- */
  measure();

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
