# LIMEN 独立 HTML 设计 · 2026-10-22

最新入口：[limen-pathways.html](../public/previews/limen-pathways.html)，与相邻 assets/ 一起使用。limen-motion.html 是早期动效实验。本轮交付独立 HTML，正式 Next.js 页面主题未覆盖、未部署。

## 页面结构

| 页面 | 布局与交互 |
| --- | --- |
| 首页 #/home | 新生成的动画电影风格岩桥静态背景；单一主标题、DeepSeek式白色输入框、换个问题、圆形发送按钮。下方为定位与四个配图流程入口，移除重复探索标签、底部手册入口和暂停动态。 |
| 画像 #/profile | 基本情况、职业兴趣两个并列入口，各有生成图片、介绍、Continue 和完成状态。配图固定桌面168px/手机145px，压缩重复小字。 |
| 基本情况 #/profile/basics | 学习背景、科研实践、技能语言、探索目标四区。必填及 GPA/排名关联校验，确认后返回画像入口。 |
| 问卷 #/assessment | 三块说明、大题干、圆形回答。保留 O*NET 30题、5档、题号、英文、RIASEC、答案码；五组，每组六题。 |
| 画像生成 / 初步评价 | 两部分确认后才显示生成按钮。实际准备期间显示 LIMEN 字标，完成后展开/下载。输入改变使报告失效；初步评价分四类证据，未选方向不默认推荐。 |
| 职业体验 #/experience | 选择方向、场景、工作/面试模式；14模板、28条三阶段路径。 |
| 体验主画面 | 人物主舞台，任务资料、对话、画像从侧栏展开；手机侧栏排在主画面下方。任务操作、计算反馈、记录和导出保留。待连接时显示占位，连接后由SDK渲染人物。 |
| 面试 | 自我介绍、中译英、英译中、专业问答、生活化问答，独立回答随成果导出，可发送给已连接导师。 |
| 规划 #/report/plan | 目标、路径、年份、周预算、下一步及已完成体验成果；引用确认的画像快照，过期时提示更新。 |
| 文库 #/library | 十方向含独立医学路径，六主题入口再进带目录详情；127条资料快照配合方向指南，医学按既有空 direction_ids 契约匹配28条资料。 |
| 论坛 #/community | Discourse式列表，求助/经验切换、搜索、详情、草稿/下载、站内邮箱验证、发布/本人删除/举报；视频铺在背景。通过同源既有API读取帖子，移除示例帖子和“前往正式社区”。 |

主导航：**首页 / 异域探索 / 信息文库 / 交流社区**。异域探索内为：**个人画像 → 初步评价 → 职业体验 → 行动规划**。资源页没有共用流程侧栏，文库详情才有专用阅读目录。“方向手册”统一称信息文库。

## 参考如何使用

全站森林绿、鼠尾草绿、米白与统一中文系统字体；通过图片、字号、分栏、细分隔线和局部图形组织不同页面。

- [首页对话框.md](../../首页对话框.md)：遵循728px输入区比例；用户后续明确DeepSeek，采用白色输入框与底部精简操作，保留换个问题。
- [左右板块布局.md](../../左右板块布局.md)：双入口、图片、图下介绍及继续填写。
- [基本情况区块.md](../../基本情况区块.md)：分区表单。
- [报告生成.md](../../报告生成.md)：中央 LIMEN 渐隐渐现，不加虚假进度或人工等待。
- [知识库区块.md](../../知识库区块.md)：六区入口与阅读详情。
- [背景浮动.md](../../背景浮动.md)：采用底层铺满关系；用户后续要求可见实物动态，移除叶影，暂用083植物视频，提供新的悬浮叶片制作稿。

补充研究：[数字人](design-references/avatar-options.md)、[问卷与生成](design-references/questionnaire-report.md)、[文库与论坛](design-references/library-forum-options.md)。文档区分公开可核实页面与 paid_only 泛化重建稿，没有声称完全复现未见原版。

## 图片和动态

两张入口图已通过用户指定API用 gpt-image-2 生成，采用 imagegen bundled CLI。原图在 output/imagegen/，网页使用 assets/profile-basics.webp、profile-interests.webp。文字与按钮由HTML呈现；实际提示词和参数见 [profile-image-prompts.json](design-references/profile-image-prompts.json)。密钥只传给生成进程，不进入源码或提示词文件。

首页使用新生成的 limen-bridge-stylized-v6.webp（2048×1152），以原桥静态帧作风格参考，形成新的山谷构图；写实版v5弃用。关于页与社区暂用 Background 083 背景层，静音循环并有封面、可见性暂停和减少动态支持。LIMEN 字标用CSS；页脚不再显示全局暂停按钮。付费04没有作为产品素材使用。[素材制作稿](design-references/media-generation-brief.md) 包含图片完整提示词及可选 Seedance 提示词。

## 预览边界

- 填写、任务和草稿只在当前页面内存中；刷新前可下载。报告为本地结构化记录，未调用AI或O*NET官方计分，不伪造能力分数或个人资格。
- 数字人复用同源 /api/session、/api/avatar/session 与星云SDK，主动连接才加载。角色引导来自仓库既有 avatarDialogue。连接后发送当前任务和主动提交的文字/语音；画像需先读取，再点击发送摘要。
- file:// 不能建立同源导师会话，提供正式平台入口。SDK交互已做模拟检查，本轮未验收真实人物连接、语音和音画同步。
- 社区接口复用 /api/community、/api/community/auth、/api/session，全部站内操作。file://不请求服务，草稿可导出；同源运行才可登录发布。本轮仅接口替身验证，未发送真实邮箱验证码、发布或删除实际帖子。
- 知识资料是本地快照，来源展开含机构、原文、日期、适用范围与复核提示。

## 维护

本地可编辑源在 work/pathways-redesign/：page.html、app.js、styles.css、modules-v4.js/css、library-v4.js/css、community-v5.js、layout-v5.css；build.cjs 结合既有问卷/模板/对话规则/手册/资料生成HTML。revise-*.cjs 是已执行的一次性变换，不能重复运行。

实际检查见 [验收记录](testing/pathways-green-preview.latest.md)。DOM模拟不等于浏览器视觉验收。

