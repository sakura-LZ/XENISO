import Image from "next/image";
import { operationResult, sampleRows } from "@/lib/experience/operations";

const identities: Record<string, { file: string; alt: string }> = {
  clinical_data: { file: "data-extraction", alt: "临床数据工作的文件、数据屏幕与服务器" },
  software: { file: "programming", alt: "软件开发者、代码窗口与设备" },
  medicine: { file: "doctors", alt: "医务人员与工作记录" },
  health_systems: { file: "server", alt: "信息系统的服务器与维护人员" },
};

/** The task graphics use the same fixed teaching data and calculator as the workbench. */
export function DirectionArt({ direction, mode = "identity", compact = false, chapter }: { direction: string; mode?: "identity" | "task"; compact?: boolean; chapter?: string }) {
  const identity = identities[direction];
  if (identity && mode === "identity") return <div className={`xn-direction-art xn-direction-identity ${compact ? "is-compact" : ""}`} data-chapter={chapter}><Image src={`/careerexplorer/${identity.file}-pana.svg`} alt={identity.alt} width={320} height={240} unoptimized /></div>;
  let graphic;
  if (direction === "signals") {
    const result = operationResult("signals", ["2", "1", "0"], 2);
    graphic = <><svg viewBox="0 0 240 135" role="img" aria-label="同一份2Hz教学波形，原始含噪曲线与3点移动平均后的曲线"><path d="M5 67H235M5 10V125" fill="none" stroke="#CEDDD1" />{result.series?.slice(1).map((series, index) => <polyline key={series.label} fill="none" stroke={index ? "#315E43" : "#477D91"} strokeWidth="2.5" points={series.values.map((v, i) => `${8 + i * 224 / (series.values.length - 1)},${68 - v * 36}`).join(" ")} />)}</svg>{!compact && <p className="xn-art-label">灰蓝：含噪波形 · 绿：处理后</p>}</>;
  } else if (direction === "imaging_eng") {
    const before = operationResult("imaging_eng", ["0", "0", "0"], 2);
    const after = operationResult("imaging_eng", ["0", "1", "0"], 2);
    graphic = <><div className="xn-pixel-pair">{[before, after].map((result, n) => <svg key={n} viewBox="0 0 16 16" role="img" aria-label={n ? "3×3均值处理后的16×16教学图像" : "含固定噪声的16×16教学图像"}>{result.pixels?.map((v, i) => <rect key={i} x={i % 16} y={Math.floor(i / 16)} width="1" height="1" fill={`rgb(${v},${v},${v})`} />)}</svg>)}</div>{!compact && <p className="xn-art-label">原始像素 / 3×3均值处理</p>}</>;
  } else if (direction === "ml_cv") {
    const results = [operationResult("ml_cv", ["0", "1", "0"], 2), operationResult("ml_cv", ["1", "1", "0"], 2)];
    graphic = <><svg viewBox="0 0 240 135" role="img" aria-label={`阈值0.5，设备A与B的错误计数：${results.map((r, i) => `设备${i ? "B" : "A"}，误报${r.metrics.假阳性}，漏报${r.metrics.假阴性}`).join("；")}`}><path d="M24 112H226" stroke="#CEDDD1" />{results.map((r, i) => <g key={i}>{["假阳性", "假阴性"].map((key, k) => <rect key={key} x={38 + i * 104 + k * 32} y={112 - Number(r.metrics[key]) * 6} width="25" height={Number(r.metrics[key]) * 6} fill={k ? "#477D91" : "#315E43"} />)}</g>)}</svg>{!compact && <p className="xn-art-label">A / B设备 · 绿：误报 · 蓝：漏报</p>}</>;
  } else if (direction === "clinical_data") {
    graphic = <div className="xn-art-data">{sampleRows.slice(1, 5).map((row, i) => <div key={i} className={row.value === null || i === 1 ? "is-marked" : ""}><span>{row.id}</span><span>{row.group}</span><span>{row.value ?? "缺失"}</span></div>)}</div>;
  } else if (direction === "llm_agent") {
    const result = operationResult("llm_agent", ["1", "1", "1"], 2);
    graphic = <div className="xn-art-routing">{["有依据回答", "标为未知", "人工确认"].map(key => <div key={key}><span>{key}</span><strong>{result.metrics[key]}</strong></div>)}</div>;
  } else if (direction === "med_nlp_kg") {
    graphic = <div className="xn-art-annotation"><p><span>无</span>咳嗽</p><p>疑似<span>发热</span></p>{!compact && <p className="xn-art-label">否定 / 不确定</p>}</div>;
  } else if (direction === "devices") {
    const result = operationResult("devices", ["0", "1", "2"], 2);
    graphic = <div className="xn-art-device"><div className="xn-art-modules"><span>采集</span><span>通信</span><span>测试</span></div><div className="xn-art-budget" aria-label={`教学预算6点，已用${result.metrics.已用点数}点`}><span style={{ width: `${Number(result.metrics.已用点数) / 6 * 100}%` }} /></div>{!compact && <p className="xn-art-label">教学预算：{result.metrics.已用点数} / 6 点</p>}</div>;
  } else if (direction === "health_systems") {
    const result = operationResult("health_systems", ["1", "1", "1"], 2);
    graphic = <div className="xn-art-routing">{["退回核对", "已交接", "待确认"].map(key => <div key={key}><span>{key}</span><strong>{result.metrics[key]}</strong></div>)}</div>;
  } else if (direction === "software") {
    graphic = <div className="xn-art-routing"><div><span>请求 ID</span><strong>01</strong></div><div><span>重复请求</span><strong>01</strong></div><div><span>返回已有结果</span></div></div>;
  } else {
    graphic = <div className="xn-art-routing"><div>本人表达</div><div>补充转述</div><div>待核对事项</div></div>;
  }
  return <figure className={`xn-direction-art xn-direction-task ${compact ? "is-compact" : ""}`} data-chapter={chapter}>{graphic}<figcaption>simulation</figcaption></figure>;
}

export function StorysetAttribution() {
  return <p className="xn-storyset-attribution">插画：<a href="https://storyset.com/" target="_blank" rel="noreferrer">Storyset</a> · Pana 系列，已调色与简化。</p>;
}
