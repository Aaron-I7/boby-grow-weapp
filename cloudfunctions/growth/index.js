const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const COLLECTIONS = {
  users: 'users',
  children: 'children',
  growthRecords: 'growth_records',
  points: 'point_records'
}

function clampInt(value, min, max, fallback) {
  const num = Number(value)
  if (Number.isNaN(num)) return fallback
  return Math.max(min, Math.min(max, Math.floor(num)))
}

function toDateKey(dateValue) {
  if (!dateValue) return ''
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return ''
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
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

function calcReflectionStreak(records) {
  const reflection = records.filter(function (r) { return r.type === 'reflection' })
  const dayMap = {}
  reflection.forEach(function (r) {
    const key = toDateKey(r.createdAt)
    if (key) dayMap[key] = true
  })

  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  for (;;) {
    const key = toDateKey(cursor.toISOString())
    if (!dayMap[key]) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

async function ensureCollections() {
  for (const name of [COLLECTIONS.users, COLLECTIONS.children, COLLECTIONS.growthRecords, COLLECTIONS.points]) {
    try {
      await db.createCollection(name)
    } catch (err) {
      // ignore collection exists errors
    }
  }
}

async function actionGetOverview(event) {
  const payload = event || {}
  const childId = payload.childId
  if (!childId) {
    return {
      totalRecords: 0,
      reflectionCount: 0,
      feedbackCount: 0,
      rewardBehaviorCount: 0,
      reflectionStreak: 0,
      typeSummary: []
    }
  }

  const res = await db.collection(COLLECTIONS.growthRecords)
    .where({ childId: childId })
    .orderBy('createdAt', 'desc')
    .get()

  const records = (res.data || []).filter(function (item) {
    return withinTimeRange(item.createdAt, payload.startTime, payload.endTime)
  })

  const typeMap = {}
  records.forEach(function (item) {
    const type = item.type || 'unknown'
    if (!typeMap[type]) {
      typeMap[type] = { type: type, count: 0 }
    }
    typeMap[type].count += 1
  })

  const reflectionCount = typeMap.reflection ? typeMap.reflection.count : 0
  const feedbackCount = typeMap.parent_feedback ? typeMap.parent_feedback.count : 0
  const rewardBehaviorCount = typeMap.reward_behavior ? typeMap.reward_behavior.count : 0

  return {
    totalRecords: records.length,
    reflectionCount: reflectionCount,
    feedbackCount: feedbackCount,
    rewardBehaviorCount: rewardBehaviorCount,
    reflectionStreak: calcReflectionStreak(records),
    typeSummary: Object.keys(typeMap).map(function (key) { return typeMap[key] }).sort(function (a, b) { return b.count - a.count })
  }
}

async function actionGetTimeline(event) {
  const payload = event || {}
  const childId = payload.childId
  if (!childId) {
    return {
      list: [],
      total: 0,
      pageNo: 1,
      pageSize: 10,
      hasMore: false
    }
  }

  const pageNo = clampInt(payload.pageNo, 1, 99999, 1)
  const pageSize = clampInt(payload.pageSize, 1, 100, 10)
  const type = payload.type ? String(payload.type) : ''

  const res = await db.collection(COLLECTIONS.growthRecords)
    .where({ childId: childId })
    .orderBy('createdAt', 'desc')
    .get()

  let records = (res.data || []).filter(function (item) {
    return withinTimeRange(item.createdAt, payload.startTime, payload.endTime)
  })

  if (type) {
    records = records.filter(function (item) { return item.type === type })
  }

  const start = (pageNo - 1) * pageSize
  const page = records.slice(start, start + pageSize)

  return {
    list: page,
    total: records.length,
    pageNo: pageNo,
    pageSize: pageSize,
    hasMore: start + pageSize < records.length
  }
}

async function actionGetStreakAndWeeklyDigest(event) {
  const payload = event || {}
  const childId = payload.childId
  if (!childId) {
    return {
      childId: '',
      reflectionStreak: 0,
      weekCompletedCount: 0,
      weekPoints: 0,
      digestText: '本周暂无成长记录',
      challengeList: [
        { target: 3, title: '三日连击', progress: 0, reached: false, remaining: 3 },
        { target: 7, title: '七日连击', progress: 0, reached: false, remaining: 7 },
        { target: 14, title: '半月坚持', progress: 0, reached: false, remaining: 14 }
      ]
    }
  }

  const now = Date.now()
  const weekStartTs = now - 6 * 24 * 60 * 60 * 1000

  const growthRes = await db.collection(COLLECTIONS.growthRecords)
    .where({ childId: childId })
    .orderBy('createdAt', 'desc')
    .get()

  const records = growthRes.data || []
  const weekRecords = records.filter(function (item) {
    const ts = new Date(item.createdAt || '').getTime()
    return !Number.isNaN(ts) && ts >= weekStartTs && ts <= now
  })

  const pointRes = await db.collection(COLLECTIONS.points)
    .where({ childId: childId })
    .orderBy('createdAt', 'desc')
    .get()
  const weekPoints = (pointRes.data || []).reduce(function (sum, item) {
    const ts = new Date(item.createdAt || '').getTime()
    const amount = Number(item.amount || 0)
    if (Number.isNaN(ts) || ts < weekStartTs || ts > now || amount <= 0) return sum
    return sum + amount
  }, 0)

  const streak = calcReflectionStreak(records)
  function buildChallenge(target, title) {
    const progress = Math.min(streak, target)
    return {
      target: target,
      title: title,
      progress: progress,
      reached: streak >= target,
      remaining: Math.max(target - streak, 0)
    }
  }

  const challengeList = [
    buildChallenge(3, '三日连击'),
    buildChallenge(7, '七日连击'),
    buildChallenge(14, '半月坚持')
  ]

  return {
    childId: childId,
    reflectionStreak: streak,
    weekCompletedCount: weekRecords.length,
    weekPoints: weekPoints,
    digestText: '本周记录' + weekRecords.length + '条，累计获得' + weekPoints + '积分',
    challengeList: challengeList
  }
}

exports.main = async (event) => {
  await ensureCollections()
  const action = event && (event.action || event.type)

  switch (action) {
    case 'getOverview': return actionGetOverview(event)
    case 'getTimeline': return actionGetTimeline(event)
    case 'getStreakAndWeeklyDigest': return actionGetStreakAndWeeklyDigest(event)
    default:
      throw new Error('unknown action: ' + action)
  }
}
