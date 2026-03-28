var onboarding = require('./utils/onboarding')
var invite = require('./utils/invite')
var refreshManager = require('./utils/refresh-manager')
var analytics = require('./utils/analytics')
var MOCK_FLAG_STORAGE_KEY = '__USE_MOCK__'
var CLOUD_ENV_STORAGE_KEY = '__CLOUDBASE_ENV__'
var LEGACY_ENV_FALLBACK = 'cloudbase-1g26i1txc0ae8f4b'
var CUTOVER_ENV = 'cloudbase-1g26i1txc0ae8f4b'
var DEFAULT_REFRESH_TTL = 60 * 1000

function hasUserIdentity(userInfo) {
  var user = userInfo || {}
  return !!(user._id || user.openId || user.nickname)
}

function isChildRole(userInfo) {
  return String((userInfo && userInfo.role) || '').trim() === 'child'
}

function pickCurrentUser(result) {
  var data = result || {}
  return data.currentUser || data.user || null
}

function resolveFamilyId(result, userInfo, fallback) {
  var data = result || {}
  var family = data.family || {}
  return family._id || data.familyId || (userInfo && userInfo.familyId) || fallback || ''
}

function resolveUseMockFlag(defaultValue) {
  var fallback = !!defaultValue
  try {
    var stored = wx.getStorageSync(MOCK_FLAG_STORAGE_KEY)
    if (stored === undefined || stored === null || stored === '') return fallback
    if (stored === true || stored === 1 || stored === '1' || stored === 'true') return true
    if (stored === false || stored === 0 || stored === '0' || stored === 'false') return false
  } catch (err) {}
  return fallback
}

function resolveCloudEnv(preferred) {
  var fallback = LEGACY_ENV_FALLBACK
  var candidate = preferred || ''
  if (!candidate || candidate.indexOf('REPLACE_WITH_NEW_ENV') > -1) candidate = ''
  try {
    var stored = wx.getStorageSync(CLOUD_ENV_STORAGE_KEY)
    if (stored && typeof stored === 'string' && stored.trim()) {
      candidate = stored.trim()
    }
  } catch (err) {}
  return candidate || fallback
}

function trackOnboardingTransitions(prev, next, source) {
  var before = prev || {}
  var after = next || {}
  var trackSource = String(source || 'app.setOnboardingState')

  if (!before.profileDone && after.profileDone) {
    analytics.trackOnboardingStep('profile', {
      source: trackSource,
      status: after.status || ''
    })
  }

  if (!before.childStepDone && after.childStepDone) {
    analytics.trackOnboardingStep('child', {
      source: trackSource,
      status: after.status || '',
      skipped: after.childSkipped ? 1 : 0
    })
  }

  if (!before.bindGuideDone && after.bindGuideDone) {
    analytics.trackOnboardingStep('bind_guide', {
      source: trackSource,
      status: after.status || '',
      skipped: after.bindGuideSkipped ? 1 : 0
    })
  }

  if (!before.completed && after.completed) {
    analytics.trackOnboardingStep('ready', {
      source: trackSource,
      status: after.status || ''
    })
  }
}

