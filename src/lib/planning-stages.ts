import type { Direction } from "./directions";
import type { Profile } from "./profile";

/**
 * R2 行动规划的阶段骨架。
 *
 * 依据分两类，页面上必须分开标：
 * - 官方：研招网管理规定、教育部公告、目标院校招生章程里写死的东西。
 * - 惯例：培训机构与考生群体长期形成的节奏（择校→基础→强化→真题→冲刺），
 *   没有官方定义，只能当"通行做法"。
 *
 * 三类数字一律不写死：报名与网上确认日期、国家线与调剂开放日、复试加试办法。
 * 它们每年变，或由招生单位自主确定，写进计划里只会过时或误导。
 */

export type PlanTask = {
  id: string;
  title: string;
  why: string;
  deliverable: string;
  dependencies: string[];
  priority: string;
  source: string;
  estimated_effort_range: null;
  stage: string;
};

export type PlanStage = {
  id: string;
  name: string;
  window: string;
  goal: string;
  exit: string;
  basis: "官方" | "惯例";
  /** 相对"现在"的位置：已经过去、正在这一段、还没到。 */
  state: "past" | "current" | "future";
  /** 这一阶段里每年都要重新核对的东西；没有就留空。 */
  verify: string;
  task_ids: string[];
};

export type PlanPosition = {
  /** 距关键节点还有几个月，负数表示已经过去。 */
  months: number;
  key_moment: string;
  current_stage: string | null;
  note: string;
};

export type PathwayPlan = {
  stages: PlanStage[];
  tasks: PlanTask[];
  position: PlanPosition;
  horizon: string;
  weekly_budget: string[];
};

export const stageSources = {
  template: (pathway: string) => `limen_stage_template:v1:${pathway}`,
  checklist: (pathway: string) => `limen_pathway_checklist:v1:${pathway}`,
  direction: (id: string) => `limen_direction_map:${id}`,
  admissions: "verifiedAdmissions:empty",
} as const;

const monthIndex = (year: number, month: number) => year * 12 + (month - 1);
const parts = (index: number) => ({ year: Math.floor(index / 12), month: (index % 12) + 1 });

/** 把两个月份索引写成人能读的区间，跨年时补上年份。 */
function span(start: number, end: number) {
  const a = parts(start);
  const b = parts(end);
  if (a.year === b.year) return a.month === b.month ? `${a.year} 年 ${a.month} 月` : `${a.year} 年 ${a.month}–${b.month} 月`;
  return `${a.year} 年 ${a.month} 月 – ${b.year} 年 ${b.month} 月`;
}

type TaskSeed = Omit<PlanTask, "stage" | "estimated_effort_range">;

const task = (seed: TaskSeed): TaskSeed => seed;

type StageSeed = {
  id: string;
  name: string;
  start: [number, number];
  end: [number, number];
  goal: string;
  exit: string;
  basis: "官方" | "惯例";
  verify?: string;
  tasks: TaskSeed[];
};

type Assembled = {
  stages: PlanStage[];
  tasks: PlanTask[];
  /** 阶段的起止月份索引，只在内部用来判断"现在处在哪一段"。 */
  bounds: { id: string; start: number; end: number }[];
};

function assemble(seeds: StageSeed[], source: string, nowIndex: number): Assembled {
  const stages: PlanStage[] = [];
  const tasks: PlanTask[] = [];
  const bounds: Assembled["bounds"] = [];
  for (const seed of seeds) {
    const start = monthIndex(seed.start[0], seed.start[1]);
    const end = monthIndex(seed.end[0], seed.end[1]);
    bounds.push({ id: seed.id, start, end });
    stages.push({
      id: seed.id,
      name: seed.name,
      window: span(start, end),
      goal: seed.goal,
      exit: seed.exit,
      basis: seed.basis,
      state: nowIndex > end ? "past" : nowIndex < start ? "future" : "current",
      verify: seed.verify ?? "",
      task_ids: seed.tasks.map((item) => item.id),
    });
    for (const item of seed.tasks) tasks.push({ ...item, source: item.source || source, stage: seed.id, estimated_effort_range: null });
  }
  return { stages, tasks, bounds };
}

