export type Mode = "project" | "interview";
export type Operation = { title: string; question: string; options: { value: string; label: string }[] };
export type Template = { id: string; direction: string; discipline?: string; role: string; title: string; brief: string; deliverable: string; stages: [Operation, Operation, Operation] };
const operation = (title: string, question: string, labels: string[]): Operation => ({ title, question, options: labels.map((label, i) => ({ value: String(i), label })) });
export const medicineDisciplines = [
  { template_id: "medicine_internal", name: "内科学" },
  { template_id: "medicine_surgery", name: "外科学" },
  { template_id: "medicine_obgyn", name: "妇产科学" },
  { template_id: "medicine_pediatrics", name: "儿科学" },
];
export const medicineNamingSource = { title: "上海交通大学研招网公开目录（2026）", url: "https://yzb.sjtu.edu.cn/storage/gs/web/yzbcn/article/2026/03/696a59c2f7ccecc45649e9d5500ef7a0.xlsx", note: "仅核对学科名称；不据此认定当前招生、学硕/专硕代码、报考或执业资格。" };
export const experienceTemplates: Template[] = [
  { id: "medicine_obgyn", direction: "medicine", role: "妇产科带教医师", title: "妇产科学：尊重沟通意愿与隐私", brief: "虚构教学情景涉及沟通意愿、隐私偏好、陪同者在场安排和待核对记录。只练习沟通协作，不涉及诊疗或法律判断。", deliverable: "妇产科沟通与交接卡", stages: [operation("记录信息与意愿", "如何整理本人表达与陪同者补充？", ["混写为一份已确认记录", "区分来源并记录本人沟通意愿"]), operation("安排沟通环境", "如何处理隐私与陪同者在场偏好？", ["默认全程共同沟通", "先询问意愿并记录待确认安排"]), operation("交接待核对事项", "如何向带教交接未确认的沟通安排？", ["省略未知项", "记录事项与责任人", "记录事项、责任人和确认时点"])] },
  { id: "ml_cv", direction: "ml_cv", role: "医学 AI 算法工程师", title: "换设备后，模型还可靠吗？", brief: "100条固定合成预测记录分为A、B两组设备。比较样本、阈值与错误取舍，不用于评价临床性能。", deliverable: "模型验证卡", stages: [operation("选择验证样本", "先查看哪组设备的数据？", ["设备 A", "设备 B", "两组设备"]), operation("调整判定阈值", "比较阈值变化带来的漏报和误报", ["阈值 0.3", "阈值 0.5", "阈值 0.7"]), operation("确定复核策略", "哪些模型结果需要人工复核？", ["仅复核预测阳性", "复核全部记录", "仅复核预测阴性"])] },
  { id: "software", direction: "software", role: "医疗软件工程师", title: "重复提交的预约请求", brief: "六条合成请求中有重复请求ID、空姓名、重复预约和取消请求。定义规则，再观察接口执行结果。", deliverable: "接口与用例卡", stages: [operation("约束输入", "如何处理缺失姓名的请求？", ["全部接收", "拒绝空姓名"]), operation("处理重复提交", "怎样识别重复请求？", ["不去重", "按请求 ID 去重", "按预约 ID 去重"]), operation("定义状态流转", "已取消的预约再次收到取消请求时怎么办？", ["拒绝重复取消", "返回原取消结果"])] },
  { id: "llm_agent", direction: "llm_agent", role: "医疗 AI 应用工程师", title: "让资料助手知道何时停下来", brief: "固定测试集包含手册内问题、手册外问题和需要人工处理的问题。所有答案路由由规则计算，不是真实模型准确率。", deliverable: "Agent 证据与路由卡", stages: [operation("选择证据集", "向助手开放哪些资料？", ["一份设备手册", "设备手册与使用说明", "不提供资料"]), operation("设置未知处理", "资料不足的问题怎样处理？", ["仍然回答", "标为未知并追问"]), operation("限定工具", "需要人工处理的事项怎样路由？", ["允许自动执行", "交给人工确认"])] },
  { id: "devices", direction: "devices", role: "医疗器械研发工程师", title: "给监测原型划定首期范围", brief: "用合成预算点数比较采集、通信和测试组合。点数仅用于教学取舍，不代表真实功耗、成本或医疗器械性能。", deliverable: "原型需求与测试卡", stages: [operation("选择采集方案", "有限预算下采用哪种采集配置？", ["基础采集（2点）", "多通道采集（5点）"]), operation("选择通信方案", "怎样传输教学数据？", ["本地记录（1点）", "无线同步（3点）"]), operation("选择测试组合", "用哪些固定用例检查原型？", ["正常输入", "正常与断连", "正常、断连与异常边界"])] },
  { id: "signals", direction: "signals", role: "生物医学信号工程师", title: "抑制噪声，也要保留原信号", brief: "固定的2Hz教学正弦波叠加12Hz噪声。观察采样与移动平均造成的变化；此波形不是心电或患者记录。", deliverable: "信号处理对比卡", stages: [operation("选择采样率", "每秒采多少个点？", ["16 Hz", "32 Hz", "64 Hz"]), operation("设置平滑窗口", "移动平均窗口如何影响误差？", ["1点（不平滑）", "3点", "7点"]), operation("选定比较范围", "用哪段数据做误差比较？", ["全部采样点", "中间半段采样点"])] },
  { id: "imaging_eng", direction: "imaging_eng", role: "医学影像工程师", title: "一幅合成图像的质量检查", brief: "16×16几何方块叠加固定噪声。窗口和降噪只作用于教学像素，不解释疾病，不外推临床图像质量。", deliverable: "影像质控卡", stages: [operation("调整显示窗口", "选择显示上限，观察像素截断", ["上限 255", "上限 180", "上限 100"]), operation("设置降噪", "是否采用3×3邻域均值？", ["不降噪", "3×3均值"]), operation("选择核对区域", "比较哪个区域与参考图的误差？", ["全图", "中央方块", "背景区域"])] },
  { id: "clinical_data", direction: "clinical_data", role: "临床数据分析师", title: "分析前先检查数据", brief: "八条虚构随访记录含重复ID、缺失值和两个分组。只做描述统计，不作疗效或因果判断。", deliverable: "数据质量与分析计划卡", stages: [operation("处理重复记录", "相同ID的记录怎样保留？", ["全部保留", "每个 ID 保留第一条"]), operation("处理缺失值", "缺失的随访数值怎样处理？", ["保留并单独计数", "仅保留完整记录"]), operation("选择统计范围", "查看哪组的描述性结果？", ["所有组", "A 组", "B 组"])] },
  { id: "health_systems", direction: "health_systems", role: "医院信息化项目负责人", title: "一次转诊需要交接什么？", brief: "六条虚构转诊事件存在缺失字段、重复通知和待确认交接。比较流程规则对队列的影响，不处理真实临床转诊。", deliverable: "流程与数据字典卡", stages: [operation("核对必要字段", "缺失科室的记录进入队列吗？", ["全部进入", "缺失科室退回核对"]), operation("设置通知去重", "按什么规则合并通知？", ["不合并", "按事件 ID 合并"]), operation("设置交接确认", "哪些事件进入已交接队列？", ["发出就算完成", "收到团队确认后完成"])] },
  { id: "med_nlp_kg", direction: "med_nlp_kg", role: "医疗 NLP 工程师", title: "短句里的信息能直接入图谱吗？", brief: "四条人工编写的教学短句包含肯定、否定和不确定表达；固定词表只是教学词表。", deliverable: "标注与关系草案卡", stages: [operation("选择实体范围", "抽取哪类教学词？", ["症状词", "症状词与检查词"]), operation("处理否定", "“无咳嗽”中的实体如何记录？", ["按肯定记录", "标记为否定"]), operation("处理不确定", "“疑似”关系能标为已确认吗？", ["作为已确认关系", "保留不确定状态"])] },
  { id: "medicine_internal", direction: "medicine", role: "内科带教医师", title: "内科：把信息交代清楚", brief: "虚构教学交接：本人叙述、家属补充、未核对的既往记录和待确认的沟通需求。只整理来源和待办，不提供诊断或治疗。", deliverable: "内科沟通交接卡", stages: [operation("整理信息来源", "怎样区分叙述与已核实记录？", ["全部写为已确认", "保留各项来源与核对状态"]), operation("安排沟通", "怎样确认对方理解了交接目的？", ["单向说明", "说明后邀请对方复述与提问"]), operation("交接待办", "如何记录尚未核对的信息？", ["暂时省略", "记录事项与责任人", "记录事项、责任人和核对时点"])] },
  { id: "medicine_surgery", direction: "medicine", role: "外科带教医师", title: "外科：团队核对与交接", brief: "虚构教学材料包括身份、文书版本、团队确认及沟通记录。体验文书与协作核对，不涉及术式选择、操作或围术期医疗决策。", deliverable: "外科团队核对卡", stages: [operation("核对文书", "发现不同版本记录时怎样整理？", ["任选一份作为最终版", "标记版本冲突并交带教核对"]), operation("明确沟通对象", "团队确认应记录哪些内容？", ["只写已沟通", "记录对象、事项和确认状态"]), operation("形成交接清单", "如何交接未解决的版本冲突？", ["不记录", "记录待办与责任人", "记录待办、责任人和跟进时点"])] },
  { id: "medicine_pediatrics", direction: "medicine", role: "儿科带教医师", title: "儿科：听见孩子与照护者", brief: "虚构教学沟通包含儿童表达、照护者转述与待核对文书。比较沟通安排和信息来源，不生成诊疗或监护法律结论。", deliverable: "儿科沟通协作卡", stages: [operation("区分表达来源", "孩子和照护者的表达怎样记录？", ["合成一条无来源记录", "分别保留表达来源"]), operation("选择沟通安排", "怎样让不同表达都被听见？", ["只听照护者", "适龄沟通并核对照护者补充"]), operation("明确跟进事项", "怎样向团队交接尚未核实的内容？", ["省略未知项", "记录待办与责任人", "记录待办、责任人和回访时点"])] },
  { id: "medical_ai_pm", direction: "health_systems", role: "医学 AI 产品经理", title: "医院辅助分诊的首期方案", brief: "合成教学情景：患者希望少走弯路，护士希望信息完整，医生要求人工处理高风险事项。系统只提供建议，不诊断。", deliverable: "简化 PRD", stages: [operation("界定用户", "需求核对覆盖谁？", ["只核对患者", "核对患者与护士", "核对患者、护士与医生"]), operation("确定首期功能", "在固定两项名额内选择组合", ["科室推荐与多语言", "信息采集与人工转接", "信息采集与科室推荐"]), operation("确定验证方案", "如何记录首期方案验证？", ["只记录满意度", "记录任务完成与人工交接", "记录任务完成、人工交接与失败案例"])] },
];
export function getTemplate(direction: string, templateId?: string): Template {
  const selectedId = templateId ?? (direction === "medicine" ? "medicine_internal" : undefined);
  const found = experienceTemplates.find(item => item.direction === direction && (!selectedId || item.id === selectedId));
  if (!found) throw new Error("请选择方向内的体验场景。");
  return found;
}
export function stageTitles(template: Template, mode: Mode) {
  return mode === "interview" ? ["选择证据与解释", "案例决策与理由", "修订方案与反问"] : template.stages.map(stage => stage.title);
}
