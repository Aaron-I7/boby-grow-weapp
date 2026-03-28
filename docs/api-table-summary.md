# 当前项目后台 API 与表结构汇总

更新时间：2026-03-26  
仓库路径：`E:\project\must\boby-grow-weapp`

## 口径与标记
- 全量口径：前端已接线 API + 文档定义 API + quickstart 示例 API + SQL 表结构 + 设计文档云集合。
- 状态标记：
`页面调用` = 已在 `miniprogram/pages` 中被调用。  
`已导出未调用` = 在 `miniprogram/utils/api.js` 导出，但页面暂未调用。  
`未见实现代码` = 仓库未发现对应 `cloudfunctions/user|task|point|mcp` 实现目录。  
`文档定义/规划` = 来自 `cloudfunctions/table/api-define/*.json`。  
`示例` = 来自 `cloudfunctions/quickstartFunctions/index.js`。

---

## 1) API 清单（前端已接线）

来源：`miniprogram/utils/api.js`（共 37 个导出接口）。  
说明：本节全部接口均映射到云函数 `user/task/point/mcp`，但仓库当前未见这些云函数实现代码。

### 1.1 用户/家庭/儿童/协管/MCP

| 接口名称 | 入参 | 出参 |
|---|---|---|
| `api.login -> user.login` `[已导出未调用][未见实现代码]` | 无 | `user/currentUser`, `family`, `currentChildId` |
| `api.getFamily -> user.getFamily` `[页面调用][未见实现代码]` | 无 | `family` 对象 |
| `api.createFamily -> user.createFamily` `[已导出未调用][未见实现代码]` | `data`（如 `name`） | mock: `{"_id","name"}`；云端：`result` |
| `api.joinFamily -> user.joinFamily` `[页面调用][未见实现代码]` | `data`（页面传 `nickname`） | `{"success": true}` |
| `api.getChildren -> user.getChildren` `[页面调用][未见实现代码]` | 无 | `children[]` |
| `api.addChild -> user.addChild` `[页面调用][未见实现代码]` | `data`（昵称、年龄、性别、头像等） | 新增 `child` 对象 |
| `api.editChild -> user.editChild` `[页面调用][未见实现代码]` | `data`（含 `_id` 和更新字段） | `{"success": true}` |
| `api.getChildDetail -> user.getChildDetail` `[已导出未调用][未见实现代码]` | `childId` | `child` 对象 |
| `api.getCoadmins -> user.getCoadmins` `[页面调用][未见实现代码]` | 无 | `coadmins[]` |
| `api.addCoadmin -> user.addCoadmin` `[已导出未调用][未见实现代码]` | `data` | `{"success": true}` |
| `api.removeCoadmin -> user.removeCoadmin` `[页面调用][未见实现代码]` | `userId` | `{"success": true}` |
| `api.updateDailyLimit -> user.updateDailyLimit` `[页面调用][未见实现代码]` | `limit` | `{"success": true}` |
| `api.getProfile -> user.getProfile` `[页面调用][未见实现代码]` | 无 | `profile` 对象 |
| `api.updateProfile -> user.updateProfile` `[页面调用][未见实现代码]` | `data`（昵称、身份、性别、头像等） | mock: `{"success":true,"profile":{...}}`；云端：`result` |
| `api.getMcpVerifyCode -> mcp.getVerifyCode` `[页面调用][未见实现代码]` | `childId` | `{"code": "xxxxxx"}` |

### 1.2 规则/任务

