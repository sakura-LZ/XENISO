"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll reveal for [data-reveal]. Only elements that start below the viewport are hidden
 * (data-state="pending"); everything else stays visible, so content never depends on JS.
 */
export function XenisoMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const show = (element: Element) => element.setAttribute("data-state", "in");
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
    const scan = () => {
      document.querySelectorAll("[data-reveal]:not([data-state])").forEach(element => {
        const top = element.getBoundingClientRect().top;
        if (reduce.matches || top < window.innerHeight * 0.9) { element.setAttribute("data-state", "shown"); return; }
        element.setAttribute("data-state", "pending");
        observer.observe(element);
      });
    };
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { subtree: true, childList: true });
    const release = () => document.querySelectorAll('[data-reveal][data-state="pending"]').forEach(show);
    reduce.addEventListener("change", release);
    return () => { observer.disconnect(); mutations.disconnect(); reduce.removeEventListener("change", release); release(); };
  }, [pathname]);
  return null;
}
