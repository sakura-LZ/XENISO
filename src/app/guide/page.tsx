import Link from "next/link";
import type { ReactNode } from "react";
import { snapshotSource, translation } from "@/lib/onet/translation";

export const metadata = { title: "使用指南 · XENISO 异域同构" };

const areaLabels: Record<string, string> = {
  realistic: "R 实作型",
  investigative: "I 研究型",
  artistic: "A 艺术型",
  social: "S 社会型",
  enterprising: "E 企业型",
  conventional: "C 常规型",
};
const activityGuide: Record<string, string> = {
  realistic: "制作、装配与操作实物",
  investigative: "观察现象、提出问题与实验研究",
  artistic: "创作文字、音乐与视觉表达",
  social: "帮助、教学与支持他人",
  enterprising: "组织、协商与推动事务",
  conventional: "整理记录、按程序处理信息",
};

/** 四步路径图：节点只写「到哪」与「拿到什么」。 */
const route = [
  { no: "01", title: "画像", output: "20 项能力底册", href: "#profile" },
  { no: "02", title: "初步评价", output: "R1 四栏与 JSON", href: "#initial" },
  { no: "03", title: "职业体验", output: "成果卡（JSON / Markdown）", href: "#experience" },
  { no: "04", title: "行动规划", output: "R2 七个栏目与 JSON", href: "#plan" },
];

const toc = [
  { href: "#start", label: "四步路径" },
  { href: "#profile", label: "个人画像" },
  { href: "#initial", label: "初步评价" },
  { href: "#experience", label: "职业体验" },
  { href: "#plan", label: "行动规划" },
  { href: "#library", label: "信息文库" },
  { href: "#community", label: "交流社区" },
  { href: "#boundaries", label: "口径与边界" },
  { href: "#data", label: "数据与来源" },
  { href: "#privacy", label: "隐私与保存" },
  { href: "#glossary", label: "名词表" },
  { href: "#questions", label: "常见问题" },
];

/** 三个问题：读者先知道这套工具各回答什么，再往下看步骤。 */
const frame = [
  { term: "你愿意做哪类活动", body: "30 道兴趣题，六个维度各 5 题。分数只说明偏好，不说明能力。" },
  { term: "你做过什么", body: "四节 20 项底册，每条记录都写明证据来源；没核验的也标出来。" },
  { term: "接下来按什么节奏做", body: "月份窗口、每周 15 分钟复盘、每年重新核对一次招生条件。" },
];

type ReadItem = { q: string; a: string };

const profileTodo = [
  "填四节共 20 项：基本信息、学业与英语、科研与技能、偏好与目标，每节 5 项。",
  "填满 18 项就能进第 2 步，差几项会写在「继续到第 2 步」按钮上；剩下 2 项可以空着。",
  "昵称、院校、专业、年级必须填。GPA 要带满分，年级排名要带年级总人数。",
  "有成绩单就导入 CSV 或 XLSX，文件不超过 2 MB、最多 500 门。原文件只在浏览器里解析，不上传。",
  "随时点「保存草稿」；以后从总览页每行的「改」或「填」回来接着写。",
];
const profileGain = [
  "一份能力底册：20 项记录按四节汇总，总览页写「底册 X / 20 项」，第 5 行显示兴趣问卷状态。",
  "一份能回查的证据清单：R1 里每条能力迁移都会标出来自哪一项，例如记录位置 user_profile.tech_skills[0]。",
];
const profileReads: ReadItem[] = [
  { q: "填不满 20 项就不能往下走吗？", a: "能。填满 18 项就放行，剩下 2 项没想清楚也不影响后面的计算。报告只按你填过的内容算，缺的项会写成没记录。" },
  { q: "为什么报告里的经历都标着「未核验」？", a: "因为这些内容是你自己写的，没有经过学校或其他机构核对。标签分四类：课程记录自填，未核验；项目自述，未独立验证；实验经历自述，未独立验证；主观自评，未独立验证。写明来源，是为了让你知道每条结论的证据有多重。" },
];

