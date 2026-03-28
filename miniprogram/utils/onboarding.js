var STORAGE_KEYS = {
  session: 'session',
  onboarding: 'onboarding',
  onboardingCompleted: 'onboarding_completed'
}

var STATUS = {
  notLoggedIn: 'not_logged_in',
  familyPending: 'family_pending',
  profilePending: 'profile_pending',
  childPending: 'child_pending',
  bindGuidePending: 'bind_guide_pending',
  ready: 'ready'
}

var ROUTES = {}
ROUTES[STATUS.notLoggedIn] = '/pages/auth/login/index'
ROUTES[STATUS.familyPending] = '/pages/auth/family-select/index'
ROUTES[STATUS.profilePending] = '/pages/parent/profile-edit/index?mode=onboarding'
ROUTES[STATUS.childPending] = '/pages/parent/add-child/index?mode=onboarding'
ROUTES[STATUS.bindGuidePending] = '/pages/parent/mcp-verify/index?mode=onboarding'
ROUTES[STATUS.ready] = '/pages/parent/dashboard/index'

var TAB_ROUTES = {
  '/pages/parent/dashboard/index': true,
  '/pages/parent/task-manage/index': true,
  '/pages/parent/child-manage/index': true,
  '/pages/parent/setting/index': true
}

function nowIso() {
  return new Date().toISOString()
}

function safeGetStorageSync(key, fallback) {
  try {
    var value = wx.getStorageSync(key)
    return value === undefined || value === '' ? fallback : value
  } catch (err) {
    return fallback
  }
}

function safeSetStorageSync(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (err) {}
}

function safeRemoveStorageSync(key) {
  try {
    wx.removeStorageSync(key)
  } catch (err) {}
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}))
}

function getDefaultOnboarding() {
  return {
    status: STATUS.notLoggedIn,
    completed: false,
    profileDone: false,
    childStepDone: false,
    bindGuideDone: false,
    childSkipped: false,
    bindGuideSkipped: false,
    updatedAt: nowIso()
  }
}

function normalizePath(url) {
  return String(url || '').split('?')[0]
}

function isProfileComplete(userInfo) {
  var user = userInfo || {}
  var nickname = String(user.nickname || '').trim()
  var identity = String(user.identity || '').trim()
  var hasAvatar = !!(user.avatarUrl || user.avatarKey)
  return !!nickname && !!identity && hasAvatar
}

function getSession() {
  var session = safeGetStorageSync(STORAGE_KEYS.session, {})
  if (!session || typeof session !== 'object') return {}
  return session
}

function saveSession(session) {
  var next = Object.assign({}, session || {})
  safeSetStorageSync(STORAGE_KEYS.session, next)
  return next
}

function mergeSession(patch) {
  var current = getSession()
  var next = Object.assign({}, current, patch || {})
  return saveSession(next)
}

function clearSession() {
  safeRemoveStorageSync(STORAGE_KEYS.session)
}

function getOnboarding() {
  var state = safeGetStorageSync(STORAGE_KEYS.onboarding, null)
  var completedFlag = !!safeGetStorageSync(STORAGE_KEYS.onboardingCompleted, false)
  var fallback = getDefaultOnboarding()
  if (!state || typeof state !== 'object') state = fallback
  state = Object.assign({}, fallback, state)
  if (completedFlag) {
    state.completed = true
    state.status = STATUS.ready
  }
  return state
}

function saveOnboarding(state) {
  var base = getDefaultOnboarding()
  var next = Object.assign({}, base, state || {})
  if (next.status === STATUS.ready) next.completed = true
  next.updatedAt = nowIso()
  safeSetStorageSync(STORAGE_KEYS.onboarding, next)
  safeSetStorageSync(STORAGE_KEYS.onboardingCompleted, !!next.completed)
  return next
}

function updateOnboarding(patch) {
  var current = getOnboarding()
  var next = Object.assign({}, current, patch || {})
  return saveOnboarding(next)
}

function resetOnboarding() {
  safeRemoveStorageSync(STORAGE_KEYS.onboarding)
  safeSetStorageSync(STORAGE_KEYS.onboardingCompleted, false)
  return getDefaultOnboarding()
}

function getRouteByStatus(status) {
  return ROUTES[status] || ROUTES[STATUS.notLoggedIn]
}

function isTabRoute(path) {
  return !!TAB_ROUTES[normalizePath(path)]
}

function evaluateStatus(context) {
  var ctx = context || {}
  var state = Object.assign({}, getDefaultOnboarding(), ctx.onboarding || {})
  var userInfo = ctx.userInfo || {}
  var role = String((ctx.role || userInfo.role || '')).trim()
  var profileDone = !!state.profileDone || isProfileComplete(userInfo)

  if (!ctx.loggedIn) return STATUS.notLoggedIn
  if (!ctx.familyId) return STATUS.familyPending
  if (state.completed) return STATUS.ready

  // 协管家长和孩子身份不阻断资料补全
  if (role === 'coadmin' || role === 'child') return STATUS.ready

  // 主流程仅阻断到资料完善，孩子与绑定改为首页可选任务
  if (!profileDone) return STATUS.profilePending
  return STATUS.ready
}

module.exports = {
  STORAGE_KEYS: STORAGE_KEYS,
  STATUS: STATUS,
  ROUTES: clone(ROUTES),
  getDefaultOnboarding: getDefaultOnboarding,
  normalizePath: normalizePath,
  isProfileComplete: isProfileComplete,
  getSession: getSession,
  saveSession: saveSession,
  mergeSession: mergeSession,
  clearSession: clearSession,
  getOnboarding: getOnboarding,
  saveOnboarding: saveOnboarding,
  updateOnboarding: updateOnboarding,
  resetOnboarding: resetOnboarding,
  getRouteByStatus: getRouteByStatus,
  isTabRoute: isTabRoute,
  evaluateStatus: evaluateStatus
}

