const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const COLLECTIONS = {
  users: 'users',
  families: 'families',
  children: 'children',
  systemConfig: 'system_config',
  inviteTickets: 'invite_tickets'
}

const DEFAULT_DAILY_LIMIT = 500
const DEFAULT_FAMILY_MODE = 'points_basic'
const CURRENT_SCHEMA_VERSION = 'v2'

const INVITE_TYPE_CHILD_BIND = 'child_bind'
const INVITE_TYPE_COADMIN_INVITE = 'coadmin_invite'

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

function randomInviteCode() {
  let out = ''
  while (out.length < 6) {
    out += Math.random().toString(36).replace(/[^a-z0-9]/gi, '').toUpperCase()
  }
  return out.slice(0, 6)
}

function randomVerifyCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function randomTicketToken() {
  let out = ''
  while (out.length < 24) {
    out += Math.random().toString(36).replace(/[^a-z0-9]/gi, '').toUpperCase()
  }
  return out.slice(0, 24)
}

function sanitizeTicketToken(ticket) {
  return String(ticket || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
}

function addMinutesIso(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

function addHoursIso(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
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

function getInviteTicketStatus(ticketDoc) {
  if (!ticketDoc) return 'not_found'
  const status = String(ticketDoc.status || 'active')
  const now = Date.now()
  const expiresAt = new Date(ticketDoc.expiresAt || '').getTime()
  if (!Number.isNaN(expiresAt) && now > expiresAt) return 'expired'

  const maxUses = Math.max(1, Number(ticketDoc.maxUses || 1))
  const usedCount = Math.max(0, Number(ticketDoc.usedCount || 0))
  if (usedCount >= maxUses) return 'used_up'

  if (status !== 'active') return status
  return 'active'
}

async function findChildByVerifyCode(code) {
  if (!code) return null
  return findOne(COLLECTIONS.children, { verifyCode: String(code) })
}

async function ensureUniqueVerifyCode(preferredCode, excludeChildId) {
  const preferred = String(preferredCode || '').trim()
  if (preferred) {
    const hit = await findChildByVerifyCode(preferred)
    if (!hit || hit._id === excludeChildId) return preferred
    throw new Error('verifyCode already exists')
  }

  for (let i = 0; i < 20; i++) {
    const code = randomVerifyCode()
    const hit = await findChildByVerifyCode(code)
    if (!hit || hit._id === excludeChildId) return code
  }
  throw new Error('failed to allocate verifyCode')
}

async function ensureCollections() {
  const names = [
    COLLECTIONS.users,
    COLLECTIONS.families,
    COLLECTIONS.children,
    COLLECTIONS.systemConfig,
    COLLECTIONS.inviteTickets
  ]
  for (const name of names) {
    try {
      await db.createCollection(name)
    } catch (err) {
      // ignore collection exists errors
    }
  }
}

async function ensureSystemConfigSeed() {
  const res = await db.collection(COLLECTIONS.systemConfig).where({ key: 'schema' }).limit(1).get()
  if (res.data && res.data[0]) return

  await db.collection(COLLECTIONS.systemConfig).add({
    data: {
      _id: makeId('syscfg'),
      key: 'schema',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      migrationPhase: 'clean_v2',
      dualWriteEnabled: false,
      readNewEnabled: true,
      collections: [
        'families',
        'users',
        'children',
        'rules',
        'tasks',
        'point_records',
        'rewards',
        'reward_requests',
        'wish_requests',
        'growth_records',
        'invite_tickets',
        'system_config'
      ],
      indexChecklist: [
        { collection: 'children', fields: ['verifyCode'], unique: true },
        { collection: 'children', fields: ['familyId', 'status'], unique: false },
        { collection: 'rules', fields: ['familyId', 'enabled'], unique: false },
        { collection: 'tasks', fields: ['childId', 'date', 'status'], unique: false },
        { collection: 'point_records', fields: ['childId', 'createdAt'], unique: false },
        { collection: 'reward_requests', fields: ['familyId', 'status'], unique: false },
        { collection: 'wish_requests', fields: ['familyId', 'status'], unique: false },
        { collection: 'invite_tickets', fields: ['ticket'], unique: true },
        { collection: 'invite_tickets', fields: ['type', 'status', 'expiresAt'], unique: false }
      ],
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
  })
}

async function findOne(collection, where, orderField, orderDirection) {
  let query = db.collection(collection).where(where).limit(1)
  if (orderField) {
    query = query.orderBy(orderField, orderDirection || 'asc')
  }
  const res = await query.get()
  return res.data && res.data[0] ? res.data[0] : null
}

async function findUserByOpenId(openId) {
  return findOne(COLLECTIONS.users, { openId: openId })
}

async function findInviteTicketByToken(ticketToken) {
  const ticket = sanitizeTicketToken(ticketToken)
  if (!ticket) return null
  return findOne(COLLECTIONS.inviteTickets, { ticket: ticket })
}

async function allocateTicketToken() {
  for (let i = 0; i < 12; i++) {
    const ticket = randomTicketToken()
    const existing = await findInviteTicketByToken(ticket)
    if (!existing) return ticket
  }
  throw new Error('failed_to_allocate_ticket')
}

async function ensureCurrentUser(payload) {
  const openId = getOpenId()
  const current = await findUserByOpenId(openId)
  if (current) return current

  const user = {
    _id: makeId('user'),
    openId: openId,
    familyId: '',
    role: 'admin',
    childId: '',
    nickname: (payload && payload.nickname) || 'Parent',
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

async function getFamilyById(familyId) {
  if (!familyId) return null
  return findOne(COLLECTIONS.families, { _id: familyId })
}

async function updateUser(userId, patch) {
  if (!userId || !patch || !Object.keys(patch).length) return
  await db.collection(COLLECTIONS.users).doc(userId).update({ data: patch })
}

function normalizeFamilyModel(family) {
  if (!family) return family
  const patch = {}
  if (!family.mode) patch.mode = DEFAULT_FAMILY_MODE
  if (!family.schemaVersion) patch.schemaVersion = CURRENT_SCHEMA_VERSION
  if (!Object.prototype.hasOwnProperty.call(family, 'upgradeHintState')) patch.upgradeHintState = 'new'
  if (!family.updatedAt) patch.updatedAt = nowIso()
  if (!Object.keys(patch).length) return family

  return Object.assign({}, family, patch)
}

async function ensureFamilyForUser(user, preferredName) {
  if (user && user.familyId) {
    const existing = await getFamilyById(user.familyId)
    if (existing) {
      const normalized = normalizeFamilyModel(existing)
      if (normalized !== existing) {
        await db.collection(COLLECTIONS.families).doc(existing._id).update({ data: {
          mode: normalized.mode,
          schemaVersion: normalized.schemaVersion,
          upgradeHintState: normalized.upgradeHintState,
          updatedAt: normalized.updatedAt
        } })
      }
      return normalized
    }
  }

  const family = {
    _id: makeId('family'),
    name: preferredName || ((user && user.nickname) ? (user.nickname + "'s Family") : 'My Family'),
    creatorOpenId: user ? (user.openId || '') : '',
    dailyPointLimit: DEFAULT_DAILY_LIMIT,
    inviteCode: randomInviteCode(),
    mode: DEFAULT_FAMILY_MODE,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    upgradeHintState: 'new',
    createdAt: nowIso(),
    updatedAt: nowIso()
  }

  await db.collection(COLLECTIONS.families).add({ data: family })
  if (user && user._id) {
    await updateUser(user._id, {
      familyId: family._id,
      role: 'admin',
      childId: '',
      updatedAt: nowIso()
    })
    user.familyId = family._id
    user.role = 'admin'
    user.childId = ''
  }
  return family
}

async function listChildrenByFamily(familyId) {
  if (!familyId) return []
  const res = await db.collection(COLLECTIONS.children).where({ familyId: familyId }).orderBy('createdAt', 'asc').get()
  return (res.data || []).filter(function (item) {
    return item.status !== 'archived'
  })
}

function normalizeChildPayload(input) {
  const data = input || {}
  const initPoints = clampInt(data.currentPoints != null ? data.currentPoints : data.totalPoints, 0, 999999, 0)
  const totalPoints = clampInt(data.totalPoints != null ? data.totalPoints : initPoints, 0, 999999, initPoints)
  return {
    nickname: (data.nickname || '').trim() || 'Kid',
    age: clampInt(data.age, 1, 18, 6),
    gender: data.gender || 'male',
    avatarIndex: clampInt(data.avatarIndex, 0, 999, 0),
    avatarKey: data.avatarKey || '',
    avatarUrl: data.avatarUrl || '',
    totalPoints: totalPoints,
    currentPoints: initPoints,
    level: clampInt(data.level, 1, 999, 1),
    verifyCode: data.verifyCode || randomVerifyCode(),
    bindOpenId: data.bindOpenId || null,
    status: data.status || 'active'
  }
}

async function createInviteTicketDoc(options) {
  const opt = options || {}
  const ticket = await allocateTicketToken()
  const now = nowIso()
  const doc = {
    _id: makeId('inv'),
    ticket: ticket,
    type: opt.type || INVITE_TYPE_CHILD_BIND,
    familyId: opt.familyId || '',
    childId: opt.childId || '',
    inviteCode: opt.inviteCode || '',
    status: 'active',
    expiresAt: opt.expiresAt || addMinutesIso(30),
    maxUses: clampInt(opt.maxUses, 1, 99, 1),
    usedCount: 0,
    createdBy: opt.createdBy || '',
    consumedBy: [],
    createdAt: now,
    updatedAt: now
  }

  await db.collection(COLLECTIONS.inviteTickets).add({ data: doc })
  return doc
}

function buildInvitePaths(ticket) {
  const safeTicket = sanitizeTicketToken(ticket || '')
  const query = 'ticket=' + encodeURIComponent(safeTicket)
  return {
    page: 'pages/invite-accept/index',
    scene: 't=' + safeTicket,
    query: query,
    qrcodePath: 'pages/invite-accept/index?' + query,
    sharePath: '/pages/invite-accept/index?' + query
  }
}

function normalizeQrcodeBuffer(value) {
  if (!value) return null
  if (Buffer.isBuffer(value)) return value
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  }
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return null
    try {
      return Buffer.from(text, 'base64')
    } catch (err) {
      return null
    }
  }
  return null
}

function pickQrcodeBuffer(resp) {
  if (!resp) return null
  return normalizeQrcodeBuffer(
    resp.buffer ||
    (resp.result && resp.result.buffer) ||
    resp.fileContent ||
    (resp.result && resp.result.fileContent) ||
    ''
  )
}

function pickUrlScheme(resp) {
  const direct = resp && (
    resp.openlink ||
    resp.url_link ||
    resp.urlLink ||
    resp.url_scheme ||
    resp.urlScheme
  )
  if (direct) return String(direct).trim()
  const result = resp && resp.result
  const nested = result && (
    result.openlink ||
    result.url_link ||
    result.urlLink ||
    result.url_scheme ||
    result.urlScheme
  )
  return nested ? String(nested).trim() : ''
}

function formatOpenapiError(action, err, extra) {
  const e = err || {}
  const code = e.errCode || e.errcode || ''
  const message = e.message || e.errMsg || 'unknown_error'
  const detail = extra ? ('[' + extra + '] ') : ''
  return action + ': ' + detail + String(code ? (code + ' ') : '') + String(message)
}

async function createInviteArtifacts(inviteDoc) {
  const paths = buildInvitePaths(inviteDoc.ticket)
  let qrFileId = ''
  let qrError = ''
  let shareLink = ''
  let shareLinkError = ''
  const qrcodeErrors = []

  async function uploadBuffer(buffer, suffix) {
    if (!buffer) return ''
    const filename = suffix
      ? (inviteDoc.ticket + '-' + suffix + '.png')
      : (inviteDoc.ticket + '.png')
    const upload = await cloud.uploadFile({
      cloudPath: 'invite-tickets/' + inviteDoc.type + '/' + filename,
      fileContent: buffer
    })
    return upload && upload.fileID ? upload.fileID : ''
  }

  async function tryGetUnlimitedQrcode() {
    const versions = ['', 'develop', 'trial']
    for (let i = 0; i < versions.length; i++) {
      const envVersion = versions[i]
      try {
        const payload = {
          scene: paths.scene,
          page: paths.page,
          checkPath: false
        }
        if (envVersion) payload.envVersion = envVersion
        const resp = await cloud.openapi.wxacode.getUnlimited(payload)
        const buffer = pickQrcodeBuffer(resp)
        if (buffer) return { buffer: buffer, mode: 'getUnlimited', envVersion: envVersion }
        qrcodeErrors.push('wxacode.getUnlimited: [' + (envVersion || 'default') + '] empty_buffer')
      } catch (err) {
        qrcodeErrors.push(formatOpenapiError('wxacode.getUnlimited', err, envVersion || 'default'))
      }
    }
    return { buffer: null, mode: '', envVersion: '' }
  }

  async function tryGetLegacyQrcode() {
    const versions = ['', 'develop', 'trial']
    for (let i = 0; i < versions.length; i++) {
      const envVersion = versions[i]
      try {
        const payload = {
          path: paths.qrcodePath
        }
        if (envVersion) payload.envVersion = envVersion
        const resp = await cloud.openapi.wxacode.get(payload)
        const buffer = pickQrcodeBuffer(resp)
        if (buffer) return { buffer: buffer, mode: 'get', envVersion: envVersion }
        qrcodeErrors.push('wxacode.get: [' + (envVersion || 'default') + '] empty_buffer')
      } catch (err) {
        qrcodeErrors.push(formatOpenapiError('wxacode.get', err, envVersion || 'default'))
      }
    }
    return { buffer: null, mode: '', envVersion: '' }
  }

  async function createShareScheme() {
    const expireMinutes = inviteDoc.type === INVITE_TYPE_CHILD_BIND ? 30 : (24 * 60)
    const versions = ['release', 'trial', 'develop']
    const errors = []
    for (let i = 0; i < versions.length; i++) {
      const envVersion = versions[i]
      try {
        const resp = await cloud.openapi.urlscheme.generate({
          jump_wxa: {
            path: paths.page,
            query: paths.query,
            env_version: envVersion
          },
          is_expire: true,
          expire_type: 1,
          expire_interval: expireMinutes
        })
        const scheme = pickUrlScheme(resp)
        if (scheme) return { shareLink: scheme, error: '' }
        errors.push('urlscheme.generate: [' + envVersion + '] empty_response')
      } catch (err) {
        errors.push(formatOpenapiError('urlscheme.generate', err, envVersion))
      }
    }
    return { shareLink: '', error: errors.join(' | ') }
  }

  const primaryResult = await tryGetUnlimitedQrcode()
  if (primaryResult.buffer) {
    qrFileId = await uploadBuffer(primaryResult.buffer, 'unlimited')
  }

  if (!qrFileId) {
    const fallbackResult = await tryGetLegacyQrcode()
    if (fallbackResult.buffer) {
      qrFileId = await uploadBuffer(fallbackResult.buffer, 'fallback')
    }
  }

  if (!qrFileId && qrcodeErrors.length) {
    qrError = qrcodeErrors.join(' | ')
    console.error('create invite qrcode failed', {
      ticket: inviteDoc.ticket,
      type: inviteDoc.type,
      errors: qrcodeErrors
    })
  }

  const schemeResult = await createShareScheme()
  shareLink = schemeResult.shareLink
  shareLinkError = schemeResult.error

  return {
    sharePath: paths.sharePath,
    qrFileId: qrFileId,
    qrError: qrError,
    shareLink: shareLink,
    shareLinkError: shareLinkError
  }
}

async function buildInvitePreview(inviteDoc) {
  if (!inviteDoc) {
    return {
      type: '',
      familyName: '',
      childNickname: '',
      expiresAt: '',
      status: 'not_found'
    }
  }

  const family = inviteDoc.familyId ? await getFamilyById(inviteDoc.familyId) : null
  const child = inviteDoc.childId ? await findOne(COLLECTIONS.children, { _id: inviteDoc.childId }) : null

  return {
    type: inviteDoc.type || '',
    familyName: family ? String(family.name || '') : '',
    childNickname: child ? String(child.nickname || '') : '',
    expiresAt: inviteDoc.expiresAt || '',
    status: getInviteTicketStatus(inviteDoc),
    maxUses: Number(inviteDoc.maxUses || 1),
    usedCount: Number(inviteDoc.usedCount || 0)
  }
}

async function confirmInviteTicketTransactional(inviteDoc, user) {
  const openId = user.openId || getOpenId()

  return db.runTransaction(async function (transaction) {
    const now = nowIso()
    const inviteRes = await transaction.collection(COLLECTIONS.inviteTickets).doc(inviteDoc._id).get()
    const freshInvite = inviteRes && inviteRes.data ? inviteRes.data : null
    if (!freshInvite) throw new Error('invite_not_found')

    const status = getInviteTicketStatus(freshInvite)
    if (status !== 'active') throw new Error('invite_' + status)

    let result = null

    if (freshInvite.type === INVITE_TYPE_CHILD_BIND) {
      if (!freshInvite.childId) throw new Error('invite_target_missing')

      const childRes = await transaction.collection(COLLECTIONS.children).doc(freshInvite.childId).get()
      const child = childRes && childRes.data ? childRes.data : null
      if (!child) throw new Error('invite_target_missing')
      if (freshInvite.familyId && child.familyId !== freshInvite.familyId) {
        throw new Error('invite_family_mismatch')
      }

      if (child.bindOpenId && child.bindOpenId !== openId) {
        throw new Error('child_already_bound')
      }

      const bindRes = await transaction.collection(COLLECTIONS.children).where({ bindOpenId: openId }).limit(1).get()
      const boundChild = bindRes.data && bindRes.data[0] ? bindRes.data[0] : null
      if (boundChild && boundChild._id !== child._id) {
        throw new Error('openid_already_bound')
      }

      if (isChildRole(user.role) && user.childId && user.childId !== child._id) {
        throw new Error('user_already_bound_other_child')
      }

      await transaction.collection(COLLECTIONS.children).doc(child._id).update({
        data: {
          bindOpenId: openId,
          updatedAt: now
        }
      })

      const userPatch = {
        familyId: child.familyId || freshInvite.familyId || '',
        role: 'child',
        childId: child._id,
        updatedAt: now
      }
      if (!user.nickname || user.nickname === 'Parent') {
        userPatch.nickname = child.nickname || user.nickname || 'Kid'
      }

      await transaction.collection(COLLECTIONS.users).doc(user._id).update({ data: userPatch })

      result = {
        success: true,
        type: freshInvite.type,
        role: 'child',
        childId: child._id,
        familyId: child.familyId || ''
      }
    } else if (freshInvite.type === INVITE_TYPE_COADMIN_INVITE) {
      if (!freshInvite.familyId) throw new Error('invite_family_missing')
      if (isChildRole(user.role) && user.childId) throw new Error('child_user_must_unbind_first')

      const nextRole = user.role === 'admin' && user.familyId === freshInvite.familyId ? 'admin' : 'coadmin'

      await transaction.collection(COLLECTIONS.users).doc(user._id).update({
        data: {
          familyId: freshInvite.familyId,
          role: nextRole,
          childId: '',
          updatedAt: now
        }
      })

      result = {
        success: true,
        type: freshInvite.type,
        role: nextRole,
        childId: '',
        familyId: freshInvite.familyId
      }
    } else {
      throw new Error('invite_type_invalid')
    }

    const maxUses = Math.max(1, Number(freshInvite.maxUses || 1))
    const nextUsedCount = Math.max(0, Number(freshInvite.usedCount || 0)) + 1
    const nextStatus = nextUsedCount >= maxUses ? 'consumed' : 'active'
    const consumedBy = Array.isArray(freshInvite.consumedBy) ? freshInvite.consumedBy.slice(0) : []
    if (consumedBy.indexOf(user._id) === -1) consumedBy.push(user._id)

    await transaction.collection(COLLECTIONS.inviteTickets).doc(freshInvite._id).update({
      data: {
        usedCount: nextUsedCount,
        status: nextStatus,
        consumedBy: consumedBy,
        lastConsumedAt: now,
        updatedAt: now
      }
    })

    return result
  })
}

async function actionLogin(event) {
  const user = await ensureCurrentUser(event)
  const family = normalizeFamilyModel(await getFamilyById(user.familyId))
  const children = family ? await listChildrenByFamily(family._id) : []

  let currentChildId = ''
  if (isChildRole(user.role) && user.childId) {
    currentChildId = user.childId
  } else {
    currentChildId = children[0] ? children[0]._id : ''
  }

  return {
    user: user,
    currentUser: user,
    family: family,
    familyId: family ? family._id : '',
    currentChildId: currentChildId
  }
}

async function actionGetFamily() {
  const user = await ensureCurrentUser()
  const family = normalizeFamilyModel(await getFamilyById(user.familyId))
  if (!family) return null

  if (!family.mode || !family.schemaVersion) {
    await db.collection(COLLECTIONS.families).doc(family._id).update({
      data: {
        mode: family.mode || DEFAULT_FAMILY_MODE,
        schemaVersion: family.schemaVersion || CURRENT_SCHEMA_VERSION,
        upgradeHintState: family.upgradeHintState || 'new',
        updatedAt: nowIso()
      }
    })
  }

  return family
}

async function actionCreateFamily(event) {
  const payload = event || {}
  const user = await ensureCurrentUser(payload)
  if (isChildRole(user.role) && user.childId) {
    throw new Error('child_user_cannot_create_family')
  }

  if (user.familyId) {
    const existing = await getFamilyById(user.familyId)
    if (existing) return normalizeFamilyModel(existing)
  }

  const family = await ensureFamilyForUser(user, (payload.name || '').trim())
  return family
}

async function actionJoinFamily(event) {
  const payload = event || {}
  const inviteCode = String(payload.inviteCode || '').trim().toUpperCase()
  const user = await ensureCurrentUser(payload)
  if (isChildRole(user.role) && user.childId) {
    throw new Error('child_user_must_unbind_first')
  }

  let family = null
  if (inviteCode) {
    family = await findOne(COLLECTIONS.families, { inviteCode: inviteCode })
  }

  if (!family && user.familyId) {
    family = await getFamilyById(user.familyId)
  }

  if (!family) {
    const anyFamily = await db.collection(COLLECTIONS.families).limit(1).get()
    family = anyFamily.data && anyFamily.data[0] ? anyFamily.data[0] : null
  }

  if (!family) {
    family = await ensureFamilyForUser(user, (payload.familyName || '').trim())
  }
  family = normalizeFamilyModel(family)

  const nextPatch = {
    familyId: family._id,
    role: 'coadmin',
    childId: '',
    updatedAt: nowIso()
  }
  if (payload.nickname) nextPatch.nickname = String(payload.nickname).trim()
  await updateUser(user._id, nextPatch)
  const currentUser = Object.assign({}, user, nextPatch)

  return {
    success: true,
    familyId: family._id,
    family: family,
    currentUser: currentUser,
    user: currentUser
  }
}

async function actionGetChildren() {
  const user = await ensureCurrentUser()

  if (isChildRole(user.role)) {
    if (!user.childId) return []
    const child = await findOne(COLLECTIONS.children, { _id: user.childId })
    if (!child) return []
    if (user.familyId && child.familyId !== user.familyId) return []
    if (child.status === 'archived') return []
    return [child]
  }

  if (!user.familyId) return []
  return listChildrenByFamily(user.familyId)
}

async function actionAddChild(event) {
  const user = await ensureCurrentUser()
  assertAdminPermission(user)

  const family = await ensureFamilyForUser(user)
  const payload = normalizeChildPayload(event)
  const verifyCode = await ensureUniqueVerifyCode(payload.verifyCode)

  const child = {
    _id: makeId('child'),
    familyId: family._id,
    nickname: payload.nickname,
    age: payload.age,
    gender: payload.gender,
    avatarIndex: payload.avatarIndex,
    avatarKey: payload.avatarKey,
    avatarUrl: payload.avatarUrl,
    totalPoints: payload.totalPoints,
    currentPoints: payload.currentPoints,
    level: payload.level,
    verifyCode: verifyCode,
    bindOpenId: payload.bindOpenId,
    status: payload.status,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }

  await db.collection(COLLECTIONS.children).add({ data: child })
  return child
}

async function actionEditChild(event) {
  const payload = event || {}
  const childId = payload._id || payload.childId
  if (!childId) throw new Error('child id is required')

  const user = await ensureCurrentUser()
  assertAdminPermission(user)

  const child = await findOne(COLLECTIONS.children, { _id: childId })
  if (!child) return { success: false }
  if (user.familyId && child.familyId !== user.familyId) return { success: false }

  const patch = Object.assign({}, payload)
  delete patch._id
  delete patch.childId

  if (Object.prototype.hasOwnProperty.call(patch, 'verifyCode')) {
    patch.verifyCode = await ensureUniqueVerifyCode(patch.verifyCode, childId)
  }

  patch.updatedAt = nowIso()
  await db.collection(COLLECTIONS.children).doc(childId).update({ data: patch })

  return { success: true }
}

async function actionGetChildDetail(event) {
  const payload = event || {}
  const childId = payload.childId
  if (!childId) throw new Error('childId is required')

  const user = await ensureCurrentUser()
  if (isChildRole(user.role) && !user.childId) return null
  if (isChildRole(user.role) && user.childId && user.childId !== childId) return null

  const child = await findOne(COLLECTIONS.children, { _id: childId })
  if (!child) return null
  if (user.familyId && child.familyId !== user.familyId) return null
  if (child.status === 'archived') return null
  return child
}

async function actionGetCoadmins() {
  const user = await ensureCurrentUser()
  assertAdminPermission(user)
  if (!user.familyId) return []

  const res = await db.collection(COLLECTIONS.users)
    .where({
      familyId: user.familyId,
      role: _.in(['admin', 'coadmin'])
    })
    .orderBy('createdAt', 'asc')
    .get()

  return res.data || []
}

async function actionAddCoadmin(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  assertAdminPermission(user)

  const family = await ensureFamilyForUser(user)

  if (payload.userId) {
    await db.collection(COLLECTIONS.users).doc(payload.userId).update({
      data: {
        familyId: family._id,
        role: 'coadmin',
        childId: '',
        updatedAt: nowIso()
      }
    })
    return { success: true }
  }

  const openId = String(payload.openId || '').trim()
  if (openId) {
    const existing = await findOne(COLLECTIONS.users, { openId: openId })
    if (existing) {
      await updateUser(existing._id, {
        familyId: family._id,
        role: 'coadmin',
        childId: '',
        nickname: payload.nickname ? String(payload.nickname).trim() : existing.nickname,
        updatedAt: nowIso()
      })
      return { success: true }
    }
  }

  const member = {
    _id: makeId('user'),
    openId: openId || ('coadmin_' + Date.now()),
    familyId: family._id,
    role: 'coadmin',
    childId: '',
    nickname: String(payload.nickname || 'Coadmin').trim(),
    identity: payload.identity || 'other',
    gender: payload.gender || 'neutral',
    avatarKey: payload.avatarKey || '',
    avatarUrl: payload.avatarUrl || '',
    createdAt: nowIso(),
    updatedAt: nowIso()
  }

  await db.collection(COLLECTIONS.users).add({ data: member })
  return { success: true }
}

async function actionRemoveCoadmin(event) {
  const payload = event || {}
  const userId = payload.userId
  if (!userId) throw new Error('userId is required')

  const current = await ensureCurrentUser()
  assertAdminPermission(current)

  const target = await findOne(COLLECTIONS.users, { _id: userId })
  if (!target) return { success: false }
  if (current.familyId && target.familyId !== current.familyId) return { success: false }

  await db.collection(COLLECTIONS.users).doc(userId).update({
    data: {
      role: 'member',
      familyId: '',
      childId: '',
      updatedAt: nowIso()
    }
  })

  return { success: true }
}

async function actionCreateChildBindTicket(event) {
  const payload = event || {}
  const childId = String(payload.childId || '').trim()
  if (!childId) throw new Error('childId is required')

  const user = await ensureCurrentUser()
  assertAdminPermission(user)

  const child = await findOne(COLLECTIONS.children, { _id: childId })
  if (!child) throw new Error('child_not_found')
  if (user.familyId && child.familyId !== user.familyId) throw new Error('permission_denied')

  const ticketDoc = await createInviteTicketDoc({
    type: INVITE_TYPE_CHILD_BIND,
    familyId: child.familyId || user.familyId || '',
    childId: child._id,
    inviteCode: '',
    expiresAt: addMinutesIso(30),
    maxUses: 1,
    createdBy: user._id
  })

  const artifacts = await createInviteArtifacts(ticketDoc)
  return {
    ticket: ticketDoc.ticket,
    type: ticketDoc.type,
    childId: child._id,
    expiresAt: ticketDoc.expiresAt,
    sharePath: artifacts.sharePath,
    qrFileId: artifacts.qrFileId,
    qrError: artifacts.qrError,
    shareLink: artifacts.shareLink,
    shareLinkError: artifacts.shareLinkError
  }
}

async function actionCreateCoadminInviteTicket() {
  const user = await ensureCurrentUser()
  assertAdminPermission(user)

  const family = await ensureFamilyForUser(user)
  const ticketDoc = await createInviteTicketDoc({
    type: INVITE_TYPE_COADMIN_INVITE,
    familyId: family._id,
    childId: '',
    inviteCode: family.inviteCode || '',
    expiresAt: addHoursIso(24),
    maxUses: 5,
    createdBy: user._id
  })

  const artifacts = await createInviteArtifacts(ticketDoc)
  return {
    ticket: ticketDoc.ticket,
    type: ticketDoc.type,
    expiresAt: ticketDoc.expiresAt,
    sharePath: artifacts.sharePath,
    qrFileId: artifacts.qrFileId,
    qrError: artifacts.qrError,
    shareLink: artifacts.shareLink,
    shareLinkError: artifacts.shareLinkError
  }
}

async function actionPreviewInviteTicket(event) {
  const payload = event || {}
  const ticketToken = sanitizeTicketToken(payload.ticket)
  if (!ticketToken) {
    return {
      type: '',
      familyName: '',
      childNickname: '',
      expiresAt: '',
      status: 'not_found'
    }
  }

  const inviteDoc = await findInviteTicketByToken(ticketToken)
  return buildInvitePreview(inviteDoc)
}

async function actionConfirmInviteTicket(event) {
  const payload = event || {}
  const ticketToken = sanitizeTicketToken(payload.ticket)
  if (!ticketToken) throw new Error('ticket is required')

  const user = await ensureCurrentUser()
  const inviteDoc = await findInviteTicketByToken(ticketToken)
  if (!inviteDoc) throw new Error('invite_not_found')

  const status = getInviteTicketStatus(inviteDoc)
  if (status !== 'active') throw new Error('invite_' + status)

  const result = await confirmInviteTicketTransactional(inviteDoc, user)
  const nextUser = await findUserByOpenId(user.openId)

  return Object.assign({}, result, {
    currentUser: nextUser || user,
    user: nextUser || user
  })
}

async function actionUnbindChildWechat(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()

  if (isChildRole(user.role)) {
    const childId = user.childId
    if (!childId) return { success: false, reason: 'child_not_bound' }
    if (payload.childId && payload.childId !== childId) throw new Error('permission_denied')

    const child = await findOne(COLLECTIONS.children, { _id: childId })
    if (!child) return { success: false, reason: 'child_not_found' }
    if (child.bindOpenId && child.bindOpenId !== user.openId) throw new Error('permission_denied')

    await db.collection(COLLECTIONS.children).doc(childId).update({
      data: {
        bindOpenId: null,
        updatedAt: nowIso()
      }
    })

    await updateUser(user._id, {
      childId: '',
      updatedAt: nowIso()
    })

    return { success: true }
  }

  assertAdminPermission(user)
  const childId = String(payload.childId || '').trim()
  if (!childId) throw new Error('childId is required')

  const child = await findOne(COLLECTIONS.children, { _id: childId })
  if (!child) return { success: false, reason: 'child_not_found' }
  if (user.familyId && child.familyId !== user.familyId) throw new Error('permission_denied')

  const oldBindOpenId = child.bindOpenId || ''

  await db.collection(COLLECTIONS.children).doc(child._id).update({
    data: {
      bindOpenId: null,
      updatedAt: nowIso()
    }
  })

  if (oldBindOpenId) {
    const boundUser = await findUserByOpenId(oldBindOpenId)
    if (boundUser && boundUser.role === 'child' && boundUser.childId === child._id) {
      await updateUser(boundUser._id, {
        childId: '',
        updatedAt: nowIso()
      })
    }
  }

  return { success: true }
}

async function actionUpdateDailyLimit(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()
  assertAdminPermission(user)

  const family = await ensureFamilyForUser(user)
  const limit = clampInt(payload.limit, 1, 9999, DEFAULT_DAILY_LIMIT)

  await db.collection(COLLECTIONS.families).doc(family._id).update({
    data: {
      dailyPointLimit: limit,
      updatedAt: nowIso()
    }
  })

  return { success: true }
}

async function actionSetFamilyMode(event) {
  const payload = event || {}
  const mode = String(payload.mode || '').trim()
  const allow = { points_basic: true, hybrid_growth: true, intrinsic_only: true }
  if (!allow[mode]) throw new Error('invalid mode')

  const user = await ensureCurrentUser()
  assertAdminPermission(user)

  const family = await ensureFamilyForUser(user)

  await db.collection(COLLECTIONS.families).doc(family._id).update({
    data: {
      mode: mode,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      modeUpdatedAt: nowIso(),
      updatedAt: nowIso()
    }
  })

  return { success: true, mode: mode }
}

async function actionGetProfile() {
  return ensureCurrentUser()
}

async function actionUpdateProfile(event) {
  const payload = event || {}
  const user = await ensureCurrentUser()

  const patch = {}
  const allowed = ['nickname', 'identity', 'gender', 'avatarUrl', 'avatarKey']
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      patch[key] = payload[key]
    }
  }
  patch.updatedAt = nowIso()

  await db.collection(COLLECTIONS.users).doc(user._id).update({ data: patch })
  const profile = Object.assign({}, user, patch)

  return {
    success: true,
    profile: profile
  }
}

exports.main = async (event) => {
  await ensureCollections()
  await ensureSystemConfigSeed()
  const action = event && (event.action || event.type)

  switch (action) {
    case 'login': return actionLogin(event)
    case 'getFamily': return actionGetFamily(event)
    case 'createFamily': return actionCreateFamily(event)
    case 'joinFamily': return actionJoinFamily(event)
    case 'getChildren': return actionGetChildren(event)
    case 'addChild': return actionAddChild(event)
    case 'editChild': return actionEditChild(event)
    case 'getChildDetail': return actionGetChildDetail(event)
    case 'getCoadmins': return actionGetCoadmins(event)
    case 'addCoadmin': return actionAddCoadmin(event)
    case 'removeCoadmin': return actionRemoveCoadmin(event)
    case 'createChildBindTicket': return actionCreateChildBindTicket(event)
    case 'createCoadminInviteTicket': return actionCreateCoadminInviteTicket(event)
    case 'previewInviteTicket': return actionPreviewInviteTicket(event)
    case 'confirmInviteTicket': return actionConfirmInviteTicket(event)
    case 'unbindChildWechat': return actionUnbindChildWechat(event)
    case 'updateDailyLimit': return actionUpdateDailyLimit(event)
    case 'setFamilyMode': return actionSetFamilyMode(event)
    case 'getProfile': return actionGetProfile(event)
    case 'updateProfile': return actionUpdateProfile(event)
    default:
      throw new Error('unknown action: ' + action)
  }
}