const initialTodo = [
  "一次答一题，共 30 题；六个维度各 5 题，点题号 1–30 可以回改。",
  "从「非常不喜欢、不喜欢、不确定、喜欢、非常喜欢」里选一项，分别记 1–5 分。",
  "答满 30 题才能提交。答案只在当前页面，刷新或离开就没了。",
  "提交后同一页出现 R1；要留档就点「导出这份报告」，下载 xeniso-r1-日期.json。",
];
const initialGain = [
  "兴趣六维：R、I、A、S、E、C 六个原始分（各 5–25 分），配雷达图和一句总结。",
  "R1 四栏：兴趣、能力迁移、知识缺口、报考条件。只读归档页可以随时回看，但那里不提供导出和 AI。",
];
const initialReads: ReadItem[] = [
  { q: "兴趣分高，是不是就适合这个方向？", a: "不是。分数只说明你愿意做哪类活动，不说明能不能做好，也不跟别人比。职业列表按 O*NET 返回的顺序排，不是推荐名次。" },
  { q: "能力迁移和知识缺口在比什么？", a: "能力迁移把你写过的课程、项目和技能对到方向任务上，标「可以直接用」或「要补基础」。知识缺口只做减法：方向要求的技能和入门课，减去画像里已经记录的；问卷结果页最多列 6 条。" },
  { q: "报考条件为什么全是「无」？", a: "还没拿到目标院校当年的招生原文。四行分别是学校与项目、目标年份、报考条件、官方来源，都标「全部待核验」；常见初试组合 101、201、301 也只写「没查到」。空着表示没核实，不表示你没资格。" },
  { q: "六类兴趣分别在看什么？", a: "R 实作型看制作、装配和操作实物；I 研究型看观察、提问和实验；A 艺术型看文字、音乐和视觉创作；S 社会型看帮助、教学和支持他人；E 企业型看组织、协商和推动事务；C 常规型看整理记录、按程序处理信息。" },
];

const experienceTodo = [
  "先选方向，再选任务：10 个方向共 14 个模板，继续医学 4 个、医疗信息系统 2 个、其余方向各 1 个。",
  "选做法：模拟项目看材料、做三次判断；模拟面试依次回答三个问题，说明取舍和依据。",
  "每一步先看固定材料，再单选，再写理由。理由至少 10 字，最多 3000 字。",
  "改了前一步，后面几步要重新确认。每步选完会出现结果表，标着「simulation · 固定教学数据」。",
  "第 4 步复盘四项：最想继续做的、最不想再碰的（各不超过 240 字）、下次想验证什么（不超过 1000 字），以及再投入 3 小时的意愿。",
];
const experienceGain = [
  "一张成果卡：三次选择、每步理由、四项复盘和日期。可以导出 JSON 或 Markdown。",
  "保存后，点「带着成果去做行动规划」会把方向带进第 4 步；成果同时成为 R2 的体验依据。",
];
const experienceReads: ReadItem[] = [
  { q: "模拟项目和模拟面试有什么区别？", a: "模拟项目围绕一组材料做三次取舍，产出对应成果卡。模拟面试把同一件事换成三个问题，让你说明判断依据。两种都要做三次单选、写三次理由。" },
  { q: "那个 100 条数据的任务在做什么？", a: "以机器学习与计算机视觉为例：100 条固定合成预测记录分成 A、B 两组设备，你要选先看哪组样本、把判定阈值定在哪、哪些结果交人工复核，最后拿到「模型验证卡」。继续医学的内科任务则是虚构交接情景：把本人叙述、家属补充和未核验记录分开，安排沟通，记下待办，拿到「内科沟通交接卡」。" },
  { q: "成果卡能证明我会做这个工作吗？", a: "不能。它是教学记录，只记下你这次怎么判断、写了什么理由，不评分，也不代表专业能力或执业资格。" },
  { q: "右边的导师会看到我写的内容吗？", a: "不会。数字人只收到当前方向和当前步骤的说明，收不到画像、理由和复盘。对话默认不保存，勾选后才随成果存档。语音和口型还没验收，以文字对话为准。" },
];

