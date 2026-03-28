# 字段含义与使用位置清单

更新时间：2026-03-26  
仓库路径：`E:\project\must\boby-grow-weapp`

## 说明
- 本清单按三类整理：
1. SQL 物理表字段（来自 `cloudfunctions/table/*.sql`）
2. 云集合逻辑字段（来自 `DESIGN.md` 第 3 节）
3. quickstart 示例集合字段（`sales`）
- “使用位置”优先列到代码文件；如果后端未实现，则标注为“仅定义/规划”。

---

## 1) SQL 物理表字段（逐字段）

### 1.1 `task_rule`

来源：`cloudfunctions/table/init_task_rule.sql`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `id` | 自增主键 | 仅 SQL 定义（物理主键） |
| `rule_id` | 业务规则 ID（如 `rule_xxx`） | SQL 定义；`task-rule.crud.json` 的 `ruleId`（创建/查询/更新/删除） |
| `family_id` | 家庭 ID | SQL 定义；`task-rule.crud.json` 的 `familyId`（创建/列表筛选） |
| `assignee_user_id` | 规则分配对象 ID（家长/孩子） | SQL 定义；`task-rule.crud.json` 的 `assigneeUserId` |
| `name` | 任务名称 | SQL 定义；`task-rule.crud.json` 的 `name`；前端 [add-task](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/add-task/index.js) 传入 |
| `category_type` | 分类键（habit/study/chore/custom） | SQL 定义；`task-rule.crud.json` 的 `categoryType` |
| `category_name` | 分类展示名称 | SQL 定义；`task-rule.crud.json` 的 `categoryName` |
| `category_icon` | 分类图标 key | SQL 定义；`task-rule.crud.json` 的 `categoryIcon` |
| `points` | 单次奖励积分 | SQL 定义；`task-rule.crud.json` 的 `points`；前端 [add-task](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/add-task/index.js) 传入 |
| `daily_limit` | 每日可完成次数上限 | SQL 定义；`task-rule.crud.json` 的 `dailyLimit`；前端 [add-task](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/add-task/index.js) 传入 |
| `frequency_type` | 频率类型（loop/once） | SQL 定义；`task-rule.crud.json` 的 `frequencyType` |
| `loop_mode` | 循环模式（daily/custom） | SQL 定义；`task-rule.crud.json` 的 `loopMode` |
| `enabled` | 是否启用 | SQL 定义；`task-rule.crud.json` 的 `enabled`；前端 [task-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/task-manage/index.js) 使用开关语义 |
| `confirmed_by_child` | 是否被孩子确认 | SQL 定义；`task-rule.crud.json` 的 `confirmedByChild` |
| `created_by` | 创建人 ID | SQL 定义；`task-rule.crud.json` 的 `createdBy` |
| `updated_by` | 最近更新人 ID | SQL 定义；`task-rule.crud.json` 的 `updatedBy` |
| `created_at` | 创建时间 | SQL 定义；`task-rule.crud.json` 响应字段 `createdAt` |
| `updated_at` | 更新时间 | SQL 定义；`task-rule.crud.json` 响应字段 `updatedAt` |
| `deleted_at` | 软删除时间 | SQL 定义；`task-rule.crud.json` 的 delete 语义说明 |

### 1.2 `task_rule_weekday`

来源：`cloudfunctions/table/init_task_rule.sql`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `id` | 自增主键 | 仅 SQL 定义 |
| `rule_id` | 对应 `task_rule.rule_id` | SQL 定义；`task-rule.crud.json` 周期子表说明 |
| `weekday` | 周几（1~7） | SQL 定义；`task-rule.crud.json` 的 `weekdays` |
| `created_at` | 创建时间 | SQL 定义 |

### 1.3 `audit_request`

