# LIMEN 协作记录

## 2026-10-22 · 用户更新医生/信息学分配与身份要求

- 新医生应用用于medicine；原医学男性应用转med_informatics，器械/产品与计算机应用保持。原APP配置保留做历史claim清理，新增MEDICINE对供新医学会话使用。四组均只存本机私有环境，不记值。
- 用户要求各人物用当前职业场景介绍自己，不再自称豆包。`src/lib/avatar-dialogue.ts`统一开场/任务/文字提问规则，保留模拟身份与真人询问真实性；普通ask不能等同系统人设。未改知识库、未迁移或部署，专用新副本`work/avatar-identities/build-app`，不动旧服务。
- 验收完成：130单测、43mock、lint、当前源码strict tsc、隔离build、51客户端密钥扫描、5smoke通过；医生和信息学开场/身份追问真实通过，无豆包自称，最终active_session为空。根tsc遇并行work旧副本失败已记录，未改对方快照。最新预览3196，见`docs/testing/avatar-identities.latest.md`。

## 2026-10-21 · 按方向绑定星云人物

- 用户明确分配：原人物用于医学带教；新人物用于器械/产品；随后追加人物用于AI/计算机。仅服务端私有配置，不在记录内保留凭据。
- 本轮编辑`src/lib/avatar-presenters.ts`、`src/lib/server/xingyun.ts`、`src/app/api/avatar/session/route.ts`、`src/components/avatar-panel.tsx`、体验页绑定、代理回归和密钥扫描。全部共用同一SDK，通过白名单别名选择；医学信息学预留不回退。
- 不改知识库、远端表或迁移，不停止3001/3193；独立`work/avatar-presenters/build-app`验收。跨应用结束会话按持久claim选原应用，兼容旧医学会话。测试证据完成后记入`docs/testing/avatar-presenters.latest.md`；不代表E2/E3或全局导师已实现。
- 2026-10-22收尾：130/130顺序单测、37代理mock、lint/tsc/隔离build/51文件客户端扫描/5 smoke通过。3195真实器械及计算机人物显示、文字问答、结束通过；计算机首轮异常已保留，刷新重连后成功，最终active_session为空。凭据仅本机，未部署；详见独立验收。

## 2026-10-21 · 多方向体验 E1 与数据库并行边界

- 用户已指示开始模板实现，新增继续医学方向，首批按内科学/外科学/妇产科学/儿科学组织；后续逐步补充。数据库由用户另一项工作同步建设，本聊天不改知识库数据、远端表、迁移、采集或服务配置。
- 本聊天编辑 `src/lib/experience*`、`src/app/experience/*`、`src/lib/directions.ts`及独立`data/medicine_direction.json`、医学手册项、R2展示适配与对应测试。沿用现有`/api/experience`和JSONB payload，新增version=3.0；对接契约另见体验设计。
- 全量测试发现知识库角色目录已从1扩到11，旧测试固定length=1已失效；只把该断言调整为按ID核对PM原有映射并检查唯一性，不修改知识库实现或数据。
- 已完成113/113单测、lint、TypeScript、隔离生产build、51文件密钥扫描、5组HTTP smoke，医学/算法/信号/流程UI和实际JSON/Markdown下载通过。使用隔离副本和本轮3193预览，不停止3001。12个E1运行/目录文件与构建哈希一致；并行知识库数据继续变化，不声称全库完全一致。证据见 `docs/testing/multi-experience-E1.latest.md`，数据契约见 `docs/EXPERIENCE_E1_CONTRACT.md`。
- 未部署、未迁移、未实测V3真实云保存或新岗位星云/LLM调用；E2/E3仍待后续阶段指示。

## 2026-10-21 · 知识库第一阶段与 Match 并行边界

