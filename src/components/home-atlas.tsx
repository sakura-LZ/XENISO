import Link from "next/link";
import { InkField } from "@/components/ink-field";
import { ChromaInkStage } from "@/components/chroma-ink-stage";
import { HomeScene } from "@/components/home-scene";
import { FilingDrawer } from "@/components/filing-drawer";
import { IconProfile, IconQuiz, IconPulse, IconCalendar } from "@/components/icons";
import { groups } from "@/lib/directions";

const steps = [
  {
    href: "/profile",
    title: "个人画像",
    time: "10 分钟",
    lede: "课程、见习、科研、技能分开填，不合成一个总分。填完你能看清自己真正攒下了什么，也知道哪几门课是你的底气。",
    output: "能力底册",
    why: "不先盘点，就不知道能带走什么",
  },
  {
    href: "/report/initial",
    title: "初步评价",
    time: "30 题 · 约 10 分钟",
    lede: "O*NET 兴趣量表，六个维度各五题。结果分四栏：兴趣、能力迁移、知识缺口、报考条件。零基础不会被判成不适合。",
    output: "报告 R1",
    why: "先筛掉硬性走不通的，少花错力气",
  },
  {
    href: "/experience",
    title: "职业体验",
    time: "25 分钟",
    lede: "挑一个真实任务做一遍：核对资料、清洗记录、写一段结论。有导师数字人在旁边，卡住可以问。",
    output: "体验记录",
    why: "想象和真做是两件事，先试再决定",
  },
  {
    href: "/report/plan",
    title: "行动规划",
    time: "15 分钟",
    lede: "把体验结果变成能执行的安排：每周投多少小时、先补哪门基础、什么时候回头看一次。",
    output: "报告 R2",
    why: "没有时间表的计划，等于没有计划",
  },
];

/* 四步各配一个手绘线描图标，和抽屉标签上的编号一起用 */
const stepIcons = [<IconProfile key="p" />, <IconQuiz key="q" />, <IconPulse key="u" />, <IconCalendar key="c" />];

const notes = [
  { kind: "求助", title: "跨考公共卫生，统计基础要补到什么程度？", meta: "3 条回复 · 2 小时前" },
  { kind: "经验", title: "从临床转医学信息，我第一年踩过的三个坑", meta: "17 条回复 · 昨天" },
  { kind: "招募", title: "想找一位做过真实世界研究的朋友聊聊", meta: "1 条回复 · 3 天前" },
];