来源：`cloudfunctions/table/init_audit.sql`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `id` | 自增主键 | 仅 SQL 定义 |
| `audit_id` | 审核业务 ID | SQL 定义；`audit-request.crud.json` 的 `auditId` |
| `family_id` | 家庭 ID | SQL 定义；`audit-request.crud.json` 的 `familyId` |
| `request_type` | 审核类型（redeem/wish/task） | SQL 定义；`audit-request.crud.json` 的 `requestType` |
| `biz_id` | 源业务 ID（如 `rr_xxx/wr_xxx/task_xxx`） | SQL 定义；`audit-request.crud.json` 的 `bizId` |
| `applicant_child_id` | 发起申请的孩子 ID | SQL 定义；`audit-request.crud.json` 的 `applicantChildId` |
| `title` | 审核单标题 | SQL 定义；`audit-request.crud.json` 的 `title` |
| `points` | 关联积分值 | SQL 定义；`audit-request.crud.json` 的 `points` |
| `status` | 审核状态（pending/approved/rejected/canceled） | SQL 定义；`audit-request.crud.json` 的 `status` |
| `assignee_user_id` | 当前审核人 ID | SQL 定义；`audit-request.crud.json` 的 `assigneeUserId` |
| `decision_note` | 审核意见 | SQL 定义；`audit-request.crud.json` 的 `decisionNote` |
| `decision_by` | 审核操作者 ID | SQL 定义；`audit-request.crud.json` 的 `decisionBy` |
| `decision_at` | 审核时间 | SQL 定义；`audit-request.crud.json` 的 `decisionAt` |
| `payload_json` | 请求快照 | SQL 定义；`audit-request.crud.json` 的 `payloadJson` |
| `snapshot_json` | 展示快照 | SQL 定义；`audit-request.crud.json` 的 `snapshotJson` |
| `created_by` | 创建人 ID | SQL 定义；`audit-request.crud.json` 的 `createdBy` |
| `updated_by` | 最近更新人 ID | SQL 定义；`audit-request.crud.json` 的 `updatedBy` |
| `created_at` | 创建时间 | SQL 定义；`audit-request.crud.json` 的 `createdAt` |
| `updated_at` | 更新时间 | SQL 定义；`audit-request.crud.json` 的 `updatedAt` |
| `deleted_at` | 软删除时间 | SQL 定义；`audit-request.crud.json` 的 delete 语义说明 |

### 1.4 `audit_action_log`

来源：`cloudfunctions/table/init_audit.sql`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `id` | 自增主键 | 仅 SQL 定义 |
| `audit_id` | 对应审核单业务 ID | SQL 定义；`audit-request.crud.json` 的 `listAuditLogs`、dbFlow |
| `action_type` | 操作类型（create/approve/reject/reassign/revoke/cancel） | SQL 定义；`audit-request.crud.json` 各 action 的 dbFlow |
| `operator_user_id` | 操作者用户 ID | SQL 定义；`audit-request.crud.json` 的 `operatorUserId` 语义映射 |
| `note` | 操作备注 | SQL 定义；`audit-request.crud.json` 的 `note` |
| `before_status` | 操作前状态 | 仅 SQL 定义/日志语义 |
| `after_status` | 操作后状态 | 仅 SQL 定义/日志语义 |
| `extra_json` | 扩展信息 | SQL 定义；`audit-request.crud.json` 日志对象语义 |
| `created_at` | 创建时间 | SQL 定义；`listAuditLogs` 返回按时间倒序 |

### 1.5 `audit_assignment`

来源：`cloudfunctions/table/init_audit.sql`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `id` | 自增主键 | 仅 SQL 定义 |
| `audit_id` | 对应审核单业务 ID | SQL 定义；`assignAuditRequest` dbFlow |
| `assignee_user_id` | 被分配审核人 ID | SQL 定义；`assignAuditRequest` 的 `assigneeUserId` |
| `assigned_by` | 分配人 ID | SQL 定义；`assignAuditRequest` 的 `operatorUserId` 语义映射 |
| `assigned_at` | 分配时间 | 仅 SQL 定义 |
| `due_at` | 截止时间 | SQL 定义；`assignAuditRequest` 的 `dueAt` |
| `status` | 分配状态（assigned/accepted/done/canceled） | 仅 SQL 定义 |
| `note` | 分配备注 | SQL 定义；`assignAuditRequest` 的 `note` |

