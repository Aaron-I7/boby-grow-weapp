# Task Rule CRUD API (for add-task page)

## 1) Create
- action: `createRule`
- method: `POST`
- path: `/task/rules`

### Request
```json
{
  "familyId": "family_001",
  "assigneeUserId": "child_001",
  "name": "阅读30分钟",
  "categoryType": "study",
  "categoryName": "学习",
  "categoryIcon": "study",
  "points": 20,
  "dailyLimit": 1,
  "frequencyType": "loop",
  "loopMode": "custom",
  "weekdays": [1,2,3,4,5],
  "createdBy": "user_001"
}
```

> `assigneeUserId` 为必填。若分配对象是孩子，可直接传孩子 ID（如 `child_001`）。

### Response
```json
{
  "ruleId": "rule_1742899500000",
  "createdAt": "2026-03-25 18:00:00"
}
```

---

## 2) Query One
- action: `getRule`
- method: `GET`
- path: `/task/rules/{ruleId}`

### Response
```json
{
  "ruleId": "rule_1742899500000",
  "familyId": "family_001",
  "assigneeUserId": "child_001",
  "name": "阅读30分钟",
  "categoryType": "study",
  "categoryName": "学习",
  "categoryIcon": "study",
  "points": 20,
  "dailyLimit": 1,
  "frequencyType": "loop",
  "loopMode": "custom",
  "weekdays": [1,2,3,4,5],
  "enabled": true,
  "confirmedByChild": false,
  "createdBy": "user_001",
  "updatedBy": null,
  "createdAt": "2026-03-25 18:00:00",
  "updatedAt": "2026-03-25 18:00:00"
}
```

---

## 3) Query List
- action: `getRules`
- method: `GET`
- path: `/task/rules`

### Query Params
- `familyId` (required)
- `assigneeUserId` (optional)
- `categoryType` (optional)
- `enabled` (optional)
- `pageNo` / `pageSize` (optional)

### Response
```json
{
  "list": [],
  "total": 0,
  "pageNo": 1,
  "pageSize": 20
}
```

---

## 4) Update
- action: `updateRule`
- method: `PUT`
- path: `/task/rules/{ruleId}`

### Request (partial update)
```json
{
  "ruleId": "rule_1742899500000",
  "assigneeUserId": "child_002",
  "name": "阅读45分钟",
  "points": 30,
  "loopMode": "custom",
  "weekdays": [1,3,5],
  "updatedBy": "user_001"
}
```

### Response
```json
{
  "success": true
}
```

---

## 5) Delete (soft delete)
- action: `deleteRule`
- method: `DELETE`
- path: `/task/rules/{ruleId}`

### Request
```json
{
  "ruleId": "rule_1742899500000",
  "updatedBy": "user_001"
}
```

### Response
```json
{
  "success": true
}
```
