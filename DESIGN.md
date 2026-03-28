# 家庭版儿童积分管理微信小程序 — 技术设计文档

> 基于 PRD V1.0 + 原型 20 屏整理，面向开发落地

---

## 一、技术架构总览

```
┌─────────────────────────────────────────────────┐
│              微信小程序前端 (miniprogram/)        │
│  ┌──────────────┐  ┌──────────────┐             │
│  │  家长端页面   │  │  儿童端页面   │             │
│  │  parent-*    │  │  child-*     │             │
│  └──────┬───────┘  └──────┬───────┘             │
│         └────────┬────────┘                     │
│           公共组件 / 工具库 / 状态管理             │
├─────────────────────────────────────────────────┤
│              微信云开发 (cloudfunctions/)         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ │
│  │ 用户   │ │ 任务   │ │ 积分   │ │ MCP查询  │ │
│  │ 管理   │ │ 管理   │ │ 管理   │ │ 接口     │ │
│  └────────┘ └────────┘ └────────┘ └──────────┘ │
├─────────────────────────────────────────────────┤
│              云数据库 (集合设计见下文)             │
└─────────────────────────────────────────────────┘
```

**技术选型**：微信小程序原生开发 + 微信云开发（云函数 + 云数据库 + 云存储）

---

## 二、页面路由与目录结构

### 2.1 页面清单（对应原型 20 屏）

| 分组 | 页面路径 | 原型文件 | 说明 |
|------|---------|---------|------|
| **家长端** | pages/parent/dashboard/index | parent-dashboard | 家长工作台首页 |
| | pages/parent/task-manage/index | parent-task-manage | 任务管理列表 |
| | pages/parent/add-task/index | parent-add-task / parent-add-task-success | 新建任务（含成功弹窗） |
| | pages/parent/audit-center/index | parent-audit-center | 审核中心（奖励+心愿） |
| | pages/parent/child-manage/index | parent-child-manage | 孩子管理列表 |
| | pages/parent/add-child/index | parent-add-child | 新增孩子档案 |
| | pages/parent/child-profiles/index | parent-child-profiles | 孩子成长档案详情 |
| | pages/parent/family-manage/index | parent-family-manage | 家庭管理 |
| | pages/parent/coadmin-manage/index | parent-coadmin-manage | 协管员管理 |
| | pages/parent/daily-limit/index | parent-daily-limit | 每日积分上限设置 |
| | pages/parent/setting/index | parent-setting | 设置页 |
| | pages/parent/profile-edit/index | parent-profile-edit | 个人信息编辑 |
| | pages/parent/mcp-verify/index | mcp-verify-code | MCP核验码查看 |
| **儿童端** | pages/child/home/index | child-home | 儿童首页 |
| | pages/child/point-manage/index | child-point-manage | 积分明细 |
| | pages/child/rewards/index | child-rewards | 奖励商城 |
| | pages/child/submit-manage/index | child-submit-manage | 任务审核状态 |
| | pages/child/submit-wish/index | child-submit-wish | 提交心愿 |
| **公共** | pages/join-family/index | join-family | 加入家庭邀请页 |

### 2.2 推荐目录结构

```
miniprogram/
├── app.js / app.json / app.wxss
├── pages/
│   ├── parent/          # 家长端 13 个页面
│   │   ├── dashboard/
│   │   ├── task-manage/
│   │   ├── add-task/
│   │   ├── audit-center/
│   │   ├── child-manage/
│   │   ├── add-child/
│   │   ├── child-profiles/
│   │   ├── family-manage/
│   │   ├── coadmin-manage/
│   │   ├── daily-limit/
│   │   ├── setting/
│   │   ├── profile-edit/
│   │   └── mcp-verify/
│   ├── child/           # 儿童端 5 个页面
│   │   ├── home/
│   │   ├── point-manage/
│   │   ├── rewards/
│   │   ├── submit-manage/
│   │   └── submit-wish/
│   └── join-family/     # 公共页面
├── components/          # 公共组件
│   ├── tab-bar/         # 自定义底部导航
│   ├── child-selector/  # 孩子切换选择器
│   ├── confirm-dialog/  # 二次确认弹窗
│   ├── point-badge/     # 积分徽章展示
│   ├── task-card/       # 任务卡片
│   ├── reward-card/     # 奖励卡片
│   └── empty-state/     # 空状态占位
├── utils/
│   ├── db.js            # 云数据库操作封装
│   ├── auth.js          # 权限校验工具
│   ├── format.js        # 日期/积分格式化
│   └── constants.js     # 常量定义
├── styles/
│   ├── variables.wxss   # 全局CSS变量
│   ├── parent-theme.wxss
│   └── child-theme.wxss
└── images/              # 本地图标资源
```

---

## 三、云数据库集合设计

### 3.1 集合总览

```
families          — 家庭档案
users             — 用户（家长）
children          — 儿童档案
rules             — 积分规则
tasks             — 任务实例
point_records     — 积分流水
rewards           — 奖励定义
reward_requests   — 奖励兑换申请
wish_requests     — 心愿申请
operation_logs    — 操作日志
```

