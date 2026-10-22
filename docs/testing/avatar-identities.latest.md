# 医生/信息学分配与身份介绍验收（2026-10-22，本机未部署）

## 用户要求与最终分配

用户最新提供的医生应用用于医学带教；原医学男性应用转给医学信息学；器械/产品和AI/计算机保持既有应用。四组完整配置仅写入Git忽略的根`.env.local`，本记录不含应用编号或凭据。

新`XINGYUN_MEDICINE_APP_ID/SECRET`供医学会话使用。`XINGYUN_INFORMATICS_APP_ID/SECRET`配置为原男性应用；原`XINGYUN_APP_ID/SECRET`仍保留，以释放已存在的医学v1/v2会话。未配置任何MEDICINE变量的旧部署继续沿用原医学应用；只配一半会明确失败，不静默换人。无新迁移、未改知识库。

用户的“相应场景身份自我介绍、不要自称豆包”要求已持久至`src/lib/avatar-dialogue.ts`，供开场、任务切换、每次文字提问共用；角色/任务每次明确传入，原始用户文字仍独立记录，不把封装提示保存为用户对话。明确询问真人/资质时如实说明AI模拟，不捏造任职、执业资质。语音仍沿用SDK会话上下文，没有新增系统提示接口。

## 实际检查

| 检查 | 结果 |
|---|---|
| `node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run lint` | 最终exit 0，零警告 |
| `node --import tsx --test --test-concurrency=1 tests/*.test.ts` | 130/130通过，0失败/跳过 |
| `node --conditions=react-server --import tsx scripts/verify-xingyun-proxy.ts` | 43检查通过，mock提供方/数据库；增加医生/信息学各自签名、错别名清理、原医学v1/v2重分配后释放、部分配置不回退 |
| 当前源码TypeScript：`node node_modules/typescript/bin/tsc --noEmit --project work/avatar-identities/tsconfig.verify.json` | exit 0，包含src/scripts/tests，继承根strict配置，排除work历史副本 |
| 隔离生产build：`node '../../../node_modules/next/dist/bin/next' build --webpack` | 修正类型后exit 0；编译、类型、14静态页生成通过 |
| 隔离副本加载根env执行`check-client-secrets.ts` | 51客户端文件通过；包括MEDICINE/INFORMATICS，值不输出 |
| src/tests/scripts/docs凭据扫描 | 205文件通过，仅输出数量 |
| 私有配置结构检查 | 四组完整；信息学等于原应用、医学不同于原应用；值不输出 |
| `LIMEN_TEST_ORIGIN=http://127.0.0.1:3196`执行`scripts/smoke.ts` | 5组HTTP检查通过 |
| 本轮3个运行文件与构建副本SHA-256 | 一致 |
| scoped whitespace / `git diff --check` | 通过；保留已有CRLF→LF提示 |

首轮build暴露`DialogueTurn`合并联合成员导致TypeScript不能缩窄`text`，已拆分为三个判别成员后重建成功。根`tsc --noEmit`随后扫描到并行任务`work/pathways-redesign/build-v2-check`中的旧提示副本同一错误；没有覆盖其他任务副本，改为明确检查当前src/scripts/tests。根全目录命令不能报告为通过。Next多lockfile root推断警告仍保留。

构建副本`work/avatar-identities/build-app`不含环境文件，生产预览使用`--env-file=../../../.env.local`在3196启动；3001/3193/3195未停止，共享`.next`未删除。其他任务和未提交内容均保留。

## 真实提供方/浏览器结果

IAB在3196真实连接，仅用公开模板和合成教学数据，不发送个人画像/操作/回答，不启用麦克风、不勾选保存对话。

1. 医学→内科学：新白衣女性医生显示；自动开场“我是本次模拟的内科带教医师（项目导师）。接下来请你先按来源分类……”；手动输入“你是谁？请简单介绍自己。”后回复“我是本次模拟的内科带教医师（项目导师）。”。两次均未自称豆包或介绍供应商品牌；点击结束后成功切换。
2. 信息学→临床数据：原黑西装男性显示；开场“我是本次模拟的临床数据分析师（项目导师）……”；同样身份追问后保持该角色，继续说明当前重复记录处理任务。两次均无豆包/供应商品牌自称。
3. 最后点击结束；真实GET `?presenter=med_informatics`返回`configured: true, active_session: null`，确认无活动会话。关闭本轮创建的验收标签。

截图：`avatar-doctor-identity.latest.jpg`（医生形象）、`avatar-informatics-identity.latest.jpg`（信息学身份回答）。全页截图API一次失败，使用已成功的AX+截图保存，未将截图失败当应用失败。

## 局限

普通ask提示增强已通过上述两场景的开场和身份追问，不能承诺任意提问/长会话都不会偏离；未验证提供方控制台System Prompt字段，未擅自使用未知配置。器械/计算机复用相同新规则，本轮未重新逐一验证其身份回复。麦克风、ASR、实际音色/音频/口型、长时间稳定性仍未验收。

未上线部署，线上仍是旧版本；后续发布需配置完整四组服务端变量并保留原APP对，随后重新部署和线上验证。未实现实时场景生成、成果动态同步、视频生成或全局入口。
