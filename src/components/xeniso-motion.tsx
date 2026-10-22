"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SKIP = "video, [data-avatar], [class*='avatar']";

export function XenisoMotion() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animations: Animation[] = [];
    let observer: IntersectionObserver | undefined;
    const main = document.querySelector("#main") ?? document.querySelector("main");
    if (main && typeof Element.prototype.animate === "function") {
      Array.from(main.children).slice(0, 6).forEach((el, i) => {
        if (!(el instanceof HTMLElement) || el.matches(SKIP) || el.querySelector(SKIP)) return;
        animations.push(el.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: i * 60, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" }));
      });
    }
    if (pathname === "/" && "IntersectionObserver" in window && typeof Element.prototype.animate === "function") {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer?.unobserve(entry.target);
          animations.push((entry.target as HTMLElement).animate([{ opacity: 0.2, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 480, easing: "cubic-bezier(.2,.7,.2,1)" }));
        });
      }, { threshold: 0.15 });
      document.querySelectorAll(".xn-path-card").forEach((card) => {
        const r = card.getBoundingClientRect();
        if (r.top > window.innerHeight) observer?.observe(card);
      });
    }
    return () => { observer?.disconnect(); animations.forEach((a) => a.cancel()); };
  }, [pathname]);
  return null;
}