### 1.6 `audit_notice`

来源：`cloudfunctions/table/init_audit.sql`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `id` | 自增主键 | 仅 SQL 定义 |
| `family_id` | 家庭 ID | SQL 定义；`audit-request.crud.json` 通知 dbFlow |
| `receiver_user_id` | 接收通知用户 ID | SQL 定义；通知发送语义 |
| `audit_id` | 对应审核单业务 ID | SQL 定义；`approve/reject/assign` dbFlow |
| `notice_type` | 通知类型（created/pending/approved/rejected/remind/assign） | SQL 定义；`audit-request.crud.json` dbFlow |
| `title` | 通知标题 | SQL 定义 |
| `content` | 通知内容 | SQL 定义 |
| `is_read` | 已读标记 | SQL 定义 |
| `read_at` | 已读时间 | SQL 定义 |
| `created_at` | 创建时间 | SQL 定义 |

---

## 2) 云集合逻辑字段（逐集合）

来源：`DESIGN.md` 第 3 节。  
说明：当前后端集合实现代码未入库，以下“使用位置”主要来自前端 mock 数据与 API 封装。

### 2.1 `families`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id` | 家庭 ID | 定义：`DESIGN.md`、`miniprogram/utils/mock.js`；使用：`miniprogram/utils/api.js`（`login/createFamily`）、`app.globalData.familyId` |
| `name` | 家庭名称 | 使用：`api.getFamily`，页面 [setting](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/setting/index.js)、[family-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/family-manage/index.js) |
| `creatorOpenId` | 家庭创建者 openId | 定义/样例：`DESIGN.md`、`mock.js` |
| `dailyPointLimit` | 每日积分上限 | 使用：`api.updateDailyLimit`，页面 [daily-limit](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/daily-limit/index.js)、[setting](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/setting/index.js) |
| `inviteCode` | 家庭邀请码 | 定义/样例：`DESIGN.md`、`mock.js` |
| `createdAt` | 创建时间 | 样例：`mock.js` |

### 2.2 `users`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id` | 用户 ID | 使用：`api.getCoadmins/removeCoadmin`、`api.getProfile/updateProfile` |
| `openId` | 微信 openId | 定义/样例：`DESIGN.md`、`mock.js` |
| `familyId` | 所属家庭 ID | 定义/样例：`DESIGN.md`、`mock.js` |
| `role` | 角色（admin/coadmin） | 使用：页面 [coadmin-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/coadmin-manage/index.js) 显示角色文案 |
| `nickname` | 用户昵称 | 使用：`api.login/getProfile/updateProfile`，页面 [profile-edit](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/profile-edit/index.js) |
| `avatarUrl` | 头像 URL | 使用：`avatar.resolveAvatar`，页面 [coadmin-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/coadmin-manage/index.js)、[profile-edit](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/profile-edit/index.js) |
| `identity` | 身份（dad/mom/...） | 使用：页面 [coadmin-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/coadmin-manage/index.js)、[profile-edit](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/profile-edit/index.js) |
| `createdAt` | 创建时间 | 样例：`mock.js` |

