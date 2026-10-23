# XENISO 设计系统（2026-10-22 重建版）

本文是全站视觉与交互的唯一依据。`XENISO_CAREEREXPLORER_REDESIGN.md` 中的页面结构、真实数据与文案规则仍然有效，其中的像素数值只作参考；与本文冲突时以本文为准。

## 1. 设计立意

**“学术出版物 × 精密工具”。** 暖白纸面、深绿黑墨色、宋体标题、黑体正文，大量留白，用细线（hairline）而不是卡片阴影组织层级。参考 CareerExplorer 的大字号、图文比例、固定双栏叙事和横向文字带，但气质更安静、更像一本做得很好的专业手册。

三个贯穿全站的签名元素：

1. **绿色小方块**：取自 Logo 中的绿色方块。用作章节标记（`.kicker`）、当前导航项、步骤序号、列表符号。全站只有这一个装饰符号。
2. **宋体大标题**：页面主标题、章节标题、方向名称、跑马灯使用 `--font-serif`（思源宋体 600）；其余一律 `--font-sans`（思源黑体）。不要第三种字体。
3. **“同构”连线**：“异域同构”= 不同领域里相同的结构。凡是表达“医学经历 → 新领域任务 → 证据”这种对应关系的地方，用两列对齐 + 细连接线的图形，而不是一堆卡片。只在关系真实存在时使用。

明确禁止：渐变背景、光晕/光斑、玻璃拟态、彩色投影、emoji、装饰性图标堆砌、“赋能/开启无限可能/专属成长之旅”式空话、开发说明进入 UI、虚构数据与分数。

## 2. Token（定义于 `src/app/globals.css`）

| 角色 | 变量 | 用途 |
|---|---|---|
| 纸面 | `--paper #f6f4ec` / `--paper-2 #efece1` | 页面底色 / 页脚、分区 |
| 阅读面 | `--surface #fff` / `--surface-2 #fbfaf5` | 表单、表格、工具面板 |
| 墨色 | `--ink #15241c` / `--ink-2 #33473c` / `--ink-3 #5c6d63` | 标题 / 正文辅助 / 来源与次级信息（均 ≥ 4.5:1） |
| 线 | `--line #dcd8c9` / `--line-2` / `--line-strong #8e9c92` | 分隔线 / 弱分隔 / 输入框边框 |
| 品牌绿 | `--green #2c5e43` / `--green-deep` / `--green-mark #1e8c4e` / `--green-soft` / `--green-wash` | 主操作 / hover / 小方块与当前态（不用于小字）/ 选中底色 |
| 数据 | `--blue #3c6d8a` + `--blue-soft`；`--ochre #8a6420` + `--ochre-soft` | 图表第二系列、信息提示；待核验、simulation |
| 危险 | `--danger` / `--danger-soft` | 删除与错误 |
| 夜色区 | `--night` `--night-2` `--night-line` `--night-ink` `--night-ink-2` `--night-mark` | 仅首页流程段等少数深色叙事区 |

图表配色固定顺序：绿 `--green` → 蓝 `--blue` → 赭 `--ochre`。不要把人物、数据、状态都涂成同一种绿。

## 3. 字号（固定档位，不用 vw）

| 类 | 桌面 | 手机(≤760) | 字体 |
|---|---|---|---|
| `.t-display` | 80/1.12 | 42 | 宋体 600，仅首页 |
| `.t-title` 页面主标题 | 60/1.18 | 36 | 宋体 |
| `.t-section` 章节标题 | 46/1.24 | 30 | 宋体 |
| `.t-block` 模块标题、方向名 | 32/1.35 | 26 | 宋体 |
| `.t-item` 条目标题、题干 | 24/1.45 | 21 | 黑体 600 |
| `.t-lede` 重要介绍 | 22/1.7 | 19 | 黑体，`--ink-2` |
| 正文（body 默认） | 18/1.75 | 17 | 黑体 |
| `.t-small` 来源、时间 | 16 | 16 | `--ink-3` |
| `.t-meta` 标签、表头 | 15 | 15 | `--ink-3` |

关键说明、任务说明、字段标签不得小于 17px；15px 是下限，只给真正的次级信息。不要使用 Tailwind 的 `text-xs`/`text-sm` 缩小正文——旧代码里遗留的这些类在重做时删除。

## 4. 共享原语（`globals.css`，直接使用）

