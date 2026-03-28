const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const COLLECTIONS = {
  users: 'users',
  children: 'children'
}

function getOpenId() {
  const ctx = cloud.getWXContext ? cloud.getWXContext() : {}
  return ctx.OPENID || 'local_openid'
}

function makeId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

function nowIso() {
  return new Date().toISOString()
}

async function ensureCollections() {
  for (const name of [COLLECTIONS.users, COLLECTIONS.children]) {
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

async function actionGetVerifyCode(event) {
  const payload = event || {}
  const childId = payload.childId

  if (childId) {
    const child = await findOne(COLLECTIONS.children, { _id: childId })
    return { code: child ? String(child.verifyCode || '') : '' }
  }

  const user = await ensureCurrentUser()
  if (!user.familyId) return { code: '' }

  const firstChildRes = await db.collection(COLLECTIONS.children)
    .where({ familyId: user.familyId })
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get()

  const child = firstChildRes.data && firstChildRes.data[0] ? firstChildRes.data[0] : null
  return { code: child ? String(child.verifyCode || '') : '' }
}

exports.main = async (event) => {
  await ensureCollections()
  const action = event && (event.action || event.type)

  switch (action) {
    case 'getVerifyCode':
      return actionGetVerifyCode(event)
    default:
      throw new Error('unknown action: ' + action)
  }
}