### 2.3 `children`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id` | 孩子 ID | 使用：`api.getChildren/getChildDetail/getMcpVerifyCode/getTasks/getPointRecords`；多个页面用作 child 切换主键 |
| `familyId` | 所属家庭 ID | 定义/样例：`DESIGN.md`、`mock.js` |
| `nickname` | 孩子昵称 | 页面 [dashboard](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/dashboard/index.js)、[child-home](E:/project/must/boby-grow-weapp/miniprogram/pages/child/home/index.js)、[mcp-verify](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/mcp-verify/index.js) |
| `age` | 年龄 | 页面 [add-child](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/add-child/index.js)、[child-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/child-manage/index.js) 编辑 |
| `avatarIndex` | 头像序号 | `avatar` 工具解析；页面 add/edit child 上传参 |
| `avatarKey` | 头像 key | 使用：`avatar.resolveAvatar`；页面 add/edit child、profile 展示 |
| `avatarUrl` | 头像地址 | 使用：导航头像、孩子卡片头像、审核页头像 |
| `totalPoints` | 历史累计积分 | 页面 add child 初始化；数据样例在 `mock.js` |
| `currentPoints` | 当前可用积分 | 页面 [dashboard](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/dashboard/index.js)、[child-home](E:/project/must/boby-grow-weapp/miniprogram/pages/child/home/index.js)、[rewards](E:/project/must/boby-grow-weapp/miniprogram/pages/child/rewards/index.js) |
| `level` | 孩子等级 | 页面 [child-profiles](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/child-profiles/index.js) |
| `verifyCode` | MCP 核验码 | `api.getMcpVerifyCode`；页面 [mcp-verify](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/mcp-verify/index.js) |
| `bindOpenId` | 绑定 openId | 定义/样例：`DESIGN.md`、`mock.js` |
| `status` | 档案状态（active/archived） | 定义/样例：`DESIGN.md`、`mock.js` |
| `createdAt` | 创建时间 | 样例：`mock.js` |

### 2.4 `rules`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id` | 规则 ID | 使用：`api.toggleRule(ruleId)`；页面 [task-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/task-manage/index.js) |
| `familyId` | 所属家庭 ID | 样例：`mock.js` |
| `category` | 任务分类 | 页面 task-manage 分类筛选；add-task 提交 |
| `name` | 规则名称 | 页面 task-manage 展示；add-task 提交 |
| `points` | 奖励积分 | 页面 task-manage 展示；add-task 提交 |
| `dailyLimit` | 每日次数限制 | 页面 add-task 提交 |
| `frequency` | 执行频率（daily/weekly/once/custom） | 页面 add-task 提交 |
| `enabled` | 是否启用 | 页面 task-manage 开关 |
| `confirmedByChild` | 是否被孩子确认 | 样例与接口返回语义 |
| `createdBy` | 创建人 | 样例：`mock.js` |
| `createdAt` | 创建时间 | 样例：`mock.js` |

### 2.5 `tasks`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id` | 任务实例 ID | 页面列表 `wx:key`；`completeTask/submitTask/auditTask` 参数 |
| `ruleId` | 关联规则 ID | `api.getTaskCompletion*` 聚合与时间线使用 |
| `familyId` | 家庭 ID | 样例：`mock.js` |
| `childId` | 孩子 ID | `api.getTasks(childId,date)` 查询条件 |
| `date` | 任务日期 | `api.getTasks` 查询条件；时间线结果返回 |
| `status` | 完成状态（pending/completed/rejected） | 页面 [child-home](E:/project/must/boby-grow-weapp/miniprogram/pages/child/home/index.js)、[dashboard](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/dashboard/index.js) |
| `completedBy` | 完成人 | `api.markTaskCompleted` 与 mock 记录 |
| `completedAt` | 完成时间 | `api.getTaskCompletionTimeline`、页面 [child-profiles](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/child-profiles/index.js) |
| `completedDateKey` | 完成日期键 | overview/timeline 聚合分组 |
| `auditStatus` | 审核状态（none/pending/approved/rejected） | 页面 [submit-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/child/submit-manage/index.js) |
| `auditNote` | 审核备注 | `api.auditTask` 写入；样例：`mock.js` |
| `points` | 任务积分 | 页面任务卡与档案时间线显示 |
| `ruleName` | 规则名称快照 | 页面 child-home、submit-manage、child-profiles |
| `category` | 分类快照 | 页面 child-home 图标、child-profiles 统计 |
| `createdAt` | 创建时间 | 页面 submit-manage 显示时间 |

### 2.6 `point_records`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id` | 流水 ID | 页面 [point-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/child/point-manage/index.js) `wx:key` |
| `familyId` | 家庭 ID | 样例：`mock.js` |
| `childId` | 孩子 ID | `api.getPointRecords(childId)` 查询条件 |
| `type` | 流水类型（task/manual/redeem） | 样例：`mock.js`；业务语义字段 |
| `amount` | 变动积分（正负） | 页面 point-manage 统计与正负样式 |
| `balance` | 变动后余额 | 样例：`mock.js` |
| `taskId` | 关联任务 ID | 样例：`mock.js` |
| `note` | 备注 | 页面 point-manage 展示 |
| `operatorId` | 操作者 ID | 样例：`mock.js` |
| `createdAt` | 创建时间 | 页面 point-manage 时间展示 |

