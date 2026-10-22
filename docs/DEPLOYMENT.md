# Vercel 部署与源码包

## 新版 XENISO 正式发布完成（2026-10-22）

https://xeniso-platform.vercel.app 已指向新版 Next.js 部署 `dpl_9VpCUquLMayc2to4JERQjkyhybPm`，项目 `sakura-lzs-projects/xeniso`，READY。GitHub 应用提交 `49910b7` 已在 `main`；已执行 `vercel promote`，四组数字人 Production 配置已同步。实际检查见 [发布记录](testing/xeniso-release-20261022.md)。以下旧项目名和待发布说明保留为历史。

## 最新：功能Preview已发布，UI继续设计（2026-10-22）

https://limen-br99jfa0q-sakura-lzs-projects.vercel.app 已READY，包含知识库/体验/报告适配/四组数字人/Match，使用已有TSX页面。正式域名仍是旧Production部署；四组新增变量只补Preview，正式发布需另同步Production。本节优先于下方历史“仅本机配置”。

Preview保留Vercel登录保护，共用既有Supabase，无本轮迁移或重新入库。当前目录八份迁移，下文“六份”为知识库扩充前历史数量；执行前核对实际迁移历史，不重复应用。未定稿public预览未上传，本轮功能包不含public，UI发布时须修订允许列表。见[30项线上验收](testing/backend-preview.latest.md)与[UI接入](BACKEND_PREVIEW_HANDOFF.md)。

## 新增本机人物分配（2026-10-22，尚未发布）

最新分配：`XINGYUN_MEDICINE_APP_ID/SECRET`用于新医生人物；`XINGYUN_ENGINEERING_APP_ID/SECRET`用于生物医学工程三细分方向，以及医学AI产品经理模板；`XINGYUN_COMPUTING_APP_ID/SECRET`用于AI/计算机三细分方向。`XINGYUN_INFORMATICS_APP_ID/SECRET`现已配置为原男性应用，负责医学信息学。四组配置均仅在本机被Git忽略的`.env.local`，线上仍是旧部署。

原`XINGYUN_APP_ID/SECRET`保留不覆盖，用于旧医学v1/v2会话清理；没有任何MEDICINE配置的旧环境仍沿用原应用，MEDICINE只填一半则明确未配置，不静默串人。新发布时同时配置完整四组变量并保留原APP对，再部署。角色介绍规则已持久到源码与交接：开场、任务切换和每次文字提问都明确场景身份，不主动自称豆包或供应商品牌；明确询问是否真人时如实说明AI模拟。当前通过普通ask增强，不能等同提供方System Prompt强约束。

前端仅传`medicine / biomed_eng / cs_ai / med_informatics`白名单别名，不下发真实App ID或Secret。全部人物共用同一SDK；服务端按别名签名，新会话claim绑定人物/应用，结束及账号删除按持久会话归属选回原应用，兼容旧单应用claim，不新增迁移。不要在尚有会话未释放时删除或轮换对应配置。

发布该版本时，需要把已分配人物的新增环境变量配置到实际Production/Preview环境后重新部署；变量值不写入源码包。新人物声音/外观按用户提供的星云配置确定，不以提示词推断或自动生成。

## 当前已上线

- 正式网址：https://limen-azure.vercel.app
- 控制台：https://vercel.com/sakura-lzs-projects/limen
- 已通过 CLI 上传当前工作区源码并完成生产构建，状态 READY；无需用户再次解压部署包。
- Production/Preview 的服务端配置已按用户授权写入；不在文档中记录值。数字人已在正式域名完成真实文字连接、回复、中断和结束检查。
- 本次实际证据和边界见 `testing/VERCEL-cloud.latest.md`。下列手动步骤用于后续重建，不代表仍待用户执行。

用户已授权部署或打包交付。源码包不含密钥、数据库数据、依赖和构建缓存，Vercel 会重新安装并构建。本次实际检查见 `testing/VERCEL-package.latest.md`；以真实线上 URL 和检查结果判断是否已部署。

## 最短部署步骤

1. 解压 `limen-vercel.zip`，在包含 `package.json` 的目录打开终端。安装 Node.js 22 LTS 和 Vercel CLI：`npm install -g vercel`。
2. 执行 `vercel login` 在浏览器完成登录，再执行 `vercel link`。选择自己的账号并创建项目，目录填 `.`，框架使用 Next.js。
3. 在项目 Settings → Environment Variables 设置下表变量，勾选实际使用的 Production / Preview 环境。直接在平台填写密钥，不上传 `.env.local`，不加 `NEXT_PUBLIC_` 前缀。
4. 当前已关联的 Supabase 项目已应用全部六份迁移，包括数字人会话与删除保护，勿重复执行。改用其他数据库时须检查迁移历史；可在 Supabase SQL Editor 应用缺失文件，或先 `npx supabase db push --dry-run --linked` 核对列表，再执行 `npx supabase db push --linked`。
5. 执行 `vercel` 创建预览，检查页面和 API 后执行 `vercel --prod`。本流程不要求推送 Git，也不开通付费套餐。
6. 生产环境如果设置 `LIMEN_APP_ORIGIN`，填写实际 HTTPS origin，无结尾斜杠，并重新部署。预览环境保持为空，使写入请求与当前预览域名一致。

