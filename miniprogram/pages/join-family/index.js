var api = require('../../utils/api')
var onboarding = require('../../utils/onboarding')
var app = getApp()

Page({
  data: {
    mode: 'standalone',
    familyName: '\u5bb6\u5ead\u9080\u8bf7',
    nickname: '',
    inviteCode: '',
    loading: false,
    suggestions: ['\u7238\u7238', '\u5988\u5988', '\u7237\u7237', '\u5976\u5976', '\u8001\u5e08'],
    labels: {
      title: '\u52a0\u5165\u5bb6\u5ead',
      desc: '\u586b\u5199\u4f60\u5728\u8be5\u5bb6\u5ead\u4e2d\u7684\u79f0\u547c',
      nickname: '\u4f60\u7684\u79f0\u547c',
      nicknamePlaceholder: '\u8bf7\u8f93\u5165\u79f0\u547c',
      inviteCode: '\u9080\u8bf7\u7801\uff08\u53ef\u9009\uff09',
      invitePlaceholder: '\u8f93\u5165\u9080\u8bf7\u7801',
      suggestion: '\u5e38\u7528\u79f0\u547c',
      submit: '\u786e\u8ba4\u52a0\u5165',
      loading: '\u5904\u7406\u4e2d...'
    }
  },

  onLoad: function (options) {
    var mode = options && options.mode === 'onboarding' ? 'onboarding' : 'standalone'
    var familyName = options && options.familyName ? options.familyName : '\u5bb6\u5ead\u9080\u8bf7'
    this.setData({ mode: mode, familyName: familyName })
  },

  onInput: function (e) {
    this.setData({ nickname: e.detail.value })
  },

  onInviteInput: function (e) {
    this.setData({ inviteCode: e.detail.value })
  },

  onSelectNick: function (e) {
    this.setData({ nickname: e.currentTarget.dataset.val })
  },

  applyJoinResult: function (res) {
    var result = res || {}
    var family = result.family || {}
    var user = result.currentUser || result.user || app.globalData.userInfo || {}
    var familyId = family._id || result.familyId || user.familyId || app.globalData.familyId || ''

    if (user && familyId && !user.familyId) user.familyId = familyId
    if (user && user._id) app.globalData.userInfo = Object.assign({}, user)

    app.globalData.familyId = familyId
    app.globalData.currentChildId = ''
    app.syncSession({
      loggedIn: true,
      familyId: familyId,
      currentChildId: '',
      userInfo: app.globalData.userInfo || null
    })

    return {
      familyId: familyId,
      user: app.globalData.userInfo || user || {}
    }
  },

  handleOnboardingSuccess: function (res) {
    var that = this
    var resolved = this.applyJoinResult(res || {})
    var profileDone = onboarding.isProfileComplete(resolved.user || {})

    app.completeOnboarding({
      profileDone: profileDone,
      childStepDone: true,
      childSkipped: true,
      bindGuideDone: true,
      bindGuideSkipped: true
    })

    that.setData({ loading: false })
    wx.showToast({ title: '\u52a0\u5165\u6210\u529f', icon: 'success' })
    setTimeout(function () {
      wx.switchTab({ url: '/pages/parent/dashboard/index' })
    })
  },

  onJoin: function () {
    var that = this
    if (that.data.loading) return

    var nickname = String(that.data.nickname || '').trim()
    if (!nickname) {
      wx.showToast({ title: '\u8bf7\u8f93\u5165\u79f0\u547c', icon: 'none' })
      return
    }

    that.setData({ loading: true })
    api.joinFamily({
      nickname: nickname,
      inviteCode: String(that.data.inviteCode || '').trim()
    }).then(function (res) {
      if (that.data.mode === 'onboarding') {
        that.handleOnboardingSuccess(res)
        return
      }
      that.applyJoinResult(res || {})
      that.setData({ loading: false })
      wx.showToast({ title: '\u52a0\u5165\u6210\u529f', icon: 'success' })
      setTimeout(function () {
        wx.switchTab({ url: '/pages/parent/dashboard/index' })
      }, 700)
    }).catch(function (err) {
      console.error('join family failed', err)
      that.setData({ loading: false })
      wx.showToast({ title: '\u52a0\u5165\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5', icon: 'none' })
    })
  }
})
