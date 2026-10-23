# XENISO 异域同构 · 独立 HTML 改版

交付入口：[xeniso-pathways.html](../public/previews/xeniso-pathways.html)。原 `limen-pathways.html` 保留。使用时保留同级 `assets/` 文件夹。

标语：**Different Fields. Shared Potential.**

- 首页：标题与输入区由顶部固定偏移改为首屏中央构图；桥景轻微上移。标语放在“下一站，是你。”下方。
- 四入口：四张独立生成的摄影风格图片，横向滚动、触摸滑动、鼠标拖动、前后按钮及键盘左右键 / Home / End。窄屏保留下一张露出，提示可继续滚动。
- 品牌：导航、页脚、文档标题、报告生成字标与下载文件名统一 XENISO；问卷与底层映射的来源、版本和原始数据不改写。
- 内页：直接使用个人画像、初步评价、职业体验、行动规划、信息文库、交流社区等标题，清理重复指示和低价值旁白。表单标签、错误反馈、数据来源和 simulation 标识保留。
- 体验：入口收敛为方向、场景、角色及工作 / 面试两种选择；场景名称改为具体工作主题，例如“医学影像模型的跨设备验证”。模板 ID、选项和计算逻辑不变。
- 文库：六主题采用分隔线和阅读目录，收录数量与日期折叠至“资料说明”；原文、来源和范围仍可查阅。
- 社区：移除旧视频背景，使用 34 个低对比度、缓慢漂浮的粒子；减少动态与隐藏页面时暂停，中心保持留白。

配套：[入口配图总览](../output/imagegen/xeniso/xeniso-feature-images.jpg) · [图片生成记录](design-references/xeniso-image-prompts.json) · [社区视频参考图与提示词](design-references/xeniso-community-video.md) · [验收](testing/xeniso-preview.latest.md)。

可编辑源为 `work/xeniso-redesign/`。重复构建使用 `node work/xeniso-redesign/build.cjs`；`customize.py` 为从旧版制作初稿的一次性变换，不可对已修改源重复执行。`xeniso.css`、`xeniso.js` 管理本轮新增样式、滑动控件和粒子背景。

本轮仅独立 HTML 与素材，未整合正式 TSX 主题、未部署、未修改数据库。报告依旧是本地结构化记录；数字人和社区保留已有同源接口，未新测真实数字人、邮箱或发布操作。浏览器安全策略拒绝 file:// 自动打开，实际视觉验收仍待完成。
