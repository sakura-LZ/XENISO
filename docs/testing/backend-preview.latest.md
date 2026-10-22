# 功能优先 Preview 发布验收 · 2026-10-22（America/Los_Angeles）

## 实际发布

- 用户要求UI继续设计期间先上传其他部分，已发布独立Preview：https://limen-br99jfa0q-sakura-lzs-projects.vercel.app
- 部署ID：`dpl_Cd6tcPJ3JXCrLXkrgK2PE4nph4ZA`，Vercel返回READY。
- 控制台：https://vercel.com/sakura-lzs-projects/limen/Cd6tcPJ3JXCrLXkrgK2PE4nph4ZA
- `vercel inspect https://limen-azure.vercel.app`确认正式别名仍指向原部署`dpl_FX6JWvRxbKyAEEd2RzxTLGd4ksYH`。
- 允许列表归档展开至`work/releases/backend-preview-20261022-011856`。src/data/scripts/tests共156文件与打包时工作区SHA256一致；未上传真实环境文件、缓存和本机工作目录。
- 本次有意不含public：正式源码没有对未定稿预览的引用，线上`/previews/limen-pathways.html`为404。此功能包不作为未来包含UI素材的完整交付包；之后必须修订打包允许列表。
- 四组人物8项新增变量仅写Preview，原APP配置保留。未修改Production变量或轮换密钥。
- 沿用既有Supabase，未执行迁移、未重新导入知识库。Preview与Production共享数据库。

## 实际检查

| 检查 | 结果 |
| --- | --- |
| `npm run lint` | exit 0，零警告 |
| `npm test` | 130/130通过，零失败/跳过 |
| Vercel `npm ci`与`npm run build` | 安装、编译、TypeScript、14静态页面生成和发布成功 |
| 同源码隔离构建客户端扫描，显式加载根env | 51文件通过，值未输出；不是远端产物扫描 |
| 线上HTTP集成 | 30/30通过，见[机器记录](backend-preview.latest.json) |
| Edge浏览器 | 首页、知识库和体验可打开；知识库加载官方资料，体验展示十方向 |

30项线上检查包括10页面、5个未登录私有接口401/no-store、跨站写入403、未定稿预览404、真实Supabase五类知识资料、交大2027/医学筛选、匿名合成访客、四组人物configured且无活动会话、V3内科学体验私有保存/恢复、合成画像保存、真实身份Match及账号删除。Match保持`scoring_standards_pending`，不代表真实评分标准完成。合成账号及记录已删除，无真实个人数据，未创建数字人供应商会话。

## 失败、警告与局限

- 首轮vercel curl把global参数传给curl导致`--scope unknown`，修正后直连仍超时。核对系统现有代理后，只让验收请求使用该代理，未更改系统网络配置；随后完整30项通过。首轮失败未记为通过。
- Preview保留Vercel登录保护。HTTP使用官方CLI认证访问，Edge已有Vercel身份可打开；独立未登录IAB正常跳转Vercel登录，没有关闭保护。
- 安装保留5项high、eslint弃用、cache-dir、install-scripts及Node `>=22`自动升级提示。未隐藏或执行破坏性自动修复，本轮未重新归因全部依赖漏洞。
- 本轮未重测真实O*NET计分、LLM报告生成、数字人供应商文字/语音、ASR/口型、社区OTP或浏览器完整画像至R2流程。历史证据不能替代新部署完整验收。
- 绿色HTML没有发布或整合；后续接入见[交接约定](../BACKEND_PREVIEW_HANDOFF.md)。