const planTodo = [
  "选目标方向（含「临床工作」），最多再选 2 个备选方向。",
  "填计划转型年份（当前年份至 2100）、每周可投入小时（大于 0、不超过 168，可填 0.5）和升学路径（未决定、统考、推免、申请制）。",
  "把每周时间分成三份：基础学习、小型练习、复盘与核验。合计要大于 0，且不超过每周投入。",
  "前三步没做完时，页面会写「尚未解锁」，并列出要补的三步。",
  "条件齐了才能导出 limen-r2-action-draft.json；想要 AI 解读，再单独点「生成行动规划」。",
];
const planGain = [
  "7 个栏目：兴趣与体验依据、积累与知识缺口、周投入安排、阶段计划、复盘与年度核对、升学与备选、AI 解释与导出。默认停在阶段计划。",
  "阶段计划：统考按 7 段排——定位与资格核验、补先修、基础轮、强化轮、真题与报名、冲刺轮、初试之后；推免 6 段，申请制 5 段。每段只给月份窗口，标「官方节点」或「通行惯例」。",
  "一份 JSON 草案：内容写明这是规则整理、不是正式 AI 报告，并附来源和限制。",
];
const planReads: ReadItem[] = [
  { q: "为什么只给月份，不给具体日期？", a: "报名、网上确认和初试日期每年由研招网和各省考试院公布，没有全国统一日期；国家线、调剂开放时间、招生章程和推免节点也每年变。写死日期，第二年就错了。" },
  { q: "任务卡上的「工作量：未知」是什么意思？", a: "这些课程和练习没有经过验证的耗时范围，页面不编小时数。任务顺序按依赖关系排，不代表进度承诺。" },
  { q: "复盘要怎么做？", a: "每周 15 分钟回答六个问题：这周实际完成多少、哪一项比估计耗时更多、哪项学了但没过判据、注意力漏在哪件具体的事上、下周停掉或降级哪一件、下周唯一必须交出的东西是什么。每月 45 分钟看目标值不值得做、预算偏差和错题类型；阶段末 90 分钟按判据逐条判定，没过就补一段。判据只看能不能合上书做题、口述或默写，重读一遍不算。" },
  { q: "AI 解读会替我查学校或补结论吗？", a: "不会。AI 只串写已保存的证据，每条解释都带「依据」，可以展开生成时的证据快照；它不新增院校、科目或结论。AI 服务没启用时，页面会提示只能看规则草案。" },
];

const libraryReads: ReadItem[] = [
  { q: "来源资料收哪些？", a: "五类：专业与职业、真实招聘、院校招生、行业与就业统计、课程与实践。每页 5 条，可以导出 LIMEN-来源资料摘录.md。" },
  { q: "没查到的分类为什么不补上？", a: "页面会写「还没查到的分类」，位置就空着。没有官方原文就不补，这一条对所有分类都适用。" },
  { q: "招生条目能直接用来判断能不能报吗？", a: "不能。招生只收有官方原文的项目，写明学校、年份和来源；个人报考资格还没核定，要按院校原文逐条核对。" },
  { q: "医学方向的科室资料从哪来？", a: "51 个科室条目（39 个临床科室、12 个医技科室）采用北京大学第一医院的实际分组，是院方实例，不是全国统一标准；其中 8 个科室有详细简介。学科名称按招生目录，不等同于医院科室。" },
];

/** 口径与边界：每条都写清边界本身和真实原因。 */
const boundaries = [
  { term: "不预测录取概率", body: "没有可靠的录取数据，招生条目也还空着。页面只给核验清单，不给你一个看起来精确的百分比。" },
  { term: "不给适合度百分比", body: "兴趣、能力、缺口、报考条件分开列。把四样东西硬加权成一个总分，权重没有来源，算出来的数也不能用。" },
  { term: "不评价能力高低", body: "兴趣分只说明你愿意做哪类活动；体验里的文字检查是线索，不是评分。" },
  { term: "没记录不等于没能力", body: "知识缺口只表示档案里缺证据，不是学不会。" },
  { term: "未知就写未知", body: "原文没写的标「没查到」，不补 0，也不编时长、薪资或招生数字。" },
  { term: "待核验不是失败", body: "没拿到院校当年官方原文之前，招生条目一律标待核验，需要你自己去核。" },
  { term: "simulation 是合成的", body: "体验用固定合成数据，是教学记录，不用于诊疗，也不代表岗位能力。" },
  { term: "继续医学同样正当", body: "留在临床是一条正经选择，不是「没转成」的退路；选它同样能出计划。" },
  { term: "AI 只引述证据", body: "只串写已保存的事实，不新增院校、科目或结论；输出里不出现百分数和链接。" },
  { term: "不按行为推断", body: "不拿点击和停留时间推测兴趣，也不训练人格或录取预测模型。" },
];

