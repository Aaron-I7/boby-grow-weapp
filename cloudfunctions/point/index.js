const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const COLLECTIONS = {
  users: 'users',
  families: 'families',
  children: 'children',
  points: 'point_records',
  rewards: 'rewards',
  rewardRequests: 'reward_requests',
  wishRequests: 'wish_requests',
  growthRecords: 'growth_records'
}

const ALLOWED_REWARD_TYPE = {
  experience: true,
  relationship: true,
  material: true
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

function weekdayLabel(day) {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return labels[day] || 'Mon'
}

function normalizeRewardType(value) {
  const type = String(value || '').trim().toLowerCase()
  return ALLOWED_REWARD_TYPE[type] ? type : 'experience'
}

function startOfWeekIso(dateValue) {
  const d = dateValue ? new Date(dateValue) : new Date()
  const day = d.getDay() || 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (day - 1))
  return d.toISOString()
}

function addDaysIso(dateValue, days) {
  const d = new Date(dateValue)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

async function ensureCollections() {
  const names = [
    COLLECTIONS.users,
    COLLECTIONS.families,
    COLLECTIONS.children,
    COLLECTIONS.points,
    COLLECTIONS.rewards,
    COLLECTIONS.rewardRequests,
    COLLECTIONS.wishRequests,
    COLLECTIONS.growthRecords
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

async function getChildById(childId) {
  if (!childId) return null
  return findOne(COLLECTIONS.children, { _id: childId })
}

async function getFirstChildByFamily(familyId) {
  if (!familyId) return null
  const res = await db.collection(COLLECTIONS.children)
    .where({ familyId: familyId })
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get()
  return res.data && res.data[0] ? res.data[0] : null
}

async function addPointRecord(data) {
  const record = Object.assign({
    _id: makeId('pr'),
    type: 'manual',
    amount: 0,
    balance: 0,
    taskId: '',
    note: '',
    operatorId: '',
    createdAt: nowIso()
  }, data || {})

  await db.collection(COLLECTIONS.points).add({ data: record })
  return record
}

async function addGrowthRecord(data) {
  const record = Object.assign({
    _id: makeId('gr'),
    familyId: '',
    childId: '',
    type: 'reward_behavior',
    sourceId: '',
    taskId: '',
    meta: {},
    createdAt: nowIso()
  }, data || {})

  await db.collection(COLLECTIONS.growthRecords).add({ data: record })
  return record
}

function normalizeRewardPayload(payload) {
  const data = payload || {}
  return {
    name: String(data.name || '').trim() || 'Reward',
    category: data.category || 'privilege',
    rewardType: normalizeRewardType(data.rewardType),
    cost: clampInt(data.cost, 1, 999999, 100),
    redeemLimit: clampInt(data.redeemLimit, 1, 99, 1),
    iconIndex: clampInt(data.iconIndex, 0, 999, 0),
    enabled: data.enabled === undefined ? true : !!data.enabled,
    weeklyQuota: clampInt(data.weeklyQuota, 0, 99, 0),
    cooldownDays: clampInt(data.cooldownDays, 0, 365, 0),
    requiresReason: !!data.requiresReason
  }
}

function normalizeRewardModel(reward) {
  const r = Object.assign({}, reward || {})
  r.rewardType = normalizeRewardType(r.rewardType)
  r.weeklyQuota = clampInt(r.weeklyQuota, 0, 99, 0)
  r.cooldownDays = clampInt(r.cooldownDays, 0, 365, 0)
  r.requiresReason = !!r.requiresReason
  return r
}

async function ensureRewardsSeeded(familyId) {
  if (!familyId) return
  const existing = await db.collection(COLLECTIONS.rewards).where({ familyId: familyId }).limit(1).get()
  if (existing.data && existing.data[0]) return

  const now = nowIso()
  const defaults = [
    {
      name: '一起去公园探索',
      category: 'companion',
      rewardType: 'relationship',
      cost: 350,
      redeemLimit: 1,
      weeklyQuota: 2,
      cooldownDays: 1,
      requiresReason: false,
      iconIndex: 0
    },
    {
      name: '家庭科学小实验',
      category: 'companion',
      rewardType: 'experience',
      cost: 280,
      redeemLimit: 1,
      weeklyQuota: 2,
      cooldownDays: 0,
      requiresReason: false,
      iconIndex: 1
    },
    {
      name: '周末家庭游戏夜',
      category: 'privilege',
      rewardType: 'relationship',
      cost: 420,
      redeemLimit: 1,
      weeklyQuota: 1,
      cooldownDays: 3,
      requiresReason: false,
      iconIndex: 2
    },
    {
      name: '精选实物奖励',
      category: 'physical',
      rewardType: 'material',
      cost: 1200,
      redeemLimit: 1,
      weeklyQuota: 1,
      cooldownDays: 7,
      requiresReason: true,
      iconIndex: 3
    }
  ]

  for (const item of defaults) {
    const reward = {
      _id: makeId('reward'),
      familyId: familyId,
      name: item.name,
      category: item.category,
      rewardType: item.rewardType,
      cost: item.cost,
      redeemLimit: item.redeemLimit,
      iconIndex: item.iconIndex,
      enabled: true,
      weeklyQuota: item.weeklyQuota,
      cooldownDays: item.cooldownDays,
      requiresReason: item.requiresReason,
      createdAt: now,
      updatedAt: now
    }
    await db.collection(COLLECTIONS.rewards).add({ data: reward })
  }
}

async function actionGetRecords(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  const childId = resolveScopedChildId(user, payload.childId)
  if (!childId) return []

  const res = await db.collection(COLLECTIONS.points)
    .where({ childId: childId })
    .orderBy('createdAt', 'desc')
    .get()

  return res.data || []
}

async function actionAdjustPoints(event) {
  const payload = event || {}
  const childId = payload.childId
  if (!childId) throw new Error('childId is required')

  const amount = Number(payload.amount || 0)
  const user = await ensureCurrentUser()
  assertAdminPermission(user)
  const child = await getChildById(childId)
  if (!child) return { success: false }
  if (user.familyId && child.familyId !== user.familyId) return { success: false }

  const current = Number(child.currentPoints || 0)
  const total = Number(child.totalPoints || 0)
  const nextCurrent = current + amount
  const nextTotal = amount > 0 ? (total + amount) : total

  await db.collection(COLLECTIONS.children).doc(childId).update({
    data: {
      currentPoints: nextCurrent,
      totalPoints: nextTotal,
      updatedAt: nowIso()
    }
  })

  await addPointRecord({
    familyId: child.familyId || '',
    childId: childId,
    type: 'manual',
    amount: amount,
    balance: nextCurrent,
    taskId: '',
    note: payload.note || '',
    operatorId: user._id,
    createdAt: nowIso()
  })

  return { success: true }
}

async function actionGetWeeklyTrend(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  const familyId = await resolveFamilyId(user, payload)

  let childId = resolveScopedChildId(user, payload.childId)
  if (!childId && familyId) {
    const firstChild = await db.collection(COLLECTIONS.children)
      .where({ familyId: familyId })
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get()
    childId = firstChild.data && firstChild.data[0] ? firstChild.data[0]._id : ''
  }

  if (!childId) {
    return [
      { day: 'Mon', points: 0 },
      { day: 'Tue', points: 0 },
      { day: 'Wed', points: 0 },
      { day: 'Thu', points: 0 },
      { day: 'Fri', points: 0 },
      { day: 'Sat', points: 0 },
      { day: 'Sun', points: 0 }
    ]
  }

  const res = await db.collection(COLLECTIONS.points)
    .where({ childId: childId })
    .orderBy('createdAt', 'desc')
    .get()

  const weekMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  ;(res.data || []).forEach(function (record) {
    const ts = new Date(record.createdAt || '').getTime()
    if (Number.isNaN(ts) || ts < sevenDaysAgo) return
    if ((record.amount || 0) <= 0) return

    const day = weekdayLabel(new Date(ts).getDay())
    weekMap[day] += Number(record.amount || 0)
  })

  return [
    { day: 'Mon', points: weekMap.Mon },
    { day: 'Tue', points: weekMap.Tue },
    { day: 'Wed', points: weekMap.Wed },
    { day: 'Thu', points: weekMap.Thu },
    { day: 'Fri', points: weekMap.Fri },
    { day: 'Sat', points: weekMap.Sat },
    { day: 'Sun', points: weekMap.Sun }
  ]
}

async function actionGetRewards(event) {
  const user = await ensureCurrentUser()
  const familyId = await resolveFamilyId(user, event)
  if (!familyId) return []

  await ensureRewardsSeeded(familyId)
  const res = await db.collection(COLLECTIONS.rewards)
    .where({ familyId: familyId })
    .orderBy('createdAt', 'desc')
    .get()

  return (res.data || []).filter(function (item) {
    return item.enabled !== false
  }).map(normalizeRewardModel)
}

async function actionCreateReward(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  assertAdminPermission(user)
  const familyId = await resolveFamilyId(user, payload)
  if (!familyId) throw new Error('family is required')

  const normalized = normalizeRewardPayload(payload)
  const reward = {
    _id: makeId('reward'),
    familyId: familyId,
    name: normalized.name,
    category: normalized.category,
    rewardType: normalized.rewardType,
    cost: normalized.cost,
    redeemLimit: normalized.redeemLimit,
    iconIndex: normalized.iconIndex,
    enabled: normalized.enabled,
    weeklyQuota: normalized.weeklyQuota,
    cooldownDays: normalized.cooldownDays,
    requiresReason: normalized.requiresReason,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }

  await db.collection(COLLECTIONS.rewards).add({ data: reward })
  return reward
}

async function actionGetRewardRequests(event) {
  const payload = event || {}
  const status = payload.status
  const user = await ensureCurrentUser()
  const familyId = await resolveFamilyId(user, payload)
  if (!familyId) return []

  const res = await db.collection(COLLECTIONS.rewardRequests)
    .where({ familyId: familyId })
    .orderBy('createdAt', 'desc')
    .get()

  let list = res.data || []
  if (isChildRole(user.role)) {
    if (!user.childId) return []
    list = list.filter(function (item) { return item.childId === user.childId })
  }
  if (status) {
    list = list.filter(function (item) { return item.status === status })
  }
  return list
}

async function actionGetRedeemHistory(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  const familyId = await resolveFamilyId(user, payload)
  if (!familyId) return []

  const scopedChildId = resolveScopedChildId(user, payload.childId)
  const res = await db.collection(COLLECTIONS.rewardRequests)
    .where({ familyId: familyId })
    .orderBy('createdAt', 'desc')
    .get()

  let list = res.data || []
  if (scopedChildId) {
    list = list.filter(function (item) { return item.childId === scopedChildId })
  }
  return list
}

async function assertRedeemPolicy(childId, reward, reasonText) {
  if (reward.requiresReason && !reasonText) {
    throw new Error('redeem reason is required')
  }

  const approvedRes = await db.collection(COLLECTIONS.rewardRequests)
    .where({ childId: childId, rewardId: reward._id, status: 'approved' })
    .orderBy('updatedAt', 'desc')
    .get()
  const approvedList = approvedRes.data || []

  if (reward.weeklyQuota > 0) {
    const weekStart = startOfWeekIso()
    const used = approvedList.filter(function (item) {
      const ts = new Date(item.updatedAt || item.createdAt || '').getTime()
      const base = new Date(weekStart).getTime()
      return !Number.isNaN(ts) && ts >= base
    }).length
    if (used >= reward.weeklyQuota) {
      throw new Error('weekly quota reached')
    }
  }

  if (reward.cooldownDays > 0 && approvedList.length) {
    const latest = approvedList[0]
    const latestTime = new Date(latest.updatedAt || latest.createdAt || '').getTime()
    if (!Number.isNaN(latestTime)) {
      const availableAt = new Date(addDaysIso(new Date(latestTime).toISOString(), reward.cooldownDays)).getTime()
      if (Date.now() < availableAt) {
        throw new Error('reward is in cooldown')
      }
    }
  }
}

async function actionRedeemReward(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  if (!isChildRole(user.role) && !isAdminRole(user.role)) {
    throw new Error('permission_denied')
  }
  const childId = resolveScopedChildId(user, payload.childId)
  const rewardId = payload.rewardId
  const reason = String(payload.reason || '').trim()
  if (!childId || !rewardId) throw new Error('childId and rewardId are required')

  const child = await getChildById(childId)
  if (!child) return { success: false }
  if (user.familyId && child.familyId !== user.familyId) throw new Error('permission_denied')

  const rewardRaw = await findOne(COLLECTIONS.rewards, { _id: rewardId })
  if (!rewardRaw) return { success: false }
  const reward = normalizeRewardModel(rewardRaw)

  if (reward.enabled === false) throw new Error('reward disabled')
  if (Number(child.currentPoints || 0) < Number(reward.cost || 0)) {
    throw new Error('insufficient points')
  }

  await assertRedeemPolicy(childId, reward, reason)

  const req = {
    _id: makeId('rr'),
    familyId: child.familyId || reward.familyId || '',
    childId: childId,
    rewardId: rewardId,
    rewardName: reward.name || '',
    rewardType: reward.rewardType || 'experience',
    cost: Number(reward.cost || 0),
    reason: reason,
    status: 'pending',
    auditNote: '',
    createdAt: nowIso(),
    updatedAt: nowIso()
  }

  await db.collection(COLLECTIONS.rewardRequests).add({ data: req })
  return { success: true, requestId: req._id }
}

async function actionAuditRedeem(event) {
  const payload = event || {}
  const requestId = payload.requestId
  if (!requestId) throw new Error('requestId is required')

  const approved = !!payload.approved
  const user = await ensureCurrentUser()
  assertAdminPermission(user)

  const request = await findOne(COLLECTIONS.rewardRequests, { _id: requestId })
  if (!request) return { success: false }
  if (user.familyId && request.familyId && request.familyId !== user.familyId) return { success: false }

  if (request.status === 'approved') {
    return { success: true, duplicated: true }
  }

  await db.collection(COLLECTIONS.rewardRequests).doc(requestId).update({
    data: {
      status: approved ? 'approved' : 'rejected',
      auditNote: payload.note || '',
      updatedAt: nowIso()
    }
  })

  if (approved) {
    const child = await getChildById(request.childId)
    if (child) {
      const cost = Number(request.cost || 0)
      const current = Number(child.currentPoints || 0)
      const nextBalance = current - cost

      await db.collection(COLLECTIONS.children).doc(child._id).update({
        data: {
          currentPoints: nextBalance,
          updatedAt: nowIso()
        }
      })

      await addPointRecord({
        familyId: request.familyId || child.familyId || '',
        childId: child._id,
        type: 'redeem',
        amount: -cost,
        balance: nextBalance,
        taskId: '',
        note: request.rewardName ? ('Redeem: ' + request.rewardName) : 'Redeem',
        operatorId: user._id,
        createdAt: nowIso()
      })

      await addGrowthRecord({
        familyId: request.familyId || child.familyId || '',
        childId: child._id,
        type: 'reward_behavior',
        sourceId: request._id,
        meta: {
          rewardType: request.rewardType || 'experience',
          rewardName: request.rewardName || '',
          cost: cost,
          approved: true,
          reason: request.reason || ''
        }
      })
    }
  }

  return { success: true }
}

async function actionGetWishRequests(event) {
  const payload = event || {}
  const status = payload.status
  const user = await ensureCurrentUser()
  const familyId = await resolveFamilyId(user, payload)
  if (!familyId) return []

  const res = await db.collection(COLLECTIONS.wishRequests)
    .where({ familyId: familyId })
    .orderBy('createdAt', 'desc')
    .get()

  let list = res.data || []
  if (isChildRole(user.role)) {
    if (!user.childId) return []
    list = list.filter(function (item) { return item.childId === user.childId })
  }
  if (status) list = list.filter(function (item) { return item.status === status })
  return list
}

async function actionSubmitWish(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  if (!isChildRole(user.role) && !isAdminRole(user.role)) {
    throw new Error('permission_denied')
  }

  let childId = resolveScopedChildId(user, payload.childId)
  let child = await getChildById(childId)
  if (!child) {
    const familyId = await resolveFamilyId(user, payload)
    child = await getFirstChildByFamily(familyId)
    childId = child ? child._id : ''
  }
  if (!child || !childId) return null
  if (user.familyId && child.familyId !== user.familyId) throw new Error('permission_denied')

  const wish = {
    _id: makeId('wr'),
    familyId: child.familyId,
    childId: childId,
    name: String(payload.name || '').trim() || 'Wish',
    iconIndex: clampInt(payload.iconIndex, 0, 999, 0),
    suggestedPoints: payload.suggestedPoints == null ? null : Number(payload.suggestedPoints),
    status: 'pending',
    createdAt: nowIso(),
    updatedAt: nowIso()
  }

  await db.collection(COLLECTIONS.wishRequests).add({ data: wish })
  return wish
}

async function actionAuditWish(event) {
  const payload = event || {}
  const wishId = payload.wishId
  if (!wishId) throw new Error('wishId is required')

  const user = await ensureCurrentUser()
  assertAdminPermission(user)

  const wish = await findOne(COLLECTIONS.wishRequests, { _id: wishId })
  if (!wish) return { success: false }
  if (user.familyId && wish.familyId && wish.familyId !== user.familyId) return { success: false }

  await db.collection(COLLECTIONS.wishRequests).doc(wishId).update({
    data: {
      status: payload.approved ? 'approved' : 'rejected',
      suggestedPoints: payload.suggestedPoints == null ? (wish.suggestedPoints == null ? null : Number(wish.suggestedPoints)) : Number(payload.suggestedPoints),
      updatedAt: nowIso()
    }
  })

  return { success: true }
}

exports.main = async (event) => {
  await ensureCollections()
  const action = event && (event.action || event.type)

  switch (action) {
    case 'getRecords': return actionGetRecords(event)
    case 'adjustPoints': return actionAdjustPoints(event)
    case 'getWeeklyTrend': return actionGetWeeklyTrend(event)
    case 'getRewards': return actionGetRewards(event)
    case 'createReward': return actionCreateReward(event)
    case 'getRewardRequests': return actionGetRewardRequests(event)
    case 'getRedeemHistory': return actionGetRedeemHistory(event)
    case 'redeemReward': return actionRedeemReward(event)
    case 'auditRedeem': return actionAuditRedeem(event)
    case 'getWishRequests': return actionGetWishRequests(event)
    case 'submitWish': return actionSubmitWish(event)
    case 'auditWish': return actionAuditWish(event)
    default:
      throw new Error('unknown action: ' + action)
  }
}
