/** LIMEN 编辑性实践建议；参考资料支持技术概念，不构成招生或职业资格承诺。 */
export type HandbookDirectionId =
  | "ml_cv" | "software" | "llm_agent" | "devices" | "signals"
  | "imaging_eng" | "clinical_data" | "health_systems" | "med_nlp_kg" | "medicine";

export type HandbookEntry = {
  overview: string;
  daily_work: string[];
  starter_project: {
    title: string;
    question: string;
    inputs: string;
    steps: string[];
    deliverable: string;
    checks: string[];
  };
  prerequisites: string[];
  sources: { title: string; url: string; purpose: string }[];
};

export const handbookEntries: Record<HandbookDirectionId, HandbookEntry> = {
  medicine: {
    overview: "继续医学也是一种主动选择。先从内科学、外科学、妇产科学和儿科学的合成情景，了解信息整理、沟通和团队协作活动。学科与医院科室并非一一对应；体验不能替代见习、规培或执业资格评定。",
    daily_work: ["在带教和岗位权限内整理信息，区分本人观察、转述和待核实内容。", "向患者及家属解释沟通目的，确认理解与参与意愿。", "向团队交接已知事项、未知事项和待跟进工作，按本机构规范核对。"],
    starter_project: {
      title: "完成一份科室沟通与交接卡", question: "内科学、外科学、妇产科学和儿科学相关工作中的沟通重点有哪些差异？",
      inputs: "平台内标明simulation的虚构交接材料，不输入真实病历。",
      steps: ["选择科室并整理信息来源。", "比较沟通或核对方案，记录仍然未知的事项。", "形成责任明确的交接清单并复盘。"],
      deliverable: "信息来源、沟通安排、未知项和交接待办卡。",
      checks: ["不把转述写成已核实事实。", "不据合成案例作诊断或治疗决定。", "说明需要带教及真实临床规范核验的内容。"],
    },
    prerequisites: ["医学伦理与患者隐私", "临床沟通基础", "在带教和权限范围内实践"], sources: [{ title: "上海交通大学研招网公开2026目录", url: "https://yzb.sjtu.edu.cn/storage/gs/web/yzbcn/article/2026/03/696a59c2f7ccecc45649e9d5500ef7a0.xlsx", purpose: "核对内科学、外科学、妇产科学、儿科学名称；不是当前招生、学位类型、专业代码或个人资格核定。" }],
  },
  ml_cv: {
    overview: "把临床问题转成可评价的预测任务，工作重点包括数据划分、基线模型、错误分析和泛化验证。会使用模型只是起点，更重要的是解释模型在什么人群、设备和条件下失效。",
    daily_work: [
      "与使用者约定预测对象、标签定义、决策时点及漏报和误报代价，再检查标签是否可靠。",
      "按患者或数据来源划分训练集与测试集，只在训练数据上拟合标准化等预处理，建立简单基线。",
      "检查混淆矩阵及不同设备、人群的错误案例，记录阈值变化带来的取舍，复现实验。",
    ],
    starter_project: {
      title: "做一份模型阈值决策卡",
      question: "同一个分类模型，在更换设备或调整阈值后，漏报与误报怎样变化？",
      inputs: "平台 simulation 工作台，或自行生成并标明 simulation 的标签、预测分数与设备分组表。",
      steps: ["固定一份评价数据，分别以两个阈值统计 TP、FP、TN、FN。", "按设备分组计算灵敏度、特异度与精确率，检查样本数量。", "选定一个方案，列出被牺牲的指标、适用场景和还缺的验证。"],
      deliverable: "含分组指标、混淆矩阵、阈值理由及局限的决策卡。",
      checks: ["混淆矩阵总数与样本数一致，分母为零时显示无法计算。", "评价数据不参与阈值调优后的独立效果宣称。", "明确数据为 simulation，不能外推临床性能。"],
    },
    prerequisites: ["Python 表格处理与绘图", "概率统计、线性代数基础", "能解释训练集、验证集、测试集及数据泄漏"],
    sources: [{ title: "scikit-learn：Common pitfalls and recommended practices", url: "https://scikit-learn.org/stable/common_pitfalls.html", purpose: "理解预处理不一致、数据泄漏及训练/测试隔离。" }],
  },
  software: {
    overview: "把真实工作流程做成可以持续使用的软件，需要处理需求、数据结构、交互、测试和维护。医学背景能帮助发现流程问题，但仍需用可运行功能和验证结果证明方案有效。",
    daily_work: [
      "观察一个业务流程，将需求写成可检查的行为，例如保存后刷新还能读取、错误输入能得到提示。",
      "设计页面和数据结构，实现输入校验、状态反馈、异常处理与必要权限。",
      "复现缺陷，编写适当的单元、集成或端到端检查，发布后检查运行情况。",
    ],
    starter_project: {
      title: "建立一个学习任务追踪器",
      question: "怎样让用户创建、完成和找回学习任务，而不因刷新丢失状态？",
      inputs: "自拟 simulation 任务列表：任务名称、截止日期、状态；不使用患者资料。",
      steps: ["画出空列表、编辑、已保存及保存失败四种状态。", "实现新增、修改、完成任务及本地持久化。", "用浏览器走一遍新增—刷新—修改—完成，并检查空标题与非法日期。"],
      deliverable: "可运行页面、简短使用说明和一次完整流程的检查记录。",
      checks: ["刷新后的任务与保存结果一致。", "输入失败时定位到字段，用户能用键盘完成操作。", "区分本地保存与云端保存，不把失败显示成成功。"],
    },
    prerequisites: ["一门编程语言与 Git 基础", "HTML、表单与 HTTP 基础", "基本的数据结构和数据库概念"],
    sources: [{ title: "Next.js：Testing", url: "https://nextjs.org/docs/app/guides/testing", purpose: "区分单元、组件、集成和端到端测试，选择与功能相符的验证方式。" }],
  },
  llm_agent: {
    overview: "设计让语言模型在资料与工具之间完成任务的工作流。核心工作包含检索、工具边界、失败处理和逐条评估，不能只用一次流畅回答判断系统质量。",
    daily_work: [
      "定义可回答问题、允许使用的资料、拒绝或追问条件，以及工具可以执行的动作。",
      "记录模型版本、输入、引用和工具结果，分析漏检、引用不支持、工具失败等错误。",
      "维护固定评测集，对比提示或模型改动前后的表现，检查延迟与成本。",
    ],
    starter_project: {
      title: "做一个能指出依据的手册问答",
      question: "系统能否只依据给定手册回答，并对资料没有覆盖的问题明确说不知道？",
      inputs: "三份公开技术文档及自编测试问题；不上传病历或个人隐私。",
      steps: ["整理文档标题、段落和链接，建立包含有答案、无答案及诱导编造问题的小测试集。", "让回答保留支持它的原文片段及来源，记录检索和生成各自的失败。", "比较两个提示版本，逐条检查事实支持、引用对应和未知项处理。"],
      deliverable: "问题—标准依据—系统回答—错误类型对照表及可演示问答流程。",
      checks: ["无答案题不编造来源或结论。", "每个关键事实可在引用原文找到支持。", "工具失败有明确结果，未把执行失败当作已完成。"],
    },
    prerequisites: ["Python 或 TypeScript 与 HTTP/JSON", "检索、文本分段和模型调用基础", "能设计测试集并进行人工错误分析"],
    sources: [{ title: "Hugging Face：Lighteval 官方 README", url: "https://raw.githubusercontent.com/huggingface/lighteval/main/README.md", purpose: "了解自定义任务、指标与逐样本结果；问答项目的人工评分规则由 LIMEN 编辑设计。" }],
  },
  devices: {
    overview: "从临床使用需求出发，把传感器、电子电路、软件与测试组合成器械方案。既要关注测量性能，也要描述使用条件、故障风险和验证方法；教学原型不等同于可用于人体的医疗器械。",
    daily_work: [
      "把临床诉求转为可测量需求，说明使用者、环境、输入输出和不能接受的失败。",
      "比较传感与处理方案，建立台架或仿真测试，记录校准、漂移和噪声。",
      "根据测试结果调整方案，维护需求—测试对应表，并与质量和合规人员协作。",
    ],
    starter_project: {
      title: "设计一个模拟生命体征报警器",
      question: "噪声和短暂异常是否会让报警器频繁误报，延迟确认又会不会漏掉持续异常？",
      inputs: "自制 simulation 数值时间序列，包含正常、短暂尖峰、持续异常及传感器断连。",
      steps: ["写出报警阈值、持续时间和断连提示的需求。", "比较单点阈值与连续多点确认两种规则。", "统计误报、漏报及触发延迟，建立需求与测试用例对照。"],
      deliverable: "报警逻辑图、仿真曲线、风险清单及台架测试计划。",
      checks: ["断连与正常读数能区分。", "测试覆盖持续异常及边界值，并说明延迟代价。", "不进行人体试验，不宣称获得注册或临床安全性证明。"],
    },
    prerequisites: ["生理学与测量误差概念", "电路、传感器和基础编程", "能够把需求转为测试条件"],
    sources: [{ title: "FDA：Overview of Device Regulation", url: "https://www.fda.gov/medical-devices/device-advice-comprehensive-regulatory-assistance/overview-device-regulation", purpose: "了解美国医疗器械监管概览；不能代替中国注册要求或具体器械合规判断。" }],
  },
  signals: {
    overview: "处理 ECG、EEG 等时间序列，判断噪声来源、选择滤波方法并验证特征是否被改变。医学背景帮助理解波形意义，工程训练帮助区分真实生理变化与处理伪影。",
    daily_work: [
      "核对采样率、通道、单位、标注和缺失片段，绘制时域波形及频谱。",
      "识别基线漂移、工频和运动伪影，比较不同滤波或重采样设置。",
      "对照参考标注检查峰值、节律或事件检测误差，记录被排除的片段及原因。",
    ],
    starter_project: {
      title: "比较一段心电的滤波前后变化",
      question: "滤波减少噪声时，是否也改变了峰值位置或波形形态？",
      inputs: "PhysioNet MIT-BIH Arrhythmia Database 的一段公开记录及标注；按数据页要求引用。",
      steps: ["先读取数据说明，记录通道、单位和采样率，截取同一时间段。", "绘制原波形与频谱，比较两组处理参数并叠加显示。", "对照标注列出峰值位置差异，解释仍存在的伪影与方法限制。"],
      deliverable: "可重复运行的分析笔记、前后对比图及参数说明。",
      checks: ["横轴时间与采样率一致，图中注明单位。", "先处理抗混叠再降低采样率，记录实际采样率。", "保留原始信号，不能凭波形变平滑就宣称临床有效。"],
    },
    prerequisites: ["Python 数组与绘图", "信号与系统、频谱和采样定理", "ECG/EEG 基础与标注阅读"],
    sources: [
      { title: "PhysioNet：MIT-BIH Arrhythmia Database v1.0.0", url: "https://physionet.org/content/mitdb/1.0.0/", purpose: "公开 ECG 数据、标注、数据说明与引用方式。" },
      { title: "MNE：Filtering and resampling data", url: "https://mne.tools/stable/auto_tutorials/preprocessing/30_filtering_resampling.html", purpose: "滤波、重采样与混叠注意事项；并非 ECG 项目的完整临床验证方案。" },
    ],
  },
  imaging_eng: {
    overview: "研究医学图像如何形成、重建、配准和被可靠地处理。与单纯训练分类器相比，这个方向更关注物理空间、图像质量、几何关系和算法误差。",
    daily_work: [
      "核对图像的 spacing、origin、direction 和强度单位，判断不同图像能否直接比较。",
      "选择配准、分割或增强方法，设置变换、相似性度量、优化器与插值。",
      "叠加检查解剖结构或合成标记，分析误差、失败样本和参数敏感性。",
    ],
    starter_project: {
      title: "让两幅错位图像重新对齐",
      question: "已知平移和旋转的合成图像，能否用配准恢复位置，哪些初始化会失败？",
      inputs: "自行绘制带标记点的 simulation 二维图像及其已知变换副本，不需要真实影像。",
      steps: ["固定图像坐标与像素间距，生成已知平移/旋转的移动图像。", "设置配准变换和初始化，保留每次参数。", "叠加显示前后结果，比较标记点误差，并尝试一次不良初始化。"],
      deliverable: "图像叠加图、变换参数、标记点误差表及失败分析。",
      checks: ["说明变换是从哪个坐标系到哪个坐标系。", "区分像素距离与物理距离，插值方式可追溯。", "不把合成图像结果当作真实临床影像性能。"],
    },
    prerequisites: ["线性代数与坐标变换", "图像处理与 Python", "基础成像物理和图像元数据概念"],
    sources: [{ title: "SimpleITK：Registration Overview", url: "https://simpleitk.readthedocs.io/en/master/registrationOverview.html", purpose: "配准坐标映射、变换、度量、优化器与初始化的官方说明。" }],
  },
  clinical_data: {
    overview: "把临床数据整理成可分析且可复核的研究资料，重点是定义变量、检查质量、设计分析和解释不确定性。医学知识能帮助发现不合理值，但不能替代研究设计和统计验证。",
    daily_work: [
      "与研究者确定研究对象、观察窗口、暴露与结局，并建立变量字典。",
      "检查缺失、重复、单位和时间顺序，保留清洗规则及排除记录。",
      "进行描述统计与合适的分析，检查敏感性和混杂，输出可复现报告。",
    ],
    starter_project: {
      title: "给一张模拟随访表做数据体检",
      question: "缺失值、重复记录和单位混用会怎样影响对数据的理解？",
      inputs: "自制并标明 simulation 的随访表，含匿名编号、日期、指标与单位，预先植入几种质量问题。",
      steps: ["先写变量定义、取值范围和一人多次记录的规则。", "统计各字段缺失、重复与异常值，区分未知与数值零。", "按明确规则清洗并保存变更日志，比较处理前后样本量和描述统计。"],
      deliverable: "数据字典、质量检查表、清洗脚本及变更日志。",
      checks: ["每条删除或修改有原因，原表可保留并重跑。", "未把缺失统一填为零，未据结果任意排除样本。", "报告只描述 simulation 数据，不推导治疗效果或因果结论。"],
    },
    prerequisites: ["概率统计与流行病学基础", "R 或 Python 表格处理", "数据库、变量定义与研究设计基础"],
    sources: [{ title: "pandas：Working with missing data", url: "https://pandas.pydata.org/docs/user_guide/missing_data.html", purpose: "缺失值类型、检测和处理操作；研究层面的缺失机制判断仍需另外设计。" }],
  },
  health_systems: {
    overview: "让不同医疗系统交换可理解的数据，并让信息系统符合实际工作流程。工作常在临床需求、数据标准、软件实现和质量控制之间展开。",
    daily_work: [
      "梳理门诊、检验或转诊流程，定义参与者、触发事件及数据去向。",
      "对照数据标准设计字段映射，核对标识、编码、单位、时间与资源引用。",
      "测试合法、缺字段、重复和失败重试情况，与使用者核对信息是否完整可用。",
    ],
    starter_project: {
      title: "把一条模拟检验结果变成结构化交换数据",
      question: "不同系统怎样准确理解同一项检验的对象、时间、数值与单位？",
      inputs: "自制 simulation 检验单，以及固定版本的 FHIR 文档；不用真实身份信息。",
      steps: ["列出原始字段及含义，选择适合表示观察结果的资源。", "写出一条示例 JSON，逐字段记录数据类型、单位、编码来源和引用。", "检查缺失单位、错误引用及重复编号，整理预期处理方式。"],
      deliverable: "流程图、字段映射表、模拟资源 JSON 和异常测试表。",
      checks: ["明确使用的 FHIR 版本，资源引用可解析。", "未把能解析 JSON 当作完整标准符合性验证。", "模拟标识与真实身份分离，未知编码不随意编造。"],
    },
    prerequisites: ["临床工作流与数据字典", "HTTP/JSON 和数据库基础", "医疗术语、编码及互操作概念"],
    sources: [{ title: "HL7：FHIR Overview（R5）", url: "https://hl7.org/fhir/overview.html", purpose: "电子医疗信息交换与资源化建模概览；具体实现还需对应资源和实施指南。" }],
  },
  med_nlp_kg: {
    overview: "把医学文本中的术语、实体和关系整理为可检索的知识。核心难点包括同义词、否定、时间、缩写和证据来源，不能只抽出几个词就视为理解了临床语义。",
    daily_work: [
      "确定语料使用条件，编写实体边界、否定和关系标注规则并处理分歧。",
      "使用规则或模型抽取实体，链接到术语表，保留原文位置和来源。",
      "按实体或关系检查精确率、召回率和错误类型，修订规则后复测。",
    ],
    starter_project: {
      title: "建立一张带证据的医学主题关系表",
      question: "同义表达能否映射到一致术语，否定与不确定描述是否会被错误当作事实？",
      inputs: "自行编写并标明 simulation 的医学短句，以及 NLM MeSH 公开主题词资料；MeSH 是主题词表，不等于完整临床诊断词库。",
      steps: ["定义疾病、干预等实体与关系，加入否定、疑似和缩写例句。", "手工标注一份参考答案，记录术语映射及原文片段。", "比较抽取结果，逐条分析漏抽、错连、否定识别错误，再修订规则。"],
      deliverable: "标注指南、实体/关系表、来源链接及错误分析小结。",
      checks: ["每条关系能回到原句，不把共现自动当作因果关系。", "区分否定、疑似和肯定，保留无法映射项。", "报告计数与指标分母，不把教学结果宣称为临床系统准确率。"],
    },
    prerequisites: ["医学术语与文献阅读", "Python、文本处理和数据库", "标注、精确率/召回率及知识表示基础"],
    sources: [{ title: "NLM：Medical Subject Headings", url: "https://www.nlm.nih.gov/mesh/meshhome.html", purpose: "受控且分层组织的医学主题词表及其用途，作为术语规范化入门。" }],
  },
};
