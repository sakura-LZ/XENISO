# 功能先发布，UI后接入（2026-10-22）

功能测试版：https://limen-br99jfa0q-sakura-lzs-projects.vercel.app

原正式版：https://limen-azure.vercel.app

本轮Preview已上传知识库检索/报告适配、多方向职业体验、四组数字人路由、Match首切片及既有画像/测评/报告/社区代码。保留现有TSX页面用于测试，未包含或整合绿色HTML。Preview受Vercel登录保护，适合项目成员验收。

沿用现有Supabase，无新迁移或重复导入。Preview与Production共享数据库，本轮仅使用新建合成身份并删除，不能当作数据库隔离环境。

## UI接入

继续使用同一个Next.js项目，UI定稿后替换页面与组件，沿用同源API和HttpOnly会话，无需重建知识库。

| 页面能力 | 现有接口 | 必须保留 |
| --- | --- | --- |
| 匿名进入、隐私管理 | `/api/session` | Cookie、刷新、本人删除 |
| 画像 | `/api/profile` | schema、未知与空值、本机成绩单解析、私有保存 |
| 官方测评 | `/api/onet/questions`、`/api/onet/results`、`/api/assessment` | 30题题号/维度/版本/answer code、真实错误状态 |
| 官方资料 | `/api/knowledge` | 分类、分页、学校/年份/医学筛选、引文与导出 |
| 三阶段体验 | `/api/experience` | V3契约、服务端重算、simulation、单份覆盖与恢复 |
| R1/R2 | `/api/reports` | 输入新鲜度、预算、证据、真实AI失败与下载 |
| 数字人 | `/api/avatar/*` | 四组别名、显式连接、SDK回调与销毁、结束/离页清理 |
| 社区 | `/api/community/*` | 登录/OTP、本人权限、发帖同意、举报与删除 |
| Match | `/api/match` | 真实标准待审，个人模式不借用模拟分数 |

绿色预览的本地报告、模拟回调与社区适配需要逐项接到真实接口并联测，不能只改链接就视为业务整合完成。后端发布不等于数字人音视频已验收。

如果未来把UI放到完全不同的域名/托管服务，需要另做认证、Cookie、同源代理、CORS/CSRF及回调域名设计；当前跨站写入被拒绝，不能直接换API域名使用。

## 最终正式发布

1. UI定稿后接入真实API，保持稳定字段与版本。
2. 发布素材时修订允许列表包含所需public资源，核对授权、路径和加载。本轮功能包有意不包含public。
3. 向Production同步完整四组人物变量并保留原APP对，尚有会话时不撤掉对应配置。
4. 按真实迁移历史核对当前八份迁移，不重复执行已应用迁移或重新导入知识库。
5. lint、单测、生产build、密钥扫描，再做预览域名真实画像→官方测评→R1→体验→R2→导出/删除联测。
6. 将验收版本发布到正式域名。宣传语音或社区注册前补真实设备和邮件验收。

证据与局限见[本轮发布验收](testing/backend-preview.latest.md)。