- 本聊天负责 `src/lib/knowledge*`、`src/lib/server/knowledge-store.ts`、`src/app/api/knowledge`、`scripts/knowledge/*`、`scripts/verify-knowledge*`、`data/knowledge/*`、知识库迁移和文档；不修改 Match 业务实现或其他线程schema。
- 已有真实中国资料7来源/8记录/23原文事实；远端只新增并应用知识库迁移，重复导入计数不变。真实RLS/检索21检查、真实模型引用10检查通过，合成账号清理成功。
- Match 继续通过独立只读适配器衔接；技能重要性、数值等级、职业兴趣保持null直到独立审核。原文quote+offset+hash和来源日期契约见 `docs/KNOWLEDGE_BASE.md`。
- 生产 `.next` 构建在Match并行写入期间曾因 `tests/match.test.ts` 的 `tech_skills` 测试对象缺少必填 `evidence` 失败。本聊天仅为该测试对象两项技能补充空 `evidence` 以符合既有画像契约，保留未知语义；Match业务文件仍由Match任务维护。知识库测试对象的地区字面量类型错误亦已修复。最终整库构建结果记录在 `docs/testing/knowledge-pilot.latest.md`。其他任务继续隔离distDir，勿启停本机3001预览。

更新时间：2026-10-21。用户最新授权 Codex 继续修改 UI 并持续完成项目。Claude 开始写入前请先查看本文件，避免同文件同时编辑。

## 当前分工
- Codex：当前负责 V4 集成收尾、报告可读文案、状态文档与统一回归。先前独立任务均已交付；目前没有并行写入任务。
- 不要同时运行 build、删除 .next 或停止 3001 服务。最终构建由 Codex 主代理执行。
- 所有已有未提交变动均保留，不进行整文件回滚。

## 已实现的业务接口（UI 调整须保留）
- 画像四步、培养阶段/年级/其他补充、英语、科研项目与论文成果、技能、所需帮助；私有保存与读取、成绩本机解析。
- O*NET 使用真实30题、原题号/答案码/版本不变；提交前创建匿名会话。
- 新 `/experience`：项目/面试两模式、三个阶段、结构化成果、反思、本地暂停恢复、导出和私有保存。
- 旧 ECG 工作台 UI 已删除，`/studio/ecg` 仅重定向新体验，禁止恢复旧 UI；历史 schema 继续兼容。
- 数字人 `AvatarPanel` 保留 role/context/onTranscript、显式连接、销毁与对话保存选择；凭据仅服务端。
- 社区为登录后匿名发布，公开结果不得包含账户 ID 或私有画像。三份旧迁移已核对并登记，新增社区迁移已执行，合成权限检查 22/22 通过；不要重复迁移。OTP 邮件送达与真实注册仍待验收，见 `docs/SUPABASE_SETUP.md`。

## 文件与编辑边界
- UI：`src/app/profile/profile-form.tsx`、`assessment/questionnaire.tsx`、`explore/direction-browser.tsx`、`experience/studio.tsx`、`community/community.tsx`、`report/initial/report.tsx`、`report/plan/report.tsx`、`src/components/avatar-panel.tsx`、`ai-report.tsx`、`nav-shell.tsx`、`src/app/globals.css`、`src/app/page.tsx`。
- TSX 同时含业务逻辑，改排版时必须保留数据字段、API、校验、回调、状态和隐私授权。
- 后端：`src/lib/**`、`src/app/api/**`、迁移、测试、脚本。
- 优先读取本文件、`docs/V4_PRODUCT_DESIGN.md` 和目标组件；不要读取 env 或重扫完整说明。

## 验证基线
- V4 基线：45 项测试、lint、tsc、build、47 文件客户端密钥扫描通过；核心合成主线、数字人真实文字会话、社区合成权限和七路由三尺寸已独立实测。
- 证据见 `docs/testing/V4-flow.latest.md`、`avatar-live.latest.md`、`community-live.latest.json`；旧 ECG 流程记录只作历史参考。
- 最新文案与 smoke 调整已完成生产重建、重启 3001、5组 smoke 和九种已保存状态复验；详见下方最新日志。

## 本轮目标与完成日志

