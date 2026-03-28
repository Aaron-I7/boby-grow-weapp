# 页面交互逻辑、用户交互逻辑与后端数据流

更新时间：2026-03-26  
适用仓库：`E:\project\must\boby-grow-weapp`

## 0. 当前运行前提

1. 小程序当前默认 `useMock=true`（见 [app.js](E:/project/must/boby-grow-weapp/miniprogram/app.js)）。
2. 这意味着当前交互主要读写 `miniprogram/utils/mock.js` 内存数据。
3. 当切换 `useMock=false` 时，前端会调用 `user/task/point/mcp` 云函数 action；但仓库中暂未看到这些云函数实现目录（仅有 quickstart 示例和 SQL/API 定义文档）。

---

## 1. 页面交互逻辑（按页面）

## 1.1 公共入口页

| 页面 | 主要交互 | 调用 API | 后端数据变化 |
|---|---|---|---|
| [pages/index](E:/project/must/boby-grow-weapp/miniprogram/pages/index/index.js) | 进入工作台（跳转） | 无 | 无 |
| [pages/join-family](E:/project/must/boby-grow-weapp/miniprogram/pages/join-family/index.js) | 输入昵称并加入家庭 | `api.joinFamily({nickname})` | 当前 mock：仅返回 `success`，无实际数据写入；云端预期：新增/更新家庭成员关系（`users/family_membership` 类数据） |

## 1.2 家长端页面

| 页面 | 主要交互 | 调用 API | 后端数据变化 |
|---|---|---|---|
| [parent/dashboard](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/dashboard/index.js) | 看孩子任务、积分趋势、待审核数；切换孩子 | `getChildren/getTasks/getWeeklyTrend/getRewardRequests/getWishRequests` | 读操作，无写入 |
| [parent/task-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/task-manage/index.js) | 查看规则、分类筛选、启停规则 | `getChildren/getRules/toggleRule` | `toggleRule`：更新规则启用状态（`rules.enabled` 或 `task_rule.enabled`） |
| [parent/add-task](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/add-task/index.js) | 配置任务名称、分类、积分、频率并保存 | `createRule` | 新增规则（当前模型：`rules`；规划模型：`task_rule + task_rule_weekday`） |
| [parent/audit-center](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/audit-center/index.js) | 审核奖励兑换、审核心愿 | `getChildren/getRewardRequests/getWishRequests/auditRedeem/auditWish` | `auditRedeem`：更新 `reward_requests.status`；`auditWish`：更新 `wish_requests.status/suggestedPoints` |
| [parent/child-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/child-manage/index.js) | 查看孩子列表、编辑孩子资料 | `getChildren/editChild` | 更新 `children`（昵称/年龄/性别/头像等） |
| [parent/add-child](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/add-child/index.js) | 新增孩子档案 | `addChild` | 新增 `children` 记录（含初始积分） |
| [parent/child-profiles](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/child-profiles/index.js) | 查看完成概览和时间线 | `getChildren/getTaskCompletionOverview/getTaskCompletionTimeline` | 读操作，无写入 |
| [parent/family-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/family-manage/index.js) | 查看家庭信息，跳转管理项 | `getFamily` | 读操作，无写入 |
| [parent/coadmin-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/coadmin-manage/index.js) | 查看协管，移除协管 | `getCoadmins/removeCoadmin` | 当前 mock：`removeCoadmin` 仅返回 `success`；云端预期：更新协管关系（`users.role` 或成员关系表） |
| [parent/daily-limit](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/daily-limit/index.js) | 查看并保存每日积分上限 | `getFamily/getChildren/getWeeklyTrend/updateDailyLimit` | 更新 `families.dailyPointLimit` |
| [parent/setting](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/setting/index.js) | 查看家庭基础信息，跳转设置项 | `getFamily` | 读操作，无写入 |
| [parent/profile-edit](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/profile-edit/index.js) | 修改昵称/身份/性别/头像 | `getProfile/updateProfile` | 更新当前用户资料（`users.nickname/identity/gender/avatar*`） |
| [parent/mcp-verify](E:/project/must/boby-grow-weapp/miniprogram/pages/parent/mcp-verify/index.js) | 选择孩子并查看核验码 | `getChildren/getMcpVerifyCode` | 读操作，无写入 |

