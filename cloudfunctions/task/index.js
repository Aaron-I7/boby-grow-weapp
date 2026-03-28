const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const COLLECTIONS = {
  users: 'users',
  families: 'families',
  rules: 'rules',
  tasks: 'tasks',
  children: 'children',
  points: 'point_records',
  growthRecords: 'growth_records',
  rewardRequests: 'reward_requests',
  wishRequests: 'wish_requests'
}

const CATEGORY_LABELS = {
  habit: '良好习惯',
  study: '学习任务',
  chore: '家务劳动',
  virtue: '品德行为',
  custom: '自定义',
  other: '其他'
}

const ALLOWED_INTRINSIC_TAG = {
  autonomy: true,
  competence: true,
  relatedness: true,
  mixed: true,
  none: true
}

function isAdminRole(role) {
  return role === 'admin' || role === 'coadmin'
}

function isChildRole(role) {
  return role === 'child'
}

function assertAdminPermission(user) {
  if (!user || !isAdminRole(user.role)) {
    throw new Error('permission_denied')
  }
}

function resolveScopedChildId(user, payloadChildId) {
  const raw = String(payloadChildId || '').trim()
  if (!isChildRole(user && user.role)) return raw
  if (!user.childId) throw new Error('child_not_bound')
  if (raw && raw !== user.childId) throw new Error('permission_denied')
  return user.childId
}

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

function getOpenId() {
  const ctx = cloud.getWXContext ? cloud.getWXContext() : {}
  return ctx.OPENID || 'local_openid'
}

function clampInt(value, min, max, fallback) {
  const num = Number(value)
  if (Number.isNaN(num)) return fallback
  return Math.max(min, Math.min(max, Math.floor(num)))
}