| 接口名称 | 入参 | 出参 |
|---|---|---|
| `api.getRules -> task.getRules` `[页面调用][未见实现代码]` | `category`（可选） | `rules[]` |
| `api.createRule -> task.createRule` `[页面调用][未见实现代码]` | `data`（名称、分类、积分、频率、weekdays、dailyLimit） | 新增 `rule` 对象 |
| `api.updateRule -> task.updateRule` `[已导出未调用][未见实现代码]` | `data`（含 `_id`） | `{"success": true}` |
| `api.toggleRule -> task.toggleRule` `[页面调用][未见实现代码]` | `ruleId`, `enabled` | `{"success": true}` |
| `api.getTasks -> task.getTasks` `[页面调用][未见实现代码]` | `childId`, `date` | `tasks[]`（含完成时间字段补齐） |
| `api.completeTask -> task.completeTask` `[已导出未调用][未见实现代码]` | `taskId` | `{"success": true}` |
| `api.submitTask -> task.submitTask` `[已导出未调用][未见实现代码]` | `taskId` | `{"success": true}` |
| `api.auditTask -> task.auditTask` `[已导出未调用][未见实现代码]` | `taskId`, `approved`, `note` | `{"success": true}` |
| `api.getTaskCompletionOverview -> task.getTaskCompletionOverview` `[页面调用][未见实现代码]` | `params`：`childId`, `startTime`, `endTime` | `{"totalCompleted","categorySummary","taskRanking"}` |
| `api.getTaskCompletionTimeline -> task.getTaskCompletionTimeline` `[页面调用][未见实现代码]` | `params`：`childId`, `startTime`, `endTime`, `pageNo`, `pageSize` | `{"list","total","pageNo","pageSize","hasMore"}` |
| `api.getTaskCompletionCluster -> task.getTaskCompletionCluster` `[已导出未调用][未见实现代码]` | `params`：`childId`, `startTime`, `endTime`, `clusterBy` | `{"clusterBy","buckets","total"}` |

### 1.3 积分/奖励/心愿

| 接口名称 | 入参 | 出参 |
|---|---|---|
| `api.getPointRecords -> point.getRecords` `[页面调用][未见实现代码]` | `childId` | `pointRecords[]` |
| `api.adjustPoints -> point.adjustPoints` `[已导出未调用][未见实现代码]` | `childId`, `amount`, `note` | `{"success": true}` |
| `api.getWeeklyTrend -> point.getWeeklyTrend` `[页面调用][未见实现代码]` | `childId`（可选） | `weeklyTrend[]` |
| `api.getRewards -> point.getRewards` `[页面调用][未见实现代码]` | 无 | `rewards[]` |
| `api.createReward -> point.createReward` `[已导出未调用][未见实现代码]` | `data` | 新增 `reward` 对象 |
| `api.getRewardRequests -> point.getRewardRequests` `[页面调用][未见实现代码]` | `status`（可选） | `rewardRequests[]` |
| `api.redeemReward -> point.redeemReward` `[页面调用][未见实现代码]` | `childId`, `rewardId` | `{"success": true}` |
| `api.auditRedeem -> point.auditRedeem` `[页面调用][未见实现代码]` | `requestId`, `approved`, `note` | `{"success": true}` |
| `api.getWishRequests -> point.getWishRequests` `[页面调用][未见实现代码]` | `status`（可选） | `wishRequests[]` |
| `api.submitWish -> point.submitWish` `[页面调用][未见实现代码]` | `data`（页面传 `name`） | 新增 `wish` 对象 |
| `api.auditWish -> point.auditWish` `[页面调用][未见实现代码]` | `wishId`, `approved`, `suggestedPoints` | `{"success": true}` |

---

## 2) API 清单（文档定义/规划）

来源：`cloudfunctions/table/api-define/task-rule.crud.json`、`cloudfunctions/table/api-define/audit-request.crud.json`。  
状态：`文档定义/规划`（仓库未见对应 `cloudfunctions/task`、`cloudfunctions/audit` 实现代码）。

### 2.1 Task Rule（5）