### 2026-10-21 · Vercel 打包与云端数字人
- 用户授权部署或打包，并明确要求数字人云端可用。新增 `vercel.json`、`.vercelignore`、`scripts/package-vercel.ps1`，更新部署文档；Vercel 当前令牌无效，未部署。
- 数字人接口移除 localhost 限制，`avatar-store.ts` 与新迁移保存跨实例会话归属。服务端 capability 哈希防止仅持有用户JWT的人伪造真实会话绑定/关闭；数据库统一同用户单会话、全局30未结束会话、每用户每分钟5次。重连先清理旧会话；删账号先释放数字人。
- `202610220001_avatar_sessions.sql` 与 `202610220002_avatar_account_cleanup.sql` 分别经 dry-run 确认为当时唯一待执行迁移后已成功应用。真实 Supabase 合成身份19项验证通过，2身份清理成功；代理19项mock通过。lint、45项单测、生产构建、5组smoke和归档通过，最终结果见 `docs/testing/VERCEL-package.latest.md`。
核心主线、新体验成果联动、报告新鲜度、社区合成权限和三尺寸页面巡检均已有实测记录。后续聚焦真实语音/邮件等未验收外部链路、事实来源复核和 AI 稳定性，不再把已通过项目列为待办。

每完成一部分追加：修改文件、行为或接口变化、实际测试与未验证项。

### 2026-10-21 · 集成收尾、报告可读性与状态复验
- 修改：`src/app/report/plan/report.tsx`、`src/app/report/initial/report.tsx`、`src/app/account/page.tsx`、`src/app/setup/page.tsx`、`scripts/smoke.ts`、`docs/DEMO.md`、`docs/SUPABASE_SETUP.md`、`docs/ISSUES.md`、`docs/CURRENT_STATUS.md`、`docs/V4_PRODUCT_DESIGN.md`、`问题总结.md`、本文件；验收证据 `docs/testing/V4-flow.latest.md`、`docs/testing/V4-ui-filled.latest.json`，执行脚本在忽略目录 `work/tools/final-readability-audit.mjs`。
- R2 关联值、来源与里程碑任务改为可读标题；R1无匹配提示去重。隐私页与维护页移除过时的未验收/AI默认关闭说明。smoke 默认仅访问本机，不创建访客或调用外部服务；覆盖未登录隔离、CSRF、防缓存、八路由和旧 ECG 重定向。旧迁移、预览及演示文档更正并标注历史。
- 验证：lint、45/45 tests、tsc、生产 build、5组 HTTP smoke、47文件密钥扫描均通过。正式构建后已保存 R1/R2/体验在1440/820/390宽度实测，九种状态无横向溢出或内部标识；体验复盘编辑后旧成功反馈/导出/下一步入口消失，恢复原合成成果成功。
- 未验证范围仍是麦克风/ASR/音频口型、OTP邮件与真实注册、译稿独立人工复核、招生来源、AI长期稳定性；未重复迁移、未公开部署。

### 2026-10-21 · 新体验保存并发完整性
- 修改：`src/app/experience/studio.tsx`。保留既有 pause/restore/restart 和暂存 schema 校验修复。
- 保存/读取共用同步 ref 锁，避免 React 重渲染前连续触发；请求期间以 disabled fieldset 锁定输入、返回、方向/模式选择、重新开始、本机恢复/暂停/清除、数字人操作及重复保存。暂停/恢复/重选/清除函数亦检查同步锁。
- record 开关与新 transcript 使已保存成果失效，并清除旧成功反馈；保存前记内容版本。数字人在途回复仍保留，若请求期间产生新对话，响应只确认已提交快照，不把当前未保存内容当成已保存或显示行动规划入口。
- 当前记录导出补充经同意保存的 transcript；仅当方向、模式、任务、复盘及对话与已保存快照一致时写 status=saved。
- 验证：定向 `npx eslint src/app/experience/studio.tsx --max-warnings=0`、`npx tsc --noEmit`、定向 `git diff --check` 均退出0；未 build、未操作服务或远端数据库。浏览器保存并发/在途数字人回复仍需主代理统一回归。

