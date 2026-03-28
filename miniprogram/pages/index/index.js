Page({
  data: {
    labels: {
      title: '\u5bb6\u5ead\u79ef\u5206\u7ba1\u5bb6',
      desc: '\u9996\u9875\u5df2\u6062\u590d',
      enter: '\u8fdb\u5165\u5de5\u4f5c\u53f0'
    }
  },
  onEnter: function () {
    wx.switchTab({ url: '/pages/parent/dashboard/index' })
  }
})