## 1.3 儿童端页面

| 页面 | 主要交互 | 调用 API | 后端数据变化 |
|---|---|---|---|
| [child/home](E:/project/must/boby-grow-weapp/miniprogram/pages/child/home/index.js) | 查看我的任务和积分 | `getChildren/getTasks` | 读操作，无写入 |
| [child/point-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/child/point-manage/index.js) | 查看积分流水和累计获得 | `getChildren/getPointRecords` | 读操作，无写入 |
| [child/rewards](E:/project/must/boby-grow-weapp/miniprogram/pages/child/rewards/index.js) | 浏览奖励并提交兑换申请 | `getChildren/getRewards/redeemReward` | 当前 mock：`redeemReward` 仅返回 `success`；云端预期：新增 `reward_requests`（`status=pending`） |
| [child/submit-manage](E:/project/must/boby-grow-weapp/miniprogram/pages/child/submit-manage/index.js) | 查看任务审核状态 | `getChildren/getTasks` | 读操作，无写入 |
| [child/submit-wish](E:/project/must/boby-grow-weapp/miniprogram/pages/child/submit-wish/index.js) | 提交心愿 | `submitWish` | 新增 `wish_requests`（`status=pending`） |

---

## 2. 不同用户之间的交互逻辑

来源：页面实现 + [DESIGN.md 权限矩阵](E:/project/must/boby-grow-weapp/DESIGN.md)。

## 2.1 角色定义

1. 主家长（admin）
2. 协管家长（coadmin）
3. 儿童
4. MCP 外部查询方（只读）

## 2.2 关键跨用户交互链路

### 链路 A：家长建规则 -> 孩子执行 -> 双方查看结果
1. 主家长在 add-task 创建规则（`createRule`）。
2. 孩子在 child/home 读取当日任务（`getTasks`）。
3. 家长在 dashboard/child-profiles 查看完成结果与趋势（`getTasks/getTaskCompletion*`）。
4. 产生数据：规则新增（写）；任务/统计读取（读）。

### 链路 B：孩子发起奖励兑换 -> 家长审核
1. 孩子在 child/rewards 发起兑换（`redeemReward`）。
2. 家长在 audit-center 看到待审兑换（`getRewardRequests`）。
3. 家长审批通过/驳回（`auditRedeem`）。
4. 产生数据：预期“申请新增 + 审核状态更新”；当前 mock 里“申请新增”未落地（仅返回成功）。

### 链路 C：孩子提交心愿 -> 家长设积分并审核
1. 孩子在 submit-wish 提交心愿（`submitWish`）。
2. 家长在 audit-center 查看心愿（`getWishRequests`）。
3. 家长输入建议积分并通过/驳回（`auditWish`）。
4. 产生数据：`wish_requests` 新增，后续更新 `status/suggestedPoints`。

### 链路 D：家长维护孩子档案 -> 所有页面同步显示
1. 主家长新增/编辑孩子（`addChild/editChild`）。
2. 家长端导航头像、孩子列表、档案页同步更新（`getChildren`）。
3. 儿童端首页、积分页、兑换页也基于同一 child 数据读取。
4. 产生数据：`children` 新增或更新，多页面读一致。

### 链路 E：家长设置积分上限 -> 任务激励策略变化
1. 主家长在 daily-limit 更新上限（`updateDailyLimit`）。
2. dashboard/setting/family-manage 读取并展示（`getFamily`）。
3. 产生数据：`families.dailyPointLimit` 更新（策略参数变更）。

### 链路 F：MCP 只读查询
1. 主家长在 mcp-verify 获取孩子核验码（`getMcpVerifyCode`）。
2. 外部 MCP 工具凭核验码做只读查询（设计定义）。
3. 产生数据：当前仅读取 `children.verifyCode`，无写入。

