var onboarding = require('../../../utils/onboarding')
var app = getApp()

Page({
  data: {
    loadingText: '\u6b63\u5728\u521d\u59cb\u5316...'
  },

  onLoad: function () {
    this.resolveNextRoute()
  },

  resolveNextRoute: function () {
    var pendingInvite = (app.globalData && app.globalData.pendingInviteTicket) || ''
    if (pendingInvite) {
      wx.reLaunch({ url: '/pages/invite-accept/index?ticket=' + encodeURIComponent(pendingInvite) })
      return
    }
    app.bootstrapOnboarding().then(function (status) {
      app.redirectByStatus(status, { reLaunch: true })
    }).catch(function () {
      app.redirectByStatus(onboarding.STATUS.notLoggedIn, { reLaunch: true })
    })
  }
})