const dataSources = [
  { term: "兴趣题目与职业信息", body: "来自 O*NET Web Services（USDOL/ETA）。O*NET® 是 USDOL/ETA 的商标。" },
  { term: "量表与译稿", body: "O*NET Mini-IP 30 题，来源文档为 2016 年附录 A。中文题目是译稿 limen-zh-draft-2026-10-20，还在等人工复核，不能当成已验证的中文版量表。" },
  { term: "方向映射", body: "由 LIMEN 编辑整理的一对多映射，不是 O*NET 官方结论，也不是中国考研专业目录。" },
  { term: "招生条目", body: "只收有官方原文的项目，写明学校、年份和来源；没核实的不补。" },
  { term: "站内编辑内容", body: "方向、课程、任务和阶段节奏都是 LIMEN 的编辑信息，不伪装成官方事实。" },
  { term: "插画", body: "来自 Storyset 的 Pana 系列，署名在页面底部。" },
  { term: "报告版本", body: "R1 是 limen-r1-rules-v1，R2 是 limen-r2-rules-v2 或 v3。画像、问卷或体验改动后，旧报告会按输入指纹判定过期，需要重新生成。" },
];

const privacy = [
  { term: "生成 AI 解读时发什么", body: "兴趣结果、技能与项目证据、体验成果与反思、计划条件。不发昵称和院校，也不发数字人对话。自由文本里的邮箱、手机号和身份证号会被替换掉。" },
  { term: "数字人", body: "只收到当前方向和当前步骤的说明，收不到画像、理由和复盘。" },
  { term: "成绩单", body: "原文件不上传，只在浏览器里解析，只保存你确认过的课程字段。" },
  { term: "存在哪", body: "云端私有记录要你主动保存才写入；体验草稿和已导出文件留在本机；会话保留 30 天。" },
  { term: "怎么删", body: "「我的资料」删除当前访客和云端私有记录，不可撤销。社区帖子要先自己删，本机暂存和下载文件要自己清。" },
];

const glossary = [
  { term: "能力底册", body: "四节 20 项记录的合集，是 R1 能力迁移栏的原始材料。" },
  { term: "R1 · 初步评价", body: "固定四栏的初步评价，规则版本 limen-r1-rules-v1，不需要先选目标方向。" },
  { term: "R2 · 行动规划", body: "把 R1、体验和计划条件排到月份上的行动规划，规则版本 limen-r2-rules-v2 或 v3。" },
  { term: "能力迁移", body: "把临床训练里的动作对到方向任务上，标「可以直接用」或「要补基础」。" },
  { term: "知识缺口", body: "方向手册要求的技能和入门课，减去画像里已经记录的。" },
  { term: "报考条件", body: "学校与项目、目标年份、报考条件、官方来源四行；拿到原文前都写「无」。" },
  { term: "simulation", body: "固定的合成教学数据，不是真实患者、真实岗位或真实成绩。" },
  { term: "关联类型", body: "直接关联是同一职业；相关关联是同一职业家族的邻近岗位；邻近关联是任务相近但路径不同。" },
  { term: "报告过期", body: "画像、问卷或体验改了以后，旧报告和新输入对不上，页面会要求重新生成。" },
  { term: "数字人导师", body: "体验页右侧的 AI 模拟形象，不是真人，收不到你的画像和理由。" },
];

const faq = [
  { q: "可以分几次填吗？", a: "画像可以，随时保存草稿；问卷不行，答案只在这一页，离开就没了。" },
  { q: "只填 18 项会影响结果吗？", a: "不会。规则按填过的内容算，缺的两项在报告里显示为没记录。" },
  { q: "没做问卷能看 R1 吗？", a: "能看到四栏的空态，兴趣栏是空的，也不会推荐方向。R2 需要问卷和体验都齐。" },
  { q: "为什么报考条件都是空的？", a: "还没拿到目标院校当年的招生原文。空着表示没核实，不表示你不能报。" },
  { q: "兴趣分最高的方向就适合我吗？", a: "不一定。兴趣只说明偏好，还要看能力证据、体验感受和报考条件。" },
  { q: "报告为什么会过期？", a: "报告按输入生成并记指纹；画像、问卷或体验改动后，旧结论不能再用。" },
  { q: "能导出哪些文件？", a: "问卷结果页导出 R1 的 JSON；体验页导出 JSON 和 Markdown；行动规划页导出 R2 的 JSON；文库导出来源摘录 Markdown。" },
  { q: "导师是真人吗？", a: "不是，是数字人。语音和口型还没验收，以文字对话为准。" },
  { q: "怎么删除资料？", a: "到「我的资料」删除当前访客和云端记录；社区帖子先自己删，本机文件自己清。" },
];

