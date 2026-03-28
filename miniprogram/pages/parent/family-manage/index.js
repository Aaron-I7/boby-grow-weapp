Page({
  onLoad: function () {
    wx.switchTab({
      url: '/pages/parent/setting/index',
      fail: function () {
        wx.reLaunch({ url: '/pages/parent/setting/index' })
      }
    })
  }
})