/** 跨考才会多出来的"补先修"：目标方向的基础课，从零过一遍。 */
function prerequisiteTasks(direction: Direction, source: string): TaskSeed[] {
  return direction.courses.map((course, index) => task({
    id: `pre-${index + 1}`,
    title: `补先修：${course}`,
    why: `跨考的专业课是从零开始的，先把「${course}」这一层补上，后面的真题才做得动。具体要不要补修学分、算不算报考条件，各校规定不同，只能查目标院校的招生章程。`,
    deliverable: `${course} 的概念清单、一个能独立做完的练习，以及卡住的地方`,
    dependencies: [],
    priority: "第一轮",
    source,
  }));
}

function unifiedExamStages(direction: Direction, year: number, crossMajor: boolean): StageSeed[] {
  const template = stageSources.template("统考");
  const checklist = stageSources.checklist("统考");
  const map = stageSources.direction(direction.id);
  const pre = crossMajor ? prerequisiteTasks(direction, map) : [];
  const lastPre = pre.length ? [pre[pre.length - 1].id] : [];

  const seeds: StageSeed[] = [
    {
      id: "locate",
      name: "定位与资格核验",
      start: [year - 1, 1],
      end: [year - 1, 3],
      goal: "先把「能不能考、考什么、什么时候考」查清楚，再决定复不复习。查的地方是招生章程和专业目录，顺序反过来，容易在错的方向上花掉一整个暑假。",
      exit: "三个候选项目都有官方来源；报考资格与考试科目有原文；查不到的项目写明「未公布」，不留空白。",
      basis: "官方",
      verify: "目标专业的招生章程、专业目录与考试科目每年都可能调整，以报考当年的官方发布为准。",
      tasks: [
        task({ id: "admissions", title: "核验目标项目的报考条件", why: "没有原文就没有结论。这一步决定后面所有复习内容是否值得投入。", deliverable: "官方 URL、招生年份、专业代码、报考资格、考试科目与核验日期", dependencies: [], priority: "先核验", source: stageSources.admissions }),
        task({ id: "target-shortlist", title: "定下三个候选项目", why: "只锁一个项目，一旦资格不符就没有退路；三个够比较，也不至于分散。", deliverable: "三个候选项目的目录页、参考书目、近三年复试要求与来源链接", dependencies: [], priority: "先核验", source: template }),
        task({ id: "path-eligibility", title: "核验跨专业资格与考试科目", why: "医学、法学、部分教育类专业对本科专业有硬性限制；不查章程就默认自己能考，风险最大。", deliverable: "目标年份、专业代码、考试科目、跨专业资格和复试要求的官方链接核验表；未知项留空", dependencies: ["admissions"], priority: "先核验", source: checklist }),
        task({ id: "path-window", title: "核验报名与考试时间窗口", why: "报名、确认、初试的日期每年由研招网公布，网上确认更是各省自定，没有全国统一日期。", deliverable: "预报名、正式报名、本省网上确认、初试与准考证下载的时间与来源；未公布的写「待公布」", dependencies: ["admissions"], priority: "先核验", source: checklist }),
      ],
    },
    ...(crossMajor ? [{
      id: "prerequisite",
      name: "补先修",
      start: [year - 1, 1] as [number, number],
      end: [year - 1, 6] as [number, number],
      goal: "把目标方向的基础课过一遍，目标是听得懂、做得动，不是学完。跨考这一层通常要比本专业考生多花一半时间。",
      exit: "每门先修课都有一份概念清单和一个自己做完的练习；做不动的地方写在清单上，交给下一轮。",
      basis: "惯例" as const,
      verify: "跨考是否要求补修先修课、是否加试，各校规定不同。招生章程必须公布加试办法，那是唯一能查的入口。",
      tasks: pre,
    }] : []),
    {
      id: "base",
      name: "基础轮",
      start: [year - 1, 3],
      end: [year - 1, 6],
      goal: "把教材通读一遍，建一张索引：知道这门课有什么、每章在解决什么问题。这一轮不要求记住，要求的是心里有地图。",
      exit: "每章有一页框架笔记；隔一天合上书，仍能对着目录说出这一章在讲什么、和上一章什么关系。",
      basis: "惯例",
      verify: "考不考数学、考数学几，由目标专业的招生目录指定；同一专业不同年份也可能改。",
      tasks: [
        task({ id: "base-english", title: "英语：词汇与长难句", why: "英语靠积累，越往后越挤不出时间。这一轮先把词汇和长难句的地基铺上。", deliverable: "词汇进度表、长难句分析本、早年阅读的错因记录", dependencies: [], priority: "第一轮", source: template }),
        task({ id: "base-math", title: "数学：教材一轮与基础题", why: "先按招生目录确认考数学几或不考，再选对应的教材；不确定就先过高数基础。", deliverable: "一章概念笔记 + 课后基础题的正确率记录", dependencies: [], priority: "第一轮", source: template }),
        task({ id: "base-major", title: `专业课：${direction.courses[0]} 等教材通读`, why: `这一轮读的是${direction.name}方向的教材，目标是搭框架，不是背细节。`, deliverable: "按章的概念框架笔记 + 每章三个自测问题", dependencies: lastPre, priority: "第一轮", source: map }),
      ],
    },
    {
      id: "intensify",
      name: "强化轮",
      start: [year - 1, 7],
      end: [year - 1, 9],
      goal: "把「知道有什么」变成「会做题」：按题型集中刷，错题分类记。暑假是唯一一段能整块投入的时间。",
      exit: "每个高频题型，在不看答案的情况下连续做对两道；错题本能说出每道题错在哪一类原因上。",
      basis: "惯例",
      verify: "真题来源与题型范围以目标院校公布的参考书目和考试大纲为准。",
      tasks: [
        task({ id: "int-english", title: "英语：阅读真题分年份推进", why: "阅读占分最重，也最需要按年份积累手感。最近三四年真题留到最后做模考。", deliverable: "每篇阅读的错因分类与重做记录", dependencies: ["base-english"], priority: "第二轮", source: template }),
        task({ id: "int-math", title: "数学：强化题型与错题本", why: "强化轮的重点不是做更多题，而是把错题变成一类一类可复用的方法。", deliverable: "按题型整理的错题本与重做记录", dependencies: ["base-math"], priority: "第二轮", source: template }),
        task({ id: "int-major", title: "专业课：结合真题背诵与刷题", why: "专业课的核心是真题。本校真题拿不到时，用同专业其他院校的真题是通行做法。", deliverable: "按高频考点整理的重点清单与默写记录", dependencies: ["base-major"], priority: "第二轮", source: map }),
        task({ id: "research", title: `做一个小型复现，验证${direction.name}方向`, why: `光看书判断不了自己愿不愿意做「${direction.work_tasks[0]}」这类事。花一周做个小复现，比再看三本书有用。`, deliverable: "研究问题、数据来源、方法、局限与可复现结果", dependencies: ["base-major"], priority: "并行", source: map }),
      ],
    },
    {
      id: "real",
      name: "真题与报名",
      start: [year - 1, 9],
      end: [year - 1, 11],
      goal: "用整套真题练时间分配，同时把报名手续办完。这两件事同期进行，报名的硬节点不等人。",
      exit: "近五年真题各做过一遍并记录分数与用时；同一科目两次整套计时，用时都落在考试时限内；报名号、缴费凭证、网上确认结果都有截图留存。",
      basis: "官方",
      verify: "预报名、正式报名、网上确认、准考证下载的日期每年由研招网与各省考试院公布；网上确认没有全国统一日期。",
      tasks: [
        task({ id: "real-past", title: "整套真题计时做", why: "分章练习和整套计时是两种能力。考场上的失分，多半是时间分配的问题。", deliverable: "近五年真题的分数与每部分用时记录", dependencies: ["int-major", "int-english"], priority: "第三轮", source: template }),
        task({ id: "register", title: "报名与网上确认", why: "未网上确认或确认未通过就不能参加考试，这一步没有补办。", deliverable: "报名号、缴费凭证、网上确认结果，以及本省确认时间与要求的截图", dependencies: ["admissions"], priority: "硬节点", source: checklist }),
        task({ id: "exam-logistics", title: "准考证与考前安排", why: "准考证一般在考前十天左右开放下载，考点和住宿要提前定。", deliverable: "准考证、考点位置、到场时间与住宿安排", dependencies: ["register"], priority: "硬节点", source: template }),
      ],
    },
    {
      id: "sprint",
      name: "冲刺轮",
      start: [year - 1, 11],
      end: [year - 1, 12],
      goal: "把会做的题在考场时间里做对：整套模拟、背诵、把作息调到考试时间。",
      exit: "连续两套模拟都在规定时间内完成，失分集中在固定的几处，而不是随机散开；政治分析题与英语作文有自己背得下来的版本。",
      basis: "惯例",
      verify: "初试日期以教育部公告为准；近年稳定在 12 月倒数第二个完整周末，但不作为承诺。",
      tasks: [
        task({ id: "sprint-mock", title: "整套模拟卷与时间分配演练", why: "最后阶段提升的是熟练度与稳定性，不是新知识。", deliverable: "三次以上整套模拟的分数、用时与失分分布", dependencies: ["real-past"], priority: "第三轮", source: template }),
        task({ id: "sprint-recite", title: "政治分析题与英语写作背诵", why: "需要背的内容启动太晚就来不及，这一轮的主要任务就是把它背熟。", deliverable: "可背诵的分析题框架与作文模板，各准备到能默写的程度", dependencies: ["int-english"], priority: "第三轮", source: template }),
      ],
    },
    {
      id: "post",
      name: "初试之后",
      start: [year, 1],
      end: [year, 4],
      goal: "初试结束不等于流程结束。复试科目、加试办法、调剂规则都要在出分前查好。",
      exit: "复试科目、形式、加试办法与材料清单都有官方原文；备选项目与调剂意向已列好。",
      basis: "官方",
      verify: "国家线公布与调剂系统开放的时间近年明显提前，以教育部当年公告为准；跨专业是否加试由招生单位自主确定。",
      tasks: [
        task({ id: "post-interview", title: "复试准备", why: "复试差额通常不低于 120%，初试分数高也不等于稳。加试办法由招生单位自主确定，必须查章程。", deliverable: "复试科目与形式、加试办法、材料清单的官方原文与准备进度", dependencies: ["exam-logistics"], priority: "按官方要求", source: checklist }),
        task({ id: "post-adjust", title: "调剂与备选", why: "调剂系统每次开放不少于 12 小时、志愿锁定不超过 36 小时，时间窗口很窄。", deliverable: "调剂意向清单、备选项目与各自的官方来源", dependencies: ["exam-logistics"], priority: "按官方要求", source: checklist }),
      ],
    },
  ];
  return seeds;
}

