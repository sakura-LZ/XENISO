"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll reveal. Two attribute families are supported:
 * - [data-reveal]          legacy chrome/home/profile sections (data-state)
 * - [data-atlas-reveal]    paper-collage primitives from atlas.css (data-atlas-in)
 * Only elements that start below the viewport are hidden, so content never depends on JS.
 */
export function XenisoMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
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
    reduce.addEventListener("change", release);

    // 兜底：入场动效只是锦上添花，不能成为"内容看不见"的理由。
    // 整页截图、打印、自动化抓取都不会滚动，元素会永远停在 pending。
    // 所以 2.2 秒后无条件放出所有仍被藏起来的元素。
    const safety = window.setTimeout(release, 2200);

    return () => { window.clearTimeout(safety); observer.disconnect(); mutations.disconnect(); reduce.removeEventListener("change", release); release(); };
  }, [pathname]);
  return null;
}
