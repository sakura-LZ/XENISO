# 信息文库与论坛：参考与采用方案

本轮依据已保存的公开网页 HTML 调研，不重复联网。证据位于 `work/pathways-redesign/{mynextmove,prospects,gitbook,discourse,flarum}-research.html`。HTML 能核实标题、内容分组、链接和列表字段；不能据此确认实时交互、精确视觉尺寸、响应式表现或动画效果。

## 信息文库：六个入口，进入后再显示目录

用户已选定六入口与详情目录，此处落实信息组织，不再另换方向。

| 参考 | HTML 已核实 | LIMEN 采用点 |
| --- | --- | --- |
| [My Next Move — Data Scientists](https://www.mynextmove.org/profile/summary/15-2051.00) | What they do、On the job、Knowledge、Skills、Abilities、Technology、Education、Job Outlook 等分组 | 把“做什么”“需要什么”“怎样准备”分开，入口用短标题，避免全文塞在首页 |
| [Prospects — Data scientist](https://www.prospects.ac.uk/job-profiles/data-scientist/) | Responsibilities、Working hours、What to expect、Qualifications、Skills、Work experience、Employers 等职业章节 | 详情页按主题阅读，把岗位日常与能力要求分开；每段先给可读摘要，再列依据 |
| [GitBook Documentation](https://gitbook.com/docs) | 文档入口、分组内容、页面内目录提示“On this page”、相关链接、更新时间 | 目录只在详情页出现；入口保持六分区，详细阅读时再显示六主题目录与返回入口 |

六入口固定为：专业特点、职业日常、能力基础、学习实践、升学准备、招聘与行业。顶部是领域筛选、搜索和可横向滚动的方向条；选择方向后展示六入口。详情页保留所选方向，目录可切换主题，来源原文与日期放在可展开区域。

美英职业网站仅用于内容组织参考，不搬用其薪资、学历门槛或就业前景作为中国结论。LIMEN 的具体资料继续使用本地已采集来源，保留适用范围与核验时效。

### 医学独立分类契约

`src/lib/knowledge.ts` 的 `roleMatchesQuery` 将 `direction_ids.length === 0` 作为医学角色分类。医学独立于九个跨学科方向，并不意味着没有资料。

当前 `medicine_guide` 对应 **28 条**本地资料：职业/专业与科室 17 条、学习 7 条、升学 1 条、行业 3 条。包括教育部本科医学门类目录、北大第一医院科室总览及 8 个科室实例，以及各医学相关专业的培养/课程材料。入口主题可能共享同一资料，因此六入口计数不能直接相加当作独立资料总数。

实现使用正式角色映射，医学返回所有空方向数组角色的记录；不得硬编码为零，也不得混入九方向的职业映射。

## 论坛：采用 Discourse 式求助与经验列表

| 参考 | HTML 已核实 | LIMEN 采用点 |
| --- | --- | --- |
| [Discourse Meta](https://meta.discourse.org/) | Topic / Replies / Views / Activity 列；主题标题、分类、标签、回复数与最近活动；分类含 Product Support、Announcements 等 | 使用横向主题列表，分“求助区 / 经验分享区”，标题为主，标签与最近更新为辅；桌面可显示回复，手机压缩次要列 |
| [Flarum Community](https://discuss.flarum.org/) | Help others、Announcements、Recently solved、All Discussions、Tags；含待回答问题及已解决内容分组 | 可借“待回答 / 已解决”筛选，帮助求助者找到适合讨论的位置；当前不替换已选的 Discourse 列表结构 |

Flarum HTML 同时包含“Something went wrong while trying to load the full version”提示，本次仅核实可读回退内容，不宣称完整论坛界面已运行验证。

论坛浮动背景只用于页头或列表外侧留白，正文列表保持稳定、低对比底色。背景不跟随帖子内容晃动，不影响阅读；尊重减少动态设置。示例帖子、回复数与活动时间在预览中应标记为演示数据，不伪装成真实社区活跃记录。