- 布局：`.container`（1280 内容宽 + 边距）、`.page`（页面上下留白）、`.page-head` + `.page-tools`（标题区与右侧工具）、`.with-toc` + `.toc`（左侧 220px 固定目录，`a[aria-current]` 显示绿条）。
- 标题区：`.kicker`（绿方块小标签）→ `h1.t-title` → `p.t-lede`。
- 控件：`.button`（胶囊主按钮）、`.button.secondary`（描边）、`.button.quiet`（文字型）、`.button.danger`、`.button.small`；`.text-action`/`.link`；`.field`（输入/选择/多行）、`.form-label`、`.form-hint`、`.choice`（单选/复选整行）。按钮末尾可放 `<span className="arrow" aria-hidden="true">→</span>`，hover 时右移。
- 反馈：`.notice`（默认赭色，`.info` 蓝、`.ok` 绿、`.error` 红）、`.status`（就地状态行）、`.simulation-tag`（虚线 simulation 标识）、`.tag` + `.green/.blue/.ochre`。
- 数据：`.data-table`、`.panel`（白底细边，只用于重复条目和真实工具，不用于包裹整段）。

固定元素的 `top` 统一写 `calc(var(--header-h) + var(--journey-h) + 24px)`：探索主线页面有 56px 的进度条，`--journey-h` 会自动生效。

## 5. 版式规则

- 每个页面的顶层元素是唯一的 `<main id="main" className="page ...">`，内部用 `.container`。页眉、进度条、页脚由 layout 提供，页面不要自带。
- 开放排版优先：章节之间用 64–112px 留白 + 1px 细线，列表用细线分隔；卡片只给重复条目或真实工具，圆角 ≤ 8px（按钮/标签胶囊除外）。
- 长正文 max-width 约 720px（28–36 个汉字）；表格与图表可占满主列。
- 图与文的比例要大方：插图/产品预览宁可大，不要缩成 48px 的小图标；预览里需要阅读的文字按实际显示尺寸 ≥ 15px。
- 状态完整：首次、回访、加载中（保持尺寸的骨架或就地文字）、失败（明确错误 + 重试）、空结果，均要有设计，不能互相冒充。
- 手机（390px）：单列，字号按上表，触控高度 ≥ 44px，无横向溢出；固定双栏、视差全部取消。

## 6. 动效语法

- 首屏内容：加 `.enter`，用 `style={{"--d": n}}` 做 80ms 级联（纯 CSS，不依赖 JS）。
- 滚动出现：元素加 `data-reveal`；一组子元素依次出现用 `data-reveal="group"`。`XenisoMotion` 只隐藏初始位于视口下方的元素，所以不会闪烁，也不会因脚本失败而空白。
- 局部切换：内容替换时给新内容加 `.swap-in`（260ms 淡入上移 8px）或 `key` 触发重新挂载。
- 数据变化：条形/分段条用 `transform: scaleX()` + `transition: transform 450ms var(--ease)`；数值文字立即显示真实值，不做数字滚动。
- 反馈：hover/focus/selected 用 160–200ms 颜色与边框变化，不改变尺寸与布局。
- `prefers-reduced-motion` 已在全局把动画缩为 1ms，并保证 `data-reveal` 内容可见；自写的滚动驱动效果需要同时检查 `matchMedia("(prefers-reduced-motion: reduce)")`。
- 统一缓动 `var(--ease)` = `cubic-bezier(.22,1,.36,1)`。设计规格中的 M-编号写在对应元素的 `data-motion` 属性上，便于验收定位。

## 7. 图像

- 方向身份图：`public/careerexplorer/*-pana.svg`（Storyset Pana，署名在全站页脚）。通过 `DirectionArt` 组件使用；该组件填满父容器宽度，尺寸由父容器决定。
- 功能说明图：用 HTML/SVG 真实组件局部（真实字段、真实合成数据、真实计算结果），不用生成图冒充产品界面。
- 示例统一标注一次 `示例 · simulation`，不得冒充当前用户结果。

## 8. 工程约定

- CSS 文件按区域划分：`chrome.css`（页眉/进度条/页脚）、`home.css`（`hm-`）、`profile.css`（`pf-`）、`report.css`（`rp-`）、`experience.css`（`ex-`）、`library.css`（`lb-`）、`community.css`（`cm-`），均由 `layout.tsx` 统一引入；类名使用各自前缀，避免与 Tailwind 工具类冲突。组件里不再单独 `import` CSS。
- 只改表现层：状态、请求、存储键、校验、导出、组件 props 与导出名保持不变。
- 验证：`npm run lint`、`npx tsc --noEmit`、`npm run build`、`npm test`，以及 1440×1000 / 390×844 截图检查。
