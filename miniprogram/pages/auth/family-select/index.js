var api = require('../../../utils/api')
var onboarding = require('../../../utils/onboarding')
var app = getApp()

Page({
  data: {
    loading: false,
    familyName: '',
    labels: {
      title: '\u9009\u62e9\u5bb6\u5ead\u5f00\u59cb\u65b9\u5f0f',
      subtitle: '\u9996\u6b21\u4f7f\u7528\u8bf7\u5148\u521b\u5efa\u6216\u52a0\u5165\u5bb6\u5ead',
      createTitle: '\u521b\u5efa\u6211\u7684\u5bb6\u5ead',
      createDesc: '\u4f60\u5c06\u6210\u4e3a\u4e3b\u7ba1\u7406\u5458\uff0c\u540e\u7eed\u53ef\u9080\u8bf7\u5176\u4ed6\u5bb6\u957f',
      familyInput: '\u5bb6\u5ead\u540d\u79f0\uff08\u53ef\u9009\uff09',
      familyInputPlaceholder: '\u9ed8\u8ba4\u4f7f\u7528\u6635\u79f0\u751f\u6210',
      createBtn: '\u521b\u5efa\u5e76\u7ee7\u7eed',
      joinTitle: '\u52a0\u5165\u5df2\u6709\u5bb6\u5ead',
      joinDesc: '\u901a\u8fc7\u5bb6\u5ead\u9080\u8bf7\u7801\u6216\u9080\u8bf7\u4eba\u8eab\u4efd\u4fe1\u606f\u52a0\u5165',
      joinBtn: '\u53bb\u52a0\u5165\u5bb6\u5ead',
      loading: '\u5904\u7406\u4e2d...'
    }
  },

  onLoad: function () {
    var user = (app.globalData && app.globalData.userInfo) || {}
    var nickname = String(user.nickname || '\u6211\u7684')
    this.setData({
      familyName: nickname + '\u7684\u5bb6\u5ead'
    })
  },

  onShow: function () {
    app.bootstrapOnboarding().then(function (status) {
      if (status !== onboarding.STATUS.familyPending) {
        app.redirectByStatus(status, { reLaunch: true })
      }
    })
  },

  onFamilyNameInput: function (e) {
    this.setData({ familyName: e.detail.value })
  },

  onCreateFamily: function () {
    var that = this
    if (that.data.loading) return

    var user = (app.globalData && app.globalData.userInfo) || {}
    var defaultName = String(user.nickname || '\u6211\u7684') + '\u7684\u5bb6\u5ead'
    var familyName = String(that.data.familyName || '').trim() || defaultName

    that.setData({ loading: true })
    api.createFamily({ name: familyName }).then(function (res) {
      var familyId = (res && res._id) || (res && res.familyId) || ''
      app.globalData.familyId = familyId
      app.globalData.currentChildId = ''
      app.syncSession({
        loggedIn: true,
        familyId: familyId,
        currentChildId: ''
      })
      app.setOnboardingStatus(onboarding.STATUS.profilePending, {
        completed: false
      })
      wx.redirectTo({ url: '/pages/parent/profile-edit/index?mode=onboarding' })
    }).catch(function (err) {
      console.error('create family failed', err)
      that.setData({ loading: false })
      wx.showToast({ title: '\u521b\u5efa\u5bb6\u5ead\u5931\u8d25', icon: 'none' })
    })
  },

  onJoinFamily: function () {
    wx.navigateTo({ url: '/pages/join-family/index?mode=onboarding' })
  }
})