function recommendationStages(year: number): StageSeed[] {
  const template = stageSources.template("推免");
  const checklist = stageSources.checklist("推免");
  return [
    {
      id: "qualify",
      name: "资格与成果盘点",
      start: [year - 1, 1],
      end: [year - 1, 4],
      goal: "推免是两条线同时走：本校愿不愿意推荐你，目标项目愿不愿意接收你。先分别确认，再准备材料。",
      exit: "本校推荐规则与目标项目接收条件各有官方原文；已有哪些成果、还缺什么，列成一张表。",
      basis: "官方",
      verify: "本校推免资格与目标项目接收条件每年都会更新，以当年通知为准。",
      tasks: [
        task({ id: "path-eligibility", title: "核验本校推荐资格与目标项目接收条件", why: "两侧规则不同，混在一起看容易误判自己能不能推。", deliverable: "本校推免资格、推荐规则及目标项目当年接收条件的官方来源对照表", dependencies: [], priority: "先核验", source: checklist }),
        task({ id: "achievement-audit", title: "盘点已有成果与缺口", why: "材料只能写有证据的东西，先盘清楚，才不会临时凑。", deliverable: "成绩、科研、竞赛、实践的成果索引，每项标注证据与待补", dependencies: [], priority: "先核验", source: template }),
      ],
    },
    {
      id: "materials",
      name: "材料与推荐",
      start: [year - 1, 4],
      end: [year - 1, 6],
      goal: "把成果整理成项目要的格式。材料准备得早，夏令营开放申请时才来得及投。",
      exit: "目标项目要求的每份材料都有草稿；推荐人已确认，成绩单与证明已开具。",
      basis: "官方",
      verify: "材料格式与份数以目标项目当年通知为准。",
      tasks: [
        task({ id: "path-materials", title: "整理申请材料与成果证据", why: "项目自述不等于已核验成果，材料格式和考核方式要以目标项目通知为准。", deliverable: "目标项目要求的成绩、科研和考核材料清单；每项标已有证据或待补", dependencies: ["path-eligibility"], priority: "按官方要求", source: checklist }),
      ],
    },
    {
      id: "camp",
      name: "夏令营",
      start: [year - 1, 6],
      end: [year - 1, 8],
      goal: "夏令营是推免的第一批机会，也是提前见到导师和项目的机会。",
      exit: "目标项目的夏令营申请都已提交；参营结果与后续联系有记录。",
      basis: "惯例",
      verify: "夏令营没有全国统一时间，各院系自主发布，只能逐个查通知。",
      tasks: [
        task({ id: "camp-apply", title: "夏令营申请与参营", why: "院系自主安排，开放申请的时间集中在 3–5 月，错过就没有第二批。", deliverable: "申请记录、入营结果与参营笔记", dependencies: ["path-materials"], priority: "硬节点", source: template }),
      ],
    },
    {
      id: "pre-recommend",
      name: "预推免",
      start: [year - 1, 8],
      end: [year - 1, 9],
      goal: "夏令营没拿到满意结果的项目，在预推免再试一轮。",
      exit: "预推免的申请与考核都已完成，结果有记录。",
      basis: "惯例",
      verify: "预推免同样由院系自主安排，时间集中在 8 月中到 9 月中。",
      tasks: [
        task({ id: "pre-apply", title: "预推免申请与考核", why: "这一轮的节奏比夏令营快，材料要现成。", deliverable: "申请记录、考核结果与待确认事项", dependencies: ["camp-apply"], priority: "硬节点", source: template }),
      ],
    },
    {
      id: "system",
      name: "九推填报",
      start: [year - 1, 9],
      end: [year - 1, 10],
      goal: "在推免服务系统里完成注册、填报、确认。这一步有硬截止，过期资格作废。",
      exit: "志愿已填报、复试与待录取通知已确认，系统里的记录都已截图。",
      basis: "官方",
      verify: "每年节点以研招网推免服务系统公告为准：一般 9 月中下旬开放注册与填报，10 月中旬截止；未落实接收单位的，资格到期后失效，可转统考。",
      tasks: [
        task({ id: "system-fill", title: "注册、填报志愿与确认", why: "三个平行志愿，每志愿提交后锁定 48 小时；接受待录取后不能再填其他志愿。", deliverable: "注册与填报时间记录、复试通知与待录取确认的截图", dependencies: ["path-eligibility"], priority: "硬节点", source: checklist }),
      ],
    },
    {
      id: "result",
      name: "结果与后续",
      start: [year - 1, 10],
      end: [year, 1],
      goal: "推免落定后确认录取手续；没落定就尽快转统考，时间还够。",
      exit: "录取状态与后续手续清楚；若转统考，统考计划已启动。",
      basis: "官方",
      verify: "拟录取名单一般 10 月中旬公示；推免生不参加网上确认。",
      tasks: [
        task({ id: "result-confirm", title: "确认录取与后续手续", why: "已录取者不得再报统考，反之亦然，两条路要明确选一条。", deliverable: "录取状态截图、后续手续清单，或转统考的决定与启动记录", dependencies: ["system-fill"], priority: "按官方要求", source: checklist }),
      ],
    },
  ];
}

