import Image from "next/image";
import { HomeSceneMotion } from "@/components/home-scene-motion";

/**
 * 首屏主视觉：一只摊开的档案夹，四张手写卡按步骤钉在里面，中间用虚线串起来。
 * 图形全部是内联 SVG（来自 redesign/xeniso.html 的手绘图形库），不额外请求图片，
 * 也不依赖 canvas，所以在任何浏览器里都能出来。
 *
 * data-hs-depth：指针微交互里的分层深度（px，指指针推到边界时的位移量）。
 * 档案夹最浅、图版和卡片最前——手扫过纸面时近的走得多、远的走得少。
 * 具体行为在 home-scene-motion.tsx。
 */

const art = {
  profile: (
    <>
      <rect x="14" y="10" width="112" height="80" rx="1.5" fill="none" stroke="#4a5d3a" strokeWidth="1.4" />
      <line x1="14" y1="28" x2="126" y2="28" stroke="#4a5d3a" strokeWidth="1.2" />
      <circle cx="26" cy="19" r="4.6" fill="none" stroke="#37452b" strokeWidth="1.2" />
      <line x1="34" y1="17" x2="70" y2="17" stroke="#37452b" strokeWidth="1" />
      <line x1="34" y1="22" x2="58" y2="22" stroke="#37452b" strokeWidth=".8" strokeDasharray="2 2" />
      <g stroke="#37452b" strokeWidth=".9">
        <line x1="22" y1="40" x2="74" y2="40" /><line x1="22" y1="52" x2="66" y2="52" />
        <line x1="22" y1="64" x2="72" y2="64" /><line x1="22" y1="76" x2="60" y2="76" />
      </g>
      <g fill="none" stroke="#8f4726" strokeWidth="1">
        <rect x="92" y="36" width="5" height="5" /><rect x="99" y="36" width="5" height="5" />
        <rect x="106" y="36" width="5" height="5" /><rect x="113" y="36" width="5" height="5" />
        <rect x="120" y="36" width="5" height="5" />
        <rect x="92" y="48" width="5" height="5" /><rect x="99" y="48" width="5" height="5" />
        <rect x="106" y="48" width="5" height="5" /><rect x="113" y="48" width="5" height="5" />
        <rect x="120" y="48" width="5" height="5" />
        <rect x="92" y="60" width="5" height="5" /><rect x="99" y="60" width="5" height="5" />
        <rect x="106" y="60" width="5" height="5" /><rect x="113" y="60" width="5" height="5" />
        <rect x="120" y="60" width="5" height="5" />
        <rect x="92" y="72" width="5" height="5" /><rect x="99" y="72" width="5" height="5" />
        <rect x="106" y="72" width="5" height="5" /><rect x="113" y="72" width="5" height="5" />
        <rect x="120" y="72" width="5" height="5" />
      </g>
      <g fill="#4a5d3a">
        <rect x="92" y="36" width="5" height="5" /><rect x="99" y="36" width="5" height="5" />
        <rect x="113" y="36" width="5" height="5" />
        <rect x="99" y="48" width="5" height="5" /><rect x="106" y="48" width="5" height="5" />
        <rect x="92" y="60" width="5" height="5" />
        <rect x="106" y="72" width="5" height="5" /><rect x="120" y="72" width="5" height="5" />
      </g>
    </>
  ),
  radar: (
    <>
      <g fill="none" stroke="#37452b" strokeWidth=".9">
        <polygon points="70,14 101,32 101,68 70,86 39,68 39,32" />
        <polygon points="70,26 92,38 92,62 70,74 48,62 48,38" />
        <polygon points="70,38 82,46 82,54 70,62 58,54 58,46" />
        <line x1="70" y1="14" x2="70" y2="86" /><line x1="39" y1="32" x2="101" y2="68" />
        <line x1="101" y1="32" x2="39" y2="68" />
      </g>
      <polygon points="70,22 96,34 88,60 70,78 50,60 52,40" fill="rgba(74,93,58,.22)" stroke="#4a5d3a" strokeWidth="1.6" />
      <g fill="#8f4726">
        <circle cx="70" cy="22" r="2" /><circle cx="96" cy="34" r="2" /><circle cx="88" cy="60" r="2" />
        <circle cx="70" cy="78" r="2" /><circle cx="50" cy="60" r="2" /><circle cx="52" cy="40" r="2" />
      </g>
      <line x1="20" y1="92" x2="120" y2="92" stroke="#37452b" strokeWidth=".8" strokeDasharray="3 3" />
    </>
  ),
  ecg: (
    <>
      <path d="M8,52 L26,52 L32,52 L38,28 L44,74 L50,52 L64,52 L70,44 L76,52 L96,52 L102,52 L108,34 L114,68 L120,52 L132,52" fill="none" stroke="#4a5d3a" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="8" y1="34" x2="132" y2="34" stroke="#8f4726" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="96" y1="16" x2="96" y2="86" stroke="#8f4726" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="96" cy="52" r="2.6" fill="#8f4726" />
      <g stroke="#37452b" strokeWidth=".7" opacity=".55">
        <line x1="8" y1="88" x2="132" y2="88" />
        <line x1="20" y1="86" x2="20" y2="90" /><line x1="40" y1="86" x2="40" y2="90" />
        <line x1="60" y1="86" x2="60" y2="90" /><line x1="80" y1="86" x2="80" y2="90" />
        <line x1="100" y1="86" x2="100" y2="90" /><line x1="120" y1="86" x2="120" y2="90" />
      </g>
    </>
  ),
  week: (
    <>
      <g stroke="#37452b" strokeWidth=".9" fill="none">
        <rect x="16" y="16" width="108" height="70" rx="1.5" />
        <line x1="16" y1="30" x2="124" y2="30" />
        <line x1="38" y1="16" x2="38" y2="86" /><line x1="60" y1="16" x2="60" y2="86" />
        <line x1="82" y1="16" x2="82" y2="86" /><line x1="104" y1="16" x2="104" y2="86" />
        <line x1="16" y1="48" x2="124" y2="48" /><line x1="16" y1="66" x2="124" y2="66" />
      </g>
      <g fill="rgba(74,93,58,.3)" stroke="#4a5d3a" strokeWidth=".8">
        <rect x="17" y="31" width="20" height="16" /><rect x="39" y="31" width="20" height="16" />
        <rect x="61" y="49" width="20" height="16" /><rect x="83" y="49" width="20" height="16" />
        <rect x="105" y="31" width="18" height="16" />
      </g>
      <g fill="rgba(143,71,38,.28)" stroke="#8f4726" strokeWidth=".8">
        <rect x="39" y="67" width="20" height="16" /><rect x="83" y="31" width="20" height="16" />
      </g>
      <path d="M16,92 L124,92" stroke="#37452b" strokeWidth=".8" strokeDasharray="3 3" />
    </>
  ),
} as const;

