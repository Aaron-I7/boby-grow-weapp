Page({
  onLoad: function () {
    wx.showToast({
      title: '该入口已合并到首页',
      icon: 'none'
    })
    wx.redirectTo({
      url: '/pages/child/home/index',
      fail: function () {
        wx.reLaunch({ url: '/pages/child/home/index' })
      }
    })
  }
})
