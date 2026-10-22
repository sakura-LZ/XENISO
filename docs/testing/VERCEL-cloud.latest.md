# Vercel 正式部署实测

日期：2026-10-21（America/New_York；UTC 2026-10-22）。

## 部署结果

- 正式网址：https://limen-azure.vercel.app
- 部署：https://limen-93g63el86-sakura-lzs-projects.vercel.app
- 控制台：https://vercel.com/sakura-lzs-projects/limen/FX6JWvRxbKyAEEd2RzxTLGd4ksYH
- 部署 ID：`dpl_FX6JWvRxbKyAEEd2RzxTLGd4ksYH`；CLI 返回 READY、target production，退出0。
- 用户完成设备授权及邮箱验证，明确授权八项提供方配置写入 Production/Preview。另配置 LLM 开关和关闭 P0 控制台，共十项变量、二十项环境绑定；仅核对名称，未输出密钥。
- `.env.local`、`.git`、`node_modules`、`.next`、`work`、原始测试记录均排除上传。源码141文件，约835KB。没有连接 Git 仓库，也没有付费升级。
- 项目 API 返回 nodeVersion 22.x、resourceConfig.fluid true。构建提示 package.json 的 >=22 可覆盖项目 Node 设置，实际部署运行时不应仅根据项目设置推断。

## 实际检查

| 检查 | 结果 |
|---|---|
| `npm run lint` | 退出0，零警告 |
| `npm test` | 退出0，45/45通过，mock/simulation与真实服务验证严格区分 |
| `vercel --prod --yes --scope sakura-lzs-projects --no-color` | 安装依赖、生产编译和部署完成，READY |
| Edge 正式首页与职业体验 | 实际页面可打开，开始体验后进入三阶段模拟任务，保留 simulation 标识 |
| 正式域名数字人 | 匿名会话建立、SDK连接、自动同步模拟任务及收到真实回复通过 |
| 中断及主动文字往返 | 中断后可继续提问，发送上线验收消息，实际回复“云端文字连接正常。” |
| 结束及持久状态 | UI显示“会话已结束”；随后浏览器打开 `/api/avatar/session` 返回 `configured: true, active_session: null` |
| `npm audit --json` | 5个high，均沿 eslint-config-next / fast-glob / micromatch / braces 开发工具链；未自动执行破坏性 fix |
| `npm audit --omit=dev --offline` | 退出0，缓存审计报告0漏洞；不是新一轮完整在线漏洞库检索 |
| Node正式域名HTTP smoke | 首个请求连接超时，未完成，不记为通过；系统curl也超时 |

截图：`VERCEL-home.latest.png`、`VERCEL-avatar.latest.png`。未输入真实个人画像、未保存对话、未使用麦克风；测试会话已结束。

## 局限

- 云端完整画像→O*NET→R1→R2未在本轮重跑，本机既有主线验收不能替代云端验收。
- 麦克风、ASR、音频播放及口型仍需用户设备实测。文字回复成功不证明这些能力通过。
- 社区OTP、译稿人工复核、招生来源核验、AI长期稳定性等既有限制保留。
- 安装输出 eslint 弃用、npm cache-dir、install-scripts 提示以及5个开发依赖high；没有隐藏或强制升级。
- 旧ZIP是打包时快照，不包含此次线上记录及之后其他工作区改动；正式部署以本次Vercel快照为准。后续本机改动不会自动上线，需要重新部署。