function toDateKey(dateValue) {
  if (!dateValue) {
    const now = new Date()
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return toDateKey()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function dateKeyToWeekday(dateKey) {
  const d = new Date(dateKey + 'T00:00:00')
  const day = d.getDay()
  return day === 0 ? 7 : day
}

function normalizeCategory(input) {
  const raw = String(input || '').trim().toLowerCase()
  const presets = ['habit', 'study', 'chore', 'virtue', 'custom']
  if (presets.indexOf(raw) > -1) return raw
  return raw ? 'custom' : 'other'
}

function normalizeFrequency(event) {
  if (event && event.frequency) return event.frequency
  if (event && event.frequencyType === 'once') return 'once'
  if (event && event.loopMode === 'custom') return 'custom'
  return 'daily'
}

function sanitizeWeekdays(days) {
  const source = Array.isArray(days) ? days : []
  const uniq = {}
  const out = []
  source.forEach(function (item) {
    const n = Number(item)
    if (n >= 1 && n <= 7 && !uniq[n]) {
      uniq[n] = true
      out.push(n)
    }
  })
  out.sort(function (a, b) { return a - b })
  return out
}

function normalizeChoiceOptions(options) {
  const source = Array.isArray(options) ? options : []
  const list = source
    .map(function (item) { return String(item || '').trim() })
    .filter(function (item) { return !!item })
  return list.slice(0, 4)
}

function normalizeIntrinsicTag(value) {
  const tag = String(value || '').trim().toLowerCase()
  return ALLOWED_INTRINSIC_TAG[tag] ? tag : 'mixed'
}

function ensureTaskCompletionFields(task) {
  const next = Object.assign({}, task || {})
  if (next.status !== 'completed') return next
  if (!next.completedAt) {
    next.completedAt = next.createdAt || new Date(next.date + 'T00:00:00Z').toISOString()
  }
  if (!next.completedDateKey) {
    next.completedDateKey = toDateKey(next.completedAt)
  }
  return next
}

function withinTimeRange(iso, startTime, endTime) {
  if (!iso) return false
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return false
  if (startTime) {
    const s = new Date(startTime).getTime()
    if (!Number.isNaN(s) && ts < s) return false
  }
  if (endTime) {
    const e = new Date(endTime).getTime()
    if (!Number.isNaN(e) && ts > e) return false
  }
  return true
}

async function ensureCollections() {
  const names = [
    COLLECTIONS.users,
    COLLECTIONS.families,
    COLLECTIONS.rules,
    COLLECTIONS.tasks,
    COLLECTIONS.children,
    COLLECTIONS.points,
    COLLECTIONS.growthRecords,
    COLLECTIONS.rewardRequests,
    COLLECTIONS.wishRequests
  ]
  for (const name of names) {
    try {
      await db.createCollection(name)
    } catch (err) {
      // ignore collection exists errors
    }
  }
}

async function findOne(collection, where) {
  const res = await db.collection(collection).where(where).limit(1).get()
  return res.data && res.data[0] ? res.data[0] : null
}

async function ensureCurrentUser() {
  const openId = getOpenId()
  const existing = await findOne(COLLECTIONS.users, { openId: openId })
  if (existing) return existing

  const user = {
    _id: makeId('user'),
    openId: openId,
    familyId: '',
    role: 'admin',
    childId: '',
    nickname: 'Parent',
    identity: 'dad',
    gender: 'neutral',
    avatarKey: '',
    avatarUrl: '',
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
  await db.collection(COLLECTIONS.users).add({ data: user })
  return user
}

async function resolveFamilyId(user, payload) {
  if (user && user.familyId) return user.familyId
  if (payload && payload.familyId) return payload.familyId
  return ''
}

async function listRules(familyId) {
  if (!familyId) return []
  const res = await db.collection(COLLECTIONS.rules).where({ familyId: familyId }).orderBy('createdAt', 'desc').get()
  return res.data || []
}

function shouldGenerateForDate(rule, dateKey, existingOnceTask) {
  if (!rule || rule.enabled === false) return false
  const frequency = rule.frequency || 'daily'

  if (frequency === 'once') {
    return !existingOnceTask
  }

  if (frequency === 'custom' || frequency === 'weekly') {
    const weekdays = sanitizeWeekdays(rule.weekdays)
    const weekday = dateKeyToWeekday(dateKey)
    if (weekdays.length) return weekdays.indexOf(weekday) > -1
    return weekday === 1
  }

  return true
}

async function generateTasksIfMissing(childId, dateKey, familyId) {
  const existing = await db.collection(COLLECTIONS.tasks)
    .where({ childId: childId, date: dateKey })
    .get()

  if ((existing.data || []).length) return

  const rules = await listRules(familyId)
  if (!rules.length) return

  for (const rule of rules) {
    if (rule.enabled === false) continue

    let existingOnceTask = false
    const frequency = rule.frequency || 'daily'
    if (frequency === 'once') {
      const hit = await db.collection(COLLECTIONS.tasks).where({ childId: childId, ruleId: rule._id }).limit(1).get()
      existingOnceTask = !!(hit.data && hit.data[0])
    }

    if (!shouldGenerateForDate(rule, dateKey, existingOnceTask)) continue

    const dailyLimit = clampInt(rule.dailyLimit, 1, 99, 1)
    for (let i = 0; i < dailyLimit; i++) {
      const task = {
        _id: makeId('task'),
        ruleId: rule._id,
        familyId: familyId,
        childId: childId,
        date: dateKey,
        status: 'pending',
        completedBy: '',
        completedAt: '',
        completedDateKey: '',
        auditStatus: 'none',
        auditNote: '',
        points: clampInt(rule.points, 0, 999999, 0),
        ruleName: rule.name || 'Task',
        category: rule.category || 'other',
        reflection: '',
        reflectionSubmittedAt: '',
        feedbackType: 'none',
        feedbackText: '',
        grantPoints: true,
        pointGranted: false,
        pointRecordId: '',
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
      await db.collection(COLLECTIONS.tasks).add({ data: task })
    }
  }
}

async function addGrowthRecord(payload) {
  const data = payload || {}
  const record = {
    _id: makeId('gr'),
    familyId: data.familyId || '',
    childId: data.childId || '',
    type: data.type || 'reflection',
    sourceId: data.sourceId || '',
    taskId: data.taskId || '',
    meta: data.meta || {},
    createdAt: nowIso()
  }
  await db.collection(COLLECTIONS.growthRecords).add({ data: record })
  return record
}

async function grantTaskPoints(task, operatorId) {
  const child = await findOne(COLLECTIONS.children, { _id: task.childId })
  if (!child) return null

  const amount = clampInt(task.points, 0, 999999, 0)
  const current = Number(child.currentPoints || 0)
  const total = Number(child.totalPoints || 0)
  const nextCurrent = current + amount
  const nextTotal = total + amount

  await db.collection(COLLECTIONS.children).doc(child._id).update({
    data: {
      currentPoints: nextCurrent,
      totalPoints: nextTotal,
      updatedAt: nowIso()
    }
  })

  const pointRecord = {
    _id: makeId('pr'),
    familyId: task.familyId || child.familyId || '',
    childId: child._id,
    type: 'task',
    amount: amount,
    balance: nextCurrent,
    taskId: task._id,
    note: task.ruleName || 'Task reward',
    operatorId: operatorId || '',
    createdAt: nowIso()
  }
  await db.collection(COLLECTIONS.points).add({ data: pointRecord })
  return pointRecord
}

async function actionGetRules(event) {
  const user = await ensureCurrentUser()
  const familyId = await resolveFamilyId(user, event)
  if (!familyId) return []

  const category = event && event.category
  let rules = await listRules(familyId)
  if (category) {
    rules = rules.filter(function (rule) {
      return rule.category === category || rule.categoryType === category
    })
  }
  return rules
}

async function actionCreateRule(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  assertAdminPermission(user)
  const familyId = await resolveFamilyId(user, payload)
  if (!familyId) throw new Error('family is required')

  const categoryType = normalizeCategory(payload.categoryType || payload.category)
  const categoryName = payload.categoryName || (categoryType === 'custom' ? String(payload.category || '自定义') : (CATEGORY_LABELS[categoryType] || categoryType))
  const frequency = normalizeFrequency(payload)
  const weekdays = frequency === 'custom' ? sanitizeWeekdays(payload.weekdays) : []

  const rule = {
    _id: makeId('rule'),
    familyId: familyId,
    assigneeUserId: payload.assigneeUserId || payload.childId || '',
    name: String(payload.name || '').trim() || 'New Task',
    category: categoryType,
    categoryType: categoryType,
    categoryName: categoryName,
    categoryIcon: payload.categoryIcon || 'edit',
    points: clampInt(payload.points, 1, 999999, 10),
    dailyLimit: clampInt(payload.dailyLimit, 1, 99, 1),
    frequency: frequency,
    frequencyType: payload.frequencyType || (frequency === 'once' ? 'once' : 'loop'),
    loopMode: payload.loopMode || (frequency === 'custom' ? 'custom' : 'daily'),
    weekdays: weekdays,
    enabled: payload.enabled === undefined ? true : !!payload.enabled,
    confirmedByChild: !!payload.confirmedByChild,
    purposeText: String(payload.purposeText || '').trim(),
    choiceOptions: normalizeChoiceOptions(payload.choiceOptions),
    reflectionRequired: !!payload.reflectionRequired,
    intrinsicTag: normalizeIntrinsicTag(payload.intrinsicTag),
    createdBy: payload.createdBy || user._id,
    updatedBy: payload.createdBy || user._id,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }

  await db.collection(COLLECTIONS.rules).add({ data: rule })
  return rule
}

async function actionUpdateRule(event) {
  const payload = event || {}
  const ruleId = payload._id || payload.ruleId
  if (!ruleId) throw new Error('rule id is required')

  const user = await ensureCurrentUser()
  assertAdminPermission(user)
  const existing = await findOne(COLLECTIONS.rules, { _id: ruleId })
  if (!existing) return { success: false }
  if (user.familyId && existing.familyId !== user.familyId) return { success: false }

  const patch = {}
  if (Object.prototype.hasOwnProperty.call(payload, 'name')) patch.name = String(payload.name || '').trim() || existing.name
  if (Object.prototype.hasOwnProperty.call(payload, 'points')) patch.points = clampInt(payload.points, 1, 999999, existing.points || 10)
  if (Object.prototype.hasOwnProperty.call(payload, 'dailyLimit')) patch.dailyLimit = clampInt(payload.dailyLimit, 1, 99, existing.dailyLimit || 1)
  if (Object.prototype.hasOwnProperty.call(payload, 'enabled')) patch.enabled = !!payload.enabled
  if (Object.prototype.hasOwnProperty.call(payload, 'confirmedByChild')) patch.confirmedByChild = !!payload.confirmedByChild

  if (Object.prototype.hasOwnProperty.call(payload, 'category') || Object.prototype.hasOwnProperty.call(payload, 'categoryType')) {
    const categoryType = normalizeCategory(payload.categoryType || payload.category)
    patch.category = categoryType
    patch.categoryType = categoryType
    patch.categoryName = payload.categoryName || (categoryType === 'custom' ? String(payload.category || existing.categoryName || '自定义') : (CATEGORY_LABELS[categoryType] || categoryType))
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, 'frequency') ||
    Object.prototype.hasOwnProperty.call(payload, 'frequencyType') ||
    Object.prototype.hasOwnProperty.call(payload, 'loopMode')
  ) {
    const nextFrequency = normalizeFrequency(payload)
    patch.frequency = nextFrequency
    patch.frequencyType = payload.frequencyType || (nextFrequency === 'once' ? 'once' : 'loop')
    patch.loopMode = payload.loopMode || (nextFrequency === 'custom' ? 'custom' : 'daily')
    patch.weekdays = nextFrequency === 'custom' ? sanitizeWeekdays(payload.weekdays) : []
  } else if (Object.prototype.hasOwnProperty.call(payload, 'weekdays')) {
    patch.weekdays = sanitizeWeekdays(payload.weekdays)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'categoryIcon')) patch.categoryIcon = payload.categoryIcon || existing.categoryIcon
  if (Object.prototype.hasOwnProperty.call(payload, 'assigneeUserId')) patch.assigneeUserId = payload.assigneeUserId || ''
  if (Object.prototype.hasOwnProperty.call(payload, 'purposeText')) patch.purposeText = String(payload.purposeText || '').trim()
  if (Object.prototype.hasOwnProperty.call(payload, 'choiceOptions')) patch.choiceOptions = normalizeChoiceOptions(payload.choiceOptions)
  if (Object.prototype.hasOwnProperty.call(payload, 'reflectionRequired')) patch.reflectionRequired = !!payload.reflectionRequired
  if (Object.prototype.hasOwnProperty.call(payload, 'intrinsicTag')) patch.intrinsicTag = normalizeIntrinsicTag(payload.intrinsicTag)

  patch.updatedBy = payload.updatedBy || user._id
  patch.updatedAt = nowIso()

  await db.collection(COLLECTIONS.rules).doc(ruleId).update({ data: patch })
  return { success: true }
}

async function actionToggleRule(event) {
  const payload = event || {}
  const ruleId = payload.ruleId
  if (!ruleId) throw new Error('ruleId is required')

  const user = await ensureCurrentUser()
  assertAdminPermission(user)
  const existing = await findOne(COLLECTIONS.rules, { _id: ruleId })
  if (!existing) return { success: false }
  if (user.familyId && existing.familyId !== user.familyId) return { success: false }

  await db.collection(COLLECTIONS.rules).doc(ruleId).update({
    data: {
      enabled: !!payload.enabled,
      updatedAt: nowIso()
    }
  })

  return { success: true }
}

async function actionGetTasks(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  const childId = resolveScopedChildId(user, payload.childId)
  if (!childId) return []

  let familyId = await resolveFamilyId(user, payload)
  if (!familyId) {
    const child = await findOne(COLLECTIONS.children, { _id: childId })
    familyId = child ? child.familyId : ''
  }
  const dateKey = toDateKey(payload.date)

  await generateTasksIfMissing(childId, dateKey, familyId)

  const res = await db.collection(COLLECTIONS.tasks)
    .where({ childId: childId, date: dateKey })
    .orderBy('createdAt', 'asc')
    .get()

  const list = (res.data || []).map(ensureTaskCompletionFields)
  const ruleIds = {}
  list.forEach(function (item) {
    if (item && item.ruleId) ruleIds[item.ruleId] = true
  })

  const ruleMap = {}
  const ids = Object.keys(ruleIds)
  for (let i = 0; i < ids.length; i++) {
    const rule = await findOne(COLLECTIONS.rules, { _id: ids[i] })
    if (rule) ruleMap[ids[i]] = rule
  }

  return list.map(function (item) {
    var rule = ruleMap[item.ruleId] || {}
    return Object.assign({}, item, {
      reflectionRequired: !!rule.reflectionRequired
    })
  })
}

async function actionCompleteTask(event) {
  const payload = event || {}
  const taskId = payload.taskId
  if (!taskId) throw new Error('taskId is required')

  const user = await ensureCurrentUser()
  assertAdminPermission(user)
  const task = await findOne(COLLECTIONS.tasks, { _id: taskId })
  if (!task) return { success: false }
  if (user.familyId && task.familyId !== user.familyId) return { success: false }

  const completedAt = nowIso()
  await db.collection(COLLECTIONS.tasks).doc(taskId).update({
    data: {
      status: 'completed',
      completedBy: user._id,
      completedAt: completedAt,
      completedDateKey: toDateKey(completedAt),
      updatedAt: nowIso()
    }
  })

  return { success: true }
}

async function actionSubmitTask(event) {
  const payload = event || {}
  const taskId = payload.taskId
  if (!taskId) throw new Error('taskId is required')

  const user = await ensureCurrentUser()
  const task = await findOne(COLLECTIONS.tasks, { _id: taskId })
  if (!task) return { success: false }
  if (isChildRole(user.role) && user.childId !== task.childId) {
    throw new Error('permission_denied')
  }
  if (!isChildRole(user.role) && !isAdminRole(user.role)) {
    throw new Error('permission_denied')
  }
  if (isAdminRole(user.role) && user.familyId && task.familyId !== user.familyId) {
    throw new Error('permission_denied')
  }

  const rule = await findOne(COLLECTIONS.rules, { _id: task.ruleId })
  const reflection = String(payload.reflection || '').trim()
  if (rule && rule.reflectionRequired && !reflection) {
    throw new Error('reflection is required')
  }

  await db.collection(COLLECTIONS.tasks).doc(taskId).update({
    data: {
      auditStatus: 'pending',
      reflection: reflection,
      reflectionSubmittedAt: reflection ? nowIso() : '',
      updatedAt: nowIso()
    }
  })

  if (reflection) {
    await addGrowthRecord({
      familyId: task.familyId,
      childId: task.childId,
      type: 'reflection',
      sourceId: taskId,
      taskId: taskId,
      meta: {
        text: reflection,
        ruleName: task.ruleName || ''
      }
    })
  }

  return { success: true }
}

async function actionAuditTask(event) {
  const payload = event || {}
  const taskId = payload.taskId
  if (!taskId) throw new Error('taskId is required')

  const approved = !!payload.approved
  const user = await ensureCurrentUser()
  assertAdminPermission(user)
  const task = await findOne(COLLECTIONS.tasks, { _id: taskId })
  if (!task) return { success: false }
  if (user.familyId && task.familyId !== user.familyId) return { success: false }

  const feedbackType = String(payload.feedbackType || (approved ? 'process' : 'none')).trim() || 'none'
  const feedbackText = String(payload.feedbackText || payload.note || '').trim()
  const grantPoints = approved ? payload.grantPoints !== false : false

  const patch = {
    auditStatus: approved ? 'approved' : 'rejected',
    auditNote: payload.note || '',
    feedbackType: feedbackType,
    feedbackText: feedbackText,
    grantPoints: grantPoints,
    auditBy: user._id,
    auditedAt: nowIso(),
    updatedAt: nowIso()
  }

  if (approved) {
    patch.status = 'completed'
    patch.completedAt = task.completedAt || nowIso()
    patch.completedDateKey = task.completedDateKey || toDateKey(patch.completedAt)
  }

  if (approved && grantPoints && !task.pointGranted) {
    const pointRecord = await grantTaskPoints(task, user._id)
    if (pointRecord) {
      patch.pointGranted = true
      patch.pointRecordId = pointRecord._id
    }
  }

  await db.collection(COLLECTIONS.tasks).doc(taskId).update({ data: patch })

  if (feedbackText) {
    await addGrowthRecord({
      familyId: task.familyId,
      childId: task.childId,
      type: 'parent_feedback',
      sourceId: taskId,
      taskId: taskId,
      meta: {
        feedbackType: feedbackType,
        feedbackText: feedbackText,
        approved: approved,
        grantPoints: grantPoints
      }
    })
  }

  return { success: true }
}

async function listCompletedTasks(payload, user) {
  const childId = resolveScopedChildId(user, payload.childId)
  if (!childId) return []

  const res = await db.collection(COLLECTIONS.tasks)
    .where({ childId: childId, status: 'completed' })
    .orderBy('completedAt', 'desc')
    .get()

  return (res.data || [])
    .map(ensureTaskCompletionFields)
    .filter(function (task) {
      return withinTimeRange(task.completedAt, payload.startTime, payload.endTime)
    })
    .sort(function (a, b) {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    })
}

async function actionGetTaskCompletionOverview(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  const completed = await listCompletedTasks(payload, user)
  const total = completed.length

  const categoryMap = {}
  const taskMap = {}

  completed.forEach(function (task) {
    const categoryKey = task.category || 'other'
    const ruleId = task.ruleId || task._id
    const ruleName = task.ruleName || '未命名任务'

    if (!categoryMap[categoryKey]) {
      categoryMap[categoryKey] = {
        categoryKey: categoryKey,
        categoryName: CATEGORY_LABELS[categoryKey] || CATEGORY_LABELS.other,
        count: 0
      }
    }
    categoryMap[categoryKey].count += 1

    const taskKey = ruleId + '::' + ruleName
    if (!taskMap[taskKey]) {
      taskMap[taskKey] = {
        taskKey: taskKey,
        ruleId: ruleId,
        ruleName: ruleName,
        categoryKey: categoryKey,
        categoryName: CATEGORY_LABELS[categoryKey] || CATEGORY_LABELS.other,
        count: 0
      }
    }
    taskMap[taskKey].count += 1
  })

  const categorySummary = Object.keys(categoryMap).map(function (key) {
    const item = categoryMap[key]
    return Object.assign({}, item, {
      percent: total ? Number(((item.count / total) * 100).toFixed(2)) : 0
    })
  }).sort(function (a, b) { return b.count - a.count })

  const taskRanking = Object.keys(taskMap).map(function (key) { return taskMap[key] })
    .sort(function (a, b) { return b.count - a.count })

  return {
    totalCompleted: total,
    categorySummary: categorySummary,
    taskRanking: taskRanking
  }
}

async function actionGetTaskCompletionTimeline(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  const pageNo = clampInt(payload.pageNo, 1, 99999, 1)
  const pageSize = clampInt(payload.pageSize, 1, 100, 10)
  const completed = await listCompletedTasks(payload, user)

  const start = (pageNo - 1) * pageSize
  const list = completed.slice(start, start + pageSize).map(function (task) {
    return {
      taskId: task._id,
      ruleId: task.ruleId || '',
      ruleName: task.ruleName || '未命名任务',
      category: task.category || 'other',
      points: task.points || 0,
      completedAt: task.completedAt,
      completedDateKey: task.completedDateKey || toDateKey(task.completedAt),
      date: task.date || '',
      reflection: task.reflection || '',
      feedbackType: task.feedbackType || 'none'
    }
  })

  return {
    list: list,
    total: completed.length,
    pageNo: pageNo,
    pageSize: pageSize,
    hasMore: start + pageSize < completed.length
  }
}

async function actionGetTaskCompletionCluster(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  const clusterBy = payload.clusterBy || 'task'
  const completed = await listCompletedTasks(payload, user)

  const bucketMap = {}
  completed.forEach(function (task) {
    let key = ''
    let label = ''

    if (clusterBy === 'day') {
      key = task.completedDateKey || toDateKey(task.completedAt)
      label = key
    } else if (clusterBy === 'category') {
      key = task.category || 'other'
      label = CATEGORY_LABELS[key] || key
    } else {
      key = task.ruleId || task._id
      label = task.ruleName || '未命名任务'
    }

    if (!bucketMap[key]) {
      bucketMap[key] = { key: key, label: label, count: 0 }
    }
    bucketMap[key].count += 1
  })

  const buckets = Object.keys(bucketMap).map(function (key) { return bucketMap[key] })
  buckets.sort(function (a, b) {
    if (clusterBy === 'day') return b.key.localeCompare(a.key)
    return b.count - a.count
  })

  return {
    clusterBy: clusterBy,
    buckets: buckets,
    total: completed.length
  }
}

async function actionGetPendingAuditSummary(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  const familyId = await resolveFamilyId(user, payload)
  if (!familyId) {
    return {
      taskPending: 0,
      rewardPending: 0,
      wishPending: 0,
      totalPending: 0
    }
  }

  const scopedChildId = isChildRole(user.role) ? user.childId : ''

  const taskRes = await db.collection(COLLECTIONS.tasks)
    .where({ familyId: familyId, auditStatus: 'pending' })
    .get()
  const rewardRes = await db.collection(COLLECTIONS.rewardRequests)
    .where({ familyId: familyId, status: 'pending' })
    .get()
  const wishRes = await db.collection(COLLECTIONS.wishRequests)
    .where({ familyId: familyId, status: 'pending' })
    .get()

  var taskList = taskRes.data || []
  var rewardList = rewardRes.data || []
  var wishList = wishRes.data || []

  if (scopedChildId) {
    taskList = taskList.filter(function (item) { return item.childId === scopedChildId })
    rewardList = rewardList.filter(function (item) { return item.childId === scopedChildId })
    wishList = wishList.filter(function (item) { return item.childId === scopedChildId })
  }

  var nowTs = Date.now()
  var overdueThresholdMs = 24 * 60 * 60 * 1000

  function getItemTimestamp(item) {
    var ts = new Date((item && (item.updatedAt || item.reflectionSubmittedAt || item.createdAt)) || '').getTime()
    return Number.isNaN(ts) ? 0 : ts
  }

  function countOverdue(list) {
    return (list || []).filter(function (item) {
      var ts = getItemTimestamp(item)
      if (!ts) return false
      return nowTs - ts >= overdueThresholdMs
    }).length
  }

  var overdueTask = countOverdue(taskList)
  var overdueReward = countOverdue(rewardList)
  var overdueWish = countOverdue(wishList)
  var overduePending = overdueTask + overdueReward + overdueWish

  var oldestPendingTs = 0
  taskList.concat(rewardList, wishList).forEach(function (item) {
    var ts = getItemTimestamp(item)
    if (!ts) return
    if (!oldestPendingTs || ts < oldestPendingTs) oldestPendingTs = ts
  })

  return {
    taskPending: taskList.length,
    rewardPending: rewardList.length,
    wishPending: wishList.length,
    totalPending: taskList.length + rewardList.length + wishList.length,
    overdueTask: overdueTask,
    overdueReward: overdueReward,
    overdueWish: overdueWish,
    overduePending: overduePending,
    hasOverdue: overduePending > 0,
    oldestPendingAt: oldestPendingTs ? new Date(oldestPendingTs).toISOString() : ''
  }
}

exports.main = async (event) => {
  await ensureCollections()
  const action = event && (event.action || event.type)

  switch (action) {
    case 'getRules': return actionGetRules(event)
    case 'createRule': return actionCreateRule(event)
    case 'updateRule': return actionUpdateRule(event)
    case 'toggleRule': return actionToggleRule(event)
    case 'getTasks': return actionGetTasks(event)
    case 'completeTask': return actionCompleteTask(event)
    case 'submitTask': return actionSubmitTask(event)
    case 'auditTask': return actionAuditTask(event)
    case 'getTaskCompletionOverview': return actionGetTaskCompletionOverview(event)
    case 'getTaskCompletionTimeline': return actionGetTaskCompletionTimeline(event)
    case 'getTaskCompletionCluster': return actionGetTaskCompletionCluster(event)
    case 'getPendingAuditSummary': return actionGetPendingAuditSummary(event)
    default:
      throw new Error('unknown action: ' + action)
  }
}
