"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 环境循环视频层。
 * ---------------------------------------------------------------------------
 * 站里原本躺着 4 个为这个项目生成的 7–8 秒循环视频（public/brand/
 * community-background.mp4、public/previews/assets/*.mp4），但从没接进页面。
 * 这个组件把它们接上，作为页面的一层很淡的环境底纹。
 *
 * 几条克制：
 * - 不看就不播：只在这块进入视口后才 play，离开立即 pause（省电、省流量）。
 * - 默认静音、loop、playsInline，不自动带声音，不进全屏。
 * - prefers-reduced-motion: reduce 时完全不加载、不播放，直接留纸色底。
 *   （所以 reduced-motion 用户看到的是一张干净的纸，没有任何动态）
 * - preload="none"：不占首屏带宽，等进入视口才取。
 * - 加载失败/解码失败就静默隐藏，不抛错、不留空白块。
 */

export function AmbientVideo({
  src,
  className,
  ariaLabel,
}: {
  src: string;
  className?: string;
  ariaLabel: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [ok, setOk] = useState(true);
  const [reduce, setReduce] = useState(true); // 默认按"要降级"处理，挂载后再判断

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduce || !ok) return;
    const node = video.current;
    const host = wrap.current;
    if (!node || !host) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void node.play().catch(() => setOk(false));
          } else {
            node.pause();
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [reduce, ok]);

  if (reduce || !ok) {
    // 降级：只留一块纸色底，不加载视频
    return <div className={className ? `ambient-video ${className}` : "ambient-video"} aria-hidden="true" />;
  }

  return (
    <div className={className ? `ambient-video ${className}` : "ambient-video"} ref={wrap} aria-hidden="true">
      <video
        ref={video}
        className="ambient-video-media"
        src={src}
        muted
        loop
        playsInline
        preload="none"
        tabIndex={-1}
        aria-label={ariaLabel}
        onError={() => setOk(false)}
      />
    </div>
  );
}
