var api = require('../../../utils/api')
var app = getApp()

Page({
  data: {
    familyName: '\u6211\u7684\u5bb6\u5ead',
    dailyLimit: 500,
    labels: {
      navTitle: '\u57fa\u672c\u4fe1\u606f',
      familyTag: '\u5f53\u524d\u7ba1\u7406\u5bb6\u5ead',
      familySection: '\u5bb6\u5ead\u7ba1\u7406',
      coadminTitle: '\u7ba1\u7406\u534f\u7ba1\u5bb6\u957f',
      childProfileTitle: '\u6210\u957f\u6863\u6848',
      weeklyReportTitle: '\u6210\u957f\u5468\u62a5',
      ruleSection: '\u89c4\u5219\u4e0e\u79ef\u5206\u8bbe\u7f6e',
      dailyLimitTitle: '\u6bcf\u65e5\u79ef\u5206\u4e0a\u9650',
      accountSection: '\u8d26\u53f7\u4e0e\u5b89\u5168',
      bindGuideTitle: '\u5b69\u5b50\u5fae\u4fe1\u7ed1\u5b9a',
      mcpTitle: '\u7ed1\u5b9a\u4e0e\u6838\u9a8c\u7801',
      mcpSubtitle: 'SECURITY CODE',
      profileTitle: '\u4e2a\u4eba\u4fe1\u606f\u4fee\u6539',
      logout: '\u9000\u51fa\u767b\u5f55'
    }
  },

  onLoad: function () {},

  onShow: function () {
    this.loadFamilyInfo()
  },

  loadFamilyInfo: function () {
    var that = this
    api.getFamily().then(function (family) {
      if (!family) return
      that.setData({
        familyName: family.name || '\u6211\u7684\u5bb6\u5ead',
        dailyLimit: family.dailyPointLimit || 500
      })
    }).catch(function (err) {
      console.error('\u52a0\u8f7d\u5bb6\u5ead\u4fe1\u606f\u5931\u8d25', err)
    })
  },

  onBack: function () {
    wx.switchTab({ url: '/pages/parent/dashboard/index' })
  },

  onCoadmin: function () {
    wx.navigateTo({ url: '/pages/parent/coadmin-manage/index' })
  },

  onChildProfiles: function () {
    wx.navigateTo({ url: '/pages/parent/child-profiles/index' })
  },

  onWeeklyReport: function () {
    wx.navigateTo({ url: '/pages/parent/weekly-report/index' })
  },

  onDailyLimit: function () {
    wx.navigateTo({ url: '/pages/parent/daily-limit/index' })
  },

  onBindGuide: function () {
    wx.navigateTo({ url: '/pages/parent/bind-guide/index' })
  },

  onMcpVerify: function () {
    wx.navigateTo({ url: '/pages/parent/mcp-verify/index' })
  },

  onProfileEdit: function () {
    wx.navigateTo({ url: '/pages/parent/profile-edit/index' })
  },

  onLogout: function () {
    app.logout()
    wx.reLaunch({ url: '/pages/auth/login/index' })
  }
})