function ProfileMock() {
  return <div className="gd-mock" role="img" aria-label="个人画像示意：能力底册已填 12 项共 20 项，兴趣问卷 30 题已完成">
    <div className="gd-mock-bar">
      <span className="gd-mock-name">能力底册</span>
      <span className="gd-mock-fig">12 / 20 项</span>
      <span className="gd-mock-tag">示例</span>
    </div>
    <div className="gd-meter" aria-hidden="true"><i style={{ width: "60%" }} /></div>
    <ul className="gd-ledger">
      <li><b className="gd-ledger-name">基本信息</b><span className="gd-ledger-desc">昵称 · 院校 · 专业 · 年级 · 培养阶段</span><span className="gd-ledger-count">5 / 5</span></li>
      <li><b className="gd-ledger-name">学业与英语</b><span className="gd-ledger-desc">GPA · 排名 · 英语 · 课程成绩</span><span className="gd-ledger-count">4 / 5</span></li>
      <li><b className="gd-ledger-name">科研与技能</b><span className="gd-ledger-desc">研究方向 · 项目 · 成果 · 工具</span><span className="gd-ledger-count">3 / 5</span></li>
      <li><b className="gd-ledger-name">偏好与目标</b><span className="gd-ledger-desc">日常兴趣 · 目标 · 动机</span><span className="gd-ledger-count">0 / 5</span></li>
    </ul>
    <div className="gd-mock-foot">
      <span className="atlas-chip" data-tone="ok">兴趣问卷 · 30 题 · 已完成</span>
      <span className="gd-mock-note">填到 18 项就能继续，现在还差 6 项。</span>
    </div>
  </div>;
}

function InitialMock() {
  return <div className="gd-mock" role="img" aria-label="初步评价示意：四栏分别为兴趣、能力迁移、知识缺口、报考条件，各自带真实状态标签">
    <div className="gd-mock-bar">
      <span className="gd-mock-name">R1 · 初步评价</span>
      <span className="gd-mock-fig">limen-r1-rules-v1</span>
      <span className="gd-mock-tag">示例</span>
    </div>
    <div className="gd-four">
      <div className="gd-four-col">
        <p className="gd-four-name">兴趣</p>
        <span className="atlas-chip" data-tone="ok">已计分</span>
        <p className="gd-four-line">六维原始分 5–25</p>
      </div>
      <div className="gd-four-col">
        <p className="gd-four-name">能力迁移</p>
        <span className="atlas-chip">未核验</span>
        <p className="gd-four-line">每条可回查来源</p>
      </div>
      <div className="gd-four-col">
        <p className="gd-four-name">知识缺口</p>
        <span className="atlas-chip" data-tone="gap">3 项待补</span>
        <p className="gd-four-line">技能与入门课</p>
      </div>
      <div className="gd-four-col">
        <p className="gd-four-name">报考条件</p>
        <span className="atlas-chip" data-tone="miss">全部待核验</span>
        <p className="gd-four-line">101 · 201 · 301 都没查到</p>
      </div>
    </div>
  </div>;
}

function ExperienceMock() {
  return <div className="gd-mock" role="img" aria-label="职业体验示意：项目模式三步，第一步已提交，第二步进行中，之后是复盘与成果">
    <div className="gd-mock-bar">
      <span className="gd-mock-name">模拟项目 · 三步</span>
      <span className="simulation-tag">simulation · 固定教学数据</span>
      <span className="gd-mock-tag">示例</span>
    </div>
    <div className="gd-mock-modes">
      <span className="atlas-chip" data-tone="ok">模拟项目</span>
      <span className="atlas-chip">模拟面试</span>
    </div>
    <ol className="gd-flow">
      <li data-state="done"><span className="gd-flow-no">第 1 步</span><span className="gd-flow-name">选择验证样本</span><span className="gd-flow-mark">已提交</span></li>
      <li data-state="current"><span className="gd-flow-no">第 2 步</span><span className="gd-flow-name">调整判定阈值</span><span className="gd-flow-mark">当前</span></li>
      <li data-state="todo"><span className="gd-flow-no">第 3 步</span><span className="gd-flow-name">确定复核策略</span></li>
      <li data-state="todo"><span className="gd-flow-no">复盘</span><span className="gd-flow-name">复盘与成果</span></li>
    </ol>
    <span className="gd-mock-note">每步的理由至少 10 字；改了前一步，后面要重新确认。</span>
  </div>;
}

