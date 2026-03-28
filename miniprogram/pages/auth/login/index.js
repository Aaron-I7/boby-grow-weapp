var api = require('../../../utils/api')
var onboarding = require('../../../utils/onboarding')
var app = getApp()

Page({
  data: {
    loading: false,
    labels: {
      title: '\u5bb6\u5ead\u79ef\u5206\u7ba1\u5bb6',
      subtitle: '\u767b\u5f55\u540e\u5373\u53ef\u5f00\u59cb\u9996\u6b21\u5f15\u5bfc\u6d41\u7a0b',
      login: '\u5fae\u4fe1\u4e00\u952e\u767b\u5f55',
      loading: '\u767b\u5f55\u4e2d...'
    }
  },

  onShow: function () {
    app.bootstrapOnboarding().then(function (status) {
      if (status !== onboarding.STATUS.notLoggedIn) {
        app.redirectByStatus(status, { reLaunch: true })
      }
    })
  },

  resolveStatusFromLoginResult: function (result) {
    var data = result || {}
    var user = data.currentUser || data.user || (app.globalData && app.globalData.userInfo) || {}
    var family = data.family || {}
    var familyId = family._id || data.familyId || user.familyId || ''
    var role = String(user.role || '').trim()
    var profileDone = onboarding.isProfileComplete(user)

    if (!familyId) {
      app.setOnboardingStatus(onboarding.STATUS.familyPending, {
        profileDone: profileDone,
        completed: false
      })
      return onboarding.STATUS.familyPending
    }

    if (role === 'coadmin') {
      app.completeOnboarding({
        profileDone: profileDone,
        childStepDone: true,
        bindGuideDone: true
      })
      return onboarding.STATUS.ready
    }

    if (role === 'child') {
      app.completeOnboarding({
        profileDone: true,
        childStepDone: true,
        bindGuideDone: true
      })
      return onboarding.STATUS.ready
    }

    if (profileDone) {
      app.setOnboardingStatus(onboarding.STATUS.ready, {
        profileDone: true,
        childStepDone: true,
        bindGuideDone: true,
        completed: true
      })
      return onboarding.STATUS.ready
    }

    app.setOnboardingStatus(onboarding.STATUS.profilePending, {
      profileDone: false,
      completed: false
    })
    return onboarding.STATUS.profilePending
  },

  onLoginTap: function () {
    var that = this
    if (that.data.loading) return

    that.setData({ loading: true })
    wx.login({
      success: function (loginRes) {
        var code = loginRes && loginRes.code
        if (!code) {
          that.setData({ loading: false })
          wx.showToast({ title: '\u767b\u5f55\u51ed\u8bc1\u83b7\u53d6\u5931\u8d25', icon: 'none' })
          return
        }

        api.login({ code: code }).then(function (res) {
          app.applyLoginResult(res || {}, { code: code })
          that.setData({ loading: false })
          var pendingInvite = (app.globalData && app.globalData.pendingInviteTicket) || ''
          if (pendingInvite) {
            wx.reLaunch({ url: '/pages/invite-accept/index?ticket=' + encodeURIComponent(pendingInvite) })
            return
          }
          var status = that.resolveStatusFromLoginResult(res || {})
          app.redirectByStatus(status, { reLaunch: true })
        }).catch(function (err) {
          console.error('login failed', err)
          that.setData({ loading: false })
          wx.showToast({ title: '\u767b\u5f55\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5', icon: 'none' })
        })
      },
      fail: function (err) {
        console.error('wx.login failed', err)
        that.setData({ loading: false })
        wx.showToast({ title: '\u5fae\u4fe1\u767b\u5f55\u5931\u8d25', icon: 'none' })
      }
    })
  }
})
