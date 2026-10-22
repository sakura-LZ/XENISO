# 星云端到端 SDK：阶段 A 调研记录

核验日期：2026-10-21。范围为用户指定的官方公开 CDN 源码；未使用真实凭据，未创建付费会话。本记录不是数字人真实端到端验收。

## 来源与可复现性

- SDK：<https://media.xingyun3d.com/xingyun3d/general/litesdk/xmovAvatar_e2e@latest.js>
- 用户指定 Gateway：<https://nebula-agent.xingyun3d.com/user/v1/ttsa_v2/session>
- 实际下载成功：1,050,887 字节。
- SHA-256：`8D03FE57A3A2ED6E0614029471C8E4B91705F9385B67AE1B93DA49DFA7E5D612`。
- 本地缓存：`work/xingyun-sdk-audit/xmovAvatar_e2e.js`（仅公开源码）。`latest` 会变动，应固定已验证版本或摘要后再部署。
- 可重复静态核验：`python scripts/audit-xingyun-sdk.py work/xingyun-sdk-audit/xmovAvatar_e2e.js`。脚本不联网、不读取环境配置、不创建会话；缺失关键接口时退出非零。

## 已在源码中确认的接口

| 能力 | 具体证据与限制 |
|---|---|
| 构造 | 全局 `XingyunAvatarAgent` 继承 `XmovAvatar`。参数包括 `containerId`、`appId`、`appSecret`、`gatewayServer`、`onMessage`。应提供 `onMessage`，其内部包装直接调用该函数。 |
| 初始化 | `init({onDownloadProgress})` 返回 Promise，等待 TTSA ready 与 E2E socket 均成功后进入 `ready` 并 `start()`。加载 JS 成功不等于初始化通过。 |
| 文本提问 | `ask(text)` 发送 `{type:"ask",message:{text}}` 后立即 resolve；该 Promise 不代表已获得回答。必须由回复/错误事件确认。 |
| 直接播报 | `speak(text,isStart=true,isEnd=true)` 发送 `type:"speak"`；另有 `speakByE2E(text)`。可作为自有 AI 编排候选接口，但未验证服务端实际接受。 |
| 语音 | `startASR({inputStream?})`、`stopASR()`，状态有 requesting-permission/starting/listening/stopping/failed。启动需真实浏览器、用户手势及麦克风许可。 |
| 打断 | 当前 Agent 覆盖的 `interrupt()` 不读取参数，向 E2E 发送 interrupt，并调用父级 `interrupt("speak")`。传入 `"speak"` 的示例可调用，但不是类型分支证据。 |
| 销毁 | `destroy(reason="user")` 返回 Promise，可重复调用；取消初始化/重连，停止 ASR、断开 E2E、调用底层释放。应在退出与启动失败时清理，不能只移除 DOM。 |
| 回调位置 | Agent 专用回调放在构造参数 **`agentCallbacks`** 内；不能仅把 `onASRResult` 等放顶层。 |
| 状态/错误 | `onAgentStateChange(state)`；`onASRStateChange(state)`；`onError({domain,code,message,retryable,cause})`。保留可恢复/额度不足区分，对外不要直接输出 raw cause。 |
| 用户语音 | `onASRResult({text,isFinal,raw})`。默认自动把 ASR 送给 LLM，`features.auto_send_asr_to_llm` 为 false 时源码存在关闭路径，但须真实服务确认。 |
| 回复正文 | **`onLLMResponse({event:"chunk"|"done",text?,isFirst?,usage?,raw})`**。应逐段累积并用 done 确认，不要把 `onConversationChange` 当回答正文。 |
| 对话状态 | `onConversationChange({state,text?})` 中 asking 的 text 是用户输入，另有 speaking/completed/interrupted/failed；该回调不保证含智能体完整回复。 |

## 人设、上下文与编排：可确认与不可确认

构造器接受 `llm_id` 或 `brain_config`，两者同时传入会抛错；也接受 `asr_id` 或 `asr_config`、`tts_config`、`features`、`extras`。`brain_config` 原样复制到会话请求，仅额外校验 `extra_body` 必须为对象。源码未明确约束 System Prompt、messages、角色名称等字段；**透传对象不证明服务端接受某个字段**。

当前公开 Agent 方法中未找到明确的运行中 `setSystemPrompt`/`setRole`/`setContext` 方法。`ask()` 的文本可以携带场景说明，但属于普通消息，不能作为可靠角色切换或任务边界控制。需要官方配置文档/控制台示例与真实会话核验才能确定支持范围。

建议任务状态机、题量/时长限制、操作证据与反馈标准继续由 LIMEN 服务端控制；浏览器只提交步骤结果。待真实验证后，选择端到端 `ask` 或由自有 AI 生成后 `speak`。后者配合关闭自动 ASR→LLM 的模式可能避免双重回复，现阶段仅是候选方案。未调研普通 Lite SDK 的正式版本契约，不能断言它已能直接替换。

