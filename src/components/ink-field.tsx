"use client";
import { useEffect, useRef } from "react";

/**
 * 首屏墨迹背景：原生 WebGL，无第三方库。
 * 三个坑都已经踩过并绕开：
 * 1. 首帧布局未落定时 getBoundingClientRect 会给出 1px，缓冲区分辨率会永久停在 1×1，
 *    被 CSS 拉满全屏后就成一片糊色 —— 所以用 clientWidth 并加最小尺寸保护 + ResizeObserver。
 * 2. 墨团沿 y 轴平移会看起来像"顺着一条竖线往上走" —— 改成原地旋转 + 两层噪声互推。
 * 3. 偏心暗角会让画面像被竖线切开 —— 改成同心收边。
 * prefers-reduced-motion 下只画一帧；离开视口或标签页隐藏时停帧。
 */
export function InkField({ className, band = false }: { className?: string; band?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: false });
    if (!gl) { canvas.style.display = "none"; return; }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const vs = `
      attribute vec2 p;
      void main() { gl_Position = vec4(p, 0.0, 1.0); }
    `;
    const fs = `
      precision highp float;
      uniform vec2 uRes;
      uniform float uTime;
      uniform float uBand;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
        for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p * 2.03; a *= 0.5; }
        return v;
      }

      vec2 rot(vec2 p, float a) { float s = sin(a), c = cos(a); return vec2(p.x * c - p.y * s, p.x * s + p.y * c); }

      void main() {
        vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
        float t = uTime * 0.075;

        vec2 q = rot(p, t * 0.25) * 1.25;
        vec2 w = vec2(fbm(q + vec2(0.0, t)), fbm(q + vec2(4.7, -t)));
        float ink = fbm(q + 2.1 * w);
        ink = mix(ink, fbm(q * 2.3 + 1.7 * w + rot(p, -t * 0.4)), 0.35);

        vec3 paper = vec3(0.945, 0.918, 0.851);
        vec3 moss  = vec3(0.290, 0.365, 0.227);
        vec3 ochre = vec3(0.561, 0.278, 0.149);

        float m = smoothstep(mix(0.44, 0.30, uBand), mix(0.88, 0.72, uBand), ink);
        float o = smoothstep(0.66, 0.97, ink) * 0.5;

        vec3 col = paper;
        /* 强度是按对比度反推的，不是拍脑袋：band 系数 0.66 时最暗墨迹落到亮度 137，
           压在它上面的 --ink-2 正文只剩 4.08:1、--ink-3 眉标只剩 3.19:1，双双跌破
           AA 4.5。收到 0.44 后最暗墨迹约 169、合成背景约 165，Δ 仍有约 70/255
           （评审给的可见性门槛是 ≥60），--ink-2 回到 5.1:1。 */
        col = mix(col, moss, m * mix(0.40, 0.44, uBand));
        col = mix(col, ochre, o * 0.26);

        /* 暗角：p 是「以画布高度归一化」的坐标，所以宽扁画布（内页页眉 768×120）
           的 p.x 跨度可达 ±3.2，几乎整片都落在暗角外 → 全被还原成纸色，实测合成后
           只有 Δ1.7/255，等于没画。uBand=1 时把收边放到极宽，让整条带都保留墨色。
           首页（uBand=0）的取值与原来完全一致，不受影响。 */
        float r = length(p * vec2(0.62, 0.95));
        float vig = smoothstep(mix(1.15, 3.4, uBand), mix(0.28, 0.10, uBand), r);
        col = mix(paper, col, vig);

        col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.012;
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("ink shader", gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vsh = compile(gl.VERTEX_SHADER, vs);
    const fsh = compile(gl.FRAGMENT_SHADER, fs);
    if (!vsh || !fsh) { canvas.style.display = "none"; return; }

    const program = gl.createProgram();
    if (!program) { canvas.style.display = "none"; return; }
    gl.attachShader(program, vsh);
    gl.attachShader(program, fsh);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.style.display = "none"; return; }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uBand = gl.getUniformLocation(program, "uBand");
    gl.uniform1f(uBand, band ? 1 : 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let frame = 0;
    let running = false;

    const draw = (ms: number) => {
      gl.uniform1f(uTime, ms * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const w0 = canvas.clientWidth || canvas.offsetWidth || 0;
      const h0 = canvas.clientHeight || canvas.offsetHeight || 0;
      if (w0 < 8 || h0 < 8) return;
      const w = Math.max(2, Math.round(w0 * dpr * 0.6));
      const h = Math.max(2, Math.round(h0 * dpr * 0.6));
      if (w === canvas.width && h === canvas.height) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      if (reduce.matches) draw(performance.now());
    };

    const loop = (ms: number) => {
      if (!running) return;
      draw(ms);
      frame = requestAnimationFrame(loop);
    };
    const start = () => { if (!running && !reduce.matches) { running = true; frame = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(frame); };

    gl.clearColor(0, 0, 0, 0);
    resize();
    requestAnimationFrame(resize);
    window.addEventListener("load", resize);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const visibility = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) { if (reduce.matches) draw(performance.now()); else start(); }
        else stop();
      }
    }, { threshold: 0.02 });
    visibility.observe(canvas);

    const onHidden = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener("visibilitychange", onHidden);
    const onMotion = () => { if (reduce.matches) { stop(); draw(performance.now()); } else start(); };
    reduce.addEventListener("change", onMotion);

    if (reduce.matches) draw(performance.now());

    return () => {
      stop();
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onHidden);
      reduce.removeEventListener("change", onMotion);
      window.removeEventListener("load", resize);
    };
  }, [band]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
