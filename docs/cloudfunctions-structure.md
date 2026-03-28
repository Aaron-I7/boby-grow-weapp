# Cloudfunctions 文件结构文档（首期兼容版）

更新时间：2026-03-27  
适用仓库：`E:\project\must\boby-grow-weapp`

## 1. 分层原则
- 采用“按业务域拆函数 + 函数内 action 路由”的结构：`user/task/point/mcp`。
- 每个云函数均保持统一入口：`index.js` 只负责 `action` 分发，不写业务细节。
- 业务逻辑放在 `actions/`，数据读写放在 `services/`，跨域复用放在 `cloudfunctions/common/`。
- 首期强约束：不修改前端 `callCloud(name, action, data)` 契约，保持向后兼容。
- 二期预留 `audit` 域；`quickstartFunctions` 继续作为示例，不并入业务域。

## 2. 目标目录树
```text
cloudfunctions/
├─ common/
│  ├─ auth/
│  │  └─ roleGuard.js
│  ├─ db/
│  │  ├─ collections.js
│  │  └─ index.js
│  ├─ errors/
│  │  └─ codes.js
│  ├─ response/
│  │  └─ index.js
│  └─ utils/
│     ├─ date.js
│     └─ validator.js
├─ user/
│  ├─ index.js
│  ├─ package.json
│  ├─ config.json
│  ├─ actions/
│  │  ├─ login.js
│  │  ├─ getFamily.js
│  │  ├─ createFamily.js
│  │  ├─ joinFamily.js
│  │  ├─ getChildren.js
│  │  ├─ addChild.js
│  │  ├─ editChild.js
│  │  ├─ getChildDetail.js
│  │  ├─ getCoadmins.js
│  │  ├─ addCoadmin.js
│  │  ├─ removeCoadmin.js
│  │  ├─ updateDailyLimit.js
│  │  ├─ getProfile.js
│  │  └─ updateProfile.js
│  └─ services/
│     ├─ family.service.js
│     ├─ child.service.js
│     └─ user.service.js
├─ task/
│  ├─ index.js
│  ├─ package.json
│  ├─ config.json
│  ├─ actions/
│  │  ├─ getRules.js
│  │  ├─ createRule.js
│  │  ├─ updateRule.js
│  │  ├─ toggleRule.js
│  │  ├─ getTasks.js
│  │  ├─ completeTask.js
│  │  ├─ submitTask.js
│  │  ├─ auditTask.js
│  │  ├─ getTaskCompletionOverview.js
│  │  ├─ getTaskCompletionTimeline.js
│  │  └─ getTaskCompletionCluster.js
│  └─ services/
│     ├─ rule.service.js
│     ├─ task.service.js
│     └─ completion.service.js
├─ point/
│  ├─ index.js
│  ├─ package.json
│  ├─ config.json
│  ├─ actions/
│  │  ├─ getRecords.js
│  │  ├─ adjustPoints.js
│  │  ├─ getWeeklyTrend.js
│  │  ├─ getRewards.js
│  │  ├─ createReward.js
│  │  ├─ getRewardRequests.js
│  │  ├─ redeemReward.js
│  │  ├─ auditRedeem.js
│  │  ├─ getWishRequests.js
│  │  ├─ submitWish.js
│  │  └─ auditWish.js
│  └─ services/
│     ├─ point.service.js
│     ├─ reward.service.js
│     └─ wish.service.js
├─ mcp/
│  ├─ index.js
│  ├─ package.json
│  ├─ config.json
│  ├─ actions/
│  │  └─ getVerifyCode.js
│  └─ services/
│     └─ verify.service.js
├─ audit/                    # phase2（预留）
│  ├─ index.js
│  ├─ package.json
│  ├─ config.json
│  ├─ actions/
│  └─ services/
├─ table/                    # 已有：SQL 与 API 规划
│  ├─ init_task_rule.sql
│  ├─ init_audit.sql
│  └─ api-define/
└─ quickstartFunctions/      # 已有：官方示例函数
```

