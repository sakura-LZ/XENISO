import Link from "next/link";

/**
 * 核对单（CheckSheet）
 * ---------------------------------------------------------------------------
 * 取代原来的「色键墨迹舞台」。那一版是一块随鼠标变形的水墨画布：技术上很讲究，
 * 但画面不承载任何产品信息——墨环/墨涡/脉迹/格纸 与 四步 的对应关系只写在图例
 * 文字里，用户读完仍然不知道这个站在做什么，而且和正下方的四步抽屉重复。
 *
 * 这一版把产品真正的机制摊开成一张纸：左边是你手上已经有的，右边是目标方向的
 * 真实要求，一条一条对，落到三栏——能带走 / 要补 / 硬性不通。"硬性不通"排在明面
 * 上，是这个站"先筛掉走不通的"那句话的实物证据。
 *
 * 全静态：没有 canvas、没有 WebGL、没有指针监听。入场只靠 atlas.css 的
 * [data-atlas-reveal] 与 [data-atlas-in]，判定章按顺序落下；减少动效时直接归位。
 */

type Verdict = "ok" | "gap" | "miss";

type Row = {
  no: string;
  have: string;
  need: string;
  verdict: Verdict;
};

const VERDICT_LABEL: Record<Verdict, string> = {
  ok: "能带走",
  gap: "要补",
  miss: "硬性不通",
};

const ROWS: Row[] = [
  { no: "01", have: "临床轮转 12 个月", need: "人群健康沟通与随访", verdict: "ok" },
  { no: "02", have: "卫生统计学 修过 2 学分", need: "统计推断与样本量估算", verdict: "gap" },
  { no: "03", have: "见习期清洗过 400 条随访记录", need: "数据清洗与可复现流程", verdict: "ok" },
  { no: "04", have: "综述 1 篇（第二作者）", need: "文献检索与证据分级", verdict: "gap" },
  { no: "05", have: "没写过代码", need: "R 或 Python 基础", verdict: "gap" },
  { no: "06", have: "本科 医学检验技术（四年制）", need: "报考条件 · 需医学门类本科", verdict: "miss" },
];

const ORDER: Verdict[] = ["ok", "gap", "miss"];

export function CheckSheet() {
  const buckets = ORDER.map((verdict) => {
    const hits = ROWS.filter((row) => row.verdict === verdict);
    return { verdict, count: hits.length, nos: hits.map((row) => row.no).join(" · ") };
  });

  return (
    <div className="cb" data-atlas-reveal>
      <div className="atlas-sheet raised cb-sheet">
        <span className="atlas-tape tr" aria-hidden="true" />

        <header className="cb-head">
          <div>
            <p className="atlas-label">核对单 · 共 {ROWS.length} 条</p>
            <p className="cb-target">目标方向 · 公共卫生（专硕）</p>
          </div>
          <p className="cb-basis">
            依据 O*NET 职业要求
            <br />
            与本站方向映射（编辑整理）
          </p>
        </header>

        <div className="cb-cols" aria-hidden="true">
          <span>序号</span>
          <span>你手上的</span>
          <span />
          <span>方向要求</span>
          <span>判定</span>
        </div>

        <ol className="cb-rows">
          {ROWS.map((row) => (
            <li className="cb-row" key={row.no} data-v={row.verdict}>
              <span className="cb-no">{row.no}</span>
              <span className="cb-have">{row.have}</span>
              <span className="cb-arrow" aria-hidden="true">
                →
              </span>
              <span className="sr-only">对照方向要求</span>
              <span className="cb-need">{row.need}</span>
              <span className="cb-verdict" data-v={row.verdict}>
                {VERDICT_LABEL[row.verdict]}
              </span>
            </li>
          ))}
        </ol>

        <div className="cb-foot">
          {buckets.map((bucket) => (
            <div className="cb-bucket" data-v={bucket.verdict} key={bucket.verdict}>
              <span className="cb-bucket-name">
                {VERDICT_LABEL[bucket.verdict]}
                <b>{bucket.count}</b>
              </span>
              <span className="cb-bucket-nos">{bucket.nos}</span>
            </div>
          ))}
        </div>

        <p className="cb-note">
          招生条件以当年官方目录为准；每条例证的来源机构与采集日期随资料一起给出，查不到的写没查到。
        </p>
      </div>
    </div>
  );
}

/** 左栏：说明 + 三栏口径 + 入口。和核对单同屏，读的人先知道三栏是什么意思。 */
export function CheckSheetCopy() {
  return (
    <div className="check-copy" data-atlas-reveal>
      <p className="atlas-label">核对 · 一条一条对</p>
      <h2 className="t-section">你的经历，会被这样一条条核对</h2>
      <p>
        不打一个总分，也不排个名次。课程、见习、科研、技能拆成条目，逐条对着目标方向的真实要求核一遍，
        落到三栏：能带走的、要补的、硬性走不通的。
      </p>
      <p>
        硬性走不通的先说。省得你在一个根本报不上的方向上，花掉半年。
      </p>

      <ul className="check-key">
        <li>
          <span className="cb-verdict" data-v="ok">能带走</span>
          <span>已经够用，写进简历就能用的那部分。</span>
        </li>
        <li>
          <span className="cb-verdict" data-v="gap">要补</span>
          <span>差得清楚、补得回来的，标出补到哪一步算够。</span>
        </li>
        <li>
          <span className="cb-verdict" data-v="miss">硬性不通</span>
          <span>专业背景、执业资格这类改不了的，先拦住。</span>
        </li>
      </ul>

      <div className="check-actions">
        <Link className="atlas-btn atlas-btn-primary" href="/profile">先做一次盘点</Link>
        <Link className="atlas-btn" href="/explore">进文库看要求</Link>
      </div>
    </div>
  );
}