### 3.2 核心集合字段

**families**
```json
{
  "_id": "family_xxx",
  "name": "小明的家",
  "creatorOpenId": "oXXX",
  "dailyPointLimit": 500,
  "inviteCode": "ABC123",
  "createdAt": "2026-03-24T00:00:00Z"
}
```

**users（家长）**
```json
{
  "_id": "user_xxx",
  "openId": "oXXX",
  "familyId": "family_xxx",
  "role": "admin | coadmin",
  "nickname": "爸爸",
  "avatarUrl": "",
  "identity": "dad | mom | grandpa | grandma | other",
  "createdAt": ""
}
```

**children（儿童档案，核心）**
```json
{
  "_id": "child_xxx",
  "familyId": "family_xxx",
  "nickname": "小明",
  "age": 7,
  "avatarIndex": 2,
  "totalPoints": 1500,
  "currentPoints": 1500,
  "level": 3,
  "verifyCode": "888666",
  "bindOpenId": null,
  "status": "active | archived",
  "createdAt": ""
}
```

**rules（积分规则）**
```json
{
  "_id": "rule_xxx",
  "familyId": "family_xxx",
  "category": "habit | study | chore | virtue",
  "name": "按时刷牙",
  "points": 10,
  "dailyLimit": 2,
  "frequency": "daily | weekly | once",
  "enabled": true,
  "confirmedByChild": false,
  "createdBy": "user_xxx",
  "createdAt": ""
}
```

**tasks（任务实例）**
```json
{
  "_id": "task_xxx",
  "ruleId": "rule_xxx",
  "familyId": "family_xxx",
  "childId": "child_xxx",
  "date": "2026-03-24",
  "status": "pending | completed | rejected",
  "completedBy": "user_xxx | child_xxx",
  "auditStatus": "none | pending | approved | rejected",
  "auditNote": "",
  "points": 10,
  "createdAt": ""
}
```

**point_records（积分流水）**
```json
{
  "_id": "pr_xxx",
  "familyId": "family_xxx",
  "childId": "child_xxx",
  "type": "task | manual | redeem",
  "amount": 10,
  "balance": 1510,
  "taskId": "task_xxx",
  "note": "按时刷牙",
  "operatorId": "user_xxx",
  "createdAt": ""
}
```

**rewards（奖励定义）**
```json
{
  "_id": "reward_xxx",
  "familyId": "family_xxx",
  "name": "去公园玩",
  "category": "companion | privilege | physical",
  "cost": 500,
  "redeemLimit": 1,
  "iconIndex": 0,
  "enabled": true,
  "createdAt": ""
}
```

**reward_requests（兑换申请）**
```json
{
  "_id": "rr_xxx",
  "familyId": "family_xxx",
  "childId": "child_xxx",
  "rewardId": "reward_xxx",
  "status": "pending | approved | rejected",
  "auditNote": "",
  "createdAt": ""
}
```

**wish_requests（心愿申请）**
```json
{
  "_id": "wr_xxx",
  "familyId": "family_xxx",
  "childId": "child_xxx",
  "name": "想要一个足球",
  "iconIndex": 0,
  "suggestedPoints": null,
  "status": "pending | approved | rejected",
  "createdAt": ""
}
```

### 3.3 索引建议

| 集合 | 索引字段 | 用途 |
|------|---------|------|
| children | familyId, status | 按家庭查孩子 |
| children | verifyCode | MCP核验码查询（唯一） |
| rules | familyId, category, enabled | 按分类筛选规则 |
| tasks | childId, date, status | 查孩子当日任务 |
| point_records | childId, createdAt | 积分明细时间线 |
| reward_requests | familyId, status | 待审核列表 |

---

## 四、云函数设计

采用单入口 + action 路由模式，按业务域拆分为 4 个云函数：

| 云函数 | 职责 | 核心 action |
|--------|------|------------|
| **user** | 用户/家庭/儿童管理 | login, createFamily, joinFamily, addChild, editChild, addCoadmin, removeCoadmin |
| **task** | 规则/任务管理 | createRule, updateRule, toggleRule, getTasks, completeTask, submitTask, auditTask |
| **point** | 积分/奖励管理 | getPoints, adjustPoints, getRecords, createReward, redeemReward, auditRedeem, submitWish, auditWish |
| **mcp** | MCP外部查询接口 | verify, queryPoints, queryTasks, queryRecords, queryRewards |

### 关键云函数逻辑示例

**积分发放（completeTask）**
```
1. 校验操作者权限（admin/coadmin）
2. 校验任务状态（pending）
3. 校验当日积分上限
4. 更新 task.status = completed
5. 写入 point_records
6. 更新 children.currentPoints / totalPoints
7. 写入 operation_logs
8. 返回最新积分
```

**MCP查询（verify + queryPoints）**
```
1. 接收 verifyCode
2. 查询 children 集合匹配
3. 核验通过 → 返回 childId + token（有效期30分钟）
4. 后续查询携带 token，仅允许读操作
5. 返回儿童化话术格式数据
```

---

