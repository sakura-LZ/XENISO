# 问题与处理记录

- 2026-10-20：目录仅有规格包且 Git 未初始化；先建立 P0 应用和验证工具，验收结果独立记录。
- 2026-10-20：未发现 O*NET / Supabase 环境配置；不进行带凭据请求，真实联调保持 BLOCKED。
- 2026-10-20：sandbox 内 npm 官方仓库 DNS 返回 ENOTFOUND；改用受审核的网络执行检查，禁止据此伪称依赖安装完成。
- 2026-10-20：首次 lint 出现匿名默认导出警告，已改为具名配置；CLI 顶层 await 在 CJS 下失败，已声明 ESM。
- 2026-10-20：Turbopack 构建在 PostCSS 子进程连接阶段崩溃；按本地 Next CLI 支持的 `--webpack` 路径重试，仍保留完整 TypeScript 与构建检查。