---

## 3. 每次交互产生的后端数据（写操作总表）

说明：同时给出“当前仓库实际（mock）”与“云端目标（按设计/SQL）”。

| 交互动作 | 执行人 | 页面/API | 当前仓库实际写入（useMock=true） | 云端目标写入（useMock=false 期望） |
|---|---|---|---|---|
| 加入家庭 | 家长/协管 | join-family / `joinFamily` | 无（仅 success） | 成员关系写入（用户加入家庭） |
| 新增孩子 | 主家长 | add-child / `addChild` | `mock.children.push(...)` | `children` 新增一条 |
| 编辑孩子 | 主家长 | child-manage / `editChild` | 更新 `mock.children[idx]` | `children` 按 `_id` 更新 |
| 创建任务规则 | 主家长 | add-task / `createRule` | `mock.rules.push(...)` | 方案A：`rules` 新增；方案B：`task_rule(+task_rule_weekday)` 新增 |
| 启停任务规则 | 主家长 | task-manage / `toggleRule` | 更新 `mock.rules[*].enabled` | `rules.enabled` 或 `task_rule.enabled` 更新 |
| 审核兑换申请 | 主家长 | audit-center / `auditRedeem` | 更新 `mock.rewardRequests[*].status` | `reward_requests.status` 更新（并可联动积分流水） |
| 提交心愿 | 儿童 | submit-wish / `submitWish` | `mock.wishRequests.push(...)` | `wish_requests` 新增一条 |
| 审核心愿 | 主家长 | audit-center / `auditWish` | 更新 `mock.wishRequests[*].status/suggestedPoints` | `wish_requests.status/suggestedPoints` 更新 |
| 兑换奖励申请 | 儿童 | rewards / `redeemReward` | 无（仅 success） | 预期新增 `reward_requests(status=pending)` |
| 修改每日上限 | 主家长 | daily-limit / `updateDailyLimit` | 更新 `mock.family.dailyPointLimit` | `families.dailyPointLimit` 更新 |
| 修改个人资料 | 主家长/协管 | profile-edit / `updateProfile` | 更新当前 `mock.users` 资料 | `users` 当前用户资料更新 |
| 移除协管 | 主家长 | coadmin-manage / `removeCoadmin` | 无（仅 success） | 协管关系移除/角色变更 |

---

## 4. 读操作主表（便于接口分层）

| 数据域 | 主要读取 API | 典型页面 |
|---|---|---|
| 家庭信息 | `getFamily` | setting/family-manage/daily-limit |
| 孩子档案 | `getChildren/getChildDetail` | dashboard/task-manage/child-manage/child-home/mcp-verify |
| 任务规则 | `getRules` | task-manage |
| 任务实例与完成统计 | `getTasks/getTaskCompletionOverview/getTaskCompletionTimeline` | child-home/submit-manage/dashboard/child-profiles |
| 积分流水与趋势 | `getPointRecords/getWeeklyTrend` | point-manage/dashboard/daily-limit |
| 奖励与申请 | `getRewards/getRewardRequests` | child/rewards、parent/audit-center |
| 心愿申请 | `getWishRequests` | parent/audit-center/dashboard |
| 个人资料 | `getProfile` | profile-edit |
| MCP核验码 | `getMcpVerifyCode` | mcp-verify |

---

## 5. 当前可见差异与风险点

1. `redeemReward/removeCoadmin/joinFamily` 在 mock 模式下无真实数据落库，前端看起来成功但不会改变 mock 数据。  
2. `createRule` 当前前端字段是 `category/frequency` 形态，而 SQL 规划是 `category_type/frequency_type/loop_mode`，存在字段映射层待补。  
3. `completeTask/submitTask/auditTask/adjustPoints` 已有 API 封装但页面未接线，任务完成与积分发放链路仍偏“展示/规划态”。  
4. `cloudfunctions/user|task|point|mcp|audit` 实现目录未见入库，当前更多依赖 mock + 设计文档。

