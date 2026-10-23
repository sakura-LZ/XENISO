# 用 ego 浏览器抓 JS 渲染页面（研究线通用手册）

本机 `ego-browser` **不在 PATH 上**，必须用完整路径调用：

```
C:\Program Files\Citro Labs\ego lite\Application\0.6.0.16\ego-browser.exe
```

## 为什么需要它

`scripts/knowledge/probe.ts` 直接 fetch HTML，遇到 JS 渲染页面只能拿到几百字符（如华科 `gszs.hust.edu.cn/info/1093/4161.htm`）。ego 浏览器会真实渲染，能拿到完整正文与后续链接。

已验证成功案例：华科研究生院招生简章页 → 渲染后拿到标题、`时间：2026-10-08`、点击量，以及真实目录入口 `http://yanzhao.hust.edu.cn/Master/Zsml_View.aspx`。

## 用法（Windows / PowerShell 唯一可靠姿势）

**PowerShell 5.1 会吞掉 `-e` 参数里的双引号和中文**，所以：把脚本写成 `.mjs` 文件（用 write 工具，不要用 `Set-Content`/`Out-File`/`>`），再用纯 ASCII 的单行命令导入执行。

1. 写文件，例如 `C:\Users\Acer\ego\<任务名>-<日期时间>\round-01.mjs`：

```js
const task = await taskSpace("抓北航生医工程专业介绍");
const page = task.page("p1");
await page.goto("https://bme.buaa.edu.cn/...");
await page.waitForLoadState("networkidle").catch(() => {});
const title = await page.evaluate(() => document.title);
const text = await page.evaluate(() => document.body.innerText);
console.log(JSON.stringify({ title, len: text.length, text: text.slice(0, 3000) }, null, 2));
```

2. 执行（注意 `file:///` 用正斜杠、路径纯 ASCII）：

```powershell
& "C:\Program Files\Citro Labs\ego lite\Application\0.6.0.16\ego-browser.exe" nodejs -e "await import('file:///C:/Users/Acer/ego/xxx-20261022-2205/round-01.mjs')"
```

## 硬性约束

- 脚本跑在 **Node.js** 里，不是页面里：`window`/`document` 只能用 `page.evaluate()` 包起来。
- **不要** `import` Playwright、不要另起浏览器、不要用 `locator()`/`getByRole()`/`context()`/`expect()`/`route()`（这套是自定义精简 API，不是 Playwright）。
- 每轮写**新文件**（`round-02.mjs`、`round-03.mjs`），不要改旧文件重跑，旧文件会把历史步骤再走一遍。
- 每个任务的脚本放在独立目录：`C:/Users/Acer/ego/<任务名>-<YYYYMMDD-HHmm>/`。
- 中文内容必须留在 `.mjs` 文件里，**绝不能**出现在 `-e` 参数中。
- 脚本不继承 shell 环境变量，也不在你的工作目录下运行：文件读写一律用**绝对路径**。

## 强制收尾：脚本结束前必须关闭页面（否则会把内存吃光）

实测教训：多条线反复运行 ego 脚本后，本机累积到 **39 个 ego/Chromium 进程、约 3.8 GB**，16 GB 机器物理内存被吃到 96%，所有进程开始换页变慢。根因是脚本跑完没有关闭 Page。

**每个脚本必须关闭自己开的页面**：

```js
const task = await taskSpace("抓北航生医工程");
const page = task.page("p1");
try {
  await page.goto("https://...");
  // ...抓取逻辑
} finally {
  await page.close();   // 必须：关闭本脚本创建的页面
}
```

规则：
1. **抓多个 URL 复用同一个 page**（`goto` 覆盖），不要每个 URL 新建页面。
2. **不要只 `console.log` 就结束脚本**——必须走到 `page.close()`。
3. 用户自己开的页面（`openedBy: "unknown"`）**不要关**，只关自己 `task.page(...)` 创建的。
4. 不要用 `Stop-Process` 杀 ego 进程来"清理"——实测只能释放约 380 MB，因为大部分是同一浏览器的子进程，共享内存。

## 政府站点被封锁时的绕行与披露规范

部分部委站对境外/机房出口有封锁，**ego 也绕不过**（换 UA、加 header 都无效）：

| 站点 | 现象 | 结论 |
|---|---|---|
| `www.nhc.gov.cn` | probe `http_412`；ego `ERR_CONNECTION_CLOSED` | 站点侧封锁，**放弃主站**，改用省级卫健委或政府门户转载 |
| `www.mohrss.gov.cn` | 域名访问同样断连 | **可用 IP 镜像 `http://114.255.111.180/…` 打开**（实测可渲染数据安全通知页） |
| `www.shanxi.gov.cn` | `http://` 报 `ERR_HTTP_RESPONSE_CODE_FAILURE` | 必须用 `https://` |
| `www.nmpa.gov.cn` | 主站 412 | 用英文镜像或省级药监转载 |

**走镜像时的强制披露**（否则等于伪造来源）：
1. `source.url` 仍填**官方域名下的规范 URL**（人可点开的那个），不要填 IP。
2. 在 `source.publication_date_note` 或该条 `context.evidence_locator` 里**写明**：`正文经由该站 IP 端点 114.255.111.180 取得（域名通道在本机不可达），内容与官方页一致`。
3. 若镜像页与官方域名页路径不一致，`evidence_locator` 要写出镜像页的完整路径，便于复核。
4. **不允许**用第三方转载（文库站、公众号、聚合站）冒充官方原文。

## 抓到正文后怎么入库

ego 抓到的正文请**存成 `.txt` + `.raw`**（`.raw` 存渲染后的 HTML 或文本快照），然后按常规 handoff 流程走：

- `content_type` 用 `text/html`，`artifact.raw_path` 指向 `.raw`，`text_path` 指向 `.txt`
- literal 取**空白折叠后的单行连续子串**（10–1600 字符），与 `.txt` 逐字一致
- 提交前 `npx tsx scripts/knowledge/verify-handoff.ts <你的 handoff.json>`，errors 必须为空

## 建议同时保留「原网站链接」

用户明确要求：**每条数据必须能点回原始网页**。handoff 的 `source.url` 必须是实际抓取的那一页 URL（不是列表页、不是首页）；若数据在附件 PDF 里，`source.url` 用附件直链，并在 `context.evidence_locator` 写明在附件中的位置。
