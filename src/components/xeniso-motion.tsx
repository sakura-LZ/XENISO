"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 全站动效控制器（唯一）。三件事，都只在客户端跑：
 *
 * 一、滚动入场。两套属性登记在案：
 *    - [data-reveal]          老版 chrome/home/profile 区块（写 data-state）
 *    - [data-atlas-reveal]    采集册原语（写 data-atlas-in）
 *    只有起始位置在视口下方的元素才会被藏起来，所以内容永远不依赖 JS。
 *
 * 二、首屏视差。墨迹底与内容按不同速率位移，数值写进 --xn-ink-y / --xn-content-y，
 *    由 motion.css 消费。位移用的是 transform，不触发重排。
 *
 * 三、顶部滚动进度条。由本组件创建 DOM，样式在 motion.css 的 .xn-progress。
 *
 * 性能约定：scroll / resize 回调里只排帧，不读布局；每帧要用的量（首屏位置、
 * 可滚动高度）在 ResizeObserver 里预先量好缓存，rAF 里只写 transform。
 */

const SAFETY_MS = 2200;

export function XenisoMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* ---------------- 一、滚动入场 ---------------- */
    const show = (element: Element) => {
      element.setAttribute("data-state", "in");
      element.setAttribute("data-atlas-in", "1");
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
    const scan = () => {
      document.querySelectorAll("[data-reveal]:not([data-state]), [data-atlas-reveal]:not([data-atlas-in])").forEach(element => {
        const top = element.getBoundingClientRect().top;
        if (reduce.matches || top < window.innerHeight * 0.9) { show(element); return; }
        element.setAttribute("data-state", "pending");
        observer.observe(element);
      });
    };
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { subtree: true, childList: true });
    const release = () => document.querySelectorAll('[data-reveal][data-state="pending"], [data-atlas-reveal]:not([data-atlas-in])').forEach(show);

    // 兜底：入场动效只是锦上添花，不能成为"内容看不见"的理由。
    // 整页截图、打印、自动化抓取都不会滚动，元素会永远停在 pending。
    // 所以 2.2 秒后无条件放出所有仍被藏起来的元素。
    const safety = window.setTimeout(release, SAFETY_MS);

    /* ---------------- 二、顶部滚动进度条 ---------------- */
    const bar = document.createElement("div");
    bar.className = "xn-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    /* ---------------- 三、首屏视差 ---------------- */
    const hero = document.querySelector<HTMLElement>(".atlas-hero");
    const ink = hero?.querySelector<HTMLElement>(".atlas-hero-ink") ?? null;
    const inner = hero?.querySelector<HTMLElement>(".atlas-hero-inner") ?? null;

    let heroTop = 0;
    let heroHeight = 1;
    let maxScroll = 1;
    const measure = () => {
      // 只在挂载、resize、尺寸变化时读布局；scroll 过程里一律走缓存。
      const root = document.documentElement;
      maxScroll = Math.max(root.scrollHeight - window.innerHeight, 1);
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      heroTop = rect.top + window.scrollY;
      heroHeight = Math.max(rect.height, 1);
    };

    let frame = 0;
    let lastProgress = -1;
    const paint = () => {
      frame = 0;
      const scrollY = window.scrollY;

      const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
      if (progress !== lastProgress) {
        lastProgress = progress;
        bar.style.transform = `scaleX(${progress.toFixed(4)})`;
      }

      if (!reduce.matches && ink && inner) {
        // 0 → 1：首屏从顶部滚到完全离开视口。墨迹下移 48px（比内容慢），
        // 内容反向上移 22px，两者差 ~70px，够看出层次又不晃。
        const travel = Math.min(Math.max((scrollY - heroTop) / heroHeight, 0), 1);
        ink.style.setProperty("--xn-ink-y", `${(travel * 48).toFixed(1)}px`);
        inner.style.setProperty("--xn-content-y", `${(travel * -22).toFixed(1)}px`);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    const onScroll = () => schedule();
    const onResize = () => { measure(); schedule(); };
    // 减少动态效果：立刻归位，之后不再改。
    const onReduceChange = () => {
      if (reduce.matches) {
        ink?.style.setProperty("--xn-ink-y", "0px");
        inner?.style.setProperty("--xn-content-y", "0px");
      }
      measure();
      schedule();
    };

    const sizes = new ResizeObserver(() => { measure(); schedule(); });
    sizes.observe(document.body);
    if (hero) sizes.observe(hero);

    measure();
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    reduce.addEventListener("change", onReduceChange);
    reduce.addEventListener("change", release);

    return () => {
      window.clearTimeout(safety);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      reduce.removeEventListener("change", onReduceChange);
      reduce.removeEventListener("change", release);
      sizes.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      bar.remove();
      ink?.style.removeProperty("--xn-ink-y");
      inner?.style.removeProperty("--xn-content-y");
      release();
    };
  }, [pathname]);
  return null;
}