function PlanMock() {
  return <div className="gd-mock" role="img" aria-label="行动规划示意：条件齐备可导出，目标方向、计划转型年份、每周投入与升学路径，以及七个栏目">
    <div className="gd-mock-bar">
      <span className="gd-mock-name">R2 · 行动规划</span>
      <span className="atlas-chip" data-tone="ok">条件齐备，可导出</span>
      <span className="gd-mock-tag">示例</span>
    </div>
    <dl className="gd-plan">
      <div><dt>目标方向</dt><dd>机器学习与计算机视觉</dd></div>
      <div><dt>计划转型年份</dt><dd>2028 年</dd></div>
      <div><dt>每周可投入</dt><dd>12 小时</dd></div>
      <div><dt>升学路径</dt><dd>统考</dd></div>
    </dl>
    <ul className="gd-tabs">
      <li data-current="true">阶段计划</li>
      <li>兴趣与体验依据</li>
      <li>周投入安排</li>
      <li>复盘与年度核对</li>
      <li>升学与备选</li>
      <li>AI 解释与导出</li>
    </ul>
    <span className="gd-mock-note">阶段计划只给月份窗口；招生条目仍然写「没查到」。</span>
  </div>;
}

function LibraryMock() {
  return <div className="gd-mock" role="img" aria-label="信息文库示意：4 组 10 个方向，勾选两个方向并排比较，每条带出处标注">
    <div className="gd-mock-bar">
      <span className="gd-mock-name">方向清单</span>
      <span className="gd-mock-fig">4 组 · 10 个方向</span>
      <span className="gd-mock-tag">示例</span>
    </div>
    <p className="gd-search"><span>关键词</span><b>医学影像</b></p>
    <ul className="gd-catalog">
      <li><span className="gd-check" aria-hidden="true">✓</span><b>医学影像工程</b><span className="atlas-chip">有出处</span></li>
      <li><span className="gd-check" aria-hidden="true">✓</span><b>医学信号处理</b><span className="atlas-chip" data-tone="gap">要补基础</span></li>
    </ul>
    <span className="gd-mock-note">勾两个方向可以并排比较，页面不排优劣。</span>
  </div>;
}