## 后端完整性更新（2026-10-21）
- `src/lib/server/supabase.ts`：服务端从 HttpOnly access/refresh cookies 恢复 Supabase Auth SDK session，`auth.updateUser()`可使用已验证会话；缺失/失效会话清理 cookie。令牌未写入日志或响应。
- `src/app/api/reports/route.ts`、`src/lib/report-freshness.ts`：AI报告保存当前画像、官方测评及（R2）体验 payload 的 SHA-256 指纹；读取时核对指纹，旧格式或过期报告不再返回，响应 409 提示重生成；生成 R2 时还会阻止基于过期 R1 继续生成。
- `src/lib/experience.ts`：导出可追溯的体验上下文、反思与三阶段成果证据；不把可选数字人对话文本转发给报告 AI。旧 ECG schema 仍可读取。
- `src/lib/community.ts`：邮箱验证请求 schema 移入共享库并有边界测试；社区发布仍须显式同意，公开内容不接受账户字段。
- 测试：`npm test` 45/45 通过；`npx tsc --noEmit` 通过；本批文件定向 ESLint（零警告）与 `git diff --check` 通过。未运行全项目 lint/build、远程数据库、邮箱验证或真实 Supabase Auth 调用；V4 服务端联调仍需后续验收。

### 2026-10-21 · 画像与兴趣测评 UI
- 修改：`src/app/profile/profile-form.tsx`、`src/app/assessment/questionnaire.tsx`、`src/components/transcript-preview.tsx`。
- 画像：按培养阶段筛选年级；毕业/其他阶段不再展示不相关培养类型；未知旧培养类型仍可显示；说明简化；四步导航在保存/读取时禁用；成绩单改为可选折叠区，保留本机读取、预览更正和确认写入画像。
- 测评：标题和指导语收短；每组需答齐才可前进，答题项在提交中锁定；重复提交受限，状态消息只在有反馈时出现。O*NET题号、翻译映射、原始题项、选项值、版本和私有保存请求不变；来源/译文说明继续保留在展开区。
- 验证：`npm run lint` 通过；`npx tsc --noEmit` 通过；定向 `git diff --check` 通过。未运行 build；未做浏览器操作与真实O*NET提交验收。
- 交接：更改未新增CSS class，无API/字段变动。可继续由UI代理统一调整外观；业务接口与隐私边界如上保持。

### 2026-10-21 · 报告与方向手册 UI
- 修改：`src/app/report/initial/report.tsx`、`src/app/report/plan/report.tsx`、`src/components/ai-report.tsx`、`src/app/explore/direction-browser.tsx`。
- R1：兴趣结果与下一步分栏；保留原始兴趣值、官方职业来源与编辑性映射；未知线索折叠；页面移除重复草案和能力否定说明。
- R2：明确目标、体验、准备缺口、实践、时间安排和报考核验的层级；旧 `/studio/ecg` 按钮改为 `/experience`；保留计划、导出条件和全部证据逻辑。
- AI 解读：主操作缩短为“生成个人解读”；删除过时“默认关闭”文案，数据使用/报考边界移入可展开说明；请求、保存、证据快照与错误反馈不变。
- 方向手册：桌面目录随滚动停留，新增章节锚点导航，突出入门实践项目；保留九方向详情、官方资料、编辑性关联和招生待核验标识。
- 验证：四组件定向 `npx eslint` 退出0；定向 `git diff --check` 修正1处空格后通过（仅CRLF换行提示）。未运行 build、未停止服务；浏览器视觉与完整主线验收交由主代理统一执行。
- 交接：无API/字段变化，无新增全局CSS class；仅使用已有通用class与Tailwind utility。所有界面文件可交由主代理继续调整。
- 后续兼容审查：后端 `REPORT_STALE`/`R1_STALE` 返回可见错误；R2 的旧 R1 过期或缺失时，AI 面板现在给出 `/report/initial` 入口。R2 页面展开可查看项目/面试三阶段成果，成果来源仍是已保存体验 `outputs`。
- 定向验证：报告面板/R2页面 ESLint、`npx tsc --noEmit`、定向 `git diff --check` 均通过。未运行 build、未做浏览器流程验收。

