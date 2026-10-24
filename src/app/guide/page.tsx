import Link from "next/link";
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
  { no: "01", title: "画像", output: "能力底册", href: "#profile" },
  { no: "02", title: "初步评价", output: "R1 四栏", href: "#initial" },
  { no: "03", title: "职业体验", output: "体验卡", href: "#experience" },
  { no: "04", title: "行动规划", output: "R2 计划", href: "#plan" },
];

const toc = [
  { href: "#start", label: "四步路径" },
  { href: "#profile", label: "个人画像" },
  { href: "#initial", label: "初步评价" },
  { href: "#experience", label: "职业体验" },
  { href: "#plan", label: "行动规划" },
  { href: "#library", label: "信息文库" },
  { href: "#boundaries", label: "口径与边界" },
  { href: "#data", label: "数据与来源" },
  { href: "#privacy", label: "隐私与保存" },
  { href: "#glossary", label: "名词表" },
  { href: "#questions", label: "常见问题" },
];

/** 报考条件的核验清单，从初评页收进来的事实，默认折叠。 */
const initialChecks = [
  "学校与项目：核实院校、项目名称、专业代码与招生方式。",
  "目标年份：核实招生年份、报名与考核时间，记下发布日期。",
  "报考条件：核实跨专业资格、考试科目、语言与复试要求。",
  "官方来源：保存项目官方 URL、原文与本次核验日期。",
];

const boundaries = [
  { term: "不预测录取概率", body: "兴趣与经历只用于辅助探索，报考资格以院校官方要求为准。" },
  { term: "不给适合度百分比", body: "兴趣分只说明你愿意做哪类活动，不折算成「适合度」，也不跟别人比。" },
  { term: "不评价能力高低", body: "页面只记录你写过什么、做过什么，不判断掌握水平。" },
  { term: "没记录不等于没能力", body: "知识缺口表示档案里缺证据、暂时对不上手册要求，不是学不会。" },
  { term: "未知就写未知", body: "原文没写的标「没查到」，没有可靠数据就不编时长、薪资或招生数字。" },
  { term: "待核验不是失败", body: "招生条目在拿到官方原文前一律显示待核验，需要你自己去核并记下日期。" },
  { term: "simulation 是合成的", body: "带 simulation 的材料、画像和体验记录只用于演示，不能当临床依据或岗位绩效。" },
  { term: "继续医学同样正当", body: "留在临床是一条正经选择，不是「没转成」的退路；选它同样能出计划。" },
  { term: "AI 只引述证据", body: "AI 解读串写已保存的事实，不新增院校、科目或结论；生成与否由你决定。" },
];

const dataSources = [
  { term: "兴趣题目与职业信息", body: "来自 O*NET Web Services（USDOL/ETA）。O*NET® 为 USDOL/ETA 商标。" },
  { term: "中文译稿", body: `${translation.version}，题目、题号、维度与版本原样对照，待人工复核后对外。` },
  { term: "方向映射", body: "由本站编辑整理的一对多映射，不是 O*NET 官方或中国考研专业的结论。" },
  { term: "招生条目", body: "只收有官方原文的项目，写明学校、年份与来源；没核实的不补。" },
  { term: "插画", body: "方向身份图来自 Storyset（Pana 系列），按其许可署名使用。" },
  { term: "报告版本", body: "页面会写明规则版本号；画像或体验改动后，旧的 R1、R2 会提示过期并需要重做。" },
];

const privacy = [
  { term: "生成 AI 解读时发送什么", body: "兴趣结果、技能与项目证据，以及需要的体验与计划参数；不发送昵称与院校字段。" },
  { term: "自由文本", body: "填写经历或和导师对话时，避免写入身份证号、联系方式等身份标识。" },
  { term: "数字人", body: "只收到你当前在看的方向和步骤；个人画像与写下的理由不会自动发过去；对话默认不保存。" },
  { term: "保存与删除", body: "画像、报告与体验成果保存在账户下；可到「我的资料与删除」删除账户及个人记录。" },
];

