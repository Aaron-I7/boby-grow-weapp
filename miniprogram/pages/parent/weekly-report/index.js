var api = require('../../../utils/api')
var avatar = require('../../../utils/avatar')
var app = getApp()

function formatDateTime(iso) {
  var d = new Date(iso || '')
  if (isNaN(d.getTime())) return '--'
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

function typeLabel(type) {
  if (type === 'reflection') return '任务反思'
  if (type === 'parent_feedback') return '家长反馈'
  if (type === 'reward_behavior') return '奖励行为'
  return '成长记录'
}

Page({
  data: {
    routeChildId: '',
    children: [],
    currentChildId: '',
    currentChild: null,
    loading: true,
    error: '',
    digest: {
      reflectionStreak: 0,
      weekCompletedCount: 0,
      weekPoints: 0,
      digestText: '',
      challengeList: []
    },
    growthOverview: {
      reflectionCount: 0,
      feedbackCount: 0,
      rewardBehaviorCount: 0,
      reflectionStreak: 0
    },
    timeline: [],
    labels: {
      navTitle: '成长周报',
      shareReport: '分享周报',
      switchChild: '切换孩子',
      emptyChild: '暂无孩子档案',
      digestTitle: '本周摘要',
      digestFallback: '本周还没有新的成长记录',
      completedLabel: '本周记录',
      pointsLabel: '本周积分',
      streakLabel: '连续天数',
      streakUnit: '天',
      challengeTitle: '连续达标挑战',
      challengeDone: '已达成',
      challengeRemainPrefix: '还差',
      challengeRemainSuffix: '天',
      challengeTargetSuffix: '天',
      signalTitle: '成长信号',
      reflectionLabel: '反思提交',
      feedbackLabel: '家长反馈',
      rewardLabel: '奖励行为',
      timelineTitle: '最近动态',
      emptyTimeline: '暂无动态',
      loadFailed: '加载失败，请稍后重试'
    }
  },

  onLoad: function (options) {
    this.setData({
      routeChildId: options && options.id ? String(options.id) : ''
    })
  },

  onShow: function () {
    this.bootstrap()
  },

  onShareAppMessage: function () {
    var child = this.data.currentChild || {}
    var digest = this.data.digest || {}
    var childName = child.nickname || '孩子'
    var childId = child.id || this.data.currentChildId || ''
    return {
      title: childName + '本周完成' + Number(digest.weekCompletedCount || 0) + '项任务，连续达标' + Number(digest.reflectionStreak || 0) + '天',
      path: '/pages/parent/weekly-report/index' + (childId ? ('?id=' + childId) : '')
    }
  },

  onShareTimeline: function () {
    var child = this.data.currentChild || {}
    var digest = this.data.digest || {}
    var childName = child.nickname || '孩子'
    var childId = child.id || this.data.currentChildId || ''
    return {
      title: childName + '成长周报：本周积分' + Number(digest.weekPoints || 0),
      query: childId ? ('id=' + childId) : ''
    }
  },

  onBack: function () {
    wx.navigateBack()
  },

  bootstrap: function () {
    var that = this
    that.setData({ loading: true, error: '' })
    api.getChildren().then(function (list) {
      var children = list || []
      if (!children.length) {
        that.setData({
          children: [],
          currentChildId: '',
          currentChild: null,
          loading: false
        })
        return
      }

      var routeId = that.data.routeChildId
      var globalId = app && app.globalData ? app.globalData.currentChildId : ''
      var current = children.find(function (item) { return item._id === routeId }) ||
        children.find(function (item) { return item._id === globalId }) ||
        children[0]

      that.setData({
        children: children,
        currentChildId: current._id,
        currentChild: {
          id: current._id,
          nickname: current.nickname || '孩子',
          avatarUrl: avatar.resolveAvatar(current, 'child')
        }
      })

      if (app && app.globalData) app.globalData.currentChildId = current._id
      return that.loadReport(current._id)
    }).catch(function (err) {
      console.error('weekly report bootstrap failed', err)
      that.setData({
        loading: false,
        error: that.data.labels.loadFailed
      })
    })
  },

  loadReport: function (childId) {
    var that = this
    return Promise.all([
      api.getStreakAndWeeklyDigest({ childId: childId }),
      api.getGrowthOverview({ childId: childId }),
      api.getGrowthTimeline({ childId: childId, pageNo: 1, pageSize: 10 })
    ]).then(function (res) {
      var digest = res[0] || {}
      var overview = res[1] || {}
      var timelineRes = res[2] || {}
      var timeline = (timelineRes.list || []).map(function (item) {
        return {
          id: item._id || '',
          typeText: typeLabel(item.type),
          timeText: formatDateTime(item.createdAt),
          desc: (item.meta && (item.meta.feedbackText || item.meta.text || item.meta.rewardName)) || ''
        }
      })

      that.setData({
        loading: false,
        digest: {
          reflectionStreak: Number(digest.reflectionStreak || 0),
          weekCompletedCount: Number(digest.weekCompletedCount || 0),
          weekPoints: Number(digest.weekPoints || 0),
          digestText: String(digest.digestText || ''),
          challengeList: Array.isArray(digest.challengeList) ? digest.challengeList : []
        },
        growthOverview: {
          reflectionCount: Number(overview.reflectionCount || 0),
          feedbackCount: Number(overview.feedbackCount || 0),
          rewardBehaviorCount: Number(overview.rewardBehaviorCount || 0),
          reflectionStreak: Number(overview.reflectionStreak || 0)
        },
        timeline: timeline
      })
    }).catch(function (err) {
      console.error('load weekly report failed', err)
      that.setData({
        loading: false,
        error: that.data.labels.loadFailed
      })
    })
  },

  onSwitchChild: function () {
    var that = this
    var children = this.data.children || []
    if (children.length <= 1) return
    wx.showActionSheet({
      itemList: children.map(function (item) { return item.nickname || '孩子' }),
      success: function (res) {
        var selected = children[res.tapIndex]
        if (!selected) return
        that.setData({
          loading: true,
          currentChildId: selected._id,
          currentChild: {
            id: selected._id,
            nickname: selected.nickname || '孩子',
            avatarUrl: avatar.resolveAvatar(selected, 'child')
          }
        })
        if (app && app.globalData) app.globalData.currentChildId = selected._id
        that.loadReport(selected._id)
      }
    })
  }
})