### 2026-10-21 · 社区 UI
- 修改：`src/app/community/community.tsx`、`src/app/community/page.tsx`。
- 桌面分为交流列表与发布区，手机纵向排列；求助/经验筛选、分类空状态、本人帖子、日期与举报区域层级更清楚；移除重复说明，保留公开内容确认、邮箱隐私和切换账号资料提示。
- 登录增加会话读取状态，避免已登录者短暂看到登录表单；重新发送验证码直接请求原认证API。API端点、字段、验证、删除确认与举报逻辑保留。页面补充中文标题/描述。
- 验证：两文件定向eslint、`npx tsc --noEmit`、定向`git diff --check`均退出0。未运行build、未发送邮件、未操作真实帖子；社区登录/发布仍需统一真实验收。
- 交接：使用现有class与Tailwind utility，无全局CSS/依赖/后端变动。

### 2026-10-21 · V4 状态与问题文档校正
- 修改：`docs/CURRENT_STATUS.md`、`docs/HANDOFF.md`、`docs/ISSUES.md`、`问题总结.md`。
- 当前状态统一标注为 V4 改造中；旧 `/studio/ecg` 合成访客全流程报告明确标注为历史证据，不再代表新版流程验收。HANDOFF 顶部注明旧交接正文的适用范围，ISSUES 区分已修复项、待验证项和历史问题。
- 汇总画像、测评、职业体验、报告新鲜度、数字人及社区的本轮改动和实际验证边界。最新版全项目 build 与 V4 浏览器全流程均标为待主代理验证；未声称远程迁移、真实认证或真实数字人调用已通过。
- 验证：四份文档定向 `git diff --check` 通过（仅 HANDOFF/ISSUES 有 CRLF 转 LF 提示）。本次仅改文档，未运行测试/build，也未操作服务。

### 2026-10-21 · 数字人面板 UI 与会话状态
- 修改：`src/components/avatar-panel.tsx`。
- 空闲界面收起 SDK 画布并精简引导；真实连接状态、初始化/取消/结束状态与对话字幕可见。等待 `onLLMResponse(done)` 才解除回复锁，避免 SDK `ask()` 仅表示消息发送完成时重复提问；语音识别最终文本和模型答复仍通过原 transcript callback 上报。
- 连接后按 role/context 组合至多同步一次当前任务，未连接不请求、未自动连接、不提取或发送个人画像；任务上下文是普通 SDK 消息，不是 system role。上下文变化期间等待当前回复完成，录音期间延后同步。初始化 fetch 可 abort，取消或离开页面会销毁 agent；SDK init 本身不提供取消 API，init promise 若不响应 destroy 最长等待超时为60秒，代际校验保证取消后的初始化结果不会重新挂起会话。
- 验证：`npx eslint src/components/avatar-panel.tsx --max-warnings=0`、`npx tsc --noEmit`、定向 `git diff --check` 通过。没有运行真实数字人连接，也没有 build；交由主代理做全量 build 和浏览器统一验收。

### 2026-10-21 · 浏览器验收辅助与移动导航
- 修改：`work/tools/browser.mjs`、`work/tools/visual-audit.mjs`、`src/app/globals.css`、`src/components/nav-shell.tsx`（`work/` 已忽略）。
- 浏览器 helper：Edge 原生 WS 握手超时清晰报错，不会静默退到共用 Cookie；支持独立 Chromium headless 新 profile/context、显式选择代理tab、代理共享tab模式、eval/navigate/screenshot、独立 viewport 和记忆 state、隔离下载目录。各状态可通过 `LIMEN_BROWSER_STATE` 分开保存。遇到代理状态 `connected=true` 但 CDP 命令超时；普通代理截图曾成功但随后失去命令响应；不把它作为可靠隔离通道。独立 Chromium 实测支持1440x1000、820x1100和390x844尺寸；每次连接恢复真实 Emulation viewport。未清理、关闭或重置主代理 tab、Cookie或服务。
- 页面目视：桌面/手机首页、方向手册、社区和体验均有成功 screenshot，真实 innerWidth 对应 viewport，document 无横向溢出。个人画像三尺寸同样检查；390手机 profile 发现顶部流程导航系统滚动条明显，当前项会被裁切。
- 移动导航修正：隐藏移动端粗滚动条（可继续触控/键盘横向滚动）；导航路由切换和断点变更时将当前流程项滚入可视区域。CSS/React变动等待主代理最终build后复测；没有碰表单或产品流程代码。
- 验证：browser helper `node --check` 通过；导航定向 ESLint 和 `npx tsc --noEmit` 通过；目标 diff check 通过（CSS 仅 CRLF 转 LF 提示）。截图证据 `work/v4-{home,handbook,community,experience}-{1440,390}.png` 与 `work/v4-profile-mobile-final.png`，`work/` 已忽略不进入提交。全程未运行 build、未启动/停止服务。