## 鉴权结论

源码 `headersNeedSign(appId,appSecret,method,url,data)` 在浏览器内根据请求路径、方法、规范化 JSON、Secret 和时间戳计算 MD5 签名，生成 `X-APP-ID`、`X-TOKEN`、`X-TIMESTAMP`。会话 **POST 与 DELETE 都签名**。因此直接向浏览器传 `appSecret` 会暴露它，前端环境变量、动态 API 下发、混淆均不能保护 Secret。

`e2eServer`+`authToken` 仅作为 E2E WebSocket 连接的备选值；通常来自统一会话返回 `e2e_resp.ws_url/e2e_token`。**它们不能据此被认定可取代创建 TTSA 会话所需的网关鉴权**。本次未找到公开源码中的临时网关凭证签发接口，也没有请求猜测端点。临时凭证是否可用仍待官方文档/支持确认。

可验证的安全适配候选：SDK 的 `gatewayServer` 指向 LIMEN 同源服务端会话代理，由代理读取 server-only Secret，对实际官方路径与经过校验的数据重新签名。浏览器使用空占位 Secret，其本地签名由代理忽略；服务端需固定目标域名/路径，绑定匿名身份，限制同时会话、频率和有效期，对 DELETE 验证 session 所有权，并处理页面退出 keepalive。成功响应内短期 socket token 仍会送浏览器，应禁止缓存与日志记录。该候选利用现有自定义 gatewayServer 路径，**尚未真实验证，不能标注为已解决鉴权**。

不要建立返回真实 Secret 的配置接口，也不要将 `brain_config` 中的模型 API Key 从浏览器透传。若供应商不允许代理或协议验证失败，只能先做受控 localhost 验证，公开发布保持禁用。

## 阶段 A 验收状态

| 验收项 | 当前状态 |
|---|---|
| 官方 CDN 可达、公开源码下载与摘要 | 已实际通过 |
| 关键构造器/方法/回调源码存在 | 已静态核验 |
| localhost 浏览器执行脚本并取得构造器 | 未在本调研中执行 |
| 凭据鉴权、数字人初始化、形象显示 | 未执行；不能用静态证据替代 |
| 文本问答及完整回复事件 | 未执行 |
| 麦克风识别、打断、实际资源释放 | 未执行 |
| 人设、上下文与右侧任务双向联动 | 未执行 |
| 临时网关凭证或服务端代理 | 候选设计，待验证 |

后续一次完整真实验证应记录：SDK 摘要、浏览器版本、开始/结束时间、成功/失败状态、回调的脱敏结构，以及销毁后麦克风/网络连接状态。不要保存 Secret、socket token、原始语音或真实个人画像。没有会话凭据时仍可完成界面、状态机、失败路径和本地模拟工作，但必须与真实 SDK 结果分开记载。

## 后续本地适配实现与测试

新增 `src/lib/server/xingyun.ts`、`src/app/api/avatar/session/route.ts`、`src/components/avatar-panel.tsx`。服务器读取 `XINGYUN_APP_ID`/`XINGYUN_APP_SECRET`；组件只传占位 App ID 和空 Secret，同源网关代理重新签名。回调、初始化超时、麦克风显式启动、打断及退出销毁均按上述源码契约接线。`context` 目前通过普通 ask 文本传递，不能将其描述成已验证 System Prompt 或强约束角色切换。

安全边界：代理固定供应商 URL，不接收浏览器认证头；检查同源 Origin、Supabase 当前用户、请求大小和会话所有权；同用户仅一会话，创建限每分钟五次；拒绝浏览器提供 brain_config/asr_config 等供应商密钥配置；POST 和 DELETE 均在服务器签名。仅 localhost/127.0.0.1 可访问，未开放公网。上游 HTTP/网络失败返回固定中文错误，不返回供应商原始响应、cause、签名或凭据，不打印日志。成功会话响应必须包含 SDK 所需的短期 socket token，因此返回 private/no-store，不记录其原文。

实际运行 `node --conditions=react-server --import tsx scripts/verify-xingyun-proxy.ts`：**10 项通过**，覆盖签名（中文/空格/嵌套排序）、跨用户删除拒绝、编号占用拒绝、单用户并发拒绝、会话编号匹配、DELETE、危险配置拒绝、上游错误脱敏和网络不确定时按 request_id 清理。该脚本覆盖固定假凭据与 mock fetch，未调用供应商服务。`npx tsc --noEmit` 退出 0；四个新增 TS/TSX 文件的 ESLint 退出 0、零警告。

局限：所有权与限流为单进程内存实现，进程重启后无法恢复既有会话所有权；不能用于多实例公开部署。网络超时不代表供应商未创建会话，所有权暂保留供 SDK DELETE 清理；若页面未完成销毁或网络持续不可用，仍可能需要供应商后台结束会话。客户端失败提示保留任务可用性，不等于数字人成功。真实浏览器会话由主验收记录，未被上述 mock 测试覆盖。