也可以将解压源码放入自己的私有 Git 仓库，在 Vercel Add New → Project 导入；Root Directory 选择含 `package.json` 的目录。ZIP 是源码交付包，不是可直接上传的静态站点。

构建使用根目录的 `vercel.json`：安装 `npm ci`、构建 `npm run build`；输出目录保持 Next.js 默认值，不填 `out`。Vercel 选择 Node.js 22.x，启用 Fluid compute 并确认允许 API 最长运行 120 秒。报告和数字人路由已声明该时长。

## 环境变量

| 名称 | 设置 |
|---|---|
| `ONET_API_KEY` | 必填，有效的 O*NET key |
| `SUPABASE_URL` | 必填，现有 Supabase 项目 HTTPS URL |
| `SUPABASE_ANON_KEY` | 必填，现有 anon/publishable key；不用 service_role |
| `LIMEN_ENABLE_P0_CONSOLE` | `false` |
| `LIMEN_APP_ORIGIN` | 可留空；固定生产域名时按上文配置 |
| `LIMEN_ENABLE_LLM` | 真实 AI 报告设 `true`，同时填写下三项；使用提供方额度 |
| `LLM_API_KEY` | AI 启用时必填，仅服务端 |
| `LLM_BASE_URL` | 已验证提供方的 API base URL |
| `LLM_MODEL` | 已验证模型名称 |
| `XINGYUN_APP_ID` | 云端数字人必填，仅服务端 |
| `XINGYUN_APP_SECRET` | 云端数字人必填，仅服务端；先结束旧会话再轮换 |

维护者可在本机查看已有 `.env.local` 并在 Vercel 填写相同配置。交付包仅含 `.env.example` 变量名与占位值。不要将环境文件发送他人或提交 Git。

## 云端数字人

- `/api/avatar/session` 支持 HTTPS 云端域名，要求有效匿名或登录会话、同源写入和请求大小校验；真实 Secret 只参与服务端签名。
- 会话归属存放于 Supabase，跨实例共享同用户单会话、最多 30 个未结束会话、每用户每分钟最多 5 次创建。数据库只保存服务端 capability 的哈希；用户 JWT 无法伪造真实会话的绑定/结束操作。
- 不确定的上游响应保留归属，重新连接先清理本人旧会话。创建成功但持久化失败会尝试补偿结束。未确认释放的会话不自动过期，避免误释放仍计费的连接；持续失败需维护者在供应商后台核验结束，不直接删除存储记录。
- 浏览器通过 HTTPS/WSS 连接供应商；若供应商有域名白名单，加入实际生产域名。麦克风需要浏览器授权。网络、提供方额度和真实语音/口型仍需在部署域名实测。
- 应用其他接口仍有进程内限流；公开推广前补共享预算与匿名注册防滥用，提供方设置费用上限。匿名用户可新建身份，单用户限流不等于全站费用保护。

## 数据库与线上验收

现有 Supabase 项目已应用六份迁移，本次新增数字人表、RPC 与账号删除保护，并通过真实合成身份权限检查。新建数据库则须启用匿名 Auth，并按文件名顺序应用全部六份迁移。所有私有表保留 RLS；账号删除接口先结束数字人会话，再删除账号及级联记录；释放失败会报告错误并保留身份以便重试。数据库同时阻止绕过释放而直接删除账号。

在 Supabase Auth URL Configuration 设置实际 Site URL 及需要的回调域名。社区 OTP 邮件仍需线上单独验收。Mini-IP 中文初译仍待独立人工复核，招生项目保持待核验。

线上先检查首页、画像、方向手册、体验、报告与社区页面，未登录访问 `/api/profile` 和 `/api/avatar/session` 应返回 401。再用隔离合成访客完成保存/刷新、官方测评、R1、三阶段体验、数字人连接/文字回复/结束/重连、R2、下载和本人删除。记录真实错误；不能将本机或 mock 测试当作线上验收。

## 本机验证与重新打包

```powershell
npm ci
npm run lint
npm test
node --conditions=react-server --import tsx scripts/verify-xingyun-proxy.ts
npm run build
npm run check:client-secrets
npm run start -- --port 3002
```

另开终端执行 `$env:LIMEN_TEST_ORIGIN='http://127.0.0.1:3002'`，再执行 `npm run test:smoke`。smoke 只访问本机，不创建远端访客、不调用真实 AI。

执行 `powershell -ExecutionPolicy Bypass -File scripts/package-vercel.ps1` 生成 `work/releases/limen-vercel.zip`。脚本使用允许列表，并在归档前扫描当前本机配置的密钥值；不会回显密钥。解压后从安装依赖开始部署。
