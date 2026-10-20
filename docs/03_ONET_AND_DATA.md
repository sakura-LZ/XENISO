# O*NET / 免费资源 / 合规接入规范

## 当前事实与风险
用户已经创建过 O*NET Web Services API Key，但截图曾完整暴露 **旧 Key 必须撤销并轮换**。压缩包不能包含任何密钥、示例也只能使用占位符。此处只规定联调，尚未验证你账号下所有端点可用。

## O*NET API v2.0（实际先核实接口）
- base `https://api-v2.onetcenter.org`
- GET `/about/`：首个真实连通测试。
- GET `/mnm/interestprofiler/questions_30?start=1&end=30`：英文Mini-IP 30题，分页处理、校验index/area；先以官方文档最新返回为准。
- GET `/mnm/interestprofiler/results?answers=<encoded>`：RIASEC，必须验证Mini-IP 30题序列是否成功；目前官网某说明页将 30题示例写成“60-character answer string”，存在矛盾，不能假定格式。
- GET `/mnm/interestprofiler/careers?realistic=...&investigative=...&artistic=...&social=...&enterprising=...&conventional=...`：用六维官方结果职业匹配，更容易与答案字符串版本区分。
- GET `/mnm/careers/<SOC_CODE>/` 及 skills、knowledge 等职业子资源：真实返回为准。
- Header `X-API-Key: ${ONET_API_KEY}`；仅服务端，所有调用 GET；不要请求端直接访问 API 或把密钥打到日志。
- 文档：https://services.onetcenter.org/reference/start/overview ; https://services.onetcenter.org/reference/mnm/ip/ip_questions_30 ; https://services.onetcenter.org/reference/mnm/ip/ip_results

## 原题与中文翻译
- 用 `{id,index,area,original_en,zh_CN,translation_status,onet_version}` 保存。`original_en` 只来自实际API或授权资料；`zh_CN` 为**经过人工审读的译文**，不可模型随意重写已确认的原题；翻译可能改变测量属性。
- 答案固定为 1..5，按原顺序存储 `index:answer`，提交前校验30道是否齐全。
- 翻译属于改编：遵守 O*NET Tools Developer License 对归属标注、翻译/改编与适当验证的要求；**公开对外发布中文版前需要制定并履行验证安排**，不要把原版效度宣传为中文版本效度。开发可先内部原型与封闭演示。
- 绝不能将官方六维分数写作LIMEN研招录取概率。API结果与自有职业→专业映射来源分开。

## 回退：离线 O*NET 数据快照
- 官方职业数据库 `https://www.onetcenter.org/database.html`，注意数据库许可与职业探索工具内容许可是两套条款。
- 如 API 因审批/网络/限额失败，显示明确错误；可用**合法下载**的职业数据、本地规则展示知识库；真实量表若无法可靠计分，阻止生成正式RIASEC结果（不要假造“官方计算通过”）。
- 加载本地职业子集只需 9个细分方向涉及的SOC编码，不导入美国全部职业信息。

O*NET Web Services 获取的职业信息用于公开免费浏览的知识库；私人画像和报告须单独保护，不能把免费职业数据锁在强制注册/收费墙后。具体遵循API账号使用条款。

## 数据源分层
1. O*NET：职业、任务、技能/知识、兴趣匹配（官方）
2. ESCO `https://esco.ec.europa.eu/en/use-esco/use-esco-services-api`：可选补充技能术语；不要强制首版连接
3. 教育部学科目录、研招网、院校官网：专业代码/招生信息；暂无确认的稳定官方批量API，按官方链接人工核验。
4. 学术论文：可作为后续“真实项目进一步阅读”，不依赖实时OpenAlex请求完成MVP。

## 检查必须写进测试日志
- 对端点真实请求的响应状态码、返回 key、条目数量，不打印响应里的API Key；模拟数据须标 `mock=true`，不能声称真实联调成功。
- API失败/超时/无职业匹配都有明确 UI；服务端设置超时、缓存、输入校验、限流和重试上限。
