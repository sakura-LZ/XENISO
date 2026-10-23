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

const SAFETY_MS = 9000;

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

    /**
     * 兜底：入场动效只是锦上添花，不能成为"内容看不见"的理由。
     * 整页截图、打印、自动化抓取都不会滚动，元素会一直停在 pending。
     *
     * 但这里**不能无条件全放**：那样等于把滚动入场整个废掉——真实读者只要在
     * 第一屏停留超过兜底时长（必然发生），往后滚时所有区块早就被放成不透明，
     * 错峰入场根本不存在。所以只放行「此刻真的在视口内」的，其余继续交给
     * IntersectionObserver 按滚动放行；超时只用来救「卡在视口外却永远不触发」
     * 的病态情况，因此时长远大于正常交互节奏。
     */
    const releaseVisible = () => {
      const vh = window.innerHeight;
      document
        .querySelectorAll('[data-reveal][data-state="pending"], [data-atlas-reveal]:not([data-atlas-in])')
        .forEach(element => {
          // 只要元素的顶边已经越过视口下沿——无论是在视口里、还是已经被滚到
          // 上方——都放行。已经被滚过去的元素不可能再入场，留着 pending 就是
          // 永久空白。还在视口下方的才继续等滚动。
          if (element.getBoundingClientRect().top < vh) show(element);
        });
    };
    const releaseAll = () => document
      .querySelectorAll('[data-reveal][data-state="pending"], [data-atlas-reveal]:not([data-atlas-in])')
      .forEach(show);
    const safety = window.setTimeout(releaseVisible, SAFETY_MS);

    // 无滚动场景（打印、整页截图）也要能看到全部内容：打印前全放
    const beforePrint = releaseAll;
    window.addEventListener("beforeprint", beforePrint);

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

    /**
     * 滚动时顺手补一次放行：IntersectionObserver 是异步的，快速滚动（含程序化
     * scrollTo、锚点跳转、惯性甩动）可能整段跳过，被跳过的元素就会永久停在
     * pending = 永久不可见。这里按几何位置兜一遍，凡是已经进入视口或已经被
     * 滚过去的，一律放行；还没到的继续等，所以错峰仍然是滚动驱动的。
     */
    const onScroll = () => { schedule(); releaseVisible(); };
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
    reduce.addEventListener("change", releaseAll);

    return () => {
      window.clearTimeout(safety);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      reduce.removeEventListener("change", onReduceChange);
      reduce.removeEventListener("change", releaseAll);
      window.removeEventListener("beforeprint", beforePrint);
      sizes.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      bar.remove();
      ink?.style.removeProperty("--xn-ink-y");
      inner?.style.removeProperty("--xn-content-y");
      releaseAll();
    };
  }, [pathname]);
  return null;
}
