# Cloudfunctions 部署文档（首期：云数据库优先 + 旧前端兼容）

更新时间：2026-03-27  
适用仓库：`E:\project\must\boby-grow-weapp`

## 1. 现状与目标
- 当前运行开关为 `miniprogram/app.js` 的 `useMock=true`，前端默认走 `mock` 数据。
- 首期目标是切换到 `useMock=false` 后，可稳定调用业务云函数：`user/task/point/mcp`。
- 首期不改前端调用契约：继续使用 `callCloud(name, action, data)`，不改 `api.js` 导出名、不改入参形态、不改主要出参键名。
- `audit.*` 作为二期预留，不阻塞首期上线。
- `quickstartFunctions` 仅保留为示例函数，不纳入业务 API 契约。
- 口径说明：
  - 文档基线（`docs/interaction-logic-dataflow.md`，2026-03-26）：`37 导出 / 26 在用 / 11 预留`。
  - 当前代码扫描（2026-03-27）：`37 导出 / 28 在用 / 9 预留`（新增 `api.login`、`api.createFamily` 页面调用）。

## 2. 环境准备
1. 准备云开发环境 ID（`envId`），并确认小程序已开通云开发。
2. 配置 `miniprogram/app.js`：
   - `globalData.env` 填真实环境 ID。
   - 联调阶段将 `useMock` 从 `true` 切到 `false`。
3. 校验项目配置：`project.config.json` 中 `cloudfunctionRoot` 必须是 `cloudfunctions/`。
4. 准备部署工具：
   - 已安装并可执行 `miniprogram-ci`（或可执行路径写入 `installPath`）。
5. 准备部署变量（PowerShell 示例）：

```powershell
$installPath = "miniprogram-ci"
$envId = "<你的云环境ID>"
$projectPath = "E:\\project\\must\\boby-grow-weapp"
```

## 3. 云函数清单
| 阶段 | 云函数 | action（按 `api.js` 映射） | 数量 |
|---|---|---|---|
| 首期 | `user` | `login,getFamily,createFamily,joinFamily,getChildren,addChild,editChild,getChildDetail,getCoadmins,addCoadmin,removeCoadmin,updateDailyLimit,getProfile,updateProfile` | 14 |
| 首期 | `task` | `getRules,createRule,updateRule,toggleRule,getTasks,completeTask,submitTask,auditTask,getTaskCompletionOverview,getTaskCompletionTimeline,getTaskCompletionCluster` | 11 |
| 首期 | `point` | `getRecords,adjustPoints,getWeeklyTrend,getRewards,createReward,getRewardRequests,redeemReward,auditRedeem,getWishRequests,submitWish,auditWish` | 11 |
| 首期 | `mcp` | `getVerifyCode` | 1 |
| 二期预留 | `audit` | `createAuditRequest,getAuditRequest,listAuditRequests,updateAuditRequest,deleteAuditRequest,approveAuditRequest,rejectAuditRequest,assignAuditRequest,listAuditLogs` | 9 |
| 示例保留 | `quickstartFunctions` | `getOpenId,getMiniProgramCode,createCollection,selectRecord,updateRecord,insertRecord,deleteRecord` | 7 |

## 4. 部署顺序与命令模板
部署顺序固定：`user -> task -> point -> mcp`。

统一命令模板（与 `uploadCloudFunction.sh` 风格一致）：

```powershell
${installPath} cloud functions deploy --e ${envId} --n <函数名> --r --project ${projectPath}
```

逐个函数示例：

```powershell
${installPath} cloud functions deploy --e ${envId} --n user --r --project ${projectPath}
${installPath} cloud functions deploy --e ${envId} --n task --r --project ${projectPath}
${installPath} cloud functions deploy --e ${envId} --n point --r --project ${projectPath}
${installPath} cloud functions deploy --e ${envId} --n mcp --r --project ${projectPath}
```

批量部署示例（PowerShell）：

```powershell
$functions = @("user","task","point","mcp")
foreach ($fn in $functions) {
  & $installPath cloud functions deploy --e $envId --n $fn --r --project $projectPath
}
```

## 5. 数据准备（云数据库优先）
首期按云数据库集合模型准备数据，不以 SQL 脚本作为上线前置：
- 必备集合：`families,users,children,rules,tasks,point_records,rewards,reward_requests,wish_requests,operation_logs`
- 推荐索引（首批）：
  - `children`: `familyId,status`；`verifyCode`（唯一）
  - `rules`: `familyId,category,enabled`
  - `tasks`: `childId,date,status`
  - `point_records`: `childId,createdAt`
  - `reward_requests`: `familyId,status`
  - `wish_requests`: `familyId,status`
- `cloudfunctions/table/*.sql` 与 `api-define/*.json` 标记为后续 SQL/审计方案参考，不作为首期必做。

## 6. 联调切换步骤（mock -> cloud）
1. 云函数部署完成后，先保持 `useMock=true`，仅检查部署状态与云函数日志。
2. 在联调分支将 `miniprogram/app.js` 切换为 `useMock=false`，确保 `env` 正确。
3. 按灰度顺序验证：
   - 第 1 轮（读为主）：`getFamily/getChildren/getRules/getTasks/getPointRecords/getRewards/getWishRequests/getRewardRequests/getProfile/getMcpVerifyCode`
   - 第 2 轮（低风险写）：`updateProfile/updateDailyLimit/toggleRule`
   - 第 3 轮（新增/审核写）：`addChild/editChild/createRule/submitWish/redeemReward/auditRedeem/auditWish`
4. 保持 `api.js` 契约不变：禁止改 `callCloud(name, action, data)` 的路由与字段形态。
5. 记录每个 action 的请求体、响应体与异常日志，作为上线前回归基线。

## 7. 验收清单（冒烟标准）
主验收基线（2026-03-26 文档口径）：
- 覆盖 26 个页面已使用 API：
  - `joinFamily,getFamily,getChildren,addChild,editChild,getCoadmins,removeCoadmin,updateDailyLimit,getProfile,updateProfile,getMcpVerifyCode`
  - `getRules,createRule,toggleRule,getTasks,getTaskCompletionOverview,getTaskCompletionTimeline`
  - `getPointRecords,getWeeklyTrend,getRewards,getRewardRequests,redeemReward,getWishRequests,submitWish,auditRedeem,auditWish`
- 每个接口通过标准：
  - 调用成功且返回结构与当前前端期望一致（不改关键字段名）。
  - 写操作可在对应集合中看到结果变化。
  - 异常时返回可读错误（不出现前端白屏/JS 报错中断）。

补充验收（当前代码口径）：
- 新增页面调用 `api.login`、`api.createFamily` 也需通过，形成 `37/28/9` 实际运行基线。

## 8. 回滚方案
1. 将 `miniprogram/app.js` 回切为 `useMock=true`，立即恢复 mock 模式。
2. 保持 `env` 不变（或回填空值），避免误调线上云函数。
3. 不删除云数据库集合，不执行破坏性清理命令，保留现场便于排障。
4. `quickstartFunctions` 保持不动，避免影响已有示例流程。
5. 如需恢复云函数历史版本，优先通过云开发控制台按版本回滚，不改前端 API 契约。

### 事实来源
- `miniprogram/utils/api.js`
- `docs/api-table-summary.md`
- `docs/interaction-logic-dataflow.md`
- `cloudfunctions/table/api-define/task-rule.crud.json`
- `cloudfunctions/table/api-define/audit-request.crud.json`
- `cloudfunctions/quickstartFunctions/index.js`
- `project.config.json`

