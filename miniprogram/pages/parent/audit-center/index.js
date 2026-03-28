var api = require('../../../utils/api')
var avatar = require('../../../utils/avatar')

function getStampIcon(status) {
  if (status === 'approved') return '/images/svg/ui/icon-pass.svg'
  if (status === 'rejected') return '/images/svg/ui/icon-notpass.svg'
  return ''
}

function getAvatarUrl(child) {
  return avatar.resolveAvatar(child, 'child')
}

function formatSeq(i) {
  return i < 9 ? '0' + (i + 1) : String(i + 1)
}

function syncAuditTabBadge(count) {
  // 审核中心已不是 tab 项，保留函数避免改动其他调用链
  return count
}

function formatMonthDayTime(iso) {
  var ts = new Date(iso || '')
  if (isNaN(ts.getTime())) return ''
  return (ts.getMonth() + 1) + '/' + ts.getDate() + ' ' + String(ts.getHours()).padStart(2, '0') + ':' + String(ts.getMinutes()).padStart(2, '0')
}

function mapRewardItem(item, i, childMap, labels) {
  var child = childMap[item.childId] || {}
  var status = item.status || 'pending'
  return {
    id: item._id,
    childId: item.childId || '',
    familyId: item.familyId || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
    title: item.rewardName || '\u5956\u52b1\u7533\u8bf7',
    cost: item.cost || 0,
    childName: child.nickname || '\u5b69\u5b50',
    avatarUrl: getAvatarUrl(child),
    status: status,
    stampIcon: getStampIcon(status),
    showStamp: status !== 'pending',
    stampAnimating: false,
    seq: formatSeq(i)
  }
}

function mapWishItem(item, i, childMap, labels) {
  var child = childMap[item.childId] || {}
  var status = item.status || 'pending'
  return {
    id: item._id,
    childId: item.childId || '',
    familyId: item.familyId || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
    title: item.name || '\u65b0\u613f\u671b',
    childName: child.nickname || '\u5b69\u5b50',
    avatarUrl: getAvatarUrl(child),
    status: status,
    stampIcon: getStampIcon(status),
    showStamp: status !== 'pending',
    stampAnimating: false,
    suggestedPoints: item.suggestedPoints || 0,
    smartSuggestedPoints: 0,
    metaText: item.suggestedPoints
      ? (labels.suggestPrefix + item.suggestedPoints + labels.pointsUnit)
      : labels.waitingSetPoints,
    seq: formatSeq(i)
  }
}

