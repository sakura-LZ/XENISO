"use client";

/**
 * 色键（chroma key）墨迹舞台
 * ---------------------------------------------------------------------------
 * 做法：先在离屏 2D canvas 上用纯绿幕底色（#00ff00）画一段循环的水墨动画，
 * 每帧作为纹理送进 WebGL，片元着色器逐像素做色键：把绿色分量占优的像素变透明，
 * 同时对边缘做去绿溢色（spill suppression），最后叠在页面纸底之上。
 *
 * 鼠标横向移动切换 4 个形态，每个形态对应首页四步里的一步：
 *   01 盘点（墨环：一层层摊开）→ 02 评价（墨涡：向内收拢成交集）
 *   → 03 体验（脉迹：真实节律）→ 04 规划（格纸：排进周次）。
 * 纵向移动改墨色浓淡；指针静止 3.2 秒后自动巡游。
 * prefers-reduced-motion 时只渲染一帧静态图。
 *
 * 之所以不用现成视频：色键在这里是实时做的，任何 DPI 下都锐利、零加载体积，
 * 而且能跟着鼠标变形；换成绿幕 mp4 反而做不不到"随鼠标换阶段"。
 */

import { useEffect, useRef, useState } from "react";

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
  /* 上下文丢失后自增，用来把整个 WebGL 装配重跑一遍 */
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const canvas = hostRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
    if (!gl) {
      canvas.style.display = "none";
      return;
    }

    /**
     * 上下文丢失恢复。
     * 浏览器在 GPU 重置、切标签页回来、内存压力、或连续大量截图时会把 WebGL 上下文丢掉。
     * 不处理的话画布就永久空白——实测连续截图时丢了 2 次，屏幕上就是一块什么都没有的纸。
     * 做法：丢失时 preventDefault（告诉浏览器"我要恢复"），恢复时把整个 effect 重跑一遍
     * （用一个 epoch 计数器触发），资源重建后接着画。
     */
    const onLost = (event: Event) => {
      event.preventDefault();
      setEpoch((n) => n + 1);
    };
    canvas.addEventListener("webglcontextlost", onLost, false);

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
    /* 墨迹重心：桌面端舞台是「左文案 + 右墨迹」两栏，右栏从 32.5rem 起，
       所以把形态中心放在画布 68% 处，否则大半墨迹被文案挡在下面看不见。
       窄屏改成上下堆叠，中心回到 50%。 */
    let cxRatio = 0.5;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      off.width = Math.min(960, w);
      off.height = Math.round((off.width * h) / Math.max(1, w));
      cxRatio = rect.width >= 1024 ? 0.68 : 0.5;
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
    /* 色键有一条硬约束：半透明的墨会先和绿幕混色，混出来的绿仍占优，
       抠像时又被抠掉一半——墨画得再"深"落纸也是淡的。这就是它之前
       在纸上几乎看不出在动的原因。所以墨一律用不透明实色，
       浓淡靠换色值（墨黑 / 石墨 / 淡灰 / 赭石）与笔触粗细，密度靠笔数。 */
    const INK = "rgb(26, 24, 20)";
    const INK_MID = "rgb(78, 74, 63)";
    const INK_SOFT = "rgb(132, 126, 111)";
    const OCHRE_INK = "rgb(143, 71, 38)";

    const drawActor = (t: number, stage: number, dens: number) => {
      const w = off.width;
      const h = off.height;
      // 纯绿幕底
      offCtx.globalCompositeOperation = "source-over";
      offCtx.fillStyle = GREEN;
      offCtx.fillRect(0, 0, w, h);

      const cx = w * cxRatio;
      const cy = h * 0.52;
      const unit = Math.min(w, h);
      // 形态的水平半宽：桌面端只铺右栏，窄屏铺满
      const span = Math.min(w * (cxRatio > 0.6 ? 0.27 : 0.35), h * 0.62);
      const squash = 0.74;
      const weight = Math.max(2.5, unit * 0.012);
      const hair = Math.max(1.6, unit * 0.006);
      // 纵向移动鼠标改浓淡：整体换一档颜色，不靠 alpha
      const tone = (dark: string, mid: string, soft: string) =>
        dens > 0.72 ? dark : dens > 0.42 ? mid : soft;

      offCtx.lineCap = "round";
      offCtx.lineJoin = "round";

      const stroke = (points: Array<[number, number]>, color: string, width: number) => {
        offCtx.beginPath();
        points.forEach(([x, y], index) => (index === 0 ? offCtx.moveTo(x, y) : offCtx.lineTo(x, y)));
        offCtx.strokeStyle = color;
        offCtx.lineWidth = width;
        offCtx.stroke();
      };

      // 环：横竖比例压扁，带手绘抖动
      const ring = (rx: number, ry: number, wobble: number, color: string, width: number, phase = 0) => {
        const points: Array<[number, number]> = [];
        const steps = 128;
        for (let i = 0; i <= steps; i += 1) {
          const angle = (i / steps) * Math.PI * 2;
          const k = 1 + Math.sin(angle * 3 + t * 1.1 + phase) * wobble;
          points.push([cx + Math.cos(angle) * rx * k, cy + Math.sin(angle) * ry * k]);
        }
        stroke(points, color, width);
      };

      if (stage < 0.5) {
        /* 01 盘点 · 墨环
           一圈套一圈的等高线：手上的东西先一层层摊开清点。
           环的粗细一厚一薄交替，像蘸墨写下的重笔与轻笔。 */
        for (let i = 0; i < 10; i += 1) {
          const k = i / 9;
          const rx = span * (0.20 + k * 0.80);
          const main = i % 2 === 0;
          ring(
            rx,
            rx * squash,
            0.018 + k * 0.026,
            main ? tone(INK, INK, INK_MID) : tone(INK_MID, INK_MID, INK_SOFT),
            main ? weight * (1.35 - k * 0.5) : hair * 1.3,
            i * 1.7,
          );
        }
        // 刻度：清点时会一行行划过去的短笔
        const ticks = 44;
        for (let i = 0; i < ticks; i += 1) {
          const angle = (i / ticks) * Math.PI * 2 + t * 0.04;
          const r = span * (0.55 + (i % 4) * 0.11);
          const x0 = cx + Math.cos(angle) * r;
          const y0 = cy + Math.sin(angle) * r * squash;
          stroke(
            [
              [x0, y0],
              [x0 + Math.cos(angle) * span * 0.09, y0 + Math.sin(angle) * span * 0.09 * squash],
            ],
            tone(INK, INK_MID, INK_SOFT),
            hair,
          );
        }
        ring(span * 1.0, span * squash, 0.02, OCHRE_INK, hair * 1.1, 2.1);
      } else if (stage < 1.5) {
        /* 02 评价 · 墨涡
           螺旋向内收：兴趣与能力绕同一中心，收口处只留下交集。 */
        for (let s = 0; s < 4; s += 1) {
          const points: Array<[number, number]> = [];
          const steps = 340;
          const turns = 2.4 + s * 0.7;
          const reach = span * (0.46 + s * 0.18);
          const direction = s % 2 === 0 ? 1 : -1;
          for (let i = 0; i <= steps; i += 1) {
            const p = i / steps;
            const angle = p * Math.PI * 2 * turns * direction + t * (0.5 + s * 0.14) + s;
            const r = span * 0.06 + p * reach;
            points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * squash]);
          }
          stroke(points, s === 0 ? tone(INK, INK, INK_MID) : tone(INK_MID, INK_SOFT, INK_SOFT), weight * (1.2 - s * 0.18));
        }
        // 收口：三道同心椭圆
        ring(span * 0.30, span * 0.30 * squash, 0.03, tone(INK, INK_MID, INK_SOFT), weight, 0.6);
        ring(span * 0.19, span * 0.19 * squash, 0.04, tone(INK, INK_MID, INK_SOFT), hair * 1.4, 1.4);
        ring(span * 0.09, span * 0.09 * squash, 0.05, OCHRE_INK, hair, 2.2);
      } else if (stage < 2.5) {
        /* 03 体验 · 脉迹
           三道心电节律：真的做过一遍，才知道它的节奏。 */
        const trace = (offset: number, amp: number, color: string, width: number, speed: number) => {
          const points: Array<[number, number]> = [];
          const steps = 460;
          for (let i = 0; i <= steps; i += 1) {
            const p = i / steps;
            const x = cx - span * 1.12 + p * span * 2.24;
            const phase = (((p * 5 - t * speed) % 1) + 1) % 1;
            let v = Math.sin(phase * Math.PI * 2) * 0.1;
            if (phase > 0.42 && phase < 0.47) v = -0.55;
            else if (phase > 0.47 && phase < 0.53) v = 2.2;
            else if (phase > 0.53 && phase < 0.58) v = -0.7;
            points.push([x, cy + offset - v * amp * unit * 0.11]);
          }
          stroke(points, color, width);
        };
        trace(-span * 0.3, 1.05, tone(INK, INK, INK_MID), weight * 1.5, 0.52);
        trace(span * 0.02, 0.72, tone(INK, INK_MID, INK_SOFT), weight * 1.15, 0.78);
        trace(span * 0.3, 0.46, tone(INK_MID, INK_MID, INK_SOFT), weight * 0.9, 1.02);
        trace(span * 0.54, 0.3, tone(INK_MID, INK_SOFT, INK_SOFT), hair * 1.3, 1.3);
        // 基线与刻度：像心率纸上的格子
        const baseY = cy + span * 0.58;
        stroke(
          [
            [cx - span * 1.12, baseY],
            [cx + span * 1.12, baseY],
          ],
          tone(INK_MID, INK_SOFT, INK_SOFT),
          hair,
        );
        for (let i = 0; i <= 30; i += 1) {
          const x = cx - span * 1.12 + (i / 30) * span * 2.24;
          stroke(
            [
              [x, baseY],
              [x, baseY + (i % 5 === 0 ? span * 0.13 : span * 0.07)],
            ],
            tone(INK, INK_MID, INK_SOFT),
            hair,
          );
        }
      } else {
        /* 04 规划 · 格纸
           排进周次的表格：填到第几格，就是已经排到哪里。 */
        const cols = 7;
        const rows = 4;
        const gw = span * 2.0;
        const gh = span * 1.06;
        const x0 = cx - gw / 2;
        const y0 = cy - gh / 2;
        const cw = gw / cols;
        const chh = gh / rows;
        // 已排进去的格子慢慢推进；起点不是 0，免得某一帧整张纸是空的
        const filled = Math.floor((0.32 + 0.68 * (Math.sin(t * 0.5) * 0.5 + 0.5)) * cols * rows);

        // 斜线铺底：只填"已经排进去"的格子
        for (let i = 0; i < filled; i += 1) {
          const c = i % cols;
          const r = Math.floor(i / cols);
          if (r >= rows) break;
          const bx = x0 + c * cw + 2;
          const by = y0 + r * chh + 2;
          offCtx.save();
          offCtx.beginPath();
          offCtx.rect(bx, by, cw - 4, chh - 4);
          offCtx.clip();
          offCtx.beginPath();
          for (let sx = -chh; sx < cw; sx += 5) {
            offCtx.moveTo(bx + sx, by + chh);
            offCtx.lineTo(bx + sx + chh, by);
          }
          offCtx.strokeStyle = tone(INK, INK_MID, INK_MID);
          offCtx.lineWidth = hair;
          offCtx.stroke();
          offCtx.restore();
        }

        // 格线
        for (let c = 0; c <= cols; c += 1) {
          const x = x0 + cw * c;
          stroke(
            [
              [x, y0],
              [x, y0 + gh],
            ],
            c % 7 === 0 ? tone(INK, INK, INK_MID) : tone(INK_MID, INK_MID, INK_SOFT),
            c % 7 === 0 ? weight * 1.1 : weight * 0.75,
          );
        }
        for (let r = 0; r <= rows; r += 1) {
          const y = y0 + chh * r;
          stroke(
            [
              [x0, y],
              [x0 + gw, y],
            ],
            r % 4 === 0 ? tone(INK, INK, INK_MID) : tone(INK_MID, INK_MID, INK_SOFT),
            r % 4 === 0 ? weight * 1.1 : weight * 0.75,
          );
        }
        // 外框用赭石重描一遍：这张表是要贴在墙上的
        stroke(
          [
            [x0, y0],
            [x0 + gw, y0],
            [x0 + gw, y0 + gh],
            [x0, y0 + gh],
            [x0, y0],
          ],
          OCHRE_INK,
          hair * 1.6,
        );
      }

      // 落笔时溅出的墨点：少量、实心，保持"活物"感
      offCtx.fillStyle = tone(INK, INK_MID, INK_SOFT);
      const drops = 6;
      for (let i = 0; i < drops; i += 1) {
        const angle = t * 0.7 + (i / drops) * Math.PI * 2;
        const r = span * (0.95 + Math.sin(t * 1.1 + i) * 0.12);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle * 1.13) * r * squash;
        const size = Math.max(1.5, unit * (0.006 + (Math.sin(t * 2 + i) * 0.5 + 0.5) * 0.006));
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
      gl.uniform1f(uOpacity, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      raf = requestAnimationFrame(render);
    };

    if (reduce) {
      drawActor(0, 0, 0.6);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uOpacity, 0.95);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      raf = requestAnimationFrame(render);
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", onLost, false);
      ro.disconnect();
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [epoch]);

  return <canvas ref={hostRef} className={className} aria-hidden="true" />;
}