## 3. Action 映射矩阵（37 + 规划/示例补充）
### 3.1 现有 `api.js` 37 个 action 映射
| # | `api.js` 导出 | `callCloud(name, action)` | 归属函数 | 建议文件 | 计划优先级 |
|---|---|---|---|---|---|
| 1 | `login` | `user.login` | `user` | `user/actions/login.js` | P1 |
| 2 | `getFamily` | `user.getFamily` | `user` | `user/actions/getFamily.js` | P0 |
| 3 | `createFamily` | `user.createFamily` | `user` | `user/actions/createFamily.js` | P1 |
| 4 | `joinFamily` | `user.joinFamily` | `user` | `user/actions/joinFamily.js` | P0 |
| 5 | `getChildren` | `user.getChildren` | `user` | `user/actions/getChildren.js` | P0 |
| 6 | `addChild` | `user.addChild` | `user` | `user/actions/addChild.js` | P0 |
| 7 | `editChild` | `user.editChild` | `user` | `user/actions/editChild.js` | P0 |
| 8 | `getChildDetail` | `user.getChildDetail` | `user` | `user/actions/getChildDetail.js` | P1 |
| 9 | `getCoadmins` | `user.getCoadmins` | `user` | `user/actions/getCoadmins.js` | P0 |
| 10 | `addCoadmin` | `user.addCoadmin` | `user` | `user/actions/addCoadmin.js` | P1 |
| 11 | `removeCoadmin` | `user.removeCoadmin` | `user` | `user/actions/removeCoadmin.js` | P0 |
| 12 | `updateDailyLimit` | `user.updateDailyLimit` | `user` | `user/actions/updateDailyLimit.js` | P0 |
| 13 | `getProfile` | `user.getProfile` | `user` | `user/actions/getProfile.js` | P0 |
| 14 | `updateProfile` | `user.updateProfile` | `user` | `user/actions/updateProfile.js` | P0 |
| 15 | `getMcpVerifyCode` | `mcp.getVerifyCode` | `mcp` | `mcp/actions/getVerifyCode.js` | P0 |
| 16 | `getRules` | `task.getRules` | `task` | `task/actions/getRules.js` | P0 |
| 17 | `createRule` | `task.createRule` | `task` | `task/actions/createRule.js` | P0 |
| 18 | `updateRule` | `task.updateRule` | `task` | `task/actions/updateRule.js` | P1 |
| 19 | `toggleRule` | `task.toggleRule` | `task` | `task/actions/toggleRule.js` | P0 |
| 20 | `getTasks` | `task.getTasks` | `task` | `task/actions/getTasks.js` | P0 |
| 21 | `completeTask` | `task.completeTask` | `task` | `task/actions/completeTask.js` | P1 |
| 22 | `submitTask` | `task.submitTask` | `task` | `task/actions/submitTask.js` | P1 |
| 23 | `auditTask` | `task.auditTask` | `task` | `task/actions/auditTask.js` | P1 |
| 24 | `getTaskCompletionOverview` | `task.getTaskCompletionOverview` | `task` | `task/actions/getTaskCompletionOverview.js` | P0 |
| 25 | `getTaskCompletionTimeline` | `task.getTaskCompletionTimeline` | `task` | `task/actions/getTaskCompletionTimeline.js` | P0 |
| 26 | `getTaskCompletionCluster` | `task.getTaskCompletionCluster` | `task` | `task/actions/getTaskCompletionCluster.js` | P1 |
| 27 | `getPointRecords` | `point.getRecords` | `point` | `point/actions/getRecords.js` | P0 |
| 28 | `adjustPoints` | `point.adjustPoints` | `point` | `point/actions/adjustPoints.js` | P1 |
| 29 | `getWeeklyTrend` | `point.getWeeklyTrend` | `point` | `point/actions/getWeeklyTrend.js` | P0 |
| 30 | `getRewards` | `point.getRewards` | `point` | `point/actions/getRewards.js` | P0 |
| 31 | `createReward` | `point.createReward` | `point` | `point/actions/createReward.js` | P1 |
| 32 | `getRewardRequests` | `point.getRewardRequests` | `point` | `point/actions/getRewardRequests.js` | P0 |
| 33 | `redeemReward` | `point.redeemReward` | `point` | `point/actions/redeemReward.js` | P0 |
| 34 | `auditRedeem` | `point.auditRedeem` | `point` | `point/actions/auditRedeem.js` | P0 |
| 35 | `getWishRequests` | `point.getWishRequests` | `point` | `point/actions/getWishRequests.js` | P0 |
| 36 | `submitWish` | `point.submitWish` | `point` | `point/actions/submitWish.js` | P0 |
| 37 | `auditWish` | `point.auditWish` | `point` | `point/actions/auditWish.js` | P0 |

