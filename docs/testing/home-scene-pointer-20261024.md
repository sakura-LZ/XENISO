# 首页首屏右册的指针微交互（2026-10-24）

## 背景

用户问："首页原来右面有那种可以微交互的动效，鼠标放在上面各个部分会浮动或者躲避"。

所指是首屏右侧 `.hero-scene`（档案夹 + 四张步骤卡 + 解剖图版 + 印章）。这部分原来由
`micro-interactions.tsx` 的第 4 条（纸张随指针倾斜）与第 7 条（抽卡：卡片随指针轻摆）
提供反馈；2026-10-24 的「首页收敛」把整层在 `/` 上停装
（`pathname === "/" ? null : install()`），同时把四张卡从链接改成静态说明块，
于是右侧只剩入场动画，鼠标怎么动都没有反馈。

## 改法

新增一层只作用于 `.hero-scene` 的指针微交互，不重新打开整站共用的 `micro-interactions`：

- `src/components/home-scene-motion.tsx`：唯一的控制器。
  - 整叠档案随指针做 ≤2°（上下）/ 3°（左右）的 perspective 倾斜；
  - 各层按 `data-hs-depth` 做 1.6–11px 的分层错位（近的走得多、远的走得少）→「浮动」；
  - 指针靠近某张卡时，卡片沿"远离指针"方向让开 ≤7px →「躲避」；
  - 指针压住的那张卡不跟视差跑（否则会从指针下面滑走），只沉 1.4px，并按指针在卡内
    的横向位置轻摆 ±1.6°；松手回正。
  - 只在 `(hover:hover) and (pointer:fine)` + ≥1025px + 非 reduced-motion 下安装；
    指针离开约 100ms 内归零，归零即移除 `data-hs-motion`、清掉内联变量并停 rAF，
    静止时不留额外合成层。
  - 位置只在安装 / resize 时量一次并存成页面坐标，滚动不需要重算；rAF 里不读布局。
  - 卡片不是链接，所以没有做悬停抬升/阴影加强，避免把静态说明画成可点按钮。
- `src/app/scene-motion.css`：消费 `--hs-rx/--hs-ry/--hs-dx/--hs-dy/--hs-sway`。
  只匹配 `.hero-scene[data-hs-motion="1"]`，没有这个属性时完全走 `home.css` 的静态版式。
  必须盖掉 `atlas.css` 里 `[data-atlas-reveal]` 的 `transform 620ms` 过渡，否则每帧倾斜
  会被再拖 620ms。
- `src/components/home-scene.tsx`：给文件夹 / 串线 / 图版 / 四张卡 / 印章加 `data-hs-depth`；
  挂载 `<HomeSceneMotion />`。
- `src/app/layout.tsx`：引入 `scene-motion.css`。

## 验收

- `npm run lint`：退出 0。
- 隔离副本 `npm run build`（`work/home-hover/build-app`，node_modules 用 junction 复用）：
  编译 + TypeScript + 16 个静态页生成通过。
- 真实浏览器（Chromium CDP，脚本 `tmp/hs-probe.mjs`、`tmp/hs-verify.mjs`）：
  - 1440×900：悬停左上 / 右下 / 两张卡、指针离开各状态均符合预期；倾斜角实测
    rx 1.36–1.52°、ry −2.04–2.17°，四张卡位移分别 0 / −5.5 / −4.6 / −7.0px（左上）
    与 3.6 / 6.2 / 5.2 / 8px（右下），按压卡带 `data-hs-press`、位移为 0、dy +1.4px；
    卡内左 1/3 与右 1/3 分别测得 sway −1.03° / +1.02°。
  - 指针离开后 `data-hs-motion` 被移除、scene transform 回到 `none`、所有 `--hs-*` 清理；
    无 `data-hs-press` 残留。
  - 全程 `scrollHeight` 2897 不变、无横向溢出、无控制台错误。
  - 1024×768 与 390×844：不安装（无属性、transform 为 none）。
  - `prefers-reduced-motion: reduce`：不安装。
- 演示录屏：`work/home-hover/demo/hs-demo.gif`（另存 webp / mp4）；
  截图与 JSON 证据：`work/home-hover/verify3/`、`work/home-hover/after4/`。

## 局限

- 没有在 Safari / Firefox 实机验证，只跑了 Chromium；用到的属性（CSS 变量、perspective、
  `clamp`/`hypot` 的 JS 侧计算）都是常规支持范围。
- 触摸设备没有替代反馈（按设计只给精确指针）。
- 四张卡仍是说明块、不可点；若以后恢复为链接，可再加回悬停抬升。
