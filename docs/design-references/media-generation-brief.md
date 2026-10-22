# LIMEN 素材生成清单与可直接使用的提示词

2026-10-22 已通过 imagegen bundled CLI，使用用户提供的 API 服务与 gpt-image-2 生成两幅个人画像入口图（1536×1024、medium、PNG）。本次是两次独立 generate，通过同系列文字约束统一风格，没有上传图一作为编辑参考。凭据仅在进程环境中使用，未写入本文件或提示词归档。两幅图已检查、压缩为 1200×800、quality 86 的 WebP，并接入双栏入口。首页现已额外生成新的动画电影风格岩桥静态图（v6），原桥帧作风格参考；前一张写实多孔石桥v5弃用。首页不播放视频。社区暂用用户提供的083背景视频，下方附可替换的悬浮叶片视频提示词。

原图：`output/imagegen/profile-basics.png`、`output/imagegen/profile-interests.png`。页面素材：`public/previews/assets/profile-basics.webp`、`public/previews/assets/profile-interests.webp`。实际生成参数与完整提示词见 [profile-image-prompts.json](./profile-image-prompts.json)。

## 参考如何落到素材上

| 用户文件 | 本项目采用的关系 | 是否需要生成素材 |
| --- | --- | --- |
| [首页对话框.md](D:/医学生跨考平台/首页对话框.md) / Transform Data | 背景铺满，前景白色输入框按后续明确的DeepSeek方向精简，保留换个问题 | 新静态背景已生成，输入框由HTML呈现 |
| [左右板块布局.md](D:/医学生跨考平台/左右板块布局.md) / What Package Fits You | 按用户明确描述，两个并列入口、各自图片、介绍、Continue | 两幅同系列静态图已生成并接入 |
| [基本情况区块.md](D:/医学生跨考平台/基本情况区块.md) / RIVR DeFi | 用区域层级、留白组织表单，文字与输入保持原生可编辑 | 不需要把表单生成成图片 |
| [报告生成.md](D:/医学生跨考平台/报告生成.md) / LaunchEx Submissions | 生成状态以中央 LIMEN 为核心，背景柔和流动，字标渐隐渐现 | CSS 可完成；可选生成无文字底层视频 |
| [知识库区块.md](D:/医学生跨考平台/知识库区块.md) / Orbit Engineers | 六个内容分区与清晰条目导航 | 不需要生成文字卡片或截图 |
| [背景浮动.md](D:/医学生跨考平台/背景浮动.md) / Botanical Shadow About | 可见植物动态作为论坛底层背景，前景为求助 / 经验帖子列表 | 暂用083背景视频，新悬浮叶片视频可替换 |

注意：其中五份文件明确标注 paid_only，正文是 reconstructed working prompt，部分没有公开视觉 URL。本稿忠实采用用户指定的分块、中心生成和植物浮影构图，不宣称这些泛化重建文本包含已验证的原版全部细节，也不直接重用付费预览视频。

## 两幅 Image2 入口图（已完成）

共同规格：两张分别输出 1536 × 1024，3:2。并列时同一机位高度、光向、对象尺度和色温。主视觉放在横向 20%–80%、纵向 15%–78% 的安全区，边缘留出至少 12%，允许窄屏裁切。色板为米白 #F5F3EA、深森林绿 #264A38、鼠尾草绿 #A8B8A1；少量自然纸色。图片只负责视觉，标题、介绍、Continue 均由网页放在图片下方。不要图内文字、品牌、水印、按钮或数字。

### 图一：个人基本情况

> 为 LIMEN 医学生职业探索网站生成一幅精致、克制的编辑式静物摄影，作为“个人基本情况”入口的配图。横幅 3:2，1536×1024。米白纸质背景与浅米色桌面自然衔接。画面中央偏左是一册打开的素色档案夹，里面是无文字的奶油白纸张，一张小的抽象人物侧影卡片半露在纸下；右侧是深森林绿色封面的薄笔记本和一支简洁铅笔，表现学习经历、已有经验、个人选择正在被整理。所有纸张没有可读文字，没有表格或假 UI。柔和自然光从左上方照入，真实纸纤维和轻微阴影，安静、有秩序、温暖、专业。主体占画面约 55%，保留大片连续米白留白，边缘不要裁掉关键物件。森林绿与鼠尾草绿作为少量实体物件颜色。不要电脑屏幕、听诊器堆叠、科技蓝光、粒子、霓虹、玻璃悬浮面板、卡通人物、文字、字母、数字、logo、水印。与另一幅职业兴趣问卷图保持同一摄影系列。

### 图二：职业兴趣问卷

本次独立生成，使用同系列文字约束，未上传图一。实际提示词：

> 生成与米白纸张、左上自然光和森林绿实体物件组成的档案静物摄影同系列的第二幅编辑式静物摄影，用于 LIMEN“职业兴趣问卷”入口。横幅 3:2，1536×1024。延续相同米白纸面、自然左上光、柔和阴影和森林绿 / 鼠尾草绿配色。中央是六张素色厚纸小卡，形成舒展但整齐的扇面，每张卡只用极简的实体压印抽象符号，分别暗示动手、观察、创作、帮助、组织和整理，不出现任何字母、数字或文字；前方三个小圆形绿色木质选择片，像正在回答兴趣偏好的选择。对象尺度与配套档案静物图的档案夹相近，摆放高度、投影方向和留白一致。材质真实，像杂志静物拍摄，有视觉识别度，不像网页截屏。主体占画面约 55%，图下方不生成标题或按钮。不要雷达图、分数、人格类型标签、假测评结论、蓝色、霓虹、粒子、发光圆环、logo、水印。