### 2026-10-21 · 下载配置重连与浏览器实测
- 修改：`work/tools/browser.mjs`（忽略目录）。每次直连 browser/context 重连后，按 state 中保存的 `downloadPath` 重新应用 `Browser.setDownloadBehavior`；新增 `click-export TEXT [TIMEOUT_MS]`，点击可见且已启用的导出控件，等待并确认新生成的非空文件；超时或没有文件会失败退出。
- 验证：在独立视觉 context 中访问画像页，点击“下载填写模板”，真实生成 `work/visual-downloads/LIMEN-成绩导入模板.csv`（41 bytes）；没有触碰主代理 context。主流程成果导出仍需其当前合成记录与有效条件，交由主代理按“导出完整成果”继续验收。

### 2026-10-21 · R1/R2 报告恢复与新鲜度交互
- 修改：`src/app/report/initial/report.tsx`、`src/app/report/plan/report.tsx`、`src/components/ai-report.tsx`。
- R2 新增“恢复已保存计划条件”：仅在登录资料已载入后请求服务端 GET；服务端 freshness 检查失败时不恢复。通过结构校验并使用 `readSavedExplanation` 核对目标、预算、备选方向后，才把报告条件恢复到页面。修改任一条件都会重置 AI 面板，避免展示不同目标/预算的旧解读。
- R1 刷新会先清空旧画像，并在新资料读取时重置 AI 面板；仅个人模式且有官方兴趣结果时开放 AI 报告操作。
- AI 请求防止重复提交；卸载时取消请求，75 秒超时给出可重试或读取已保存报告的反馈；错误/非 JSON 响应可见，不将失败标记为成功。收掉禁用状态下重复的通用说明。
- 验证：三文件定向 ESLint、`npx tsc --noEmit`、定向 `git diff --check` 均退出0。未运行 build 或浏览器验收；由主代理统一验证刷新恢复、旧 R1 freshness 与生成超时场景。

### 2026-10-21 · 社区远端迁移与合成权限验收
- 迁移：先按远端 catalog 基线执行 repair，登记已存在的 `202610200001`、`202610200002`、`202610200003`。执行前 dry-run 精确只列出 `202610210001_community.sql`，继而 `db push --linked --yes` 成功。迁移列表复核四份均已应用。
- 验收脚本：新增 `scripts/verify-community.ts`，机器结果 `docs/testing/community-live.latest.json`。真实远端 22 项通过，检查匿名拒绝、已验证合成账户发布和匿名展示、跨用户本人删除边界、举报/更新、直接读表拒绝、发布限流及删除后拒绝举报。
- 清理：创建 1 anonymous 与 2 个已验证合成账户，测试帖子及举报随本人删除；anonymous 通过本人删除 RPC 清理，两个合成成员通过管理 API 清理，均复核不存在。管理凭据仅进程内用于 provision/cleanup，访问断言使用普通 anon/user JWT；未发邮件或操作真实用户资料。
- 验证：定向 ESLint、`npx tsc --noEmit` 通过。迁移后 `db push --dry-run` 因缺少本机 `SUPABASE_DB_PASSWORD` 而无法连接 CLI 临时数据库角色，未产生写入；邮箱 OTP 流程未发邮件、未验收。