const faq = [
  { q: "可以分几次完成吗？", a: "可以。离开填写页前先检查保存提示；体验中的本机草稿与云端保存以页面状态为准。" },
  { q: "为什么有的栏目是空的？", a: "还没做兴趣问卷、还没填经历，或没有拿到官方原文。空着表示缺证据，不代表结论是负面的。" },
  { q: "改了画像，报告为什么要重做？", a: "报告按输入生成并记录指纹。画像或体验改动后，旧报告会标记过期，避免用旧结论下判断。" },
  { q: "资料和结果可以带走吗？", a: "报告和体验成果提供导出入口。满足页面所列条件后，可下载 JSON 或 Markdown 记录。" },
  { q: "导师是真人吗？", a: "不是。带教导师是 AI 模拟形象，会如实说明；回答只用于演示与练习。" },
  { q: "怎么删除个人资料？", a: "前往「我的资料与删除」，按页面提示处理账户及个人记录。" },
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
      <li><b className="gd-ledger-name">基本信息</b><span className="gd-ledger-desc">昵称 · 院校 · 专业 · 年级</span><span className="gd-ledger-count">5 / 5</span></li>
      <li><b className="gd-ledger-name">学业与英语</b><span className="gd-ledger-desc">GPA · 年级排名 · 课程成绩</span><span className="gd-ledger-count">4 / 5</span></li>
      <li><b className="gd-ledger-name">科研与技能</b><span className="gd-ledger-desc">研究项目 · 论文 · 工具</span><span className="gd-ledger-count">3 / 5</span></li>
      <li><b className="gd-ledger-name">偏好与目标</b><span className="gd-ledger-desc">还没填</span><span className="gd-ledger-count">0 / 5</span></li>
    </ul>
    <div className="gd-mock-foot">
      <span className="atlas-chip" data-tone="ok">兴趣问卷 · 30 题 · 已完成</span>
      <span className="gd-mock-note">还差 6 项可进下一步。</span>
    </div>
  </div>;
}

function InitialMock() {
  return <div className="gd-mock" role="img" aria-label="初步评价示意：四栏分别为兴趣、能力迁移、知识缺口、报考条件，各自带状态标签">
    <div className="gd-mock-bar">
      <span className="gd-mock-name">R1 · 初步评价</span>
      <span className="gd-mock-fig">limen-r1-rules-v1</span>
      <span className="gd-mock-tag">示例</span>
    </div>
    <div className="gd-four">
      <div className="gd-four-col">
        <p className="gd-four-name">兴趣</p>
        <span className="atlas-chip" data-tone="ok">已读到官方兴趣结果</span>
        <p className="gd-four-line">O*NET Mini-IP · 30 题</p>
      </div>
      <div className="gd-four-col">
        <p className="gd-four-name">能力迁移</p>
        <span className="atlas-chip">本人填写 · 未独立核验</span>
        <p className="gd-four-line">记录 4 条，可展开原文</p>
      </div>
      <div className="gd-four-col">
        <p className="gd-four-name">知识缺口</p>
        <span className="atlas-chip" data-tone="gap">要补基础</span>
        <p className="gd-four-line">3 项没有记录</p>
      </div>
      <div className="gd-four-col">
        <p className="gd-four-name">报考条件</p>
        <span className="atlas-chip" data-tone="miss">没查到</span>
        <p className="gd-four-line">全部待核验</p>
      </div>
    </div>
  </div>;
}

function ExperienceMock() {
  return <div className="gd-mock" role="img" aria-label="职业体验示意：项目模式三步，第一步已提交，第二步进行中，之后是复盘与成果">
    <div className="gd-mock-bar">
      <span className="gd-mock-name">模拟项目 · 三步</span>
      <span className="simulation-tag">simulation · 合成材料</span>
      <span className="gd-mock-tag">示例</span>
    </div>
    <div className="gd-mock-modes">
      <span className="atlas-chip" data-tone="ok">按项目做</span>
      <span className="atlas-chip">按面试做</span>
    </div>
    <ol className="gd-flow">
      <li data-state="done"><span className="gd-flow-no">第 1 步</span><span className="gd-flow-name">选择验证样本</span><span className="gd-flow-mark">已提交</span></li>
      <li data-state="current"><span className="gd-flow-no">第 2 步</span><span className="gd-flow-name">调整判定阈值</span><span className="gd-flow-mark">当前</span></li>
      <li data-state="todo"><span className="gd-flow-no">第 3 步</span><span className="gd-flow-name">确定复核策略</span></li>
      <li data-state="todo"><span className="gd-flow-no">复盘</span><span className="gd-flow-name">复盘与成果</span></li>
    </ol>
  </div>;
}

