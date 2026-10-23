"use client";

/**
 * 色键（chroma key）墨迹舞台
 * ---------------------------------------------------------------------------
 * 做法：先在离屏 2D canvas 上用纯绿幕底色（#00ff00）画一段循环的水墨动画，
 * 每帧作为纹理送进 WebGL，片元着色器逐像素做色键：把绿色分量占优的像素变透明，
 * 同时对边缘做去绿溢色（spill suppression），最后叠在页面纸底之上。
 *
 * 鼠标横向移动切换 4 个"阶段"（墨环 → 墨涡 → 脉迹 → 格纸），纵向移动改变浓淡；
 * 指针静止 3.2 秒后自动巡游。prefers-reduced-motion 时只渲染一帧静态图。
 *
 * 之所以不用现成视频：色键在这里是实时做的，任何 DPI 下都锐利、零加载体积，
 * 而且能跟着鼠标变形；换成绿幕 mp4 反而做不不到"随鼠标换阶段"。
 */

import { useEffect, useRef } from "react";

const GREEN = "#00ff00";

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_opacity;

void main() {
  vec3 c = texture2D(u_tex, v_uv).rgb;
  // 绿色占优程度：绿分量减去红蓝中的较大者
  float greenDominance = c.g - max(c.r, c.b);
  // 硬键 + 窄过渡带，避免锯齿；0.04~0.16 之间平滑
  float alpha = 1.0 - smoothstep(0.04, 0.16, greenDominance);
  // 去绿溢色：边缘残留的绿往红蓝的均值压
  float spill = clamp(greenDominance, 0.0, 1.0);
  vec3 keyed = vec3(c.r + spill * 0.06, c.g - spill * 0.55, c.b + spill * 0.06);
  // 预乘 alpha：context 声明 premultipliedAlpha，混合用 ONE / ONE_MINUS_SRC_ALPHA，
  // 若输出非预乘颜色，透明区域会把绿色"加"到底图上，出现一层绿雾。
  float a = alpha * u_opacity;
  gl_FragColor = vec4(keyed * a, a);
}`;

type Stage = 0 | 1 | 2 | 3;

export function ChromaInkStage({ className }: { className?: string }) {
  const hostRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = hostRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
    if (!gl) {
      canvas.style.display = "none";
      return;
    }

    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d");
    if (!offCtx) {
      canvas.style.display = "none";
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- WebGL 装配 ----
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.style.display = "none";
      return;
    }
    const prog = gl.createProgram();
    if (!prog) {
      canvas.style.display = "none";
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.style.display = "none";
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const uOpacity = gl.getUniformLocation(prog, "u_opacity");

    // ---- 尺寸 ----
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      off.width = Math.min(960, w);
      off.height = Math.round((off.width * h) / Math.max(1, w));
      gl.viewport(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ---- 指针 → 阶段 ----
    let targetStage: Stage = 0;
    let currentStage = 0;
    let targetDensity = 0.5;
    let density = 0.5;
    let lastMove = 0;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / Math.max(1, rect.width);
      const ry = (e.clientY - rect.top) / Math.max(1, rect.height);
      if (rx < 0 || rx > 1 || ry < 0 || ry > 1) return;
      targetStage = Math.min(3, Math.floor(rx * 4)) as Stage;
      targetDensity = 0.25 + ry * 0.75;
      lastMove = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // ---- 画面：绿幕上画墨 ----
    const drawActor = (t: number, stage: number, dens: number) => {
      const w = off.width;
      const h = off.height;
      // 纯绿幕底
      offCtx.globalCompositeOperation = "source-over";
      offCtx.fillStyle = GREEN;
      offCtx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;
      const unit = Math.min(w, h);
      const ink = "rgba(24,22,18,";

      offCtx.lineCap = "round";
      offCtx.lineJoin = "round";

      // 墨环：一圈带粗细变化的笔迹
      const ring = (radius: number, wobble: number, alpha: number, width: number) => {
        offCtx.beginPath();
        for (let i = 0; i <= 96; i += 1) {
          const a = (i / 96) * Math.PI * 2;
          const r = radius * (1 + Math.sin(a * 3 + t * 1.6) * wobble);
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r * 0.82;
          if (i === 0) offCtx.moveTo(x, y);
          else offCtx.lineTo(x, y);
        }
        offCtx.strokeStyle = ink + alpha + ")";
        offCtx.lineWidth = width;
        offCtx.stroke();
      };

      // 墨涡：阿基米德螺线，随阶段拉伸
      const spiral = (turns: number, alpha: number, width: number, squash: number) => {
        offCtx.beginPath();
        const steps = 220;
        for (let i = 0; i <= steps; i += 1) {
          const p = i / steps;
          const a = p * Math.PI * 2 * turns + t * 0.9;
          const r = unit * 0.06 + p * unit * 0.34;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r * squash;
          if (i === 0) offCtx.moveTo(x, y);
          else offCtx.lineTo(x, y);
        }
        offCtx.strokeStyle = ink + alpha + ")";
        offCtx.lineWidth = width;
        offCtx.stroke();
      };

      // 脉迹：心电波形
      const pulse = (alpha: number, width: number, amp: number) => {
        offCtx.beginPath();
        const steps = 260;
        for (let i = 0; i <= steps; i += 1) {
          const p = i / steps;
          const x = w * 0.08 + p * w * 0.84;
          const phase = (p * 6 - t * 0.55) % 1;
          let v = 0;
          if (phase > 0.44 && phase < 0.5) v = -1;
          else if (phase > 0.5 && phase < 0.56) v = 2.6;
          else if (phase > 0.56 && phase < 0.62) v = -0.8;
          else v = Math.sin(phase * Math.PI * 2) * 0.12;
          const y = cy - v * amp * unit * 0.06;
          if (i === 0) offCtx.moveTo(x, y);
          else offCtx.lineTo(x, y);
        }
        offCtx.strokeStyle = ink + alpha + ")";
        offCtx.lineWidth = width;
        offCtx.stroke();
      };

      // 格纸：日历/表格网格
      const grid = (alpha: number, width: number) => {
        const cols = 7;
        const rows = 4;
        const gw = unit * 0.72;
        const gh = unit * 0.44;
        const x0 = cx - gw / 2;
        const y0 = cy - gh / 2;
        offCtx.strokeStyle = ink + alpha + ")";
        offCtx.lineWidth = width;
        offCtx.beginPath();
        for (let c = 0; c <= cols; c += 1) {
          const x = x0 + (gw / cols) * c;
          offCtx.moveTo(x, y0);
          offCtx.lineTo(x, y0 + gh);
        }
        for (let r = 0; r <= rows; r += 1) {
          const y = y0 + (gh / rows) * r;
          offCtx.moveTo(x0, y);
          offCtx.lineTo(x0 + gw, y);
        }
        offCtx.stroke();
        // 已填的格子：慢慢推进的进度感
        const filled = Math.floor((Math.sin(t * 0.6) * 0.5 + 0.5) * cols * rows);
        offCtx.fillStyle = "rgba(58,72,44,.30)";
        for (let i = 0; i < filled; i += 1) {
          const c = i % cols;
          const r = Math.floor(i / cols);
          if (r >= rows) break;
          offCtx.fillRect(x0 + (gw / cols) * c + 2, y0 + (gh / rows) * r + 2, gw / cols - 4, gh / rows - 4);
        }
      };

      const a = 0.5 + dens * 0.42;

      if (stage < 0.5) {
        ring(unit * 0.30, 0.05, a * 0.85, Math.max(1.5, unit * 0.006));
        ring(unit * 0.21, 0.09, a * 0.6, Math.max(1.2, unit * 0.004));
        ring(unit * 0.12, 0.14, a * 0.45, Math.max(1, unit * 0.003));
      } else if (stage < 1.5) {
        spiral(2.6, a * 0.8, Math.max(1.5, unit * 0.005), 0.9);
        spiral(1.7, a * 0.5, Math.max(1, unit * 0.0035), 1.25);
      } else if (stage < 2.5) {
        pulse(a * 0.85, Math.max(1.6, unit * 0.006), 1);
        offCtx.setLineDash([4, 7]);
        offCtx.strokeStyle = "rgba(122,84,40,.5)";
        offCtx.lineWidth = Math.max(1, unit * 0.0025);
        offCtx.beginPath();
        offCtx.moveTo(w * 0.08, cy);
        offCtx.lineTo(w * 0.92, cy);
        offCtx.stroke();
        offCtx.setLineDash([]);
      } else {
        grid(a * 0.55, Math.max(1, unit * 0.003));
        ring(unit * 0.34, 0.03, a * 0.35, Math.max(1.2, unit * 0.004));
      }

      // 墨点飞散：少量小圆点，制造"活物"感
      offCtx.fillStyle = ink + a * 0.5 + ")";
      const drops = 7;
      for (let i = 0; i < drops; i += 1) {
        const a2 = t * 0.7 + (i / drops) * Math.PI * 2;
        const r = unit * (0.30 + Math.sin(t * 1.1 + i) * 0.06);
        const x = cx + Math.cos(a2) * r;
        const y = cy + Math.sin(a2 * 1.13) * r * 0.82;
        const size = Math.max(1, unit * (0.004 + (Math.sin(t * 2 + i) * 0.5 + 0.5) * 0.005));
        offCtx.beginPath();
        offCtx.arc(x, y, size, 0, Math.PI * 2);
        offCtx.fill();
      }
    };

    // ---- 渲染循环 ----
    let raf = 0;
    let stopped = false;
    const start = performance.now();

    const render = (now: number) => {
      if (stopped) return;
      const t = (now - start) / 1000;

      // 静止 3.2s 后自动巡游阶段
      if (now - lastMove > 3200) {
        targetStage = (Math.floor(t / 5.2) % 4) as Stage;
      }
      currentStage += (targetStage - currentStage) * 0.045;
      density += (targetDensity - density) * 0.05;

      drawActor(t, currentStage, density);

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uOpacity, 0.92);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      raf = requestAnimationFrame(render);
    };

    if (reduce) {
      drawActor(0, 0, 0.6);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uOpacity, 0.8);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      raf = requestAnimationFrame(render);
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return <canvas ref={hostRef} className={className} aria-hidden="true" />;
}