### 2026-10-21 · 主线状态与浏览器实测（主代理，持续补充）
- `src/app/experience/studio.tsx`：恢复/重开清除旧反思与可选对话，只有有效本机/私有记录显示恢复按钮；私有保存成功独立于本机清除结果。`src/app/profile/profile-form.tsx`：读取/保存期间锁定侧边步骤。
- 本批合并 `npm run lint` 退出0、`npm test` 45/45、`npm run build` 退出0，`npm run check:client-secrets` 47文件通过。构建前停止核对过的3001项目服务，构建后重启，未并行构建。
- 独立 Chromium 合成访客实际通过画像UI保存、刷新后私有读取（GPA3.4/4、英语、研究项目保留）；30题UI提交真实 O*NET 31.0（onet_live，6维、20职业）；R1实时AI生成/GET200，解释引用官方分值及自述项目。六维同分未强行推断方向；文本逐条核对未发现无证据能力/录取结论。
- 新体验UI通过第一步→第二步暂停→刷新恢复前一步内容→完成三阶段/反思→私有保存/GET200→刷新读取成果；simulation:true、三outputs与反思完整、未授权对话保存时transcript为空。R2与真实下载仍在验收，暂不标整链通过。

### 2026-10-21 · 数字人正式构建真实连接验收
- 文件：`docs/testing/avatar-live.latest.md`、`docs/testing/avatar-live.latest.json`；未改源码、未构建或启停服务。
- 在独立全新 Chromium context，直接验收已包含 HTMLElement 容器修复的正式构建，不使用 SDK wrapper、构造器注入或 mock。实际 UI 连接后 GET200/POST200，收到当前任务回复和主动文字提问回复；等待期间打断恢复可发送；结束后 DELETE200、UI 会话已结束。
- 未授权麦克风（permission:prompt），未勾选保存对话，未发送个人画像。测试后通过本人删除 API 清理新建合成访客，200且复核会话为空。仅保留脱敏元数据，不保留凭据或原始响应。
- 局限：ASR/麦克风、音频播放、动画口型和真实个人访谈未测；主线画像到R2另见统一验收。

### 2026-10-21 · V4 主线续验（核心流程已通过；追加问题见下）
- 仅主代理操作隔离合成访客；复用3001已验收构建，不重复迁移、不操作共享浏览器个人资料。
- R2真实生成/保存、三份JSON实际下载、刷新恢复计划条件、读取已保存报告已通过。年份2028→2029会清空旧解读和解释导出，读取旧报告被上下文校验拒绝；恢复2028可重新读取。
- 完整证据持续维护于 `docs/testing/V4-flow.latest.md`；后续追加体验变化保护和三尺寸巡检结果，当前仅保留明确的开放事项。

### 2026-10-21 · 体验变化保护与最终尺寸巡检补充
- `src/app/experience/studio.tsx`：复盘和投入意愿编辑统一失效旧保存状态与反馈消息；不改变保存契约。
- `docs/testing/V4-flow.latest.md`：追加体验变化保护、报告新鲜度和三尺寸结果。
- 已执行：`npm run lint`、`npm test` 45/45、`npx tsc --noEmit`、`npm run build`、`npm run check:client-secrets`；均通过。
- 三尺寸路由巡检结果：`/profile`、`/assessment`、`/report/initial`、`/experience`、`/report/plan`、`/explore`、`/community` 在 1440×1000、820×1100、390×844 无页面横向溢出；截图保存在 `work/v4-responsive/`。
- 未改变的开放项：语音 ASR/音频口型、社区 OTP 邮件、中文译稿、招生来源和 AI 长期稳定性。

### 2026-10-21 · LIMEN-Match 中断续建首个切片
- 范围：src/lib/match、src/app/match、src/app/api/match、data/match、scripts/match-*、tests/match.test.ts 与对应文档。未修改knowledge采集/入库文件、原R1/R2或远端表。
- 契约match-1、技能limen-skills-1；四维确定性算法、缺失/资格/时间边界、三岗位simulation交互与真实JSON下载已验证；提取器handoff仅产待审候选。
- 全项目78/78、lint、隔离build、原smoke5组与MatchHTTP通过；构建保留多lockfile root推断警告，未载入真实env，不声明真实个人GET或新增RLS通过。
- 正式结构说明docs/LIMEN_MATCH_V1.md；未执行数据库草案docs/sql/limen-match-v1.proposed.sql；完整验收docs/testing/LIMEN-Match.latest.md。合成预览3187与原3001隔离。