| 接口名称 | 入参 | 出参 |
|---|---|---|
| `task.createRule` `[文档定义/规划]` | 必填：`familyId,assigneeUserId,name,categoryType,categoryName,points,dailyLimit,frequencyType,createdBy`；可选：`categoryIcon,loopMode,weekdays,enabled` | `{"ruleId","createdAt"}` |
| `task.getRule` `[文档定义/规划]` | `ruleId` | `rule` 明细（含 `weekdays,enabled,confirmedByChild,createdAt,updatedAt`） |
| `task.getRules` `[文档定义/规划]` | 必填：`familyId`；可选：`assigneeUserId,categoryType,enabled,pageNo,pageSize` | `{"list","total","pageNo","pageSize"}` |
| `task.updateRule` `[文档定义/规划]` | 必填：`ruleId,updatedBy`；可选：`assigneeUserId,name,categoryType,categoryName,categoryIcon,points,dailyLimit,frequencyType,loopMode,weekdays,enabled,confirmedByChild` | `{"success": true}` |
| `task.deleteRule` `[文档定义/规划]` | `ruleId,updatedBy` | `{"success": true}` |

### 2.2 Audit Request（9）

| 接口名称 | 入参 | 出参 |
|---|---|---|
| `audit.createAuditRequest` `[文档定义/规划]` | 必填：`familyId,requestType,bizId,title,createdBy`；可选：`applicantChildId,points,assigneeUserId,payloadJson,snapshotJson` | `{"auditId","createdAt"}` |
| `audit.getAuditRequest` `[文档定义/规划]` | `auditId` | `auditRequest` 明细（含 `status,decision*,payloadJson,snapshotJson`） |
| `audit.listAuditRequests` `[文档定义/规划]` | 必填：`familyId`；可选：`status,requestType,assigneeUserId,pageNo,pageSize` | `{"list","total","pageNo","pageSize"}` |
| `audit.updateAuditRequest` `[文档定义/规划]` | 必填：`auditId,updatedBy`；可选：`title,points,assigneeUserId,payloadJson,snapshotJson` | `{"success": true}` |
| `audit.deleteAuditRequest` `[文档定义/规划]` | `auditId,updatedBy` | `{"success": true}` |
| `audit.approveAuditRequest` `[文档定义/规划]` | `auditId,operatorUserId,note?` | `{"success": true}` |
| `audit.rejectAuditRequest` `[文档定义/规划]` | `auditId,operatorUserId,note?` | `{"success": true}` |
| `audit.assignAuditRequest` `[文档定义/规划]` | `auditId,assigneeUserId,operatorUserId,note?,dueAt?` | `{"success": true}` |
| `audit.listAuditLogs` `[文档定义/规划]` | `auditId` | `{"list": AuditActionLog[]}` |

---

## 3) API 清单（quickstart 示例）

来源：`cloudfunctions/quickstartFunctions/index.js`，通过 `event.type` 路由。  
状态：`示例`（与家庭积分业务域无直接绑定）。

| 接口名称 | 入参 | 出参 |
|---|---|---|
| `quickstart.getOpenId` `[示例]` | `{"type":"getOpenId"}` | `{"openid","appid","unionid"}` |
| `quickstart.getMiniProgramCode` `[示例]` | `{"type":"getMiniProgramCode"}` | `fileID`（字符串） |
| `quickstart.createCollection` `[示例]` | `{"type":"createCollection"}` | `{"success": true, "data"?: "create collection success"}` |
| `quickstart.selectRecord` `[示例]` | `{"type":"selectRecord"}` | `db.collection("sales").get()` 结果 |
| `quickstart.updateRecord` `[示例]` | `{"type":"updateRecord","data":[{"_id","sales"}]}` | 成功：`{"success":true,"data":[...]}`；失败：`{"success":false,"errMsg":...}` |
| `quickstart.insertRecord` `[示例]` | `{"type":"insertRecord","data":{"region","city","sales"}}` | 成功：`{"success":true,"data":...}`；失败：`{"success":false,"errMsg":...}` |
| `quickstart.deleteRecord` `[示例]` | `{"type":"deleteRecord","data":{"_id"}}` | 成功：`{"success":true}`；失败：`{"success":false,"errMsg":...}` |

