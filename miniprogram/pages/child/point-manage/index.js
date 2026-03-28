var api = require('../../../utils/api')
Page({
  data: { child: {}, records: [], weekEarned: 0 },
  onShow() {
    var that = this
    api.getChildren().then(function (children) {
      var child = children[0]
      if (!child) return
      that.setData({ child: child })
      return api.getPointRecords(child._id)
    }).then(function (records) {
      if (!records) return
      var earned = records.filter(function (r) { return r.amount > 0 }).reduce(function (s, r) { return s + r.amount }, 0)
      that.setData({ records: records, weekEarned: earned })
    })
  }
})