## 五、权限控制矩阵

| 操作 | 主家长 | 协管家长 | 儿童(小程序) | MCP |
|------|--------|---------|-------------|-----|
| 创建/删除孩子 | ✅ | ❌ | ❌ | ❌ |
| 编辑孩子档案 | ✅ | ❌ | ❌ | ❌ |
| 创建/修改规则 | ✅ | ❌ | ❌ | ❌ |
| 标记任务完成 | ✅ | ✅ | ❌ | ❌ |
| 手动加/扣分 | ✅ | ✅ | ❌ | ❌ |
| 审核奖励兑换 | ✅ | ❌ | ❌ | ❌ |
| 审核心愿 | ✅ | ❌ | ❌ | ❌ |
| 邀请/移除协管 | ✅ | ❌ | ❌ | ❌ |
| 设置每日上限 | ✅ | ❌ | ❌ | ❌ |
| 查看积分/任务 | ✅ | ✅ | ✅ | ✅(只读) |
| 确认规则 | ❌ | ❌ | ✅ | ❌ |
| 申请兑换奖励 | ❌ | ❌ | ✅ | ❌ |
| 提交心愿 | ❌ | ❌ | ✅ | ❌ |

---

## 六、UI 设计规范速查

### 6.1 双端主题色

| 属性 | 家长端 | 儿童端 |
|------|--------|--------|
| 主色 | #4FC3F7 (浅蓝) | #FFCC80 (暖橙) |
| 背景 | #F5F7FA | #FFF8E1 |
| 文字 | #333333 | #5D4037 |
| 强调 | #FF9800 (暖橙) | #FF5722 (亮红) |
| 字号下限 | 14px | 16px |
| 风格 | 简洁商务 | 卡通圆润 |

### 6.2 公共组件与原型对应

| 组件 | 使用页面 | 原型参考 |
|------|---------|---------|
| child-selector | dashboard, mcp-verify | 顶部孩子头像切换 |
| task-card | task-manage, child-home | 任务卡片（图标+名称+积分+状态） |
| reward-card | child-rewards | 奖励网格卡片（图片+积分+按钮） |
| point-badge | dashboard, child-home | 大号积分数字+星星 |
| confirm-dialog | 加分/删除等操作 | 二次确认弹窗 |
| tab-bar | 家长端底部 | 首页/孩子管理/任务中心/我的 |

### 6.3 交互要点

- 家长端：核心操作（加分、删除、审核）必须二次确认弹窗
- 儿童端：无长按、无输入框，仅点击操作；积分到账播放星星飘落动画
- 全局：页面加载 ≤ 2s，弱网显示 loading 骨架屏
- 儿童端无底部导航栏，全屏大按钮布局

---

## 七、页面间导航关系

```
家长端导航（TabBar）:
  dashboard ─── task-manage ─── child-manage ─── setting
      │              │               │              │
      ├→ add-task    │          add-child      profile-edit
      ├→ audit-center│          child-profiles  family-manage
      │              │                           ├→ coadmin-manage
      │              │                           ├→ daily-limit
      │              │                           └→ mcp-verify
      └→ (快捷加分弹窗)

儿童端导航（无TabBar，页面跳转）:
  child-home
      ├→ point-manage
      ├→ rewards
      ├→ submit-manage
      └→ submit-wish

公共入口:
  join-family（通过分享链接/扫码进入）
```

---

## 八、开发分期建议

### P0 — MVP（核心闭环，建议 2 周）
1. 家长登录 + 创建家庭 + 添加孩子
2. 积分规则 CRUD + 任务管理
3. 标记任务完成 + 积分发放 + 积分流水
4. 家长工作台首页
5. 儿童端首页 + 积分查看 + 任务查看

### P1 — 完善体验（建议 1 周）
6. 奖励商城 + 兑换申请 + 审核流程
7. 心愿提交 + 审核
8. 协管家长邀请 + 权限控制
9. 加入家庭流程

### P2 — 增强功能（建议 1 周）
10. MCP 查询接口 + 核验码管理
11. 每日积分上限 + 防刷分
12. 数据统计（周/月趋势图）
13. 操作日志 + 数据导出

### P3 — 体验优化
14. 儿童端动画（星星飘落、等级升级）
15. 规则确认推送
16. 骨架屏 + 离线缓存
17. 适老化/低龄化优化

---

## 九、关键注意事项

1. **儿童档案 ≠ 用户账号**：children 集合不关联 openId（除非主动绑定），verifyCode 是唯一外部标识
2. **积分操作必须原子化**：积分变动需在云函数中用事务保证 point_records 写入与 children.currentPoints 更新一致
3. **协管权限严格校验**：每个云函数 action 入口必须校验 user.role，协管不可越权
4. **MCP 接口零操作权限**：仅返回数据，不接受任何写操作，verifyCode 错误 3 次锁定 10 分钟
5. **扣分默认关闭**：rules 中 points 默认正数，扣分需家长在设置中手动开启开关后才可创建负分规则
6. **头像不允许上传**：使用系统内置卡通头像（avatarIndex），不接入云存储上传