---

## 4) 表结构清单（SQL + 云集合）

### 4.1 SQL 表结构（已定义 SQL）

来源：`cloudfunctions/table/init_task_rule.sql`、`cloudfunctions/table/init_audit.sql`

| 表名 | 字段结构 | 备注 |
|---|---|---|
| `task_rule` | `id, rule_id, family_id, assignee_user_id, name, category_type, category_name, category_icon, points, daily_limit, frequency_type, loop_mode, enabled, confirmed_by_child, created_by, updated_by, created_at, updated_at, deleted_at` | 主任务规则表 |
| `task_rule_weekday` | `id, rule_id, weekday, created_at` | 自定义循环日期子表 |
| `audit_request` | `id, audit_id, family_id, request_type, biz_id, applicant_child_id, title, points, status, assignee_user_id, decision_note, decision_by, decision_at, payload_json, snapshot_json, created_by, updated_by, created_at, updated_at, deleted_at` | 审核主表 |
| `audit_action_log` | `id, audit_id, action_type, operator_user_id, note, before_status, after_status, extra_json, created_at` | 审核动作日志 |
| `audit_assignment` | `id, audit_id, assignee_user_id, assigned_by, assigned_at, due_at, status, note` | 审核分配历史 |
| `audit_notice` | `id, family_id, receiver_user_id, audit_id, notice_type, title, content, is_read, read_at, created_at` | 审核通知 |

### 4.2 云数据库集合结构（设计文档定义）

来源：`DESIGN.md` 第 3 节  
状态：`设计定义`（用于业务模型说明；不等同于已落库 SQL）。

| 集合名 | 字段结构（文档示例） | 备注 |
|---|---|---|
| `families` | `_id, name, creatorOpenId, dailyPointLimit, inviteCode, createdAt` | 家庭档案 |
| `users` | `_id, openId, familyId, role, nickname, avatarUrl, identity, createdAt` | 家长用户 |
| `children` | `_id, familyId, nickname, age, avatarIndex, totalPoints, currentPoints, level, verifyCode, bindOpenId, status, createdAt` | 儿童档案 |
| `rules` | `_id, familyId, category, name, points, dailyLimit, frequency, enabled, confirmedByChild, createdBy, createdAt` | 积分规则 |
| `tasks` | `_id, ruleId, familyId, childId, date, status, completedBy, auditStatus, auditNote, points, createdAt` | 任务实例 |
| `point_records` | `_id, familyId, childId, type, amount, balance, taskId, note, operatorId, createdAt` | 积分流水 |
| `rewards` | `_id, familyId, name, category, cost, redeemLimit, iconIndex, enabled, createdAt` | 奖励定义 |
| `reward_requests` | `_id, familyId, childId, rewardId, status, auditNote, createdAt` | 奖励兑换申请 |
| `wish_requests` | `_id, familyId, childId, name, iconIndex, suggestedPoints, status, createdAt` | 心愿申请 |
| `operation_logs` | 文档仅列出集合名，未给字段示例 | 操作日志 |

### 4.3 quickstart 示例集合

来源：`cloudfunctions/quickstartFunctions/index.js`

| 集合名 | 字段结构 | 备注 |
|---|---|---|
| `sales` | `_id(自动), region, city, sales` | quickstart 示例中 `createCollection/insertRecord/updateRecord/selectRecord/deleteRecord` 使用 |

---

## 校验结果（按执行计划）

- `api.js` 导出接口数量：`37`；本文件已列出：`37`。
- `api-define` action 数量：`task-rule = 5`，`audit-request = 9`；本文件已列出一致。
- SQL `CREATE TABLE` 数量：`6`；本文件已列出一致。
- API 表格统一为三列：`接口名称 / 入参 / 出参`。
