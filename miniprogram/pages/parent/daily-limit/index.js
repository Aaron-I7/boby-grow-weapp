var api = require('../../../utils/api')

function clamp(value) {
  var n = parseInt(value, 10) || 100
  if (n < 100) n = 100
  if (n > 1000) n = 1000
  return n
}

function toPercent(limit) {
  return Math.round(((limit - 100) / 900) * 100)
}

Page({
  data: {
    limit: 500,
    weekAvg: 320,
    sliderPercent: toPercent(500),
    labels: {
      navTitle: '\u6bcf\u65e5\u79ef\u5206\u4e0a\u9650',
      heroTag: 'Executive Suite / Limits',
      heroTitle: '\u7ba1\u7406\u6210\u957f\u52a8\u529b',
      heroDesc: '\u5e73\u8861\u5956\u52b1\u4e0e\u6311\u6218\u662f\u57f9\u517b\u4e60\u60ef\u7684\u5173\u952e\uff0c\u901a\u8fc7\u8bbe\u7f6e\u4e0a\u9650\u786e\u4fdd\u4efb\u52a1\u7cfb\u7edf\u53ef\u6301\u7eed\u8fd0\u8f6c\u3002',
      currentLimit: '\u5f53\u524d\u6bcf\u65e5\u4e0a\u9650\u989d\u5ea6',
      manual: '\u624b\u52a8\u8c03\u6574',
      tipTitle: '\u5b89\u5168\u9632\u5237\u63d0\u9192',
      tipText: '\u8bbe\u7f6e\u5b69\u5b50\u6bcf\u65e5\u901a\u8fc7\u4efb\u52a1\u53ef\u83b7\u5f97\u7684\u6700\u5927\u79ef\u5206\u9650\u989d\uff0c\u9632\u6b62\u5237\u5206\u3002',
      statAvg: '\u4e0a\u5468\u5e73\u5747',
      statRange: '\u5efa\u8bae\u8303\u56f4',
      save: '\u4fdd\u5b58\u8bbe\u7f6e'
    }
  },

  onLoad: function () {
    this.loadData()
  },

  loadData: function () {
    var that = this
    api.getFamily().then(function (family) {
      var limit = clamp((family || {}).dailyPointLimit || 500)
      that.setData({
        limit: limit,
        sliderPercent: toPercent(limit)
      })
    })

    api.getChildren().then(function (children) {
      if (!children || !children.length) return
      return api.getWeeklyTrend(children[0]._id).then(function (trend) {
        var list = trend || []
        if (!list.length) return
        var sum = list.reduce(function (acc, item) { return acc + (item.points || 0) }, 0)
        that.setData({ weekAvg: Math.round(sum / list.length) })
      })
    })
  },

  onBack: function () {
    wx.navigateBack()
  },

  onSliderChange: function (e) {
    var limit = clamp(e.detail.value)
    this.setData({
      limit: limit,
      sliderPercent: toPercent(limit)
    })
  },

  onInput: function (e) {
    var raw = e.detail.value
    if (raw === '') {
      this.setData({ limit: 100, sliderPercent: toPercent(100) })
      return
    }
    var limit = clamp(raw)
    this.setData({
      limit: limit,
      sliderPercent: toPercent(limit)
    })
  },

  onSave: function () {
    var that = this
    api.updateDailyLimit(this.data.limit).then(function () {
      wx.showToast({ title: '\u5df2\u4fdd\u5b58', icon: 'success' })
      setTimeout(function () { wx.navigateBack() }, 900)
    }).catch(function () {
      wx.showToast({ title: '\u4fdd\u5b58\u5931\u8d25', icon: 'none' })
      that.loadData()
    })
  }
})
