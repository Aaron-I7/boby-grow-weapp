# 增长改造开发拆分（执行清单）

- 日期：2026-03-28
- 范围：P0 首批开工

## A. 信息架构与导航
- [x] A1 父母端 tabBar 从 3 项改为 5 项（总览/任务/审核消息/孩子/我的）
- [x] A2 `onboarding` tab 路由白名单补齐（audit-center/setting）
- [x] A3 dashboard 到 setting/audit-center 改为 `switchTab`
- [x] A4 补齐专用 tab 图标资源（新增 `tab-audit` / `tab-mine`）

## B. 去冗余
- [x] B1 `family-manage` 迁移为兼容跳转页，统一收敛至 setting
- [x] B2 setting 增加“孩子管理与绑定”入口，减少双路径
- [x] B3 `child/submit-wish` 改为兼容跳转页，主入口收敛到 `child/home` 抽屉

## C. 审核消息与红点
- [x] C1 新增 API：`task.getPendingAuditSummary`（前端封装+mock）
- [x] C2 dashboard 用聚合接口拉取待办并同步 tab 红点
- [x] C3 audit-center 页面同步红点状态

## D. 奖励闭环
- [x] D1 新增 API：`point.getRedeemHistory`（前端封装+mock）
- [x] D2 rewards 页面接入“兑换记录”真实列表
- [x] D3 mock `redeemReward/auditRedeem` 补齐请求落库与积分扣减

## E. 成长周报接口准备
- [x] E1 新增 API：`growth.getStreakAndWeeklyDigest`（前端封装+mock）
- [x] E2 云函数 growth 补 action 骨架
- [x] E3 前端周报页面接入（新增 `weekly-report` 页面与 dashboard 摘要卡片）

## F. 云函数联动（非 mock）
- [x] F1 `cloudfunctions/task` 增加 `getPendingAuditSummary`
- [x] F2 `cloudfunctions/point` 增加 `getRedeemHistory`
- [x] F3 `cloudfunctions/growth` 增加 `getStreakAndWeeklyDigest`

## G. 下一批（建议顺序）
1. [x] 连续达标挑战（3/7/14天）
2. [x] 家庭协作提醒（超时待审）
3. [x] 审核中心批量处理的“智能分配建议分”策略
4. [x] 周报导出与家庭分享（已上线分享卡，海报导出待增强）

## H. 数据埋点与实验口径
1. [x] 新增统一埋点工具（自动补齐 `role/childId/familyId/ts/source`）
2. [x] `onboarding_step_completed` 接入 onboarding 状态迁移
3. [x] `audit_turnaround_time` / `reward_loop_closed` 接入审核中心动作
4. [x] `task_cycle_closed` 接入任务审核 API