这六张抽象卡只是兴趣探索的视觉隐喻；不能替代 O*NET 题目或计分，也不在图片中嵌入 RIASEC 标签。

## 论坛背景视频：可直接复制到 Seedance

用途：铺在交流社区的底层，帖子列表叠在上方。植物本体缓慢浮动，不再使用墙面投影。当前已接入083视频作为暂用背景，生成新视频后替换素材即可。

参数：16:9、1920×1080、8秒、24fps、无声、固定镜头。尽量设置首尾帧一致以便循环；另存一张JPG封面。生成结果仍需检查循环接缝。

> 为一个森林绿与米白配色的网站制作安静、精致的动态背景。温润的米白色无边界空间中，少量鼠尾草绿半透明叶片分布在画面左上角、右侧边缘与右下角，缓慢悬浮、轻微旋转，形成柔和的前后景深。叶片本身清晰可见，有细腻叶脉和自然透光，不是墙面的植物投影。画面中央约65%始终保持干净、明亮、均匀留白，用于叠放论坛帖子列表。运动幅度小、节奏舒缓、亮度稳定、固定镜头、首尾自然衔接。无人物、文字、标志、UI、粒子、霓虹、快速运动、闪烁。不要生成网页或在画面中放入卡片。

## 可选视频二：报告生成背景

对应 LaunchEx Submissions 的中央生成状态。**LIMEN 字标的渐隐、渐现和细微流动优先用 CSS / SVG 实现，不必生成视频。**这样字形清晰，能随真实生成状态结束，也能响应减少动态偏好。背景视频仅用于增加材质，不烧录 LIMEN 字样，不模拟百分比或假进度。

建议输出：1920×1080、16:9、6 秒、24fps、无声、可循环；中心 40% 留白供网页叠加 LIMEN。加载面板采用背景铺满，文字独立；生成完成后立刻退出，不强制播放完整视频。

> 米白色无边界空间中的极简动态材质背景。两条很薄的半透明鼠尾草绿色柔性薄膜从画面两侧缓慢流过，形态像柔和折叠的纸与丝绸之间，边缘带极淡的森林绿色，反光低调而真实。它们沿边缘缓慢靠近又舒展，但从不进入画面中心 40% 的留白区域。整体亮度稳定，轻盈、有秩序、安静，固定镜头。6 秒循环，运动连续，无闪烁，无突然切换，无粒子和光爆，无蓝色霓虹。所有区域都不出现任何文字、字母、logo、进度条、数字、网页 UI 或人物。中心将由网页另行叠加 LIMEN 字标，所以不要自行生成字标。

## 交付时保留的边界

两张入口图及新的首页插画已生成并接入。论坛新悬浮叶片视频、报告背景视频仍为可选制作稿，当前论坛暂用083视频。问卷圆形选项、表单、知识库六分区和中央LIMEN字标通过网页实现。实时数字人另需人物资产和交互接入，不用背景视频冒充真正的面试对话。

## 首页岩桥新图（v6，已接入）

用户要求接近原图的柔和三维动画环境，避免写实桥梁摄影。通过 imagegen bundled CLI 的 edit 接口，使用原桥帧作为风格参考生成新构图；模型 gpt-image-2，medium，2048×1152。原图为 output/imagegen/limen-bridge-stylized-v6.png，页面为 public/previews/assets/limen-bridge-stylized-v6.webp（quality 88）。已单独查看确认插画风格。以下为实际完整提示词：

```text
Use case: stylized-concept
Asset type: static full-width website hero background, 16:9.
Input image: style reference only. Create a NEW landscape composition in the same softly sculpted animated-film aesthetic, rather than reproducing the exact scene.
Primary request: a beautiful imaginative green valley with ONE broad organic moss-covered natural rock arch spanning the lower foreground. Rounded lush foliage and softly sculpted karst mountains on the outer edges, layered pale sage mountains receding into warm ivory mist. An inviting sense of possibility and discovery.
Style: premium stylized 3D animation film environment, storybook miniature, deliberately simplified rounded forms, matte hand-crafted surfaces, painterly atmospheric depth. Preserve the reference's warm gentle light and rich green vegetation. Clearly illustrated, not a photograph.
Composition: wide panoramic landscape; the arch occupies the bottom quarter; foliage frames the far left and right; large quiet warm ivory sky in the upper and central 60 percent for website heading and input composer. Keep central background low contrast, but retain beautiful substantial landscape around the edges. Reimagine the mountain silhouettes and arch curvature to make a new scene.
Lighting: soft warm morning light, diffuse atmospheric haze, restrained highlights.
Avoid: photorealism, photographic stone texture, masonry bridge, multi-arch viaduct, sharp realistic cliffs, buildings, roads, text, lettering, logos, UI elements, particles, neon, blue color cast. No people needed.
```
