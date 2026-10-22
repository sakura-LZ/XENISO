# 按方向绑定星云人物 Implementation Plan

> 当前聊天内执行：用户已明确分配新人物给器械/产品，原人物给医学带教。沿用writing-plans的文件/验收清单；不派生新聊天、不扩大为全局导师或动态生成。

**Goal:** 同一SDK按体验选择星云应用，新人物分别用于医工器械/医学AI产品经理、AI/计算机，原人物用于医学带教。

**Architecture:** 前端只传四类人物别名，服务端从对应环境变量选择应用。以已有claim_hash识别会话所属应用，使换人物、重连、本人删除始终用创建会话时的配置结束；兼容旧单应用claim，不新增数据库字段或迁移。

**Tech Stack:** Next.js / TypeScript / 当前星云SDK与同源代理 / Supabase会话归属。

## 边界

- 医学使用现有XINGYUN_APP配置；医工器械/产品使用ENGINEERING配置；用户追加的第三人物使用COMPUTING配置；医学信息学仍预留，未配置不串用医学形象。
- APP凭据仅.env.local与server-side env；源码、UI、测试、文档和打包不含真实值。前端只收到别名、可用状态及SDK必要的短期会话数据。
- 本轮仅本机配置/代码接入与验收，不部署、不远端迁移；不扩展E2/E3、视频或全局入口。

## Task 1：方向映射及私有配置

文件：新增`src/lib/avatar-presenters.ts`，修改`src/app/experience/studio.tsx`、`src/components/avatar-panel.tsx`、`.env.example`、`scripts/check-client-secrets.ts`、`scripts/package-vercel.ps1`。

- [x] 四大方向映射到四个别名，medical_ai_pm模板显式映射医工/产品人物；拒绝未知别名。
- [x] AvatarPanel以别名构造同源gateway URL；开始前按别名查询可用状态，切换后释放旧实例。
- [x] 新凭据只写入Git忽略的.env.local；客户端/归档密钥扫描覆盖新增变量。

## Task 2：跨应用归属及回归

文件：修改`src/lib/server/xingyun.ts`、`src/app/api/avatar/session/route.ts`、`scripts/verify-xingyun-proxy.ts`；新增`tests/avatar-presenters.test.ts`。

- [x] 创建按白名单别名选择服务端配置，签名使用对应APP；未知/未配置别名不调用上游。
- [x] 新claim绑定别名/应用；DELETE根据持久化hash匹配真实应用，不信任当前页面别名；旧医学claim兼容。
- [x] mock校验三应用签名、错别名删除、跨用户、旧会话、补偿清理、未配置与伪造归属；只用固定假凭据。

## Task 3：验收与交接

- [x] 全量测试、代理mock、lint、TypeScript、隔离生产build、所有XINGYUN客户端值扫描、HTTP smoke；不操作3001/既有预览。
- [x] 对新应用做真实合成连接/回复/结束（计算机首轮异常保留，刷新重连后通过）；声音年龄按用户描述，不以文字会话证明音色验收。
- [x] 更新CURRENT_STATUS、HANDOFF、DEPLOYMENT和独立测试记录，明确三个已配置人物、医学信息学预留与未部署。

实际证据：`docs/testing/avatar-presenters.latest.md`；本轮专用预览3195。未实施E2/E3、未部署。

## Task 4：医生应用与场景身份（2026-10-22，用户追加）

新应用→医学带教；原医学男性应用→医学信息学；器械/产品与计算机保持既有分配。原APP配置保留用于旧医学会话清理，新增MEDICINE配置用于新医学会话。不开启部署/迁移。

- [x] 私有配置补齐四组，兼容原医学v1/v2会话，mock覆盖改分配后的清理。
- [x] 共用场景身份提示用于开场/任务更新/文字问答；以场景职业自我介绍，不主动使用豆包或供应商品牌；被问是否真人时如实说明模拟AI。
- [x] lint、顺序测试、43代理mock、隔离build/密钥扫描/smoke及医生/信息学真实身份问答，更新状态与验收记录。根tsc扫描并行work旧副本失败，当前源码strict检查通过，见`docs/testing/avatar-identities.latest.md`。