function applicationStages(year: number): StageSeed[] {
  const template = stageSources.template("申请制");
  const checklist = stageSources.checklist("申请制");
  return [
    {
      id: "qualify",
      name: "条件核验",
      start: [year - 1, 1],
      end: [year - 1, 3],
      goal: "申请制没有统一平台，也没有统一时间表。先把目标项目的学历、语言、材料要求逐条查清。",
      exit: "目标项目的学历条件、语言要求、材料清单与截止时间都有官方页面；查不到的写明未公布。",
      basis: "官方",
      verify: "各项目要求不同，且每年更新，只能以项目官网当年页面为准。",
      tasks: [
        task({ id: "path-eligibility", title: "核验学历与语言条件", why: "不同项目规则可能不同，不据医学背景推断是否可申请。", deliverable: "目标项目学历条件、语言要求、材料要求与官方来源；不预设语言分数", dependencies: [], priority: "先核验", source: checklist }),
      ],
    },
    {
      id: "language",
      name: "语言考试",
      start: [year - 1, 3],
      end: [year - 1, 7],
      goal: "语言成绩要在申请季开始前出分，晚一步就会错过第一轮。",
      exit: "语言成绩已出分且在有效期内；若未达标，补考时间已排进日历。",
      basis: "惯例",
      verify: "成绩有效期与项目最低要求以项目官网为准。",
      tasks: [
        task({ id: "language-exam", title: "语言考试报名与出分", why: "申请季 9 月就开始滚动录取，成绩没出来就只能等下一轮。", deliverable: "报名记录、成绩单与有效期截止日", dependencies: ["path-eligibility"], priority: "硬节点", source: template }),
      ],
    },
    {
      id: "materials",
      name: "材料准备",
      start: [year - 1, 7],
      end: [year - 1, 9],
      goal: "把成绩单、推荐信、个人陈述这些材料做齐，别等到截止前一周。",
      exit: "每份材料都有定稿；推荐信已由推荐人提交或确认可提交。",
      basis: "惯例",
      verify: "材料清单以项目官网为准；部分项目要求邮寄纸质件。",
      tasks: [
        task({ id: "path-materials", title: "整理项目要求的申请材料", why: "根据已核验的材料要求整理研究问题与成果；推荐或导师联系只在项目要求或本人有明确目的时安排。", deliverable: "个人陈述或研究计划等材料的项目要求对照、成果索引与待准备项；非必需材料不强加", dependencies: ["path-eligibility"], priority: "按官方要求", source: checklist }),
      ],
    },
    {
      id: "apply",
      name: "网申提交",
      start: [year - 1, 9],
      end: [year - 1, 12],
      goal: "滚动录取、先到先得。第一轮提交比完美提交更有用。",
      exit: "目标项目都已提交，申请号与提交时间有记录；后续补件要求已跟进。",
      basis: "惯例",
      verify: "各项目截止时间不同，部分项目分轮次；以项目官网为准。",
      tasks: [
        task({ id: "submit", title: "网申提交与材料跟进", why: "热门项目在 12 月主轮就可能满额，早提交的池子更大。", deliverable: "申请号、提交时间、补件要求与完成情况", dependencies: ["path-materials", "language-exam"], priority: "硬节点", source: template }),
      ],
    },
    {
      id: "interview",
      name: "面试与结果",
      start: [year, 1],
      end: [year, 4],
      goal: "面试与录取通知集中在年初到四月，收到 offer 后还要办留位费与签证。",
      exit: "面试完成；录取结果与后续手续（留位费、签证）有时间表。",
      basis: "惯例",
      verify: "留位费金额与截止时间以录取通知为准。",
      tasks: [
        task({ id: "interview-result", title: "面试准备与录取后续", why: "面试考察的是你为什么选这个项目，不是背答案。", deliverable: "面试准备笔记、录取结果与后续手续时间表", dependencies: ["submit"], priority: "按官方要求", source: template }),
      ],
    },
  ];
}

