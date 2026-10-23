import type { Template } from "@/lib/experience/templates";
import { operationResult, sampleRows, type ChoiceState } from "@/lib/experience/operations";

const requests = [
  ["1", "1", "甲", "创建"], ["1", "1", "甲", "创建"], ["2", "2", "缺失", "创建"],
  ["3", "1", "甲", "取消"], ["4", "1", "甲", "取消"], ["5", "3", "丙", "创建"],
];

const seriesColors = ["var(--green)", "var(--ochre)", "var(--ink-3)"];

/** 材料固定在原位，只有当前决策和结果会跟着变。 */
export function TaskMaterial({ template, choices = [null, null, null], compact = false }: { template: Template; choices?: ChoiceState; compact?: boolean }) {
  const id = template.id;
  const effective = choices.map(value => value ?? "0") as ChoiceState;
  // compact 只用在「按项目做 / 按面试做」的预览框里。那个框已有 h4 作标题，
  // 再出一个 h3 区块标题（21px）会让字号在 13/16/21 之间乱跳，
  // 读起来像"句子中间突然有几个字变大"。所以 compact 时降为标签档。
  const head = (title: string, note?: string) => (
    <div className="xd-sheet-head">
      {compact ? <p className="xd-sheet-cap">{title}</p> : <h3>{title}</h3>}
      {note && !compact && <p className="xd-sheet-note">{note}</p>}
    </div>
  );

  if (id === "clinical_data") return <div className={compact ? "" : "atlas-sheet xd-tight"}>
    {head("随访记录", "共 8 条合成记录")}
    <div className="xd-table-wrap">
      <table className="xd-table">
        <thead><tr><th scope="col">记录 ID</th><th scope="col">分组</th><th scope="col">随访数值</th></tr></thead>
        <tbody>{sampleRows.map((row, i) => {
          const duplicate = sampleRows.findIndex(other => other.id === row.id) !== i;
          const excluded = choices[0] === "1" && duplicate || choices[1] === "1" && row.value === null || choices[2] === "1" && row.group !== "A" || choices[2] === "2" && row.group !== "B";
          return <tr key={i} className={excluded ? "is-excluded" : ""}><td>{row.id}{duplicate && <span className="xd-cell-note">重复 ID</span>}</td><td>{row.group}</td><td className={row.value === null ? "is-missing" : ""}>{row.value ?? "缺失"}{excluded && <span className="xd-cell-note">已排除</span>}</td></tr>;
        })}</tbody>
      </table>
    </div>
  </div>;

  if (id === "software") return <div className={compact ? "" : "atlas-sheet xd-tight"}>
    {head("预约请求", "六条合成请求")}
    <div className="xd-table-wrap">
      <table className="xd-table">
        <thead><tr>{["请求 ID", "预约 ID", "姓名", "操作"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{requests.map((row, i) => <tr key={i} className={choices[0] === "1" && row[2] === "缺失" ? "is-excluded" : ""}>{row.map((cell, j) => <td key={j} className={cell === "缺失" ? "is-missing" : ""}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </div>;

  if (id === "signals") {
    const result = operationResult(id, effective, 2);
    return <figure className={compact ? "xd-figure" : "atlas-sheet xd-tight xd-figure"}>
      {head("教学正弦波与噪声")}
      <svg viewBox="0 0 600 180" role="img" aria-label="2 Hz 参考正弦波、叠加 12 Hz 噪声与移动平均后的信号">
        <title>固定教学正弦波</title>
        <path d="M0 96H600" style={{ stroke: "var(--line)" }} />
        {result.series!.map((line, i) => <polyline key={line.label} points={line.values.map((value, index) => `${index * 600 / (line.values.length - 1)},${96 - value * 62}`).join(" ")} fill="none" style={{ stroke: seriesColors[i] }} strokeWidth="2.4" />)}
      </svg>
      <figcaption>绿：参考 · 赭：含噪 · 蓝：处理后。2 Hz 正弦波叠加 12 Hz 噪声，不是患者心电图。</figcaption>
    </figure>;
  }

  if (id === "imaging_eng") {
    const result = operationResult(id, effective, 2);
    return <figure className={compact ? "xd-figure xd-pixels" : "atlas-sheet xd-tight xd-figure xd-pixels"}>
      {head("合成几何影像")}
      <svg viewBox="0 0 16 16" role="img" aria-label="16 乘 16 的固定教学像素">
        <title>合成几何图形</title>
        {result.pixels!.map((value, i) => <rect key={i} x={i % 16} y={Math.floor(i / 16)} width="1" height="1" fill={`rgb(${value},${value},${value})`} />)}
      </svg>
      <figcaption>16 × 16 几何方块，不是患者影像。</figcaption>
    </figure>;
  }

  const evidence = id === "medical_ai_pm" ? ["患者：少走弯路", "护士：信息完整", "医生：高风险事项转人工"]
    : id === "health_systems" ? ["事件 ID：1、1、2、3、4、5", "事件 2、4 缺少科室", "事件 3 未收到交接确认"]
    : id === "med_nlp_kg" ? ["有咳嗽", "无咳嗽", "疑似发热", "记录检查甲"]
    : id === "llm_agent" ? ["设备手册内的问题", "使用说明内的问题", "资料之外的问题", "需要人工处理的问题"]
    : id === "devices" ? ["采集：基础 2 点 / 多通道 5 点", "通信：本地 1 点 / 无线 3 点", "测试：正常输入、断连、异常边界"]
    : id === "ml_cv" ? ["设备 A：50 条合成预测", "设备 B：50 条合成预测", "对照标签、预测阈值与人工复核"]
    : id === "medicine_surgery" ? ["身份信息", "文书版本与冲突", "团队确认", "待核对沟通记录"]
    : id === "medicine_obgyn" ? ["本人沟通意愿", "隐私偏好", "陪同者在场安排", "待确认事项"]
    : id === "medicine_pediatrics" ? ["儿童表达", "照护者转述", "待核对文书", "团队跟进事项"]
    : ["本人叙述", "家属补充", "未核对的既往记录", "待确认的沟通需求"];

  const title = id === "medical_ai_pm" ? "需求记录" : id.startsWith("medicine_") ? "沟通与交接记录" : "案例记录";
  const sheet = <div className={compact ? "" : "atlas-sheet xd-tight"}>
    {head(title)}
    <ol className="xd-evidence">
      {evidence.map((item, i) => <li key={item}><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><p>{item}</p></li>)}
    </ol>
    {!compact && <p className="xd-hint">这些是编辑好的固定材料，编号只为对照，按顺序读不代表优先级。</p>}
  </div>;
  return sheet;
}

export function TaskModePreview({ template, mode }: { template: Template; mode: "project" | "interview" }) {
  if (mode === "project") return <div className="xd-mode-preview" data-motion="M-E03">
    <strong>会看到什么材料</strong>
    <TaskMaterial template={template} compact />
    <p style={{ marginTop: 10 }}>产出：{template.deliverable}</p>
  </div>;
  return <div className="xd-mode-preview" data-motion="M-E04">
    <strong>会怎么被问</strong>
    <p>{template.stages[0].question}</p>
    <ul>{template.stages[0].options.map(option => <li key={option.value}>{option.label}</li>)}</ul>
  </div>;
}
