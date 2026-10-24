import Link from "next/link";
import { InkField } from "@/components/ink-field";
import { BookSpread } from "@/components/book-spread";
import { HomeScene } from "@/components/home-scene";
import { FilingDrawer } from "@/components/filing-drawer";
import { IconProfile, IconQuiz, IconPulse, IconCalendar } from "@/components/icons";
import { groups } from "@/lib/directions";

const steps = [
  {
    href: "/profile",
    title: "个人画像",
    time: "从这里开始",
    lede: "分别整理课程、见习与技能经历，留下可核对的记录。选填项可以跳过。",
    output: "能力底册",
  },
  {
    href: "/report/initial",
    title: "初步评价",
    time: "填写画像后",
    lede: "O*NET 兴趣量表，六个维度各五题。结果分四栏：兴趣、能力迁移、知识缺口、报考条件。零基础不会被判成不适合。",
    output: "报告 R1",
  },
  {
    href: "/experience",
    title: "职业体验",
    time: "了解初评后",
    lede: "选择一个模拟职业任务，记录操作、选择理由和体验后的想法，导出体验记录。",
    output: "体验记录",
  },
  {
    href: "/report/plan",
    title: "行动规划",
    time: "完成体验后",
    lede: "把体验结果变成能执行的安排：每周投多少小时、先补哪门基础、什么时候回头看一次。",
    output: "报告 R2",
  },
];

/* 四步各配一个手绘线描图标，和抽屉标签上的编号一起用 */
const stepIcons = [<IconProfile key="p" />, <IconQuiz key="q" />, <IconPulse key="u" />, <IconCalendar key="c" />];

export function HomeAtlas() {
  const directionCount = groups.reduce((sum, group) => sum + group.specializations.length, 0);

  return (
    <main id="main" className="home-clarity">
      {/* ---------- 首屏：一张摊开的档案袋 ---------- */}
      <section className="atlas-hero">
        <div className="atlas-hero-ink" aria-hidden="true">
          <InkField className="atlas-hero-canvas" />
        </div>
        <div className="container atlas-hero-inner">
          <div className="atlas-hero-sheet atlas-sheet raised" data-atlas-reveal>
            <span className="atlas-tape mid" aria-hidden="true" />
            <p className="home-question">继续学医，还是试试其他方向？已有的经历能用在哪里？</p>
            <h1 className="t-display">看清方向，<br />再决定下一步</h1>
            <svg className="atlas-hero-rule atlas-draw" viewBox="0 0 620 14" aria-hidden="true" style={{ ["--len" as string]: 640 }}>
              <path d="M2 9C96 3 168 11 262 7s176-6 268 1 66 2 88 0" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <p className="t-lede atlas-hero-lede">
              面向医学生的跨学科探索与行动规划平台。梳理你的经历与职业兴趣，了解不同方向的实际工作，
              通过模拟任务体验，形成可导出的准备计划。
            </p>
            <div className="atlas-hero-actions">
              <Link className="atlas-btn atlas-btn-primary" href="/profile">开始探索 <span aria-hidden="true">→</span></Link>
              <Link className="home-text-link" href="/explore">先浏览方向文库</Link>
            </div>
          </div>

          <HomeScene groupCount={groups.length} directionCount={directionCount} />
        </div>
      </section>

      {/* ---------- 装订册：一张图版，一页目录 ----------
          这一屏换过四版：随鼠标变形的水墨画布（抽象、和网站无关）、逐条核对的表格
          （清楚但没劲）、印刷「对版」（对得上才实）、根须图（墨迹分布脏、交互看不出）。
          现在是第五版：一本摊开的线圈装订册。左边是 1568 年的解剖图版，右边是方向索引，
          可以真的翻过去——翻动是这一屏的主张本身：路就在这儿，只是没打光/没翻页时看不见。 */}
      <section className="bk-band" id="direction-index">
        <div className="container">
          <div className="bk-head" data-atlas-reveal>
            <h2 className="t-section">先了解有哪些方向</h2>
          </div>
          <BookSpread />
        </div>
      </section>

      <section className="atlas-band" data-tone="paper-2">
        <div className="container">
          <div className="atlas-band-head" data-atlas-reveal>
            <h2 className="t-section">探索分四步进行</h2>
            <p className="t-lede">先整理经历，再了解兴趣、体验工作，最后形成准备计划。展开查看每一步的内容与产出。</p>
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

      {/* ---------- 社区 ---------- */}
      <section className="atlas-band" data-tone="paper-2">
        <div className="container">
          <div className="atlas-band-head" data-atlas-reveal>
            <h2 className="t-section">还有具体问题？去社区交流</h2>
            <p className="t-lede">浏览其他人的分享，或登录后提出你的方向选择与准备问题。</p>
            <Link className="home-text-link" href="/community">进入交流社区 <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

    </main>
  );
}
