# XENISO Next.js 新版发布记录（2026-10-22）

## 续接完成：正式域名已切换

已执行 `vercel promote xeniso-dg3kh5k4x-sakura-lzs-projects.vercel.app --yes --timeout 60s`，退出0；`vercel inspect xeniso-platform.vercel.app` 确认正式域名指向 `dpl_9VpCUquLMayc2to4JERQjkyhybPm`，Production/Ready。GitHub远端 `main` 已有应用提交 `49910b748dd078a582754dd76a701430ef77385c`。以下“待切换/正在复测”为先前过程记录。

- 续接重跑 lint、136/136单测、隔离 `npm run build`、本机5/5 smoke、54文件客户端扫描：通过。构建多lockfile警告保留。发布副本与当前源码差异仅两个文件末尾空行，无业务差异。
- 正式域名26项公开HTTP检查通过，无cookie/无Vercel认证绕过：10页面、10图片、3私有接口拒绝、原型404、真实知识库和O*NET题目。见 `xeniso-public-release.latest.json`。
- 正式域名1440/820/390宽度30页面浏览器巡检通过，无溢出/坏图/脚本异常；章节切换、临床方向、首页横滑、体验入口、减少动态5项交互通过。见 `xeniso-public-browser.latest.json`。Edge直连先失败，经既有本机代理公开访问成功；验证脚本两次语法错误已修复，失败尝试不计通过。
- 修复UTF-8解码后的真实API链中，画像/官方30题计分/知识库/私有三阶段体验/R1/R2生成保存恢复/权限隔离/过期检查均通过；共51检查中50通过，最后一项合成访客删除发生传输中断。原 `xeniso-production.live.latest.json` 保留失败。经已授权的Supabase管理API核实唯一空合成访客：测试窗口内、精确创建时间、node会话、无画像/测评/体验/报告；按上述全部条件删除1个，复查窗口剩余0。两个合成访客均已清理，不改原JSON为全量通过。

音视频/ASR/口型、社区OTP邮件和真实成员发帖仍未验收；开发依赖审计问题与内容事实局限保持下文原记录。

用户在改版对话及本对话授权迁移后推送 GitHub、发布现有 Vercel 项目。
GitHub：`sakura-LZ/XENISO`；Vercel：`sakura-lzs-projects/xeniso`，项目 ID 保持不变。

本次发布以当前 Next.js 源码为准，包括用户 Logo、桥景首页、独立配图、画像/问卷、信息文库六章节、职业体验、真实 R1/R2 和浅色社区。保留原服务端接口、来源与权限契约。参考 HTML 不进入部署包。

## 已执行的本机检查

- `npm run lint`：退出 0。
- `npm test`：136/136，通过；无跳过。
- 当前源码允许列表打包：226 文件，环境文件仅允许 `.env.example`，密钥值扫描通过。
- `npm run build`（隔离构建目录）：退出 0，TypeScript 与页面生成完成；保留 Next.js 多 lockfile/root 推断警告。
- `npm run test:smoke`，`http://127.0.0.1:4194`：5/5，通过，包含新版页面标题与私有接口/同源边界。
- 当前构建客户端密钥扫描：55 文件通过，扫描值不回显。
- 四组数字人共 8 项服务端环境变量已补入 Production；保留原有配置，无本轮数据库迁移。

## 本轮修复

发布允许列表遗漏 `public/previews/assets` 中页面引用的 8 张图片，已逐项补齐。集成检查仍匹配旧页面文案，已更新为新版标题并增加基本情况路由。应用页面沿用 Opus 已输出的迁移成果。

## 线上状态

GitHub 应用提交 `49910b7` 已推送到 `main`。Vercel 生产部署 `dpl_9VpCUquLMayc2to4JERQjkyhybPm` 已 READY，地址 `https://xeniso-dg3kh5k4x-sakura-lzs-projects.vercel.app`。正式域名待本轮真实 API 检查后切换。

本轮最新隔离生产构建在桌面 1440、平板 820、手机 390 宽度共 30 页面检查通过，无溢出、坏图或脚本异常；文库章节/临床工作切换、首页横滑、体验入口与减少动态检查通过。记录 `work/xeniso-release-20261022/browser-evidence.json`。

云端构建保留告警：Node engines 范围未设上限、npm cache-dir/安装脚本提示、ESLint 弃用及 5 项高危审计项。实际 `npm audit --json` 退出 1，根因为 ESLint 开发依赖的 braces/递归模式栈耗尽链；`npm audit --omit=dev --json` 退出 0，生产依赖漏洞 0。未强行降级 Next ESLint，也不将完整审计写作通过。

## 局限

数字人音视频/ASR、社区 OTP 邮件和真实成员发帖尚未在本轮验收。真实服务测试仅使用明确标记的合成访客，并须删除其账号及记录。全国招生、中文量表验证、Match 评分标准的既有局限保留。

## 首轮线上检查诊断

首轮真实 R1/R2 生成、私有保存、官方计分和知识检索通过，R2 恢复的严格相等检查失败：CLI stdout 的 Buffer 在 UTF-8 字符中间切块，检查器逐块转字符串产生 `�`。检查器已改用 Node stdout UTF-8 流解码，保留原 deepEqual 断言，正在复测。最小逐字节分块试验确认旧方法损坏中文、新解码保留原文。首轮失败完整保留于 `work/xeniso-release-20261022/live-first-attempt.json`，两个合成账号均已删除；不将首轮写作全量通过。