type SceneCard = {
  href: string;
  no: string;
  title: string;
  art: keyof typeof art;
  desc: string;
  tape: "tl" | "tr" | "bl" | "br";
  depth: number;
};

const cards: SceneCard[] = [
  { href: "/profile", no: "01", title: "个人画像", art: "profile", desc: "整理课程、见习与技能经历。", tape: "tl", depth: 5 },
  { href: "/report/initial", no: "02", title: "初步评价", art: "radar", desc: "完成 30 道职业兴趣题，查看探索方向。", tape: "tr", depth: 8.6 },
  { href: "/experience", no: "03", title: "职业体验", art: "ecg", desc: "尝试模拟工作，记录选择与感受。", tape: "bl", depth: 7.2 },
  { href: "/report/plan", no: "04", title: "行动规划", art: "week", desc: "结合目标和可投入时间，安排后续准备。", tape: "br", depth: 11 },
];

export function HomeScene({ groupCount, directionCount }: { groupCount: number; directionCount: number }) {
  return (
    <div className="hero-scene" data-atlas-reveal>
      <HomeSceneMotion />
      <div className="scene-folder" data-hs-depth="1.6" aria-hidden="true" />

      {/* 档案原件：一张公有领域的解剖图版，像被随手夹进档案夹的复印件。
          它不是为了好看而放的装饰图，而是这个站"每条结论都要有出处"的物证。
          这块曾被整段删掉，用户澄清后恢复——要删的是压在它上面的赭黄批注
          （.scene-hand，已在下方移除），图版本身留着。
          priority 让它进首屏预载：JPG 解码前的那个窗口是"变白闪"的来源。 */}
      <figure className="scene-archive" data-hs-depth="5.2">
        <Image
          src="/generated/W3-hsyw2whj.jpg"
          alt="19 世纪人体解剖图版，Jones Quain 编，Wellcome Collection 藏"
          width={1189}
          height={1600}
          sizes="(max-width: 1024px) 120px, 160px"
          priority
        />
        <figcaption>Quain 解剖图版 · Wellcome Collection</figcaption>
      </figure>

      <svg className="scene-thread" data-hs-depth="2.6" viewBox="0 0 680 600" preserveAspectRatio="none" aria-hidden="true">
        <path d="M196,150 C280,168 300,196 360,214" fill="none" stroke="#8f4726" strokeWidth="1.6" strokeDasharray="6 6" opacity=".55" />
        <path d="M470,250 C420,300 330,300 268,330" fill="none" stroke="#8f4726" strokeWidth="1.6" strokeDasharray="6 6" opacity=".55" />
        <path d="M420,430 C470,440 500,470 540,486" fill="none" stroke="#8f4726" strokeWidth="1.6" strokeDasharray="6 6" opacity=".5" />
        <circle cx="360" cy="214" r="3.2" fill="#8f4726" opacity=".7" />
        <circle cx="268" cy="330" r="3.2" fill="#8f4726" opacity=".7" />
        <circle cx="540" cy="486" r="3.2" fill="#8f4726" opacity=".6" />
      </svg>

      {cards.map((card, index) => (
        <div key={card.href} className={`scene-card scene-c${index + 1}`} data-hs-depth={card.depth} data-atlas-stagger>
          <span className={`scene-tape scene-tape-${card.tape}`} aria-hidden="true" />
          <span className="scene-no">{card.no}</span>
          <span className="scene-title">{card.title}</span>
          <span className="scene-art" aria-hidden="true">
            <svg viewBox="0 0 140 100">{art[card.art]}</svg>
          </span>
          <span className="scene-d">{card.desc}</span>
        </div>
      ))}

      <p className="scene-stamp" data-hs-depth="3.4" aria-hidden="true">
        {groupCount} 类方向<br />{directionCount} 个去向
      </p>
    </div>
  );
}
