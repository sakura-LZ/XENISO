# XENISO 品牌更名与报名材料交付（2026-10-22）

用户授权将 GitHub 和 Vercel 名称改为 XENISO，更新仓库介绍，继续交付 PPT 并修正海报副标题。

## 已执行

- GitHub 仓库由 `sakura-LZ/limen` 改为 `sakura-LZ/XENISO`，仍为公开仓库；About 简介与 Website 已同步。
- README 标题、简介、公开网址和品牌称呼已更新，提交 `74aa1d2` 已推送到远端 `main`。本地 `origin` 更新为新仓库地址。
- Vercel 项目 ID `prj_JXBSyBrHMyX43dVZ9kU4QtHU5Fcg` 保持不变，名称改为 `xeniso`。本机 `.vercel/project.json` 同步新名称。
- `xeniso.vercel.app` 绑定尝试返回已被占用。成功绑定 `https://xeniso-platform.vercel.app`，并添加为项目域名，以继续跟随 Production 发布。
- 新域名仍使用原生产部署 `dpl_FX6JWvRxbKyAEEd2RzxTLGd4ksYH`；页面目前显示 LIMEN，未部署并行进行中的新版 XENISO UI，未更改数据库、环境变量或访问保护。
- 交付目录：`output/submission/XENISO_报名提交包/`，包含 6 页可编辑 PPTX、PDF 预览、海报 PNG/A3 PDF、总览与报名清单。
- 海报保留此前 Image 2 图像，仅统一修正副标题文字“面向医学生的跨学科探索与行动规划平台”。未声称本轮重新调用 Image 2。

## 实际检查

- 浏览器可见 GitHub 新仓库名、About 简介、README 标题和新 DEMO 链接。远端已显示 `74aa1d2`。
- Vercel CLI 更名、alias 创建、项目域名绑定均成功；新域名首页和 `/experience` 页面浏览器检查可访问。
- PPTX 包完整性、关系、6 页页数、版面几何与 Artifact Tool 重新导入通过。
- 本机 PowerPoint 实际打开 PPTX，成功导出 6 页 PDF 和 1600×900 逐页图片；六页逐一目视检查。
- PPTX 原生文本及两条新超链接检查通过；海报 PDF 为 1 页，尺寸 297×420mm，原图 1055×1491 像素，未插值冒充原生高清。
- `git diff --check -- README.md` 通过。本轮没有更改应用源码，未运行 `npm run lint` 或 `npm run build`，不沿用别轮结果作为本轮通过证据。

## 制作中发现并修复

- 原简写的 `Presentation.load()` 需要当前运行时未安装的 Node API，已改用文档明确的 `PresentationFile.importPptx(FileBlob.load())`。
- 超链接新增 XML 的 `r` 命名空间遗漏已修复，结构校验随后通过。
- finalizer 缺少运行时模块路径已补充，全部最终校验通过。中间失败不计为成功验收。

完整 AI 主线、语音/ASR、邮件和新版 UI 发布不属于本轮更名及材料检查范围。
