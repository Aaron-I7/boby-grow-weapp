// API 缁熶竴鎺ュ彛灞?鈥?mock/浜戝嚱鏁板弻妯″紡鍒囨崲
var mock = require('./mock')
var avatar = require('./avatar')
var refreshManager = require('./refresh-manager')
var analytics = require('./analytics')
var app = getApp()
var DEFAULT_TTL_MS = 60 * 1000

function useMock() {
  return app.globalData.useMock
}

function cloneValue(value) {
  if (value === undefined || value === null) return value
  if (typeof value !== 'object') return value
  try {
    return JSON.parse(JSON.stringify(value))
  } catch (err) {
    return value
  }
}

function resolveReadOptions(opts) {
  var options = opts || {}
  var ttlMs = Number(options.ttlMs)
  if (isNaN(ttlMs) || ttlMs <= 0) {
    var appTtl = app && app.globalData ? Number(app.globalData.refreshTTL) : 0
    ttlMs = !isNaN(appTtl) && appTtl > 0 ? appTtl : DEFAULT_TTL_MS
  }
  return {
    force: !!options.force,
    ttlMs: ttlMs
  }
}

function getContextCacheKey(prefix, extra) {
  var globalData = app && app.globalData ? app.globalData : {}
  var user = globalData.userInfo || {}
  var familyId = globalData.familyId || user.familyId || ''
  var role = user.role || ''
  var userId = user._id || user.openId || ''
  return [prefix, familyId, role, userId, extra || ''].join('|')
}

function readWithCache(scope, key, opts, fetcher) {
  var options = resolveReadOptions(opts)
  var cacheKey = String(key || '__default__')

  if (!options.force && !refreshManager.shouldRefresh(scope, options.ttlMs)) {
    var cached = refreshManager.getCache(scope, cacheKey)
    if (cached !== undefined) return Promise.resolve(cloneValue(cached))
  }

  return refreshManager.withInflight(scope, cacheKey, function () {
    return Promise.resolve(fetcher()).then(function (result) {
      var cloned = cloneValue(result)
      refreshManager.setCache(scope, cacheKey, cloned)
      refreshManager.markFetched(scope)
      return cloneValue(cloned)
    })
  })
}

function markScopesDirty(scopes) {
  (scopes || []).forEach(function (scope) {
    refreshManager.markDirty(scope)
  })
}

function markChildrenChanged() {
  markScopesDirty(['shared.children', 'parent.dashboard', 'parent.childManage', 'parent.taskManage'])
}

function markRulesChanged() {
  markScopesDirty(['shared.rules', 'parent.taskManage', 'parent.dashboard'])
}

function markAuditChanged() {
  markScopesDirty(['shared.audit', 'parent.dashboard'])
}

function calcTurnaroundMinutesSafe(startAt, endAt) {
  return analytics.calcTurnaroundMinutes(startAt, endAt || new Date().toISOString())
}

function buildAuditEventMeta(meta, fallback) {
  var base = Object.assign({}, fallback || {})
  var extra = meta && typeof meta === 'object' ? meta : {}
  return Object.assign(base, extra)
}

function trackAuditEvents(eventType, entityId, approved, meta) {
  var info = meta || {}
  var result = approved ? 'approved' : 'rejected'
  var source = String(info.source || ('api.audit.' + eventType))
  var turnaroundMinutes = calcTurnaroundMinutesSafe(
    info.requestCreatedAt || info.requestSubmittedAt || '',
    info.auditAt || ''
  )

  var turnaroundPayload = {
    source: source,
    eventType: eventType,
    entityId: entityId || '',
    result: result,
    childId: info.childId || '',
    familyId: info.familyId || ''
  }
  if (turnaroundMinutes >= 0) turnaroundPayload.turnaroundMinutes = turnaroundMinutes
  analytics.trackAuditTurnaround(turnaroundPayload)

  if (eventType === 'task') {
    analytics.trackTaskCycleClosed({
      source: source,
      taskId: entityId || '',
      result: result,
      childId: info.childId || '',
      familyId: info.familyId || '',
      grantPoints: info.grantPoints ? 1 : 0
    })
    return
  }

  analytics.trackRewardLoopClosed({
    source: source,
    loopType: eventType === 'reward' ? 'reward_redeem' : 'wish_review',
    requestId: entityId || '',
    result: result,
    childId: info.childId || '',
    familyId: info.familyId || '',
    cost: Number(info.cost || 0),
    suggestedPoints: Number(info.suggestedPoints || 0)
  })
}

// 妯℃嫙寮傛
function resolve(data) {
  return new Promise(function (res) {
    setTimeout(function () { res(data) }, 200)
  })
}

function callCloud(name, action, data) {
  return wx.cloud.callFunction({
    name: name,
    data: Object.assign({ action: action }, data)
  }).then(function (res) { return res.result })
}

function normalizeChild(item) {
  if (!item) return null
  return avatar.withResolvedAvatar(item, 'child')
}

function normalizeAdult(item) {
  if (!item) return null
  return avatar.withResolvedAvatar(item, 'adult')
}

function normalizeSelf(item) {
  if (!item) return avatar.withResolvedAvatar({}, 'self')
  return avatar.withResolvedAvatar(item, 'self')
}

function getMockCurrentUser() {
  var users = mock.users || []
  if (!users.length) return null
  var globalUser = app && app.globalData ? app.globalData.userInfo : null
  if (globalUser && globalUser._id) {
    var hit = users.find(function (u) { return u._id === globalUser._id })
    if (hit) return hit
  }
  return users[0]
}

function getMockUserById(userId) {
  return (mock.users || []).find(function (u) { return u && u._id === userId }) || null
}

function getMockUserByOpenId(openId) {
  return (mock.users || []).find(function (u) { return u && u.openId === openId }) || null
}

function getMockFamilyId() {
  var currentUser = getMockCurrentUser() || {}
  return currentUser.familyId || ((mock.family || {})._id) || ''
}

