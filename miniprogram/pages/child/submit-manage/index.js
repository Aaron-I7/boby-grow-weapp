var api = require('../../../utils/api')
var format = require('../../../utils/format')
Page({
  data: { tasks: [], pendingCount: 0 },
  onShow() {
    var that = this
    api.getChildren().then(function (children) {
      var child = children[0]
      if (!child) return
      return api.getTasks(child._id, format.getToday())
    }).then(function (tasks) {
      if (!tasks) return
      var auditable = tasks.filter(function (t) { return t.auditStatus !== 'none' })
      var pending = auditable.filter(function (t) { return t.auditStatus === 'pending' }).length
      that.setData({ tasks: auditable, pendingCount: pending })
    })
  }
})