/** 四步小节共用的骨架：界面小样、要做的事、拿到的产出、折叠的口径说明。 */
function StepSection({ id, no, title, badge, intro, mock, todo, gain, reads, change, href, cta }: {
  id: string; no: string; title: string; badge: string; intro: string; mock: ReactNode;
  todo: string[]; gain: string[]; reads: ReadItem[]; change: string; href: string; cta: string;
}) {
  return <section id={id} className="guide-topic gd-step">
    <div className="gd-head">
      <span className="gd-no" aria-hidden="true">{no}</span>
      <h2>{title}</h2>
      <span className="atlas-chip">{badge}</span>
    </div>
    <p className="gd-lede">{intro}</p>
    {mock}
    <div className="gd-cols">
      <div>
        <h3 className="gd-sub">你要做的</h3>
        <ol className="gd-points">{todo.map(item => <li key={item}>{item}</li>)}</ol>
      </div>
      <div>
        <h3 className="gd-sub">你拿到的</h3>
        <ul className="gd-points">{gain.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </div>
    <div className="gd-facts">{reads.map(item => <details key={item.q} className="gd-fact">
      <summary>{item.q}</summary>
      <p>{item.a}</p>
    </details>)}</div>
    <p className="gd-change">{change}</p>
    <div className="gd-cta">
      <Link className="atlas-btn" href={href}>{cta} <span className="arrow" aria-hidden="true">→</span></Link>
    </div>
  </section>;
}

export default function GuidePage() {
  return <main id="main" className="container guide-page">
    <header id="start" className="guide-hero">
      <p className="kicker">使用指南</p>
      <h1>四步走完，<br />每步留下记录。</h1>
      <p className="gd-hero-lede">从个人画像到行动规划，四步共用同一份记录。下面写清楚每一步要填什么、拿到什么、结果怎么读，以及现在还不能替你判断的部分。</p>
      <ol className="gd-path" aria-label="四步路径">
        {route.map(item => <li key={item.no}>
          <a href={item.href}>
            <span className="gd-path-no">{item.no}</span>
            <span className="gd-path-title">{item.title}</span>
            <span className="gd-path-out">拿到 {item.output}</span>
          </a>
        </li>)}
      </ol>
      <dl className="gd-frame">{frame.map(item => <div key={item.term}>
        <dt>{item.term}</dt>
        <dd>{item.body}</dd>
      </div>)}</dl>
      <div className="gd-cta">
        <Link className="atlas-btn atlas-btn-primary" href="/profile">从个人画像开始 <span className="arrow" aria-hidden="true">→</span></Link>
        <Link className="text-action" href="/explore">先看信息文库</Link>
      </div>
      <p className="gd-hero-note">已经有目标方向？先去信息文库看它的工作、课程和招生原文，再回到职业体验和行动规划验证；阅读可以跳着来，记录仍要按四步补齐。</p>
    </header>

    <div className="guide-layout">
      <nav className="guide-nav" aria-label="指南目录">
        {toc.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>

      <div>
        <StepSection
          id="profile" no="01" title="个人画像" badge="产出 · 能力底册"
          intro="把课程、科研、技能和偏好分开写下来。这一步不是为了填满表格，而是让后面每一句判断都有出处。"
          mock={<ProfileMock />}
          todo={profileTodo} gain={profileGain} reads={profileReads}
          change="改了画像，已经生成的报告会按输入指纹判定过期，需要重新生成；问卷结果不用重做。"
          href="/profile" cta="进入个人画像"
        />

        <StepSection
          id="initial" no="02" title="初步评价" badge="产出 · R1 四栏"
          intro="做 30 道兴趣题，拿到 R1 四栏。分数只说明你愿意做哪类活动；能力迁移、知识缺口和报考条件分开列，不合成一个分数。"
          mock={<InitialMock />}
          todo={initialTodo} gain={initialGain} reads={initialReads}
          change="点「重新作答」会清空这一次的答案和结果。画像或问卷改动后，旧 R1 会过期；重新打开时页面会提示需要重新生成。"
          href="/assessment" cta="开始兴趣问卷"
        />

        <StepSection
          id="experience" no="03" title="职业体验" badge="产出 · 成果卡"
          intro="挑一个方向里的模拟任务，用固定合成材料做三次判断。做完你会知道：这件事你愿意继续做，还是只想了解。"
          mock={<ExperienceMock />}
          todo={experienceTodo} gain={experienceGain} reads={experienceReads}
          change="保存新成果会替换上一次的；想留旧的，先导出。改前一步的选择，后面几步会退回待确认，重新确认一遍再继续。"
          href="/experience" cta="进入职业体验"
        />

        <StepSection
          id="plan" no="04" title="行动规划" badge="产出 · R2 七个栏目"
          intro="把前三步的记录排成能执行的计划。填完条件，页面会按目标年份排出月份窗口、每周投入和三档复盘；招生的部分仍然要你自己核。"
          mock={<PlanMock />}
          todo={planTodo} gain={planGain} reads={planReads}
          change="改了任一条件，下面的规则预览会重算；已保存的 AI 解读要重新读取或重新生成。导出前先确认体验已保存、四项条件齐全，预算没有超过每周投入。"
          href="/report/plan" cta="进入行动规划"
        />

        <section id="library" className="guide-topic">
          <div className="gd-head">
            <h2>信息文库</h2>
            <span className="atlas-chip">随时可查</span>
          </div>
          <p className="gd-lede">文库不生成结论，只把每个方向的原文、来源和缺口摆出来，让你自己核对。</p>
          <LibraryMock />
          <ul className="gd-points gd-points-wide">
            <li><b>4 组 10 个方向：</b>AI / 计算机 3 个、生物医学工程 / 医工交叉 3 个、医学信息学 3 个、继续医学 1 个。分组是站内编辑，不是官方学科目录。</li>
            <li><b>每个方向 6 章：</b>专业特点、职业日常、能力基础、学习实践、升学准备、招聘与行业。每章标题下面就是读者会问的那句话，比如「一天的工作长什么样」「能不能报，卡在哪一条」。</li>
            <li><b>检索和比较：</b>关键词最多 160 字，可以和分类叠加，只做字面匹配，换个说法可能就搜不到。勾两个方向能并排看 5 行：实际工作、能力基础、入门任务、报考门槛、来源。页面不排优劣，也不给适合度。</li>
            <li><b>三种标注：</b>有出处是原文能查到；没查到是原文没写或没公开；要补基础是方向要求了、你本科没学过。引文照录原文，标题与归属是站内索引；职业关联由 LIMEN 编辑，不是 O*NET 官方结论。</li>
          </ul>
          <div className="gd-facts">{libraryReads.map(item => <details key={item.q} className="gd-fact">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>)}</div>
          <div className="gd-cta">
            <Link className="atlas-btn" href="/explore">进入信息文库 <span className="arrow" aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section id="community" className="guide-topic">
          <div className="gd-head">
            <h2>交流社区</h2>
            <span className="atlas-chip">只收求助与经验</span>
          </div>
          <p className="gd-lede">社区是匿名留言墙，用来问具体问题、写做过的尝试。它不做配对，也不替你判断方向。</p>
          <ul className="gd-points gd-points-wide">
            <li>发帖要先用邮箱验证码登录，发出来只显示「匿名探索者」。</li>
            <li>标题 4–100 字，正文 10–4000 字。发之前要勾选「内容里没有姓名、联系方式或患者信息」。</li>
            <li>举报分四类原因，人工复核，不自动删帖，也不通知被举报的人。</li>
            <li>「招募」栏现在空着，来源核实后才放。规则三条：只写确认过的事；不替别人下判断；对内容提不同意见。</li>
          </ul>
          <div className="gd-cta">
            <Link className="atlas-btn" href="/community">去交流社区 <span className="arrow" aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section id="boundaries" className="guide-topic">
          <div className="gd-head"><h2>口径与边界</h2></div>
          <p className="gd-lede">整站通用，页面正文不重复。每条边界后面都写了原因。</p>
          <dl className="gd-rules">{boundaries.map(item => <div key={item.term}><dt>{item.term}</dt><dd>{item.body}</dd></div>)}</dl>
        </section>

        <section id="data" className="guide-topic">
          <div className="gd-head"><h2>数据与来源</h2></div>
          <p className="gd-lede">每条结论都能回到来源；来源本身也有版本和限制。</p>
          <div className="gd-facts">{dataSources.map(item => <details key={item.term} className="gd-fact">
            <summary>{item.term}</summary>
            <p>{item.body}</p>
          </details>)}</div>
        </section>

        <section id="privacy" className="guide-topic">
          <div className="gd-head"><h2>隐私与保存</h2></div>
          <p className="gd-lede">哪些数据会离开本机，哪些只留在浏览器里，先说清楚。完整说明在<Link href="/account">我的资料</Link>。</p>
          <div className="gd-facts">{privacy.map(item => <details key={item.term} className="gd-fact">
            <summary>{item.term}</summary>
            <p>{item.body}</p>
          </details>)}</div>
        </section>

        <section id="glossary" className="guide-topic">
          <div className="gd-head"><h2>名词表</h2></div>
          <p className="gd-lede">报告、栏目和标签里的固定说法，都在这里。</p>
          <dl className="guide-kv">
            {glossary.map(item => <div key={item.term}><dt>{item.term}</dt><dd>{item.body}</dd></div>)}
          </dl>
          <div className="gd-facts"><details className="gd-fact">
            <summary>六类兴趣各自在问什么</summary>
            <p>以下是题目活动说明。没有个人结果时，它只是词汇表，不作为测评结论。</p>
            <dl className="guide-kv">{Object.entries(areaLabels).map(([area, label]) => {
              const example = translation.items.find(item => item.area === area);
              return <div key={area}><dt>{label}</dt><dd>{activityGuide[area]}。题目示例：{example?.zh}（原题 {example?.index}：<span lang="en">{example?.original_en}</span>）。</dd></div>;
            })}</dl>
            <p className="guide-source">活动来源：<a href={snapshotSource} target="_blank" rel="noreferrer">O*NET Mini-IP 2016 附录 A</a>；中文译稿 {translation.version}，待人工复核。</p>
          </details></div>
        </section>

        <section id="questions" className="guide-topic">
          <div className="gd-head"><h2>常见问题</h2></div>
          <div className="gd-facts">{faq.map(item => <details key={item.q} className="gd-fact">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>)}</div>
        </section>
      </div>
    </div>
  </main>;
}