### 3.2 二期 `audit` 规划 action（来自 `api-define`）
`createAuditRequest,getAuditRequest,listAuditRequests,updateAuditRequest,deleteAuditRequest,approveAuditRequest,rejectAuditRequest,assignAuditRequest,listAuditLogs`

### 3.3 `quickstartFunctions` 示例 action（不纳入业务契约）
`getOpenId,getMiniProgramCode,createCollection,selectRecord,updateRecord,insertRecord,deleteRecord`

## 4. 优先级分层（P0/P1/P2）
计划口径（与既有规划对齐）：
- P0（26，页面在用）：  
  `getFamily,joinFamily,getChildren,addChild,editChild,getCoadmins,removeCoadmin,updateDailyLimit,getProfile,updateProfile,getMcpVerifyCode,getRules,createRule,toggleRule,getTasks,getTaskCompletionOverview,getTaskCompletionTimeline,getPointRecords,getWeeklyTrend,getRewards,getRewardRequests,redeemReward,getWishRequests,submitWish,auditRedeem,auditWish`
- P1（11，已导出未调用）：  
  `login,createFamily,getChildDetail,addCoadmin,updateRule,completeTask,submitTask,auditTask,getTaskCompletionCluster,adjustPoints,createReward`
- P2（9，审计规划动作）：  
  `createAuditRequest,getAuditRequest,listAuditRequests,updateAuditRequest,deleteAuditRequest,approveAuditRequest,rejectAuditRequest,assignAuditRequest,listAuditLogs`

当前代码扫描补充（2026-03-27）：
- 新增页面调用 `login`、`createFamily`，实际已演进为 `37/28/9`。  
- 执行层可将这两项从 P1 提前到 P0+，但不影响本结构文档的兼容落地顺序。

## 5. 返回约定（兼容优先）
- 继续沿用当前前端的返回期望，不强制引入统一包裹（如统一改成 `{code,data}`）。
- 保留关键兼容点：
  - `api.login`：返回中应可读到 `user/currentUser,family,currentChildId`。
  - `api.getChildren/getRules/getTasks/getRewards/getWishRequests/getRewardRequests/getPointRecords`：保持数组返回。
  - `api.getMcpVerifyCode`：保持 `{ code: string }`。
  - 多数写接口：保持 `{ success: true/false }` 语义。
- 可新增扩展字段，但不能删改前端已消费的主字段名。
- 时间字段统一使用 ISO 字符串，避免前端日期解析分支增加。

## 6. 命名与文件规范
- 路由入口：`index.js` 只做 `action` 到 handler 的映射，不写业务 SQL/查询细节。
- Action 文件：`actions/<action>.js`，文件名与 `action` 一致，单文件单职责。
- Service 文件：`services/*.service.js`，只做集合读写和跨 action 可复用查询。
- 公共能力：`cloudfunctions/common/` 统一放权限校验、返回包装、错误码、日期与参数校验。
- 每个函数目录保留 `package.json` 和 `config.json`，便于独立部署与依赖管理。
- 审计域（`audit`）先建空壳目录，不在首期业务发布中启用调用。

### 事实来源
- `miniprogram/utils/api.js`
- `docs/api-table-summary.md`
- `docs/interaction-logic-dataflow.md`
- `cloudfunctions/table/api-define/task-rule.crud.json`
- `cloudfunctions/table/api-define/audit-request.crud.json`
- `cloudfunctions/quickstartFunctions/index.js`