export function HomeAtlas() {
  const directionCount = groups.reduce((sum, group) => sum + group.specializations.length, 0);

  return (
    <main id="main">
      {/* ---------- 首屏：一张摊开的档案袋 ---------- */}
      <section className="atlas-hero">
        <div className="atlas-hero-ink" aria-hidden="true">
          <InkField className="atlas-hero-canvas" />
        </div>
        <div className="container atlas-hero-inner">
          <div className="atlas-hero-sheet atlas-sheet raised" data-atlas-reveal>
            <span className="atlas-tape mid" aria-hidden="true" />
            <h1 className="t-display">医学读到这里，路不止一条</h1>
            <svg className="atlas-hero-rule atlas-draw" viewBox="0 0 620 14" aria-hidden="true" style={{ ["--len" as string]: 640 }}>
              <path d="M2 9C96 3 168 11 262 7s176-6 268 1 66 2 88 0" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <p className="t-lede atlas-hero-lede">
              这里不猜你适合什么，也不给你排个名次。它做的事很朴素：把你的经历一条条摊开，
              对着真实职业要求核一遍，看哪些能带走、哪些得补，然后陪你走一段试试看。
            </p>
            <div className="atlas-hero-actions">
              <Link className="atlas-btn atlas-btn-primary" href="/profile">开始盘点我的经历</Link>
              <Link className="atlas-btn" href="/explore">先看看有哪些方向</Link>
            </div>
            <p className="t-meta atlas-hero-meta">
              XENISO 异域同构 · 全程 8–12 分钟，可以随时停下。填的东西只进你自己的档案，随时能删。
            </p>
          </div>

          <HomeScene groupCount={groups.length} directionCount={directionCount} />
        </div>
      </section>

      {/* ---------- 文字滚动带：跨学科方向主题 ---------- */}
      <div className="xn-marquee" aria-label="跨学科方向主题">
        <div className="xn-marquee-track">
          {[0, 1].map((copy) => (
            <div className="xn-marquee-group" key={copy} aria-hidden={copy === 1}>
              {["课程", "见习", "科研", "技能", "工具", "病例", "数据"].map((word) => (
                <span className="xn-marquee-item" key={word}>{word}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- 色键墨迹舞台：同一件事的四种看法 ---------- */}
      <section className="chroma-band">
        <div className="chroma-band-ink" aria-hidden="true">
          <ChromaInkStage className="chroma-canvas" />
        </div>
        <div className="container chroma-band-inner">
          <div className="chroma-copy" data-atlas-reveal>
            <p className="atlas-label">色键墨迹 · 实时生成</p>
            <h2 className="t-section">你走过的路，换个角度就能看见结构</h2>
            <p>
              左边这幅墨迹是实时画的：它先在绿幕上成形，再被逐像素抠掉底色，才叠到这张纸上。
              你把鼠标横着移过去，它会换成下一个阶段——这四个阶段，正好是你接下来要走的四步。
            </p>
            <ul className="chroma-legend">
              <li><b>墨环</b><span>盘点：环环相扣，先看清手上已有的东西</span></li>
              <li><b>墨涡</b><span>评价：向内收拢，兴趣与能力的交集</span></li>
              <li><b>脉迹</b><span>体验：真实节律，做过一次才知道</span></li>
              <li><b>格纸</b><span>规划：排进周次，才算真的开始</span></li>
            </ul>
            <p className="chroma-hint">移动鼠标切换阶段</p>
          </div>
        </div>
      </section>

      <section className="atlas-band" data-tone="paper-2">
        <div className="container">
          <div className="atlas-band-head" data-atlas-reveal>
            <h2 className="t-section">四步，每一步都留下能核对的东西</h2>
            <p className="t-lede">不是问卷填完给一段鸡汤。每一步都会生成一份你可以拿走、也可以推翻的材料。</p>
          </div>
          {/* 四步做成一只可以一格格拉开的档案抽屉：收起时只留编号、标题、时长，
              想看细节就拉开那一格。默认第一格是开的，否则页面一进来像空的。 */}
          <div data-atlas-reveal>
            <FilingDrawer
              className="home-filing-drawer"
              steps={steps.map((step, index) => ({
                ...step,
                no: `0${index + 1}`,
                icon: stepIcons[index],
              }))}
            />
          </div>
        </div>
      </section>

      {/* ---------- 文库 ---------- */}
      <section className="atlas-band">
        <div className="container atlas-split">
          <div data-atlas-reveal>
            <h2 className="t-section">每个方向能查到什么，先说清楚</h2>
            <p className="t-lede">
              文库按方向归档，一条资料对应一个来源。查得到的是报考条件、课程与技能要求、常见工作内容；
              查不到的（比如某个学校今年到底招几个）就明写没查到，不拿猜测凑数。
            </p>
            <Link className="atlas-btn" href="/explore">进文库看看</Link>
          </div>
          <div className="atlas-sheet atlas-lift" data-atlas-reveal>
            <span className="atlas-tape tr" aria-hidden="true" />
            <p className="atlas-label">方向目录</p>
            <ul className="atlas-dir-list">
              {groups.slice(0, 10).map(group => (
                <li key={group.id}>
                  <span>{group.name}</span>
                  <i>{group.specializations.length} 个去向</i>
                </li>
              ))}
            </ul>
            {groups.length > 10 && <p className="t-meta">还有 {groups.length - 10} 类方向在文库目录里。</p>}
            <div className="atlas-src-note">
              <p className="atlas-label">每条资料固定带三样</p>
              <p className="t-small">来源机构、发布日期、我们采集它的日期。三者缺一，这条就不进文库。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 社区 ---------- */}
      <section className="atlas-band" data-tone="paper-2">
        <div className="container">
          <div className="atlas-band-head" data-atlas-reveal>
            <h2 className="t-section">正在走这条路的人，把话留在这儿</h2>
            <p className="t-lede">求助、踩坑、找人聊。发帖可以匿名，也可以只用一句「我临床五年制，想问问」。</p>
          </div>
          <ul className="atlas-notes" data-atlas-reveal data-atlas-stagger>
            {notes.map(note => (
              <li key={note.title} className="atlas-sheet atlas-lift atlas-note">
                <span className="atlas-pin" aria-hidden="true" />
                <span className="atlas-chip" data-tone={note.kind === "求助" ? "gap" : note.kind === "经验" ? "ok" : undefined}>{note.kind}</span>
                <p className="atlas-note-title">{note.title}</p>
                <p className="t-meta">{note.meta}</p>
              </li>
            ))}
          </ul>
          <p className="t-meta atlas-center"><Link href="/community">进社区 →</Link></p>
        </div>
      </section>

      {/* ---------- 边界 ---------- */}
      <section className="atlas-band" data-tone="night">
        <div className="container atlas-limits" data-atlas-reveal>
          <h2 className="t-section">我们把话说在前面</h2>
          <div className="atlas-cols-3">
            <div>
              <p className="atlas-label">不给的东西</p>
              <p>不预测录取概率，不给方向排名，不算「适合度百分比」。这些数字看着专业，其实没有依据。</p>
            </div>
            <div>
              <p className="atlas-label">一定保留的</p>
              <p>继续医学、留在临床，永远是一条正经选择，不是「没转成」的退路。</p>
            </div>
            <div>
              <p className="atlas-label">数据怎么来的</p>
              <p>职业兴趣题目与职业信息来自 O*NET Web Services；方向映射由本站编辑整理，不是官方招生结论。</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