### 2.7 `rewards`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id` | 奖励 ID | `api.redeemReward(childId,rewardId)` 参数 |
| `familyId` | 家庭 ID | 样例：`mock.js` |
| `name` | 奖励名称 | 页面 [child/rewards](E:/project/must/boby-grow-weapp/miniprogram/pages/child/rewards/index.js) |
| `category` | 奖励分类 | 样例：`mock.js` |
| `cost` | 兑换所需积分 | rewards 页积分比较与确认文案 |
| `redeemLimit` | 兑换上限 | 样例：`mock.js` |
| `iconIndex` | 图标索引 | 样例：`mock.js` |
| `enabled` | 是否启用 | 样例：`mock.js` |
| `createdAt` | 创建时间 | 样例：`mock.js` |

### 2.8 `reward_requests`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id` | 兑换申请 ID | `api.auditRedeem(requestId,...)` 参数；审核页主键 |
| `familyId` | 家庭 ID | 样例：`mock.js` |
| `childId` | 申请孩子 ID | 审核页通过 `childMap` 关联孩子信息 |
| `rewardId` | 关联奖励 ID | 样例：`mock.js` |
| `rewardName` | 奖励名称快照 | 审核页 `mapRewardItem` 标题展示 |
| `cost` | 兑换积分 | 审核页展示 |
| `status` | 申请状态（pending/approved/rejected） | 审核页状态章；dashboard 待审计数 |
| `auditNote` | 审核备注 | 样例：`mock.js`；`api.auditRedeem` 语义 |
| `createdAt` | 创建时间 | 样例：`mock.js` |

### 2.9 `wish_requests`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id` | 心愿申请 ID | `api.auditWish(wishId,...)` 参数；审核页主键 |
| `familyId` | 家庭 ID | 样例：`mock.js` |
| `childId` | 申请孩子 ID | 审核页关联孩子昵称/头像 |
| `name` | 心愿名称 | 页面 [submit-wish](E:/project/must/boby-grow-weapp/miniprogram/pages/child/submit-wish/index.js) 提交；审核页展示 |
| `iconIndex` | 图标索引 | submit-wish 提交；样例：`mock.js` |
| `suggestedPoints` | 建议积分 | 审核页显示与审批输入默认值 |
| `status` | 状态（pending/approved/rejected） | 审核页状态章；dashboard 待审计数 |
| `createdAt` | 创建时间 | 样例：`mock.js` |

### 2.10 `operation_logs`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id`/其它字段 | 操作日志记录 | `DESIGN.md` 仅列集合名；当前仓库未给字段样例，未见实际代码读写 |

---

## 3) quickstart 示例集合字段（`sales`）

来源：`cloudfunctions/quickstartFunctions/index.js`

| 字段 | 含义 | 所用的地方 |
|---|---|---|
| `_id` | 文档 ID（数据库自动生成） | `updateRecord/deleteRecord` 按 `_id` 更新/删除 |
| `region` | 区域 | `createCollection/insertRecord` 写入 |
| `city` | 城市 | `createCollection/insertRecord` 写入 |
| `sales` | 销售值（数值） | `createCollection/insertRecord` 写入；`updateRecord` 更新；`selectRecord` 查询 |

---

## 4) 现状结论（便于后续开发）

1. 物理表字段已完整定义在 SQL，但核心业务云函数实现目录（`user/task/point/mcp/audit`）尚未入库。  
2. 云集合字段在前端侧主要通过 `mock.js + api.js` 运行，页面层已形成稳定字段消费模式。  
3. 若后续从 mock 切换到真实后端，建议优先对齐：
`rules/tasks/point_records/reward_requests/wish_requests` 这 5 组字段与接口返回。