export function buildPathwayPlan(input: {
  pathway: Profile["pathway"];
  direction: Direction;
  transitionYear: number;
  now: Date;
  crossMajor: boolean;
}): PathwayPlan | null {
  const { pathway, direction, transitionYear, now, crossMajor } = input;
  const seeds = pathway === "统考" ? unifiedExamStages(direction, transitionYear, crossMajor)
    : pathway === "推免" ? recommendationStages(transitionYear)
      : pathway === "申请制" ? applicationStages(transitionYear)
        : null;
  if (!seeds) return null;

  const source = stageSources.template(pathway);
  const nowIndex = monthIndex(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const { stages, tasks, bounds } = assemble(seeds, source, nowIndex);

  const startIndex = bounds[0].start;
  const endIndex = bounds[bounds.length - 1].end;
  const anchor = pathway === "统考" ? monthIndex(transitionYear - 1, 12) : monthIndex(transitionYear - 1, 9);
  const keyMoment = pathway === "统考" ? `初试（${transitionYear - 1} 年 12 月）` : pathway === "推免" ? `推免系统开放（${transitionYear - 1} 年 9 月）` : `申请季开始（${transitionYear - 1} 年 9 月）`;
  const months = anchor - nowIndex;

  const currentBound = bounds.find((bound) => nowIndex >= bound.start && nowIndex <= bound.end) ?? null;
  const currentStage = currentBound ? stages.find((stage) => stage.id === currentBound.id)?.name ?? null : null;

  const note = nowIndex < startIndex
    ? `按这套节奏，第一阶段从 ${stages[0].window} 开始。现在比标准节奏更早，正好用来核验资格、把目标定下来。`
    : nowIndex > endIndex
      ? "这套节奏的时间窗口已经过去。先更新目标年份，再重排一次。"
      : currentStage
        ? `按通行节奏，你现在应该在「${currentStage}」这一段。`
        : "现在落在两个阶段之间的空档，按上一阶段的判据收尾，别急着开新的。";

  return {
    stages,
    tasks,
    position: { months, key_moment: keyMoment, current_stage: currentStage, note },
    horizon: `目标年份 ${transitionYear}，距${keyMoment}还有 ${Math.abs(months)} 个月。下面的阶段按通行节奏排，具体日期每年公布，必须以官方公告为准。`,
    weekly_budget: [
      "把每周可用时间分成三份：基础学习、一次能交出来的练习、复盘与核验。比例自己调。",
      "每周记一次实际耗时。连续两周超出预算，就砍任务，不要压睡眠。",
    ],
  };
}

/** 每周复盘要回答的问题。只写感受不加数字的复盘没有用。 */
export const reviewQuestions = [
  "计划里的任务，这周实际完成了多少？",
  "哪一项的实际耗时比你估的多？多了多少？",
  "哪一项「学了但没过判据」？卡在哪一步？",
  "这周的注意力漏在哪件具体的事上？",
  "下周要停掉或降级哪一件？只能选一件，选最没用的。",
  "下周唯一必须交出来的东西是什么？",
] as const;

/** 复盘节奏：周、月、阶段末各看不同的东西。 */
export const reviewCadence = [
  { when: "每周", minutes: 15, what: "对着上面六个问题过一遍，写进下周的计划。" },
  { when: "每月", minutes: 45, what: "看目标还值不值得做、预算偏差多少、错题集中在哪一类。" },
  { when: "阶段末", minutes: 90, what: "按判据逐条判定。没过就补一段，不要带着没过的判据进下一阶段。" },
] as const;

/** 判据怎么算过。这一条决定了整份计划是不是自欺欺人。 */
export const exitRule = "判据只看你能不能做出来，不看投入了多少时间。合上书做题、口述或默写都算，重读一遍不算。同一个知识点隔两三天再自测一次，比当天连看三遍有用。";

/** 每年都会变、写进计划就会过时的东西。页面上单独列一段。 */
export const yearlyVerifyNotes = [
  "报名、网上确认与初试日期：每年由研招网公布，网上确认由各省考试院自定，没有全国统一日期。",
  "国家线公布与调剂系统开放时间：近年明显提前，以教育部当年公告为准。",
  "目标专业当年的招生章程：报考资格、考试科目、加试办法都以原文为准。",
  "推免与夏令营节点：院系自主安排，只能逐个查通知。",
] as const;
