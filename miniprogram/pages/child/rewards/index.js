var api = require('../../../utils/api')

function getStatusText(status) {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已驳回'
  return '待审核'
}

Page({
  data: {
    child: {},
    rewards: [],
    redeemHistory: [],
    loadingHistory: false
  },

  onShow: function () {
    this.loadData()
  },

  loadData: function () {
    var that = this
    return Promise.all([
      api.getChildren(),
      api.getRewards()
    ]).then(function (res) {
      var children = res[0] || []
      var rewards = res[1] || []
      var child = children[0]
      that.setData({
        child: child || {},
        rewards: rewards
      })
      if (!child || !child._id) {
        that.setData({ redeemHistory: [] })
        return null
      }
      return that.loadRedeemHistory(child._id)
    })
  },

  loadRedeemHistory: function (childId) {
    var that = this
    that.setData({ loadingHistory: true })
    return api.getRedeemHistory(childId).then(function (list) {
      var history = (list || []).map(function (item) {
        return Object.assign({}, item, {
          statusText: getStatusText(item.status)
        })
      })
      that.setData({ redeemHistory: history })
    }).finally(function () {
      that.setData({ loadingHistory: false })
    })
  },

  onRedeem: function (e) {
    var reward = this.data.rewards[e.currentTarget.dataset.idx]
    var child = this.data.child
    if (!reward || !child || !child._id) return
    if (child.currentPoints < reward.cost) {
      wx.showToast({ title: '积分不足', icon: 'none' })
      return
    }

    var reason = reward.requiresReason ? '我会珍惜使用这个奖励，并继续保持努力。' : ''
    var tip = reward.rewardType === 'material'
      ? '该奖励属于实物奖励，会占用每周名额，确认提交申请吗？'
      : '确认提交兑换申请吗？'

    var that = this
    wx.showModal({
      title: '确认兑换',
      content: reward.name + '（' + reward.cost + '分）\n' + tip,
      success: function (res) {
        if (!res.confirm) return
        api.redeemReward(child._id, reward._id, reason).then(function () {
          wx.showToast({ title: '申请已提交', icon: 'success' })
          return api.getRewards()
        }).then(function (list) {
          if (list) that.setData({ rewards: list })
          return that.loadRedeemHistory(child._id)
        }).catch(function (err) {
          wx.showToast({ title: err && err.message ? err.message : '提交失败', icon: 'none' })
        })
      }
    })
  }
})