Page({
  data: {
    tab: 'wish',
    rewardRequests: [],
    wishRequests: [],
    batchMode: false,
    batchLoading: false,
    selectedRewardIds: [],
    selectedWishIds: [],
    auditSummary: {
      overdueTask: 0,
      overdueReward: 0,
      overdueWish: 0,
      overduePending: 0,
      hasOverdue: false,
      oldestPendingAt: ''
    },
    overdueHint: '',
    showPointsModal: false,
    approvingWishId: '',
    wishPointsInput: '',
    labels: {
      navTitle: '\u5ba1\u6838\u4e2d\u5fc3',
      tabReward: '\u5956\u52b1\u5151\u6362',
      tabWish: '\u613f\u671b\u7533\u8bf7',
      chipPending: '\u5f85\u5ba1\u6838\u7533\u8bf7',
      rewardTitle: '\u5956\u52b1\u5ba1\u6838',
      rewardDesc: '\u67e5\u770b\u5e76\u7ba1\u7406\u5b69\u5b50\u7684\u5956\u52b1\u7533\u8bf7\uff0c\u786e\u4fdd\u6fc0\u52b1\u89c4\u5219\u4e00\u81f4\u3002',
      wishTitle: '\u613f\u671b\u5ba1\u6838',
      wishDesc: '\u5b69\u5b50\u63d0\u4ea4\u7684\u65b0\u613f\u671b\uff0c\u4f60\u53ef\u4ee5\u5c06\u5176\u52a0\u5165\u79ef\u5206\u5546\u5e97\u4f5c\u4e3a\u6210\u957f\u76ee\u6807\u3002',
      overdueTitlePrefix: '\u8d85\u65f6\u5f85\u5ba1 ',
      overdueTitleSuffix: ' \u6761',
      overdueDetailPrefix: '\u4efb\u52a1',
      overdueDetailMiddle: '\u3001\u5956\u52b1',
      overdueDetailEnd: '\u3001\u613f\u671b',
      overdueOldestPrefix: '\u6700\u65e9\u5f85\u5ba1\uff1a',
      rewardReq: '\u5956\u52b1\u5151\u6362',
      wishReq: '\u65b0\u613f\u671b\u7533\u8bf7',
      costPrefix: '\u9700\u8981',
      pointsUnit: ' \u79ef\u5206',
      waitingSetPoints: '\u7b49\u5f85\u5bb6\u957f\u8bbe\u5b9a\u79ef\u5206',
      suggestPrefix: '\u5efa\u8bae ',
      smartSuggestPrefix: '\u667a\u80fd\u5efa\u8bae ',
      setPointsTitle: '\u8bbe\u7f6e\u79ef\u5206',
      setPointsHint: '\u8bf7\u4e3a\u8be5\u613f\u671b\u8bbe\u7f6e\u901a\u8fc7\u79ef\u5206',
      pointsPlaceholder: '\u4f8b\u5982\uff1a500',
      confirmSetPoints: '\u786e\u5b9a\u901a\u8fc7',
      cancelSetPoints: '\u53d6\u6d88',
      approve: '\u901a\u8fc7',
      quickApprove: '\u5efa\u8bae\u5206\u901a\u8fc7',
      adjustApprove: '\u6539\u5206\u901a\u8fc7',
      reject: '\u9a73\u56de',
      batchMode: '\u6279\u91cf\u5904\u7406',
      batchCancel: '\u9000\u51fa\u6279\u91cf',
      batchSelectAll: '\u5168\u9009',
      batchClear: '\u6e05\u7a7a',
      batchApprove: '\u6279\u91cf\u901a\u8fc7',
      batchReject: '\u6279\u91cf\u9a73\u56de',
      batchNoSelection: '\u8bf7\u5148\u9009\u62e9\u5f85\u5904\u7406\u7533\u8bf7',
      batchProcessing: '\u6279\u5904\u7406\u4e2d...',
      batchWishSkipHint: '\u90e8\u5206\u613f\u671b\u7f3a\u5c11\u5efa\u8bae\u79ef\u5206\uff0c\u5df2\u8df3\u8fc7',
      batchDone: '\u6279\u5904\u7406\u5b8c\u6210',
      emptyReward: '\u6682\u65e0\u5956\u52b1\u5151\u6362\u7533\u8bf7',
      emptyWish: '\u6682\u65e0\u613f\u671b\u7533\u8bf7'
    }
  },

  onLoad: function () {
  },

  onShow: function () {
    this.loadData()
  },

  loadData: function () {
    var that = this
    var summaryTask = api.getPendingAuditSummary().catch(function () { return null })
    Promise.all([api.getChildren(), api.getRewardRequests(), api.getWishRequests(), summaryTask, api.getRewards().catch(function () { return [] })]).then(function (res) {
      var children = res[0] || []
      var rewards = res[1] || []
      var wishes = res[2] || []
      var summary = res[3] || {}
      var rewardCatalog = res[4] || []
      var childMap = {}
      children.forEach(function (c) {
        childMap[c._id] = c
      })

      var rewardList = rewards.map(function (item, i) {
        return mapRewardItem(item, i, childMap, that.data.labels)
      })

      var wishList = wishes.map(function (item, i) {
        return mapWishItem(item, i, childMap, that.data.labels)
      }).map(function (item) {
        if (item.status !== 'pending') return item
        if (Number(item.suggestedPoints || 0) > 0) return item
        var smartPoints = that.inferWishPoints(item.title, rewardCatalog)
        if (!smartPoints) return item
        return Object.assign({}, item, {
          smartSuggestedPoints: smartPoints,
          metaText: that.data.labels.smartSuggestPrefix + smartPoints + that.data.labels.pointsUnit
        })
      })

      that.setData({
        rewardRequests: rewardList,
        wishRequests: wishList,
        selectedRewardIds: that.filterExistingSelections(that.data.selectedRewardIds, rewardList),
        selectedWishIds: that.filterExistingSelections(that.data.selectedWishIds, wishList)
      })
      var rewardPending = rewardList.filter(function (item) { return item.status === 'pending' }).length
      var wishPending = wishList.filter(function (item) { return item.status === 'pending' }).length
      syncAuditTabBadge(rewardPending + wishPending)

      var overduePending = Number(summary.overduePending) || 0
      var oldestText = summary.oldestPendingAt ? formatMonthDayTime(summary.oldestPendingAt) : ''
      that.setData({
        auditSummary: {
          overdueTask: Number(summary.overdueTask) || 0,
          overdueReward: Number(summary.overdueReward) || 0,
          overdueWish: Number(summary.overdueWish) || 0,
          overduePending: overduePending,
          hasOverdue: !!summary.hasOverdue || overduePending > 0,
          oldestPendingAt: String(summary.oldestPendingAt || '')
        },
        overdueHint: oldestText ? (that.data.labels.overdueOldestPrefix + oldestText) : ''
      })
    }).catch(function (err) {
      console.error('\u5ba1\u6838\u6570\u636e\u52a0\u8f7d\u5931\u8d25', err)
      wx.showToast({ title: '\u52a0\u8f7d\u5931\u8d25', icon: 'none' })
    })
  },

  inferWishPoints: function (wishName, rewardCatalog) {
    var title = String(wishName || '').trim().toLowerCase()
    var costs = (rewardCatalog || []).map(function (item) {
      return Number(item.cost || 0)
    }).filter(function (cost) {
      return cost > 0
    }).sort(function (a, b) { return a - b })

    var base = 200
    if (costs.length) {
      var mid = Math.floor(costs.length / 2)
      base = costs.length % 2 === 0
        ? Math.round((costs[mid - 1] + costs[mid]) / 2)
        : costs[mid]
    }

    var multiplier = 1
    if (/(旅游|乐园|电子|平板|手机|游戏机|自行车|滑板车)/.test(title)) {
      multiplier = 2.5
    } else if (/(玩具|图书|书|积木|手办|文具|画笔)/.test(title)) {
      multiplier = 1.2
    } else if (/(零食|饮料|甜品|糖|奶茶)/.test(title)) {
      multiplier = 0.6
    }

    var points = Math.round((base * multiplier) / 10) * 10
    if (points < 50) points = 50
    if (points > 5000) points = 5000
    return points
  },

  buildAuditMeta: function (item, source, extra) {
    var request = item || {}
    return Object.assign({
      source: source || 'parent.audit-center',
      childId: request.childId || '',
      familyId: request.familyId || '',
      requestCreatedAt: request.createdAt || request.updatedAt || ''
    }, extra || {})
  },

  onTabChange: function (e) {
    this.setData({
      tab: e.currentTarget.dataset.tab,
      showPointsModal: false,
      approvingWishId: '',
      wishPointsInput: ''
    })
  },

  onBack: function () {
    wx.navigateBack({
      fail: function () {
        wx.switchTab({ url: '/pages/parent/dashboard/index' })
      }
    })
  },

  onPointsInput: function (e) {
    this.setData({ wishPointsInput: e.detail.value })
  },

  filterExistingSelections: function (selectedIds, latestList) {
    var map = {}
    ;(latestList || []).forEach(function (item) {
      if (item && item.id && item.status === 'pending') map[item.id] = true
    })
    return (selectedIds || []).filter(function (id) {
      return !!map[id]
    })
  },

  getCurrentListKey: function () {
    return this.data.tab === 'reward' ? 'rewardRequests' : 'wishRequests'
  },

  getCurrentSelectionKey: function () {
    return this.data.tab === 'reward' ? 'selectedRewardIds' : 'selectedWishIds'
  },

  getCurrentPendingList: function () {
    var list = this.data[this.getCurrentListKey()] || []
    return list.filter(function (item) { return item.status === 'pending' })
  },

  onToggleBatchMode: function () {
    var next = !this.data.batchMode
    this.setData({
      batchMode: next,
      selectedRewardIds: next ? this.data.selectedRewardIds : [],
      selectedWishIds: next ? this.data.selectedWishIds : []
    })
  },

  onToggleSelectAll: function () {
    var pendingIds = this.getCurrentPendingList().map(function (item) { return item.id })
    var selectionKey = this.getCurrentSelectionKey()
    var selected = this.data[selectionKey] || []
    var nextSelected = selected.length === pendingIds.length ? [] : pendingIds
    this.setData({
      [selectionKey]: nextSelected
    })
  },

  onClearSelection: function () {
    var selectionKey = this.getCurrentSelectionKey()
    this.setData({
      [selectionKey]: []
    })
  },

  onToggleItemSelect: function (e) {
    var id = e.currentTarget.dataset.id
    if (!id || !this.data.batchMode) return
    var selectionKey = this.getCurrentSelectionKey()
    var selected = (this.data[selectionKey] || []).slice()
    var idx = selected.indexOf(id)
    if (idx > -1) {
      selected.splice(idx, 1)
    } else {
      selected.push(id)
    }
    this.setData({
      [selectionKey]: selected
    })
  },

  isIdSelected: function (id) {
    var selectionKey = this.getCurrentSelectionKey()
    var selected = this.data[selectionKey] || []
    return selected.indexOf(id) > -1
  },

  getSelectedPendingItems: function () {
    var list = this.getCurrentPendingList()
    var selectionKey = this.getCurrentSelectionKey()
    var selectedMap = {}
    ;(this.data[selectionKey] || []).forEach(function (id) {
      selectedMap[id] = true
    })
    return list.filter(function (item) { return !!selectedMap[item.id] })
  },

  onBatchApprove: function () {
    var items = this.getSelectedPendingItems()
    if (!items.length) {
      wx.showToast({ title: this.data.labels.batchNoSelection, icon: 'none' })
      return
    }
    var that = this
    that.setData({ batchLoading: true })
    wx.showLoading({ title: this.data.labels.batchProcessing })

    var tab = this.data.tab
    var ops = []
    var skippedWish = 0
    items.forEach(function (item) {
      if (tab === 'reward') {
        ops.push(api.auditRedeem(
          item.id,
          true,
          '',
          that.buildAuditMeta(item, 'parent.audit-center.batch-approve', {
            cost: Number(item.cost || 0)
          })
        ))
      } else {
        var points = parseInt(item.suggestedPoints || item.smartSuggestedPoints || 0, 10)
        if (points > 0) {
          ops.push(api.auditWish(
            item.id,
            true,
            points,
            that.buildAuditMeta(item, 'parent.audit-center.batch-approve', {
              suggestedPoints: points
            })
          ))
        } else {
          skippedWish += 1
        }
      }
    })

    Promise.all(ops).then(function () {
      if (skippedWish > 0) {
        wx.showToast({ title: that.data.labels.batchWishSkipHint, icon: 'none' })
      } else {
        wx.showToast({ title: that.data.labels.batchDone, icon: 'success' })
      }
      that.onClearSelection()
      return that.loadData()
    }).catch(function () {
      wx.showToast({ title: '\u6279\u5904\u7406\u5931\u8d25', icon: 'none' })
    }).finally(function () {
      that.setData({ batchLoading: false })
      wx.hideLoading()
    })
  },

  onBatchReject: function () {
    var items = this.getSelectedPendingItems()
    if (!items.length) {
      wx.showToast({ title: this.data.labels.batchNoSelection, icon: 'none' })
      return
    }
    var that = this
    that.setData({ batchLoading: true })
    wx.showLoading({ title: this.data.labels.batchProcessing })
    var tab = this.data.tab
    var ops = items.map(function (item) {
      return tab === 'reward'
        ? api.auditRedeem(item.id, false, '\u6279\u91cf\u9a73\u56de', that.buildAuditMeta(item, 'parent.audit-center.batch-reject', {
          cost: Number(item.cost || 0)
        }))
        : api.auditWish(item.id, false, undefined, that.buildAuditMeta(item, 'parent.audit-center.batch-reject'))
    })
    Promise.all(ops).then(function () {
      wx.showToast({ title: that.data.labels.batchDone, icon: 'success' })
      that.onClearSelection()
      return that.loadData()
    }).catch(function () {
      wx.showToast({ title: '\u6279\u5904\u7406\u5931\u8d25', icon: 'none' })
    }).finally(function () {
      that.setData({ batchLoading: false })
      wx.hideLoading()
    })
  },

  onCancelPointsModal: function () {
    this.setData({
      showPointsModal: false,
      approvingWishId: '',
      wishPointsInput: ''
    })
  },

  playStampAnimation: function (listKey, id, status) {
    var list = (this.data[listKey] || []).map(function (item) {
      if (item.id !== id) return item
      return Object.assign({}, item, {
        status: status,
        showStamp: true,
        stampIcon: getStampIcon(status),
        stampAnimating: true
      })
    })
    this.setData({ [listKey]: list })
    var that = this
    setTimeout(function () {
      var next = (that.data[listKey] || []).map(function (item) {
        if (item.id !== id) return item
        return Object.assign({}, item, { stampAnimating: false })
      })
      that.setData({ [listKey]: next })
    }, 380)
  },

  onApproveRedeem: function (e) {
    if (this.data.batchMode) return
    var id = e.currentTarget.dataset.id
    var item = (this.data.rewardRequests || []).find(function (r) { return r.id === id }) || {}
    var that = this
    this.playStampAnimation('rewardRequests', id, 'approved')
    api.auditRedeem(id, true, '', that.buildAuditMeta(item, 'parent.audit-center.single-approve', {
      cost: Number(item.cost || 0)
    })).then(function () {
      wx.showToast({ title: '\u5df2\u901a\u8fc7', icon: 'success' })
      setTimeout(function () { that.loadData() }, 420)
    }).catch(function () {
      wx.showToast({ title: '\u64cd\u4f5c\u5931\u8d25', icon: 'none' })
      that.loadData()
    })
  },

  onRejectRedeem: function (e) {
    if (this.data.batchMode) return
    var id = e.currentTarget.dataset.id
    var item = (this.data.rewardRequests || []).find(function (r) { return r.id === id }) || {}
    var that = this
    this.playStampAnimation('rewardRequests', id, 'rejected')
    api.auditRedeem(id, false, '\u6682\u4e0d\u5151\u6362', that.buildAuditMeta(item, 'parent.audit-center.single-reject', {
      cost: Number(item.cost || 0)
    })).then(function () {
      wx.showToast({ title: '\u5df2\u9a73\u56de', icon: 'none' })
      setTimeout(function () { that.loadData() }, 420)
    }).catch(function () {
      wx.showToast({ title: '\u64cd\u4f5c\u5931\u8d25', icon: 'none' })
      that.loadData()
    })
  },

  onApproveWish: function (e) {
    if (this.data.batchMode) return
    var id = e.currentTarget.dataset.id
    var item = (this.data.wishRequests || []).find(function (w) { return w.id === id })
    var suggestedPoints = item && item.suggestedPoints ? parseInt(item.suggestedPoints, 10) : 0
    var smartPoints = item && item.smartSuggestedPoints ? parseInt(item.smartSuggestedPoints, 10) : 0
    var effectivePoints = suggestedPoints > 0 ? suggestedPoints : smartPoints
    if (effectivePoints > 0) {
      this.auditWishWithPoints(id, effectivePoints, this.buildAuditMeta(item, 'parent.audit-center.single-approve', {
        suggestedPoints: effectivePoints
      }))
      return
    }
    var defaultPoints = item && item.suggestedPoints ? String(item.suggestedPoints) : ''
    this.setData({
      showPointsModal: true,
      approvingWishId: id,
      wishPointsInput: defaultPoints
    })
  },

  onAdjustWish: function (e) {
    if (this.data.batchMode) return
    var id = e.currentTarget.dataset.id
    var item = (this.data.wishRequests || []).find(function (w) { return w.id === id })
    var defaultPoints = ''
    if (item) {
      defaultPoints = String(item.suggestedPoints || item.smartSuggestedPoints || '')
    }
    this.setData({
      showPointsModal: true,
      approvingWishId: id,
      wishPointsInput: defaultPoints
    })
  },

  auditWishWithPoints: function (id, points, meta) {
    var that = this
    this.playStampAnimation('wishRequests', id, 'approved')
    api.auditWish(id, true, points, meta || {}).then(function () {
      wx.showToast({ title: '\u5df2\u901a\u8fc7', icon: 'success' })
      setTimeout(function () { that.loadData() }, 420)
    }).catch(function () {
      wx.showToast({ title: '\u64cd\u4f5c\u5931\u8d25', icon: 'none' })
      that.loadData()
    })
  },

  onConfirmWishPoints: function () {
    var id = this.data.approvingWishId
    var points = parseInt((this.data.wishPointsInput || '').trim(), 10)

    if (!id) return
    if (!points || points <= 0) {
      wx.showToast({ title: '\u8bf7\u8f93\u5165\u6b63\u786e\u79ef\u5206', icon: 'none' })
      return
    }

    this.setData({
      showPointsModal: false,
      approvingWishId: '',
      wishPointsInput: ''
    })

    var item = (this.data.wishRequests || []).find(function (w) { return w.id === id }) || {}
    this.auditWishWithPoints(id, points, this.buildAuditMeta(item, 'parent.audit-center.modal-approve', {
      suggestedPoints: points
    }))
  },

  onRejectWish: function (e) {
    if (this.data.batchMode) return
    var id = e.currentTarget.dataset.id
    var item = (this.data.wishRequests || []).find(function (w) { return w.id === id }) || {}
    var that = this
    this.playStampAnimation('wishRequests', id, 'rejected')
    api.auditWish(id, false, undefined, this.buildAuditMeta(item, 'parent.audit-center.single-reject')).then(function () {
      wx.showToast({ title: '\u5df2\u9a73\u56de', icon: 'none' })
      setTimeout(function () { that.loadData() }, 420)
    }).catch(function () {
      wx.showToast({ title: '\u64cd\u4f5c\u5931\u8d25', icon: 'none' })
      that.loadData()
    })
  }
})
