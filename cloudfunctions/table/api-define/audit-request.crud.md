# Audit Request API Define

## 1) Create Audit Request
- action: `createAuditRequest`
- method: `POST`
- path: `/audit/requests`

### Request
```json
{
  "familyId": "family_001",
  "requestType": "wish",
  "bizId": "wr_001",
  "applicantChildId": "child_001",
  "title": "想要一个足球",
  "points": 800,
  "assigneeUserId": "user_001",
  "createdBy": "user_002"
}
```

### Response
```json
{
  "auditId": "audit_1742899800000",
  "createdAt": "2026-03-25 18:10:00"
}
```

---

## 2) Query One
- action: `getAuditRequest`
- method: `GET`
- path: `/audit/requests/{auditId}`

---

## 3) Query List
- action: `listAuditRequests`
- method: `GET`
- path: `/audit/requests`

### Query Params
- `familyId` (required)
- `status` (optional)
- `requestType` (optional)
- `assigneeUserId` (optional)
- `pageNo/pageSize` (optional)

---

## 4) Update
- action: `updateAuditRequest`
- method: `PUT`
- path: `/audit/requests/{auditId}`

### Request
```json
{
  "auditId": "audit_1742899800000",
  "title": "想要新足球",
  "points": 1000,
  "updatedBy": "user_001"
}
```

---

## 5) Delete (soft delete)
- action: `deleteAuditRequest`
- method: `DELETE`
- path: `/audit/requests/{auditId}`

---

## 6) Approve
- action: `approveAuditRequest`
- method: `POST`
- path: `/audit/requests/{auditId}/approve`

### Request
```json
{
  "auditId": "audit_1742899800000",
  "operatorUserId": "user_001",
  "note": "同意，进入奖励列表"
}
```

---

## 7) Reject
- action: `rejectAuditRequest`
- method: `POST`
- path: `/audit/requests/{auditId}/reject`

### Request
```json
{
  "auditId": "audit_1742899800000",
  "operatorUserId": "user_001",
  "note": "先完成本周任务"
}
```

---

## 8) Assign
- action: `assignAuditRequest`
- method: `POST`
- path: `/audit/requests/{auditId}/assign`

### Request
```json
{
  "auditId": "audit_1742899800000",
  "assigneeUserId": "user_003",
  "operatorUserId": "user_001",
  "note": "请妈妈审核",
  "dueAt": "2026-03-30 23:59:59"
}
```

---

## 9) Logs
- action: `listAuditLogs`
- method: `GET`
- path: `/audit/requests/{auditId}/logs`