App({
  onLaunch: function () {
    var session = onboarding.getSession()
    var onboardState = onboarding.getOnboarding()
    var defaultUseMock = false
    var useMock = resolveUseMockFlag(defaultUseMock)
    var cloudEnv = resolveCloudEnv(CUTOVER_ENV)

    this.globalData = {
      env: cloudEnv,
      useMock: useMock,
      refreshTTL: DEFAULT_REFRESH_TTL,
      userInfo: session.userInfo || null,
      currentChildId: session.currentChildId || '',
      familyId: session.familyId || '',
      pendingInviteTicket: invite.getPendingTicket(),
      session: session,
      onboarding: onboardState,
      onboardingStatus: onboardState.status,
      defaultUseMock: defaultUseMock
    }

    if (!wx.cloud) {
      console.error('Please use basic library 2.2.3+ to enable cloud capability')
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true
      })
    }

    var launchOptions = null
    if (wx.getLaunchOptionsSync) {
      launchOptions = wx.getLaunchOptionsSync()
    }
    this.capturePendingInviteFromOptions(launchOptions)
  },

  onShow: function (options) {
    this.capturePendingInviteFromOptions(options)
  },

  getRefreshTTL: function () {
    var ttl = this.globalData && this.globalData.refreshTTL
    if (typeof ttl !== 'number' || isNaN(ttl) || ttl <= 0) return DEFAULT_REFRESH_TTL
    return ttl
  },

  shouldScopeRefresh: function (scope, ttlMs) {
    var ttl = typeof ttlMs === 'number' ? ttlMs : this.getRefreshTTL()
    return refreshManager.shouldRefresh(scope, ttl)
  },

  markScopeDirty: function (scope) {
    if (Array.isArray(scope)) {
      scope.forEach(function (item) { refreshManager.markDirty(item) })
      return
    }
    refreshManager.markDirty(scope)
  },

  markScopeFetched: function (scope) {
    refreshManager.markFetched(scope)
  },

  setCurrentChildId: function (childId) {
    var nextId = childId || ''
    this.globalData.currentChildId = nextId
    this.syncSession({ currentChildId: nextId })
    return nextId
  },

  setUseMock: function (enabled, persist) {
    var next = !!enabled
    this.globalData.useMock = next
    if (persist !== false) {
      try {
        wx.setStorageSync(MOCK_FLAG_STORAGE_KEY, next ? '1' : '0')
      } catch (err) {}
    }
    return next
  },

  getUseMock: function () {
    return !!this.globalData.useMock
  },

  setPendingInviteTicket: function (ticket) {
    var token = invite.setPendingTicket(ticket || '')
    this.globalData.pendingInviteTicket = token
    return token
  },

  clearPendingInviteTicket: function () {
    invite.clearPendingTicket()
    this.globalData.pendingInviteTicket = ''
  },

  capturePendingInviteFromOptions: function (options) {
    var ticket = invite.resolveTicketFromOptions(options || {})
    if (!ticket) return ''
    return this.setPendingInviteTicket(ticket)
  },

  syncSession: function (patch) {
    var next = Object.assign({
      loggedIn: hasUserIdentity(this.globalData.userInfo),
      userInfo: this.globalData.userInfo || null,
      familyId: this.globalData.familyId || '',
      currentChildId: this.globalData.currentChildId || ''
    }, patch || {})

    next.updatedAt = new Date().toISOString()
    this.globalData.session = onboarding.mergeSession(next)
    return this.globalData.session
  },

  setOnboardingState: function (patch) {
    var before = this.globalData.onboarding || onboarding.getOnboarding()
    var nextPatch = Object.assign({}, patch || {})
    var source = nextPatch.source || 'app.setOnboardingState'
    if (Object.prototype.hasOwnProperty.call(nextPatch, 'source')) delete nextPatch.source
    var next = onboarding.updateOnboarding(nextPatch)
    this.globalData.onboarding = next
    this.globalData.onboardingStatus = next.status
    this.markScopeDirty('guard.onboarding')
    trackOnboardingTransitions(before, next, source)
    return next
  },

  setOnboardingStatus: function (status, patch) {
    var merged = Object.assign({}, patch || {}, { status: status })
    if (status === onboarding.STATUS.ready) merged.completed = true
    return this.setOnboardingState(merged)
  },

  completeOnboarding: function (patch) {
    return this.setOnboardingStatus(onboarding.STATUS.ready, Object.assign({
      completed: true,
      childStepDone: true,
      bindGuideDone: true
    }, patch || {}))
  },

  applyLoginResult: function (result, meta) {
    var data = result || {}
    var currentUser = pickCurrentUser(data)
    var familyId = resolveFamilyId(data, currentUser, this.globalData.familyId)
    var currentChildId = data.currentChildId || ''

    if (currentUser) {
      currentUser = Object.assign({}, currentUser)
      if (familyId && !currentUser.familyId) currentUser.familyId = familyId
      this.globalData.userInfo = currentUser
    }

    this.globalData.familyId = familyId || ''
    this.globalData.currentChildId = currentChildId || ''

    this.syncSession({
      loggedIn: true,
      loginCode: meta && meta.code ? meta.code : '',
      lastLoginAt: new Date().toISOString()
    })
    this.markScopeDirty('guard.onboarding')
  },

  bootstrapOnboarding: function (options) {
    var that = this
    var opts = options || {}
    var scope = 'guard.onboarding'
    var ttl = typeof opts.ttlMs === 'number' ? opts.ttlMs : this.getRefreshTTL()
    var force = !!opts.force

    if (!force && !refreshManager.shouldRefresh(scope, ttl)) {
      var cachedStatus = refreshManager.getCache(scope, 'status')
      if (cachedStatus) return Promise.resolve(cachedStatus)
    }

    return refreshManager.withInflight(scope, 'bootstrap', function () {
      var state = onboarding.getOnboarding()
      var session = onboarding.getSession()

      if (!that.globalData.userInfo && session.userInfo) that.globalData.userInfo = session.userInfo
      if (!that.globalData.familyId && session.familyId) that.globalData.familyId = session.familyId
      if (!that.globalData.currentChildId && session.currentChildId) that.globalData.currentChildId = session.currentChildId

      var userInfo = that.globalData.userInfo || null
      var role = (userInfo && userInfo.role) || ''
      var familyId = that.globalData.familyId || (userInfo && userInfo.familyId) || ''
      var loggedIn = !!(session.loggedIn || hasUserIdentity(userInfo))
      var profileDone = !!state.profileDone || onboarding.isProfileComplete(userInfo)

      if (!loggedIn) {
        that.setOnboardingStatus(onboarding.STATUS.notLoggedIn, {
          completed: false
        })
        return onboarding.STATUS.notLoggedIn
      }

      if (!familyId) {
        that.syncSession({ loggedIn: true, familyId: '' })
        that.setOnboardingStatus(onboarding.STATUS.familyPending, {
          completed: false
        })
        return onboarding.STATUS.familyPending
      }

      that.globalData.familyId = familyId

      var api = require('./utils/api')
      return api.getChildren({ ttlMs: ttl, force: force }).then(function (list) {
        var children = list || []
        var hasChildren = children.length > 0
        if (hasChildren && !that.globalData.currentChildId) {
          that.globalData.currentChildId = children[0]._id || ''
        }

        var nextStatus = onboarding.evaluateStatus({
          onboarding: state,
          loggedIn: true,
          familyId: familyId,
          userInfo: userInfo,
          role: role,
          hasChildren: hasChildren
        })

        var patch = {
          status: nextStatus,
          profileDone: profileDone,
          childStepDone: state.childStepDone,
          bindGuideDone: state.bindGuideDone
        }
        if (nextStatus === onboarding.STATUS.ready) patch.completed = true

        var saved = that.setOnboardingState(patch)
        that.syncSession({ loggedIn: true, familyId: familyId })
        return saved.status
      }).catch(function () {
        var fallbackHasChildren = !!that.globalData.currentChildId
        var nextStatus = onboarding.evaluateStatus({
          onboarding: state,
          loggedIn: true,
          familyId: familyId,
          userInfo: userInfo,
          role: role,
          hasChildren: fallbackHasChildren
        })
        var saved = that.setOnboardingStatus(nextStatus, {
          profileDone: profileDone,
          childStepDone: state.childStepDone,
          bindGuideDone: state.bindGuideDone
        })
        that.syncSession({ loggedIn: true, familyId: familyId })
        return saved.status
      })
    }).then(function (status) {
      refreshManager.setCache(scope, 'status', status)
      refreshManager.markFetched(scope)
      return status
    })
  },

  getRouteByStatus: function (status) {
    return onboarding.getRouteByStatus(status)
  },

  getCurrentPagePath: function () {
    if (typeof getCurrentPages !== 'function') return ''
    var stack = getCurrentPages() || []
    if (!stack.length) return ''
    var current = stack[stack.length - 1] || {}
    var route = String(current.route || '').trim()
    if (!route) return ''
    if (route.charAt(0) !== '/') route = '/' + route
    return onboarding.normalizePath(route)
  },

  redirectByStatus: function (status, options) {
    var target = onboarding.getRouteByStatus(status)
    if (status === onboarding.STATUS.ready && isChildRole(this.globalData.userInfo)) {
      target = '/pages/child/home/index'
    }
    if (!target) return

    var normalized = onboarding.normalizePath(target)
    var currentPath = this.getCurrentPagePath()
    if (currentPath && currentPath === normalized) return

    var useReLaunch = options && options.reLaunch
    if (onboarding.isTabRoute(normalized)) {
      wx.switchTab({ url: normalized })
      return
    }
    if (useReLaunch) {
      wx.reLaunch({ url: target })
      return
    }
    wx.redirectTo({
      url: target,
      fail: function () {
        wx.reLaunch({ url: target })
      }
    })
  },

  guardPage: function (currentPath) {
    var that = this
    var path = onboarding.normalizePath(currentPath || this.getCurrentPagePath())
    return this.bootstrapOnboarding({ ttlMs: this.getRefreshTTL() }).then(function (status) {
      if (status === onboarding.STATUS.ready) {
        if (isChildRole(that.globalData.userInfo)) {
          if (path.indexOf('/pages/child/') === 0 || path === '/pages/invite-accept/index') return false
          var childHome = '/pages/child/home/index'
          var normalizedChildHome = onboarding.normalizePath(childHome)
          var currentRoute = that.getCurrentPagePath()
          if (path === normalizedChildHome || currentRoute === normalizedChildHome) return false
          wx.reLaunch({ url: childHome })
          return true
        }
        return false
      }
      var target = onboarding.getRouteByStatus(status)
      var normalizedTarget = onboarding.normalizePath(target)
      var currentRoutePath = that.getCurrentPagePath()
      if (normalizedTarget === path || normalizedTarget === currentRoutePath) return false
      wx.reLaunch({ url: target })
      return true
    })
  },

  logout: function () {
    onboarding.clearSession()
    onboarding.resetOnboarding()
    this.globalData.userInfo = null
    this.globalData.familyId = ''
    this.globalData.currentChildId = ''
    this.globalData.session = {}
    this.globalData.onboarding = onboarding.getOnboarding()
    this.globalData.onboardingStatus = this.globalData.onboarding.status
    this.markScopeDirty([
      'guard.onboarding',
      'shared.children',
      'shared.rules',
      'shared.audit',
      'parent.dashboard',
      'parent.taskManage',
      'parent.childManage'
    ])
  }
})
