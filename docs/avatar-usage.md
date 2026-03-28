# 头像展示位清单（当前代码）

## 一级导航头像（`nav-bar`）
- `components/nav-bar/index.wxml`  
用途：父端一级页面（工作台/任务中心/孩子管理）左侧头像展示。  
来源：`avatarUrl` 属性（页面传入）。

## 页面内头像展示
- `pages/parent/add-child/index.wxml`  
用途：新增孩子时的头像选择网格（4 选 1）。
- `pages/parent/audit-center/index.wxml`  
用途：审核卡片中的孩子头像。
- `pages/parent/child-manage/index.wxml`  
用途：孩子列表卡片头像。
- `pages/parent/child-profiles/index.wxml`  
用途：孩子档案页头像。
- `pages/parent/coadmin-manage/index.wxml`  
用途：协管员/管理员成员头像。
- `pages/parent/mcp-verify/index.wxml`  
用途：核验码页面顶部孩子切换 chip 头像。
- `pages/parent/profile-edit/index.wxml`  
用途：个人资料编辑页头像展示。
- `pages/child/home/index.wxml`  
用途：孩子端首页头部头像。

## 头像路径规范（已迁移）
- PNG 目录：`/images/png/avatar/`
- 文件命名：`avatar-1.png` ~ `avatar-4.png`
- 动态规则：`avatarIndex + 1`
