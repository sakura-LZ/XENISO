import type { Template } from "@/lib/experience/templates";
import { operationResult, sampleRows, type ChoiceState } from "@/lib/experience/operations";

const requests = [
  ["1", "1", "甲", "创建"], ["1", "1", "甲", "创建"], ["2", "2", "缺失", "创建"],
  ["3", "1", "甲", "取消"], ["4", "1", "甲", "取消"], ["5", "3", "丙", "创建"],
];

/** Source material stays in place while the current decision and result change. */
export function TaskMaterial({ template, choices = [null, null, null], compact = false }: { template: Template; choices?: ChoiceState; compact?: boolean }) {
  const id = template.id;
  const effective = choices.map(value => value ?? "0") as ChoiceState;
  if (id === "clinical_data") return <div className={`task-material ${compact ? "is-compact" : ""}`}>
    <h3>随访记录</h3><div className="task-table-wrap"><table><thead><tr><th scope="col">记录 ID</th><th scope="col">分组</th><th scope="col">随访数值</th></tr></thead><tbody>{sampleRows.map((row, i) => {
      const duplicate = sampleRows.findIndex(other => other.id === row.id) !== i;
      const excluded = choices[0] === "1" && duplicate || choices[1] === "1" && row.value === null || choices[2] === "1" && row.group !== "A" || choices[2] === "2" && row.group !== "B";
      return <tr key={i} className={excluded ? "is-excluded" : ""}><td>{row.id}{duplicate && <span className="task-cell-note">重复 ID</span>}</td><td>{row.group}</td><td className={row.value === null ? "is-missing" : ""}>{row.value ?? "缺失"}{excluded && <span className="task-cell-note">已排除</span>}</td></tr>;
    })}</tbody></table></div></div>;
  if (id === "software") return <div className={`task-material ${compact ? "is-compact" : ""}`}><h3>预约请求</h3><div className="task-table-wrap"><table><thead><tr>{["请求 ID", "预约 ID", "姓名", "操作"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{requests.map((row, i) => <tr key={i} className={choices[0] === "1" && row[2] === "缺失" ? "is-excluded" : ""}>{row.map((cell, j) => <td key={j} className={cell === "缺失" ? "is-missing" : ""}>{cell}</td>)}</tr>)}</tbody></table></div></div>;
  if (id === "signals") {
    const result = operationResult(id, effective, 2);
    return <figure className={`task-material task-waveform ${compact ? "is-compact" : ""}`}><h3>教学正弦波与噪声</h3><svg viewBox="0 0 600 200" role="img" aria-label="2 Hz参考正弦波、叠加12 Hz噪声与处理后信号"><path d="M0 100H600" stroke="#CEDDD1" />{result.series!.map((line, i) => <polyline key={line.label} points={line.values.map((value, index) => `${index * 600 / (line.values.length - 1)},${100 - value * 56}`).join(" ")} fill="none" stroke={["#52645B", "#8A642E", "#477D91"][i]} strokeWidth="2.5" />)}</svg><figcaption><span>灰：参考</span><span>棕：含噪</span><span>蓝：处理后</span></figcaption><p className="task-source">2 Hz 正弦波 + 12 Hz 噪声，不是患者心电图。</p></figure>;
  }
  if (id === "imaging_eng") {
    const result = operationResult(id, effective, 2);
    return <figure className={`task-material task-pixels ${compact ? "is-compact" : ""}`}><h3>合成几何影像</h3><svg viewBox="0 0 16 16" role="img" aria-label="16乘16固定教学像素">{result.pixels!.map((value, i) => <rect key={i} x={i % 16} y={Math.floor(i / 16)} width="1" height="1" fill={`rgb(${value},${value},${value})`} />)}</svg><figcaption>16 × 16 几何方块，不是患者影像。</figcaption></figure>;
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
  return <div className={`task-material ${compact ? "is-compact" : ""}`}><h3>{id === "medical_ai_pm" ? "需求记录" : id.startsWith("medicine_") ? "沟通与交接记录" : "案例记录"}</h3><ol className="task-evidence-list">{evidence.map((item, i) => <li key={item}><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><p>{item}</p></li>)}</ol>{!compact && <p className="task-source">{template.brief}</p>}</div>;
}

export function TaskModePreview({ template, mode }: { template: Template; mode: "project" | "interview" }) {
  if (mode === "project") return <div className="task-mode-preview" data-motion="M-E03"><TaskMaterial template={template} compact /><div className="task-preview-outcome"><span>成果</span><strong>{template.deliverable}</strong></div></div>;
  return <div className="task-mode-preview task-interview-preview" data-motion="M-E04"><p className="task-source">{template.role} · 案例问题</p><p className="task-preview-question">{template.stages[0].question}</p><div className="task-preview-evidence">{template.stages[0].options.map(option => <span key={option.value}>{option.label}</span>)}</div><div className="task-preview-answer">选择证据，并说明你的依据</div></div>;
}
