# 星云按方向分配人物验收（2026-10-21—22，本机，未部署）

## 交付范围

共用现有端到端SDK，以四个白名单别名选择服务端应用。原应用用于医学带教；两组新增应用分别用于器械/产品和AI/计算机。凭据仅在Git忽略的根`.env.local`与服务端环境中，不记录具体值。

| 分组 | 体验范围 | 本机配置 |
|---|---|---|
| medicine | 内科学、外科学、妇产科学、儿科学 | 原有应用保留 |
| biomed_eng | 智能医疗器械、医学信号处理、医学影像工程；另含医学AI产品经理模板 | 新应用已接入 |
| cs_ai | 机器学习与计算机视觉、软件工程与系统开发、大语言模型与AI Agent | 新应用已接入 |
| med_informatics | 临床数据科学、医疗信息系统普通模板、医疗NLP与知识图谱 | 预留，未配置，不自动回退 |

前端只传人物别名；`gatewayServer`携带别名，POST由服务器签名。新claim绑定人物/应用，DELETE按持久化归属识别原应用，兼容旧医学v1 claim；换方向、重连、账号删除不依赖当前页面人物。未新增数据库字段或迁移。

## 实际命令与结果

Windows npm shim不能直接运行，npm任务使用`node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' ...`。

| 检查 | 实际结果 |
|---|---|
| `npm run lint`（以上述Node入口单独执行） | exit 0，零警告 |
| `node --import tsx --test --test-concurrency=1 tests/*.test.ts` | 130/130通过，0失败/跳过；含新增3项分组映射测试 |
| `node --conditions=react-server --import tsx scripts/verify-xingyun-proxy.ts` | 37项通过；固定假凭据、mock数据库/提供方，不能当真实服务证据 |
| `node node_modules/typescript/bin/tsc --noEmit` | exit 0 |
| 隔离副本执行`node '../../../node_modules/next/dist/bin/next' build --webpack` | exit 0，编译、类型和14页生成通过 |
| 隔离副本载入根服务端环境，执行`check-client-secrets.ts` | 51个客户端文件通过，覆盖所有已配置星云App ID/Secret，输出不含值 |
| src/tests/scripts/docs额外凭据扫描 | 200文件通过，仅输出数量 |
| `LIMEN_TEST_ORIGIN=http://127.0.0.1:3195`执行`scripts/smoke.ts` | 原有5组HTTP smoke通过 |
| 构建快照比对 | 本轮5个运行文件SHA-256全部一致；不声称并行工作区全库一致 |
| `.env.local`忽略检查 | `git check-ignore .env.local`命中 |

曾将lint、默认并发测试与代理mock同时运行，出现V8/esbuild内存不足，3个测试文件进程退出，lint首轮exit 1无有效诊断。随后拆开执行，lint通过，全套测试以单并发130/130通过。保留该失败记录，不把首轮默认`npm test`报告为通过。隔离构建保留Next多lockfile/workspace-root推断警告，未修改共享构建配置掩盖它。

隔离副本`work/avatar-presenters/build-app`未复制`.env.local`；运行时用Node的`--env-file`从根配置载入。3195为本轮专用预览，未停止3001或既有3193，也未删除共享`.next`。

## 真实SDK与提供方验收

通过IAB真实UI操作`http://127.0.0.1:3195/experience`，仅使用合成教学任务，未启用麦克风，未勾选保存对话，未发送个人画像。

- 器械模板：连接成功，白衣女性人物显示；当前任务自动回复、预算约束的手动文字问答成功；点击结束后切换方向成功。用户描述的年龄/音色未由本轮验证。
- 计算机首轮软件模板：会话与任务回复成功；人物最初只见背景，随后显示穿西装男性。页面两次出现固定连接异常提示；首个手动问答收到文字，但自述角色被“合成验收”措辞影响。后一个追问未看到新回复，不能计为通过。截图`avatar-computing.latest.jpg`保留异常状态。
- 结束并刷新页面后，计算机应用在算法模板重新连接成功：人物显示、当前任务自动回复、手动任务问答均通过，页面显示“导师已回复”。截图`avatar-presenters.latest.jpg`及`avatar-computing-retry.latest.jpg`。
- 最后点击结束，UI显示“会话已结束”；真实GET `?presenter=cs_ai`返回`configured: true, active_session: null`。医学配置GET同样为true/null；信息学为false/null。医学本轮只核对配置与路由，未重跑其完整真实会话。

独立截图API曾两次报无法捕获，改用文档支持的`getAXStateAndScreenshot`后成功保存图片；未更换为CDP或脚本注入操作。

## 局限与后续边界

真实连接、文字回复和会话释放已有证据；首轮异常尚无可复现根因，不能宣称提供方长期稳定。模型回复是原文输出，未做专业正确性评分；普通ask提示不能保证角色强约束。麦克风/ASR、实际音频与口型未验收。没有新增视频生成、实时场景生成、成果动态同步、全局导师或E2/E3。

本轮未部署，线上仍是旧版本。后续发布需把两组新增服务端环境变量配置到实际Vercel环境，再部署和进行线上验收；医学信息学还需第四组应用配置。数据库沿用既有会话/RLS与体验接口，没有远端迁移。