function getMockScopedChildId(payloadChildId) {
  var currentUser = getMockCurrentUser() || {}
  if (currentUser.role === 'child') {
    return currentUser.childId || ''
  }
  return payloadChildId || ''
}

function getMockChildById(childId) {
  return (mock.children || []).find(function (item) { return item && item._id === childId }) || null
}

function getMockTicketStore() {
  if (!Array.isArray(mock.inviteTickets)) mock.inviteTickets = []
  return mock.inviteTickets
}

function randomMockTicket() {
  return ('T' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toUpperCase()
}

function getMockTicketStatus(ticket) {
  if (!ticket) return 'not_found'
  var now = Date.now()
  var expires = new Date(ticket.expiresAt || '').getTime()
  if (!isNaN(expires) && now > expires) return 'expired'
  var maxUses = Number(ticket.maxUses || 1)
  var usedCount = Number(ticket.usedCount || 0)
  if (usedCount >= maxUses) return 'used_up'
  return ticket.status || 'active'
}

function toDateKey(dateValue) {
  var d = new Date(dateValue)
  if (isNaN(d.getTime())) return ''
  var y = d.getFullYear()
  var m = String(d.getMonth() + 1).padStart(2, '0')
  var day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

function getTaskCompletedAt(task) {
  if (!task) return ''
  if (task.completedAt) return task.completedAt
  if (task.createdAt) return task.createdAt
  if (task.date) return task.date + 'T00:00:00.000Z'
  return ''
}

function ensureTaskCompletionFields(task) {
  var next = Object.assign({}, task || {})
  next.reflectionRequired = !!next.reflectionRequired
  if (next.status !== 'completed') return next
  var completedAt = getTaskCompletedAt(next) || new Date().toISOString()
  next.completedAt = completedAt
  next.completedDateKey = next.completedDateKey || toDateKey(completedAt)
  return next
}

function markTaskCompleted(task, completedBy) {
  if (!task) return
  var now = new Date().toISOString()
  task.status = 'completed'
  task.completedBy = completedBy || task.completedBy || 'user_001'
  task.completedAt = now
  task.completedDateKey = toDateKey(now)
}

function withinTimeRange(iso, startTime, endTime) {
  var time = new Date(iso).getTime()
  if (isNaN(time)) return false
  if (startTime) {
    var start = new Date(startTime).getTime()
    if (!isNaN(start) && time < start) return false
  }
  if (endTime) {
    var end = new Date(endTime).getTime()
    if (!isNaN(end) && time > end) return false
  }
  return true
}

function getMockCompletedTasks(options) {
  var opts = options || {}
  return (mock.tasks || [])
    .filter(function (task) {
      return task.childId === opts.childId && task.status === 'completed'
    })
    .map(ensureTaskCompletionFields)
    .filter(function (task) {
      return withinTimeRange(task.completedAt, opts.startTime, opts.endTime)
    })
    .sort(function (a, b) {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    })
}

// ========== 鐢ㄦ埛/瀹跺涵 ==========
function login(payload) {
  if (useMock()) {
    var currentUser = normalizeSelf(getMockCurrentUser() || {})
    var children = (mock.children || []).map(normalizeChild)
    var currentChildId = children[0] ? children[0]._id : ''
    if (app && app.globalData) {
      app.globalData.userInfo = currentUser
      app.globalData.currentChildId = currentChildId
      app.globalData.familyId = currentUser.familyId || (mock.family || {})._id || ''
    }
    return resolve({
      user: currentUser,
      currentUser: currentUser,
      family: mock.family,
      currentChildId: currentChildId
    })
  }
  return callCloud('user', 'login', payload || {}).then(function (result) {
    var data = result || {}
    var currentUser = data.currentUser || data.user
    if (currentUser) {
      currentUser = normalizeSelf(currentUser)
      data.currentUser = currentUser
      data.user = currentUser
    }
    return data
  })
}

function getFamily() {
  if (useMock()) return resolve(mock.family)
  return callCloud('user', 'getFamily')
}

function createFamily(data) {
  if (useMock()) {
    var familyId = 'family_' + Date.now()
    var family = Object.assign({}, mock.family || {}, {
      _id: familyId,
      name: data && data.name ? data.name : 'My Family',
      createdAt: new Date().toISOString()
    })
    mock.family = family
    var currentUser = getMockCurrentUser()
    if (currentUser) currentUser.familyId = familyId
    if (app && app.globalData) app.globalData.familyId = familyId
    return resolve(family).then(function (res) {
      markScopesDirty(['guard.onboarding'])
      return res
    })
  }
  return callCloud('user', 'createFamily', data).then(function (res) {
    markScopesDirty(['guard.onboarding'])
    return res
  })
}

function setFamilyMode(mode) {
  if (useMock()) {
    if (mock.family) {
      mock.family.mode = mode || 'points_basic'
      mock.family.schemaVersion = 'v2'
    }
    return resolve({ success: true, mode: mode || 'points_basic' })
  }
  return callCloud('user', 'setFamilyMode', { mode: mode })
}

function joinFamily(data) {
  if (useMock()) {
    var familyId = (data && data.familyId) || (mock.family && mock.family._id) || 'family_001'
    var currentUser = getMockCurrentUser()
    if (currentUser) currentUser.familyId = familyId
    if (app && app.globalData) app.globalData.familyId = familyId
    return resolve({ success: true, familyId: familyId }).then(function (res) {
      markScopesDirty(['guard.onboarding'])
      return res
    })
  }
  return callCloud('user', 'joinFamily', data).then(function (res) {
    markScopesDirty(['guard.onboarding'])
    return res
  })
}

function createChildBindTicket(data) {
  if (useMock()) {
    var payload = data || {}
    var childId = payload.childId
    var child = getMockChildById(childId)
    if (!child) return resolve({ ticket: '', expiresAt: '', sharePath: '', qrFileId: '' })

    var ticket = randomMockTicket()
    var expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    var ticketDoc = {
      ticket: ticket,
      type: 'child_bind',
      familyId: child.familyId || getMockFamilyId(),
      childId: child._id,
      status: 'active',
      expiresAt: expiresAt,
      maxUses: 1,
      usedCount: 0,
      consumedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    getMockTicketStore().push(ticketDoc)
    return resolve({
      ticket: ticket,
      type: 'child_bind',
      childId: child._id,
      expiresAt: expiresAt,
      sharePath: '/pages/invite-accept/index?ticket=' + encodeURIComponent(ticket),
      qrFileId: '',
      qrError: '',
      shareLink: '',
      shareLinkError: ''
    })
  }
  return callCloud('user', 'createChildBindTicket', data || {})
}

function createCoadminInviteTicket(data) {
  if (useMock()) {
    var ticket = randomMockTicket()
    var familyId = getMockFamilyId()
    var expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    var ticketDoc = {
      ticket: ticket,
      type: 'coadmin_invite',
      familyId: familyId,
      childId: '',
      status: 'active',
      expiresAt: expiresAt,
      maxUses: 5,
      usedCount: 0,
      consumedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    getMockTicketStore().push(ticketDoc)
    return resolve({
      ticket: ticket,
      type: 'coadmin_invite',
      expiresAt: expiresAt,
      sharePath: '/pages/invite-accept/index?ticket=' + encodeURIComponent(ticket),
      qrFileId: '',
      qrError: '',
      shareLink: '',
      shareLinkError: ''
    })
  }
  return callCloud('user', 'createCoadminInviteTicket', data || {})
}

function previewInviteTicket(ticket) {
  if (useMock()) {
    var token = String(ticket || '').trim()
    var doc = getMockTicketStore().find(function (item) { return item.ticket === token }) || null
    var child = doc && doc.childId ? getMockChildById(doc.childId) : null
    var family = mock.family || {}
    if (!doc) {
      return resolve({
        type: '',
        familyName: '',
        childNickname: '',
        expiresAt: '',
        status: 'not_found'
      })
    }
    return resolve({
      type: doc.type,
      familyName: family.name || '',
      childNickname: child ? (child.nickname || '') : '',
      expiresAt: doc.expiresAt,
      status: getMockTicketStatus(doc),
      maxUses: Number(doc.maxUses || 1),
      usedCount: Number(doc.usedCount || 0)
    })
  }
  return callCloud('user', 'previewInviteTicket', { ticket: ticket })
}

function confirmInviteTicket(ticket) {
  if (useMock()) {
    var token = String(ticket || '').trim()
    var doc = getMockTicketStore().find(function (item) { return item.ticket === token }) || null
    if (!doc) return Promise.reject(new Error('invite_not_found'))
    var status = getMockTicketStatus(doc)
    if (status !== 'active') return Promise.reject(new Error('invite_' + status))

    var currentUser = getMockCurrentUser() || getMockUserById('user_001')
    if (!currentUser) return Promise.reject(new Error('user_not_found'))
    var now = new Date().toISOString()

    if (doc.type === 'child_bind') {
      var child = getMockChildById(doc.childId)
      if (!child) return Promise.reject(new Error('child_not_found'))
      if (child.bindOpenId && child.bindOpenId !== currentUser.openId) {
        return Promise.reject(new Error('child_already_bound'))
      }

      var boundByOpenId = (mock.children || []).find(function (item) {
        return item.bindOpenId === currentUser.openId && item._id !== child._id
      })
      if (boundByOpenId) return Promise.reject(new Error('openid_already_bound'))

      child.bindOpenId = currentUser.openId
      currentUser.role = 'child'
      currentUser.childId = child._id
      currentUser.familyId = child.familyId
      if (!currentUser.nickname || currentUser.nickname === 'Parent') currentUser.nickname = child.nickname || 'Kid'
    } else if (doc.type === 'coadmin_invite') {
      currentUser.role = 'coadmin'
      currentUser.childId = ''
      currentUser.familyId = doc.familyId || currentUser.familyId
    } else {
      return Promise.reject(new Error('invite_type_invalid'))
    }

    doc.usedCount = Number(doc.usedCount || 0) + 1
    doc.updatedAt = now
    if (doc.usedCount >= Number(doc.maxUses || 1)) doc.status = 'consumed'

    if (app && app.globalData) {
      app.globalData.userInfo = normalizeSelf(currentUser)
      app.globalData.familyId = currentUser.familyId || ''
      app.globalData.currentChildId = currentUser.childId || ''
    }

    return resolve({
      success: true,
      type: doc.type,
      role: currentUser.role,
      childId: currentUser.childId || '',
      familyId: currentUser.familyId || '',
      currentUser: normalizeSelf(currentUser),
      user: normalizeSelf(currentUser)
    }).then(function (res) {
      markScopesDirty(['guard.onboarding'])
      return res
    })
  }
  return callCloud('user', 'confirmInviteTicket', { ticket: ticket }).then(function (res) {
    markScopesDirty(['guard.onboarding'])
    return res
  })
}

function unbindChildWechat(childId) {
  if (useMock()) {
    var id = String(childId || '').trim() || getMockScopedChildId('')
    if (!id) return resolve({ success: false })

    var child = getMockChildById(id)
    if (!child) return resolve({ success: false })
    var boundOpenId = child.bindOpenId
    child.bindOpenId = null

    if (boundOpenId) {
      var boundUser = getMockUserByOpenId(boundOpenId)
      if (boundUser && boundUser.role === 'child' && boundUser.childId === id) {
        boundUser.childId = ''
      }
    }

    return resolve({ success: true })
  }
  return callCloud('user', 'unbindChildWechat', { childId: childId })
}

// ========== 鍎跨 ==========
function getChildren(opts) {
  var key = getContextCacheKey('children')
  return readWithCache('shared.children', key, opts, function () {
    if (useMock()) {
      var familyId = app && app.globalData ? app.globalData.familyId : ''
      var currentUser = getMockCurrentUser() || {}
      var list = (mock.children || []).filter(function (item) {
        if (!familyId) return true
        return item.familyId === familyId
      })
      if (currentUser.role === 'child') {
        list = list.filter(function (item) { return item._id === currentUser.childId })
      }
      return resolve(list.map(normalizeChild))
    }
    return callCloud('user', 'getChildren').then(function (list) {
      return (list || []).map(normalizeChild)
    })
  })
}

function addChild(data) {
  if (useMock()) {
    var defaultFamilyId = (app && app.globalData && app.globalData.familyId) || (mock.family && mock.family._id) || 'family_001'
    var c = Object.assign({ _id: 'child_' + Date.now(), familyId: defaultFamilyId, totalPoints: 0, currentPoints: 0, level: 1, verifyCode: String(Math.floor(100000 + Math.random() * 900000)), bindOpenId: null, status: 'active', createdAt: new Date().toISOString() }, data)
    if (!c.avatarKey && c.avatarIndex !== undefined) {
      var presetKeys = avatar.getPresetKeys({ audience: 'child', mode: 'all' })
      var avatarIdx = Number(c.avatarIndex)
      if (isNaN(avatarIdx) || avatarIdx < 0) avatarIdx = 0
      avatarIdx = Math.floor(avatarIdx) % presetKeys.length
      c.avatarKey = presetKeys[avatarIdx] || presetKeys[0] || ''
    }
    if (!c.avatarUrl) {
      c.avatarUrl = avatar.resolveAvatar(c, 'child')
    }
    mock.children.push(c)
    return resolve(normalizeChild(c)).then(function (res) {
      markChildrenChanged()
      return res
    })
  }
  return callCloud('user', 'addChild', data).then(function (res) {
    markChildrenChanged()
    return res
  })
}

function editChild(data) {
  if (useMock()) {
    var idx = mock.children.findIndex(function (c) { return c._id === data._id })
    if (idx >= 0) {
      Object.assign(mock.children[idx], data)
      if (!mock.children[idx].avatarUrl) {
        mock.children[idx].avatarUrl = avatar.resolveAvatar(mock.children[idx], 'child')
      }
    }
    return resolve({ success: true }).then(function (res) {
      markChildrenChanged()
      return res
    })
  }
  return callCloud('user', 'editChild', data).then(function (res) {
    markChildrenChanged()
    return res
  })
}

function getChildDetail(childId) {
  if (useMock()) {
    var child = (mock.children || []).find(function (c) { return c._id === childId })
    return resolve(normalizeChild(child))
  }
  return callCloud('user', 'getChildDetail', { childId: childId }).then(function (item) {
    return normalizeChild(item)
  })
}

// ========== 鍗忕 ==========
function getCoadmins() {
  if (useMock()) {
    var currentUser = getMockCurrentUser() || {}
    if (currentUser.role === 'child') return resolve([])
    return resolve((mock.users || []).map(normalizeAdult))
  }
  return callCloud('user', 'getCoadmins').then(function (list) {
    return (list || []).map(normalizeAdult)
  })
}

function addCoadmin(data) {
  if (useMock()) return resolve({ success: true })
  return callCloud('user', 'addCoadmin', data)
}

function removeCoadmin(userId) {
  if (useMock()) return resolve({ success: true })
  return callCloud('user', 'removeCoadmin', { userId: userId })
}

// ========== 瑙勫垯 ==========
function getRules(category, opts) {
  var categoryKey = category || '__all__'
  var key = getContextCacheKey('rules', categoryKey)
  return readWithCache('shared.rules', key, opts, function () {
    if (useMock()) {
      var list = category ? mock.rules.filter(function (r) { return r.category === category }) : mock.rules
      return resolve(list)
    }
    return callCloud('task', 'getRules', { category: category })
  })
}

function createRule(data) {
  if (useMock()) {
    var r = Object.assign({ _id: 'rule_' + Date.now(), familyId: 'family_001', enabled: true, confirmedByChild: false, createdBy: 'user_001', createdAt: new Date().toISOString() }, data)
    mock.rules.push(r)
    return resolve(r).then(function (res) {
      markRulesChanged()
      return res
    })
  }
  return callCloud('task', 'createRule', data).then(function (res) {
    markRulesChanged()
    return res
  })
}

function updateRule(data) {
  if (useMock()) {
    var idx = mock.rules.findIndex(function (r) { return r._id === data._id })
    if (idx >= 0) Object.assign(mock.rules[idx], data)
    return resolve({ success: true }).then(function (res) {
      markRulesChanged()
      return res
    })
  }
  return callCloud('task', 'updateRule', data).then(function (res) {
    markRulesChanged()
    return res
  })
}

function toggleRule(ruleId, enabled) {
  if (useMock()) {
    var r = mock.rules.find(function (r) { return r._id === ruleId })
    if (r) r.enabled = enabled
    return resolve({ success: true }).then(function (res) {
      markRulesChanged()
      return res
    })
  }
  return callCloud('task', 'toggleRule', { ruleId: ruleId, enabled: enabled }).then(function (res) {
    markRulesChanged()
    return res
  })
}

// ========== 浠诲姟 ==========
function getTasks(childId, date, opts) {
  var key = getContextCacheKey('tasks', [childId || '', date || ''].join('|'))
  return readWithCache('parent.dashboard', key, opts, function () {
    if (useMock()) {
      var list = mock.tasks
        .filter(function (t) { return t.childId === childId && t.date === date })
        .map(function (task) {
          var next = ensureTaskCompletionFields(task)
          if (next.reflectionRequired === undefined) next.reflectionRequired = false
          return next
        })
      return resolve(list)
    }
    return callCloud('task', 'getTasks', { childId: childId, date: date }).then(function (list) {
      return (list || []).map(ensureTaskCompletionFields)
    })
  })
}

function completeTask(taskId) {
  if (useMock()) {
    var t = mock.tasks.find(function (t) { return t._id === taskId })
    if (t) markTaskCompleted(t, 'user_001')
    return resolve({ success: true }).then(function (res) {
      markAuditChanged()
      return res
    })
  }
  return callCloud('task', 'completeTask', { taskId: taskId }).then(function (res) {
    markAuditChanged()
    return res
  })
}

function submitTask(taskId, reflection) {
  if (useMock()) {
    var t = mock.tasks.find(function (t) { return t._id === taskId })
    if (t) {
      t.auditStatus = 'pending'
      t.reflection = (reflection || '').trim()
      t.reflectionSubmittedAt = new Date().toISOString()
    }
    return resolve({ success: true }).then(function (res) {
      markAuditChanged()
      return res
    })
  }
  return callCloud('task', 'submitTask', { taskId: taskId, reflection: reflection || '' }).then(function (res) {
    markAuditChanged()
    return res
  })
}

function auditTask(taskId, approved, note, feedbackType, feedbackText, grantPoints, meta) {
  if (useMock()) {
    var t = mock.tasks.find(function (t) { return t._id === taskId })
    if (t) {
      t.auditStatus = approved ? 'approved' : 'rejected'
      t.auditNote = note || ''
      t.feedbackType = feedbackType || 'none'
      t.feedbackText = feedbackText || ''
      if (grantPoints !== undefined) t.grantPoints = !!grantPoints
      if (approved) markTaskCompleted(t, t.completedBy || 'user_001')
    }
    return resolve({ success: true }).then(function (res) {
      markAuditChanged()
      trackAuditEvents('task', taskId, approved, buildAuditEventMeta(meta, {
        source: 'api.auditTask.mock',
        childId: t && t.childId ? t.childId : '',
        familyId: t && t.familyId ? t.familyId : '',
        requestSubmittedAt: t && (t.reflectionSubmittedAt || t.updatedAt || t.createdAt) ? (t.reflectionSubmittedAt || t.updatedAt || t.createdAt) : '',
        grantPoints: grantPoints === undefined ? false : !!grantPoints
      }))
      return res
    })
  }
  return callCloud('task', 'auditTask', {
    taskId: taskId,
    approved: approved,
    note: note,
    feedbackType: feedbackType,
    feedbackText: feedbackText,
    grantPoints: grantPoints
  }).then(function (res) {
    markAuditChanged()
    trackAuditEvents('task', taskId, approved, buildAuditEventMeta(meta, {
      source: 'api.auditTask.cloud',
      grantPoints: grantPoints === undefined ? false : !!grantPoints
    }))
    return res
  })
}

function getTaskCompletionOverview(params) {
  if (useMock()) {
    var categoryLabels = {
      habit: '\u597d\u4e60\u60ef',
      study: '\u5b66\u4e60\u4efb\u52a1',
      chore: '\u5bb6\u52a1\u52b3\u52a8',
      virtue: '\u54c1\u5fb7\u884c\u4e3a',
      other: '\u5176\u4ed6'
    }
    var completed = getMockCompletedTasks(params || {})
    var total = completed.length
    var categoryMap = {}
    var taskMap = {}

    completed.forEach(function (task) {
      var categoryKey = task.category || 'other'
      var ruleId = task.ruleId || task._id
      var ruleName = task.ruleName || '\u672a\u547d\u540d\u4efb\u52a1'

      if (!categoryMap[categoryKey]) {
        categoryMap[categoryKey] = {
          categoryKey: categoryKey,
          categoryName: categoryLabels[categoryKey] || categoryLabels.other,
          count: 0
        }
      }
      categoryMap[categoryKey].count += 1

      var taskKey = ruleId + '::' + ruleName
      if (!taskMap[taskKey]) {
        taskMap[taskKey] = {
          taskKey: taskKey,
          ruleId: ruleId,
          ruleName: ruleName,
          categoryKey: categoryKey,
          categoryName: categoryLabels[categoryKey] || categoryLabels.other,
          count: 0
        }
      }
      taskMap[taskKey].count += 1
    })

    var categorySummary = Object.keys(categoryMap).map(function (key) {
      var item = categoryMap[key]
      return Object.assign({}, item, {
        percent: total ? Number(((item.count / total) * 100).toFixed(2)) : 0
      })
    }).sort(function (a, b) { return b.count - a.count })

    var taskRanking = Object.keys(taskMap).map(function (key) { return taskMap[key] })
      .sort(function (a, b) { return b.count - a.count })

    return resolve({
      totalCompleted: total,
      categorySummary: categorySummary,
      taskRanking: taskRanking
    })
  }
  return callCloud('task', 'getTaskCompletionOverview', params || {})
}

function getTaskCompletionTimeline(params) {
  if (useMock()) {
    var payload = params || {}
    var pageNo = Number(payload.pageNo) || 1
    var pageSize = Number(payload.pageSize) || 10
    var completed = getMockCompletedTasks(payload)
    var start = (pageNo - 1) * pageSize
    var list = completed.slice(start, start + pageSize).map(function (task) {
      return {
        taskId: task._id,
        ruleId: task.ruleId || '',
        ruleName: task.ruleName || '\u672a\u547d\u540d\u4efb\u52a1',
        category: task.category || 'other',
        points: task.points || 0,
        completedAt: task.completedAt,
        completedDateKey: task.completedDateKey || toDateKey(task.completedAt),
        date: task.date || ''
      }
    })
    return resolve({
      list: list,
      total: completed.length,
      pageNo: pageNo,
      pageSize: pageSize,
      hasMore: start + pageSize < completed.length
    })
  }
  return callCloud('task', 'getTaskCompletionTimeline', params || {})
}

function getTaskCompletionCluster(params) {
  if (useMock()) {
    var payload = params || {}
    var clusterBy = payload.clusterBy || 'task'
    var completed = getMockCompletedTasks(payload)
    var bucketMap = {}

    completed.forEach(function (task) {
      var key = ''
      var label = ''
      if (clusterBy === 'day') {
        key = task.completedDateKey || toDateKey(task.completedAt)
        label = key
      } else if (clusterBy === 'category') {
        key = task.category || 'other'
        label = key
      } else {
        key = task.ruleId || task._id
        label = task.ruleName || '\u672a\u547d\u540d\u4efb\u52a1'
      }
      if (!bucketMap[key]) {
        bucketMap[key] = { key: key, label: label, count: 0 }
      }
      bucketMap[key].count += 1
    })

    var buckets = Object.keys(bucketMap).map(function (key) { return bucketMap[key] })
    buckets.sort(function (a, b) {
      if (clusterBy === 'day') return b.key.localeCompare(a.key)
      return b.count - a.count
    })

    return resolve({
      clusterBy: clusterBy,
      buckets: buckets,
      total: completed.length
    })
  }
  return callCloud('task', 'getTaskCompletionCluster', params || {})
}

// ========== 绉垎 ==========
function getPendingAuditSummary(opts) {
  var key = getContextCacheKey('pendingAuditSummary')
  return readWithCache('shared.audit', key, opts, function () {
    if (useMock()) {
      var currentUser = getMockCurrentUser() || {}
      var scopedChildId = currentUser.role === 'child' ? currentUser.childId : ''
      var taskPendingList = (mock.tasks || []).filter(function (item) {
        if (item.auditStatus !== 'pending') return false
        if (!scopedChildId) return true
        return item.childId === scopedChildId
      })
      var rewardPendingList = (mock.rewardRequests || []).filter(function (item) {
        if (item.status !== 'pending') return false
        if (!scopedChildId) return true
        return item.childId === scopedChildId
      })
      var wishPendingList = (mock.wishRequests || []).filter(function (item) {
        if (item.status !== 'pending') return false
        if (!scopedChildId) return true
        return item.childId === scopedChildId
      })

      var now = Date.now()
      var overdueMs = 24 * 60 * 60 * 1000
      function getItemTs(item) {
        var ts = new Date((item && (item.updatedAt || item.reflectionSubmittedAt || item.createdAt)) || '').getTime()
        return isNaN(ts) ? 0 : ts
      }
      function countOverdue(list) {
        return (list || []).filter(function (item) {
          var ts = getItemTs(item)
          if (!ts) return false
          return now - ts >= overdueMs
        }).length
      }

      var taskPending = taskPendingList.length
      var rewardPending = rewardPendingList.length
      var wishPending = wishPendingList.length
      var overdueTask = countOverdue(taskPendingList)
      var overdueReward = countOverdue(rewardPendingList)
      var overdueWish = countOverdue(wishPendingList)

      var oldestTs = 0
      ;(taskPendingList.concat(rewardPendingList, wishPendingList)).forEach(function (item) {
        var ts = getItemTs(item)
        if (!ts) return
        if (!oldestTs || ts < oldestTs) oldestTs = ts
      })
      return resolve({
        taskPending: taskPending,
        rewardPending: rewardPending,
        wishPending: wishPending,
        totalPending: taskPending + rewardPending + wishPending,
        overdueTask: overdueTask,
        overdueReward: overdueReward,
        overdueWish: overdueWish,
        overduePending: overdueTask + overdueReward + overdueWish,
        hasOverdue: overdueTask + overdueReward + overdueWish > 0,
        oldestPendingAt: oldestTs ? new Date(oldestTs).toISOString() : ''
      })
    }
    return callCloud('task', 'getPendingAuditSummary')
  })
}

function getPointRecords(childId) {
  if (useMock()) {
    var list = mock.pointRecords.filter(function (p) { return p.childId === childId })
    return resolve(list)
  }
  return callCloud('point', 'getRecords', { childId: childId })
}

function adjustPoints(childId, amount, note) {
  if (useMock()) return resolve({ success: true })
  return callCloud('point', 'adjustPoints', { childId: childId, amount: amount, note: note })
}

function getWeeklyTrend(childId, opts) {
  var key = getContextCacheKey('weeklyTrend', childId || '')
  return readWithCache('parent.dashboard', key, opts, function () {
    if (useMock()) return resolve(mock.weeklyTrend)
    return callCloud('point', 'getWeeklyTrend', { childId: childId })
  })
}

// ========== 濂栧姳 ==========
function getRewards() {
  if (useMock()) {
    return resolve((mock.rewards || []).map(function (item) {
      return Object.assign({
        rewardType: 'experience',
        weeklyQuota: 0,
        cooldownDays: 0,
        requiresReason: false
      }, item)
    }))
  }
  return callCloud('point', 'getRewards')
}

function createReward(data) {
  if (useMock()) {
    var r = Object.assign({ _id: 'reward_' + Date.now(), familyId: 'family_001', enabled: true, createdAt: new Date().toISOString() }, data)
    mock.rewards.push(r)
    return resolve(r)
  }
  return callCloud('point', 'createReward', data)
}

function getRewardRequests(status, opts) {
  var statusKey = status || '__all__'
  var key = getContextCacheKey('rewardRequests', statusKey)
  return readWithCache('shared.audit', key, opts, function () {
    if (useMock()) {
      var currentUser = getMockCurrentUser() || {}
      var list = status ? mock.rewardRequests.filter(function (r) { return r.status === status }) : mock.rewardRequests
      if (currentUser.role === 'child') {
        list = list.filter(function (item) { return item.childId === currentUser.childId })
      }
      return resolve(list)
    }
    return callCloud('point', 'getRewardRequests', { status: status })
  })
}

function getRedeemHistory(childId, opts) {
  var key = getContextCacheKey('redeemHistory', childId || '__all__')
  return readWithCache('shared.audit', key, opts, function () {
    if (useMock()) {
      var currentUser = getMockCurrentUser() || {}
      var scopedChildId = currentUser.role === 'child' ? currentUser.childId : (childId || '')
      var rewardMap = {}
      ;(mock.rewards || []).forEach(function (item) {
        rewardMap[item._id] = item
      })
      var list = (mock.rewardRequests || []).filter(function (item) {
        if (!scopedChildId) return true
        return item.childId === scopedChildId
      }).map(function (item) {
        var reward = rewardMap[item.rewardId] || {}
        return {
          _id: item._id,
          rewardId: item.rewardId || '',
          rewardName: item.rewardName || reward.name || '\u5956\u52b1',
          cost: item.cost || reward.cost || 0,
          childId: item.childId || '',
          status: item.status || 'pending',
          auditNote: item.auditNote || '',
          createdAt: item.createdAt || '',
          updatedAt: item.updatedAt || item.createdAt || ''
        }
      }).sort(function (a, b) {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      })
      return resolve(list)
    }
    return callCloud('point', 'getRedeemHistory', { childId: childId || '' })
  })
}

function redeemReward(childId, rewardId, reason) {
  if (useMock()) {
    var reward = (mock.rewards || []).find(function (item) { return item._id === rewardId }) || {}
    var request = {
      _id: 'rr_' + Date.now(),
      familyId: getMockFamilyId(),
      childId: childId,
      rewardId: rewardId,
      rewardName: reward.name || '\u5956\u52b1',
      cost: Number(reward.cost || 0),
      status: 'pending',
      reason: reason || '',
      auditNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    if (!Array.isArray(mock.rewardRequests)) mock.rewardRequests = []
    mock.rewardRequests.push(request)
    return resolve({ success: true }).then(function (res) {
      markAuditChanged()
      return res
    })
  }
  return callCloud('point', 'redeemReward', { childId: childId, rewardId: rewardId, reason: reason || '' }).then(function (res) {
    markAuditChanged()
    return res
  })
}

function auditRedeem(requestId, approved, note, meta) {
  if (useMock()) {
    var r = mock.rewardRequests.find(function (r) { return r._id === requestId })
    if (r) {
      var nextStatus = approved ? 'approved' : 'rejected'
      var prevStatus = r.status || 'pending'
      r.status = nextStatus
      r.auditNote = note || ''
      r.updatedAt = new Date().toISOString()

      if (approved && prevStatus !== 'approved') {
        var child = getMockChildById(r.childId)
        var cost = Number(r.cost || 0)
        if (child && cost > 0) {
          child.currentPoints = Math.max(0, Number(child.currentPoints || 0) - cost)
          if (!Array.isArray(mock.pointRecords)) mock.pointRecords = []
          mock.pointRecords.unshift({
            _id: 'pr_' + Date.now(),
            familyId: child.familyId || getMockFamilyId(),
            childId: child._id,
            type: 'redeem',
            amount: -cost,
            balance: child.currentPoints,
            taskId: '',
            note: 'Redeem: ' + (r.rewardName || '\u5956\u52b1'),
            operatorId: '',
            createdAt: new Date().toISOString()
          })
        }
      }
    }
    return resolve({ success: true }).then(function (res) {
      markAuditChanged()
      trackAuditEvents('reward', requestId, approved, buildAuditEventMeta(meta, {
        source: 'api.auditRedeem.mock',
        childId: r && r.childId ? r.childId : '',
        familyId: r && r.familyId ? r.familyId : '',
        requestCreatedAt: r && (r.createdAt || r.updatedAt) ? (r.createdAt || r.updatedAt) : '',
        cost: r && r.cost ? Number(r.cost) : 0
      }))
      return res
    })
  }
  return callCloud('point', 'auditRedeem', { requestId: requestId, approved: approved, note: note }).then(function (res) {
    markAuditChanged()
    trackAuditEvents('reward', requestId, approved, buildAuditEventMeta(meta, {
      source: 'api.auditRedeem.cloud'
    }))
    return res
  })
}

// ========== 蹇冩効 ==========
function getWishRequests(status, opts) {
  var statusKey = status || '__all__'
  var key = getContextCacheKey('wishRequests', statusKey)
  return readWithCache('shared.audit', key, opts, function () {
    if (useMock()) {
      var currentUser = getMockCurrentUser() || {}
      var list = status ? mock.wishRequests.filter(function (w) { return w.status === status }) : mock.wishRequests
      if (currentUser.role === 'child') {
        list = list.filter(function (item) { return item.childId === currentUser.childId })
      }
      return resolve(list)
    }
    return callCloud('point', 'getWishRequests', { status: status })
  })
}

function submitWish(data) {
  if (useMock()) {
    var w = Object.assign({ _id: 'wr_' + Date.now(), familyId: 'family_001', status: 'pending', createdAt: new Date().toISOString() }, data)
    mock.wishRequests.push(w)
    return resolve(w).then(function (res) {
      markAuditChanged()
      return res
    })
  }
  return callCloud('point', 'submitWish', data).then(function (res) {
    markAuditChanged()
    return res
  })
}

function auditWish(wishId, approved, suggestedPoints, meta) {
  if (useMock()) {
    var w = mock.wishRequests.find(function (w) { return w._id === wishId })
    if (w) { w.status = approved ? 'approved' : 'rejected'; w.suggestedPoints = suggestedPoints }
    return resolve({ success: true }).then(function (res) {
      markAuditChanged()
      trackAuditEvents('wish', wishId, approved, buildAuditEventMeta(meta, {
        source: 'api.auditWish.mock',
        childId: w && w.childId ? w.childId : '',
        familyId: w && w.familyId ? w.familyId : '',
        requestCreatedAt: w && (w.createdAt || w.updatedAt) ? (w.createdAt || w.updatedAt) : '',
        suggestedPoints: Number(suggestedPoints || 0)
      }))
      return res
    })
  }
  return callCloud('point', 'auditWish', { wishId: wishId, approved: approved, suggestedPoints: suggestedPoints }).then(function (res) {
    markAuditChanged()
    trackAuditEvents('wish', wishId, approved, buildAuditEventMeta(meta, {
      source: 'api.auditWish.cloud',
      suggestedPoints: Number(suggestedPoints || 0)
    }))
    return res
  })
}

// ========== 瀹跺涵璁剧疆 ==========
function updateDailyLimit(limit) {
  if (useMock()) {
    mock.family.dailyPointLimit = limit
    return resolve({ success: true }).then(function (res) {
      markScopesDirty(['parent.dashboard'])
      return res
    })
  }
  return callCloud('user', 'updateDailyLimit', { limit: limit }).then(function (res) {
    markScopesDirty(['parent.dashboard'])
    return res
  })
}

function updateProfile(data) {
  if (useMock()) {
    var current = getMockCurrentUser()
    if (current) Object.assign(current, data)
    var profile = normalizeSelf(current || {})
    if (app && app.globalData) app.globalData.userInfo = profile
    return resolve({ success: true, profile: profile }).then(function (res) {
      markScopesDirty(['parent.dashboard'])
      return res
    })
  }
  return callCloud('user', 'updateProfile', data).then(function (res) {
    markScopesDirty(['parent.dashboard'])
    return res
  })
}

function getProfile() {
  if (useMock()) {
    var current = normalizeSelf(getMockCurrentUser() || {})
    if (app && app.globalData) app.globalData.userInfo = current
    return resolve(current)
  }
  return callCloud('user', 'getProfile').then(function (profile) {
    return normalizeSelf(profile || {})
  })
}

function getMcpVerifyCode(childId) {
  if (useMock()) {
    var c = mock.children.find(function (c) { return c._id === childId })
    return resolve({ code: c ? c.verifyCode : '' })
  }
  return callCloud('mcp', 'getVerifyCode', { childId: childId })
}

function getGrowthOverview(params) {
  if (useMock()) {
    return resolve({
      totalRecords: 0,
      reflectionCount: 0,
      feedbackCount: 0,
      rewardBehaviorCount: 0,
      reflectionStreak: 0,
      typeSummary: []
    })
  }
  return callCloud('growth', 'getOverview', params || {})
}

function getGrowthTimeline(params) {
  if (useMock()) {
    return resolve({
      list: [],
      total: 0,
      pageNo: (params && params.pageNo) || 1,
      pageSize: (params && params.pageSize) || 10,
      hasMore: false
    })
  }
  return callCloud('growth', 'getTimeline', params || {})
}

function getStreakAndWeeklyDigest(params) {
  if (useMock()) {
    var payload = params || {}
    var childId = payload.childId || ''
    var now = new Date()
    var start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    var completed = getMockCompletedTasks({ childId: childId }).map(ensureTaskCompletionFields)

    var weekCompleted = completed.filter(function (task) {
      var time = new Date(task.completedAt || task.createdAt || 0).getTime()
      return !isNaN(time) && time >= start.getTime() && time <= now.getTime()
    })
    var weekPoints = weekCompleted.reduce(function (sum, task) {
      return sum + Number(task.points || 0)
    }, 0)

    var daySet = {}
    completed.forEach(function (task) {
      var key = task.completedDateKey || toDateKey(task.completedAt)
      if (key) daySet[key] = true
    })
    var streak = 0
    var probe = new Date(now)
    while (true) {
      var key = toDateKey(probe.toISOString())
      if (!daySet[key]) break
      streak += 1
      probe = new Date(probe.getTime() - 24 * 60 * 60 * 1000)
    }

    function buildChallenge(target, title) {
      var progress = Math.min(streak, target)
      return {
        target: target,
        title: title,
        progress: progress,
        reached: streak >= target,
        remaining: Math.max(target - streak, 0)
      }
    }

    var challengeList = [
      buildChallenge(3, '\u4e09\u65e5\u8fde\u51fb'),
      buildChallenge(7, '\u4e03\u65e5\u8fde\u51fb'),
      buildChallenge(14, '\u534a\u6708\u575a\u6301')
    ]

    return resolve({
      childId: childId,
      reflectionStreak: streak,
      weekCompletedCount: weekCompleted.length,
      weekPoints: weekPoints,
      digestText: '\u672c\u5468\u5df2\u5b8c\u6210' + weekCompleted.length + '\u9879\u4efb\u52a1\uff0c\u7d2f\u8ba1' + weekPoints + '\u79ef\u5206',
      challengeList: challengeList
    })
  }
  return callCloud('growth', 'getStreakAndWeeklyDigest', params || {})
}

module.exports = {
  login: login,
  getFamily: getFamily,
  createFamily: createFamily,
  setFamilyMode: setFamilyMode,
  joinFamily: joinFamily,
  createChildBindTicket: createChildBindTicket,
  createCoadminInviteTicket: createCoadminInviteTicket,
  previewInviteTicket: previewInviteTicket,
  confirmInviteTicket: confirmInviteTicket,
  unbindChildWechat: unbindChildWechat,
  getChildren: getChildren,
  addChild: addChild,
  editChild: editChild,
  getChildDetail: getChildDetail,
  getCoadmins: getCoadmins,
  addCoadmin: addCoadmin,
  removeCoadmin: removeCoadmin,
  getRules: getRules,
  createRule: createRule,
  updateRule: updateRule,
  toggleRule: toggleRule,
  getTasks: getTasks,
  completeTask: completeTask,
  submitTask: submitTask,
  auditTask: auditTask,
  getTaskCompletionOverview: getTaskCompletionOverview,
  getTaskCompletionTimeline: getTaskCompletionTimeline,
  getTaskCompletionCluster: getTaskCompletionCluster,
  getPendingAuditSummary: getPendingAuditSummary,
  getPointRecords: getPointRecords,
  adjustPoints: adjustPoints,
  getWeeklyTrend: getWeeklyTrend,
  getRewards: getRewards,
  createReward: createReward,
  getRewardRequests: getRewardRequests,
  getRedeemHistory: getRedeemHistory,
  redeemReward: redeemReward,
  auditRedeem: auditRedeem,
  getWishRequests: getWishRequests,
  submitWish: submitWish,
  auditWish: auditWish,
  updateDailyLimit: updateDailyLimit,
  getProfile: getProfile,
  updateProfile: updateProfile,
  getMcpVerifyCode: getMcpVerifyCode,
  getGrowthOverview: getGrowthOverview,
  getGrowthTimeline: getGrowthTimeline,
  getStreakAndWeeklyDigest: getStreakAndWeeklyDigest
}