function PlanMock() {
  return <div className="gd-mock" role="img" aria-label="行动规划示意：条件齐备可导出，目标方向、转型年份、每周投入与栏目切换">
    <div className="gd-mock-bar">
      <span className="gd-mock-name">R2 · 行动规划</span>
      <span className="atlas-chip" data-tone="ok">条件齐备，可导出</span>
      <span className="gd-mock-tag">示例</span>
    </div>
    <dl className="gd-plan">
      <div><dt>目标方向</dt><dd>机器学习与计算机视觉</dd></div>
      <div><dt>计划转型年份</dt><dd>2028 年</dd></div>
      <div><dt>每周可投入小时</dt><dd>8 小时</dd></div>
      <div><dt>升学路径</dt><dd>统考</dd></div>
    </dl>
    <ul className="gd-tabs">
      <li data-current="true">阶段计划</li>
      <li>知识缺口</li>
      <li>时间安排</li>
      <li>招生核验</li>
    </ul>
  </div>;
}

function LibraryMock() {
  return <div className="gd-mock" role="img" aria-label="信息文库示意：按关键词检索方向，勾选两个方向并排比较，每条带原文年份">
    <div className="gd-mock-bar">
      <span className="gd-mock-name">方向目录</span>
      <span className="gd-mock-fig">12 个方向</span>
      <span className="gd-mock-tag">示例</span>
    </div>
    <p className="gd-search"><span>关键词</span><b>医学影像</b></p>
    <ul className="gd-catalog">
      <li><span className="gd-check" aria-hidden="true">✓</span><b>机器学习与计算机视觉</b><span className="atlas-chip">原文 · 2026</span></li>
      <li><span className="gd-check" aria-hidden="true">✓</span><b>医学影像工程</b><span className="atlas-chip">原文 · 2026</span></li>
    </ul>
  </div>;
}

export default function GuidePage() {
  return <main id="main" className="container guide-page">
    <header id="start" className="guide-hero">
      <p className="kicker">使用指南</p>
      <h1>一次异域探索，四步走完。</h1>
      <p className="gd-hero-lede">每步都有产出；中途退出，回来接着做。</p>
      <ol className="gd-path" aria-label="四步路径">
        {route.map(item => <li key={item.no}>
          <a href={item.href}>
            <span className="gd-path-no">{item.no}</span>
            <span className="gd-path-title">{item.title}</span>
            <span className="gd-path-out">拿到 {item.output}</span>
          </a>
        </li>)}
      </ol>
      <Link className="atlas-btn atlas-btn-primary" href="/profile">从个人画像开始 <span className="arrow" aria-hidden="true">→</span></Link>
    </header>

    <div className="guide-layout">
      <nav className="guide-nav" aria-label="指南目录">
        {toc.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>

      <div>
        <section id="profile" className="guide-topic gd-step">
          <div className="gd-head">
            <span className="gd-no" aria-hidden="true">01</span>
            <h2>个人画像</h2>
            <span className="atlas-chip">产出 · 能力底册</span>
          </div>
          <ProfileMock />
          <div className="gd-body">
            <ol className="gd-points">
              <li>四节共 20 项，填满 18 项就能进下一步。</li>
              <li>兴趣问卷 30 题，按喜好选，不用先考虑能不能做到。</li>
              <li>没有的字段如实留空，随时回来改。</li>
            </ol>
            <Link className="atlas-btn" href="/profile">进入个人画像 <span className="arrow" aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section id="initial" className="guide-topic gd-step">
          <div className="gd-head">
            <span className="gd-no" aria-hidden="true">02</span>
            <h2>初步评价</h2>
            <span className="atlas-chip">产出 · R1 四栏</span>
          </div>
          <InitialMock />
          <div className="gd-body">
            <ol className="gd-points">
              <li>兴趣来自 O*NET 官方计分，只说明偏好，不代表能力水平。</li>
              <li>能力迁移逐条可展开来源核对；没记录不等于没能力。</li>
              <li>报考条件全部待核验，没拿到当年官方原文就留空。</li>
            </ol>
            <Link className="atlas-btn" href="/report/initial">查看初步评价 <span className="arrow" aria-hidden="true">→</span></Link>
          </div>
          <details className="gd-fact gd-fact-block">
            <summary>报考条件核验四处</summary>
            <ul>{initialChecks.map(check => <li key={check}>{check}</li>)}</ul>
          </details>
        </section>

        <section id="experience" className="guide-topic gd-step">
          <div className="gd-head">
            <span className="gd-no" aria-hidden="true">03</span>
            <h2>职业体验</h2>
            <span className="atlas-chip">产出 · 体验卡</span>
          </div>
          <ExperienceMock />
          <div className="gd-body">
            <ol className="gd-points">
              <li>先选方向与任务，再选按项目做或按面试做。</li>
              <li>三步各做一个选择并写下理由，至少 10 个字；改了前一步要重新确认后续。</li>
              <li>四问复盘后保存成果，可导出 JSON 或 Markdown。</li>
            </ol>
            <Link className="atlas-btn" href="/experience">进入职业体验 <span className="arrow" aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section id="plan" className="guide-topic gd-step">
          <div className="gd-head">
            <span className="gd-no" aria-hidden="true">04</span>
            <h2>行动规划</h2>
            <span className="atlas-chip">产出 · R2 计划</span>
          </div>
          <PlanMock />
          <div className="gd-body">
            <ol className="gd-points">
              <li>读取画像、兴趣与体验，填方向、年份、路径与每周投入。</li>
              <li>左侧切换阶段计划、知识缺口、时间安排与招生核验。</li>
              <li>规则预览随条件更新；AI 解释单独生成，条件齐备才能导出。</li>
            </ol>
            <Link className="atlas-btn" href="/report/plan">进入行动规划 <span className="arrow" aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section id="library" className="guide-topic gd-step">
          <div className="gd-head">
            <span className="gd-no" aria-hidden="true">文库</span>
            <h2>信息文库</h2>
            <span className="atlas-chip">随时可查</span>
          </div>
          <LibraryMock />
          <div className="gd-body">
            <ol className="gd-points">
              <li>按关键词或分类收窄方向，点名称读详情。</li>
              <li>原文、适用年份与来源都能展开核对。</li>
              <li>勾两个方向并排比较；没查到的仍需自己核验。</li>
            </ol>
            <Link className="atlas-btn" href="/explore">进入信息文库 <span className="arrow" aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section id="boundaries" className="guide-topic">
          <div className="gd-head"><h2>口径与边界</h2></div>
          <p className="gd-lede">整站通用，页面正文不重复。</p>
          <dl className="gd-rules">{boundaries.map(item => <div key={item.term}><dt>{item.term}</dt><dd>{item.body}</dd></div>)}</dl>
        </section>

        <section id="data" className="guide-topic">
          <div className="gd-head"><h2>数据与来源</h2></div>
          <p className="gd-lede">每条结论都能回到来源。</p>
          <div className="gd-facts">{dataSources.map(item => <details key={item.term} className="gd-fact">
            <summary>{item.term}</summary>
            <p>{item.body}</p>
          </details>)}</div>
        </section>

        <section id="privacy" className="guide-topic">
          <div className="gd-head"><h2>隐私与保存</h2></div>
          <p className="gd-lede">哪些数据会离开本机，先说清楚。</p>
          <div className="gd-facts">{privacy.map(item => <details key={item.term} className="gd-fact">
            <summary>{item.term}</summary>
            <p>{item.body}</p>
          </details>)}</div>
        </section>

        <section id="glossary" className="guide-topic">
          <div className="gd-head"><h2>名词表</h2></div>
          <dl className="guide-kv">
            <div><dt>能力底册</dt><dd>个人画像整理出的课程、经历与工具清单，是能力迁移栏的原始材料。</dd></div>
            <div><dt>R1 · 初步评价</dt><dd>固定四栏：兴趣、能力迁移、知识缺口、报考条件。规则整理，不需要联网。</dd></div>
            <div><dt>R2 · 行动规划</dt><dd>把 R1 的结论排到具体时间上：每周小时数、阶段目标与待核验清单。</dd></div>
            <div><dt>关系类型</dt><dd>直接关联＝同一职业；相关关联＝同一职业家族的邻近岗位；邻近关联＝任务相近但路径不同。</dd></div>
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
