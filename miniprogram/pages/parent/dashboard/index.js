var api = require('../../../utils/api')
var format = require('../../../utils/format')
var avatar = require('../../../utils/avatar')
var app = getApp()

function getBadgeText(count) {
  if (!count || count <= 0) return ''
  if (count >= 100) return '99+'
  return String(count)
}

function buildLineData(trend) {
  var source = trend && trend.length ? trend : [
    { points: 36 }, { points: 52 }, { points: 44 }, { points: 68 }, { points: 49 }, { points: 72 }, { points: 58 }
  ]
  var values = source.map(function (item) { return item.points || 0 })
  var max = values.length ? Math.max.apply(null, values) : 100
  if (!max) max = 100
  var widthHeightRatio = 2.75

  var points = values.map(function (val, idx) {
    var x = values.length === 1 ? 50 : 8 + (idx * 84) / (values.length - 1)
    var y = 74 - (val / max) * 48
    return { x: x, y: y }
  })

  var segments = []
  for (var i = 0; i < points.length - 1; i++) {
    var p1 = points[i]
    var p2 = points[i + 1]
    var dx = p2.x - p1.x
    var dy = p2.y - p1.y
    var len = Math.sqrt(dx * dx + Math.pow(dy / widthHeightRatio, 2))
    var deg = Math.atan2(dy / widthHeightRatio, dx) * 180 / Math.PI
    segments.push({ left: p1.x, top: p1.y, width: len, rotate: deg })
  }
  return { points: points, segments: segments }
}

function buildZeroLineData() {
  return buildLineData([
    { points: 0 }, { points: 0 }, { points: 0 }, { points: 0 }, { points: 0 }, { points: 0 }, { points: 0 }
  ])
}

function getNavInfo(child, labels) {
  var c = child || {}
  if (!c._id) {
    return {
      navSubtitle: (labels.currentChild || '') + '\uff1a' + labels.noChild,
      navAvatar: '',
      navAvatarEmpty: true
    }
  }

  return {
    navSubtitle: (labels.currentChild || '') + '\uff1a' + (c.nickname || labels.noChild),
    navAvatar: avatar.resolveAvatar(c, 'child'),
    navAvatarEmpty: false
  }
}

function setGlobalCurrentChildId(childId) {
  if (app && app.globalData) {
    if (typeof app.setCurrentChildId === 'function') {
      app.setCurrentChildId(childId || '')
    } else {
      app.globalData.currentChildId = childId || ''
      app.syncSession({ currentChildId: childId || '' })
    }
  }
}

function syncAuditTabBadge(count) {
  // 审核中心已不是 tab 项，首页只保留卡片角标，不再同步 tab 红点
  return count
}

function formatMonthDayTime(iso) {
  var ts = new Date(iso || '')
  if (isNaN(ts.getTime())) return ''
  var month = ts.getMonth() + 1
  var day = ts.getDate()
  var hour = String(ts.getHours()).padStart(2, '0')
  var minute = String(ts.getMinutes()).padStart(2, '0')
  return month + '/' + day + ' ' + hour + ':' + minute
}

Page({
  data: {
    loading: true,
    hasLoadedOnce: false,
    error: '',
    hasChildren: false,
    child: { _id: '', avatarIndex: 0, nickname: '\u672a\u6dfb\u52a0\u5b69\u5b50', currentPoints: 0, avatarUrl: '' },
    navSubtitle: '\u5f53\u524d\u5b69\u5b50\uff1a\u672a\u6dfb\u52a0\u5b69\u5b50',
    navAvatar: '',
    navAvatarEmpty: true,
    currentChildId: '',
    children: [],
    tasks: [],
    completedCount: 0,
    totalCount: 0,
    weeklyTrend: [],
    maxTrend: 100,
    pendingAuditCount: 0,
    badgeText: '',
    overdueHint: '',
    auditSummary: {
      taskPending: 0,
      rewardPending: 0,
      wishPending: 0,
      totalPending: 0,
      overdueTask: 0,
      overdueReward: 0,
      overdueWish: 0,
      overduePending: 0,
      hasOverdue: false,
      oldestPendingAt: ''
    },
    weeklyDigest: {
      reflectionStreak: 0,
      weekCompletedCount: 0,
      weekPoints: 0,
      digestText: '',
      challengeList: []
    },
    showTrendBars: false,
    linePoints: [],
    lineSegments: [],
    weekLabels: [
      { text: 'MON', active: false },
      { text: 'TUE', active: false },
      { text: 'WED', active: false },
      { text: 'THU', active: false },
      { text: 'FRI', active: false },
      { text: 'SAT', active: false },
      { text: 'SUN', active: true }
    ],
    labels: {
      loading: '\u52a0\u8f7d\u4e2d...',
      retry: '\u91cd\u8bd5',
      currentChild: '\u5f53\u524d\u5b69\u5b50',
      noChild: '\u6682\u672a\u6dfb\u52a0',
      appTitle: '\u5bb6\u5ead\u79ef\u5206\u7ba1\u5bb6',
      totalPoints: '\u5f53\u524d\u53ef\u7528\u79ef\u5206',
      doneToday: '\u4eca\u65e5\u5f85\u529e\u5df2\u5b8c\u6210',
      audit: '\u5956\u52b1\u5ba1\u6838',
      weeklyDigestTitle: '\u6210\u957f\u5468\u62a5',
      weeklyDigestAction: '\u67e5\u770b\u8be6\u60c5',
      digestCompleted: '\u672c\u5468\u8bb0\u5f55',
      digestPoints: '\u672c\u5468\u79ef\u5206',
      digestStreak: '\u8fde\u7eed\u5929\u6570',
      digestDayUnit: '\u5929',
      digestFallback: '\u672c\u5468\u8fd8\u6ca1\u6709\u65b0\u7684\u6210\u957f\u8bb0\u5f55',
      challengeTitle: '\u8fde\u7eed\u8fbe\u6807\u6311\u6218',
      challengeDone: '\u5df2\u8fbe\u6210',
      challengeRemainPrefix: '\u8fd8\u5dee',
      challengeRemainSuffix: '\u5929',
      challengeTargetSuffix: '\u5929',
      overdueTitlePrefix: '\u6709',
      overdueTitleSuffix: '\u6761\u5f85\u5ba1\u5df2\u8d85 24 \u5c0f\u65f6',
      overdueDetailPrefix: '\u4efb\u52a1',
      overdueDetailMiddle: '\u3001\u5956\u52b1',
      overdueDetailEnd: '\u3001\u613f\u671b',
      overdueAction: '\u7acb\u5373\u5904\u7406',
      overdueOldestPrefix: '\u6700\u65e9\u5f85\u5ba1\uff1a',
      trendTitle: '\u8fd17\u65e5\u79ef\u5206\u8d8b\u52bf',
      trendUnit: '\u7edf\u8ba1\u5355\u4f4d\uff1a\u5206',
      emptyTitle: '\u8fd8\u6ca1\u6709\u5b69\u5b50\u6863\u6848',
      emptyDesc: '\u4f60\u53ef\u4ee5\u5148\u8fdb\u5165\u5b69\u5b50\u7ba1\u7406\u6dfb\u52a0\u5b69\u5b50\uff0c\u7a0d\u540e\u518d\u56de\u6765\u8fd9\u91cc\u67e5\u770b\u6570\u636e\u3002',
      goAddChild: '\u53bb\u6dfb\u52a0\u5b69\u5b50'
    }
  },

  getReadOptions: function (options) {
    var opts = options || {}
    var readOptions = { ttlMs: app.getRefreshTTL() }
    if (opts.force) readOptions.force = true
    return readOptions
  },

  getGlobalCurrentChildId: function () {
    return (app && app.globalData ? app.globalData.currentChildId : '') || ''
  },

  syncCurrentChildFromGlobal: function () {
    var globalId = this.getGlobalCurrentChildId()
    if (!globalId || globalId === this.data.currentChildId) return ''
    var selected = (this.data.children || []).find(function (item) { return item._id === globalId })
    if (!selected) return ''
    var navInfo = getNavInfo(selected, this.data.labels)
    this.setData({
      currentChildId: selected._id,
      child: selected,
      navSubtitle: navInfo.navSubtitle,
      navAvatar: navInfo.navAvatar,
      navAvatarEmpty: navInfo.navAvatarEmpty
    })
    return selected._id || ''
  },

  onShow: function () {
    var that = this
    app.guardPage('/pages/parent/dashboard/index').then(function (redirected) {
      if (redirected) return
      if (that.data.hasLoadedOnce) {
        var switchedId = that.syncCurrentChildFromGlobal()
        if (switchedId) {
          that.loadChildScopedData(switchedId, { silent: true, force: true })
          return
        }
      }
      var shouldRefresh = !that.data.hasLoadedOnce || app.shouldScopeRefresh('parent.dashboard')
      if (!shouldRefresh) return
      that.loadData({ silent: that.data.hasLoadedOnce })
    })
  },

  loadData: function (options) {
    var opts = options || {}
    var coreTask = this.loadCoreData(opts)
    var auditTask = this.loadAuditBadge(opts)
    return Promise.all([coreTask, auditTask])
  },

  loadCoreData: function (options) {
    var that = this
    var opts = options || {}
    var today = format.getToday()
    var readOptions = that.getReadOptions(opts)
    var silent = !!opts.silent

    if (!silent) {
      that.setData({ loading: true, error: '' })
    } else if (that.data.error) {
      that.setData({ error: '' })
    }

    return api.getChildren(readOptions).then(function (children) {
      var list = children || []
      if (!list.length) {
        var emptyChild = {
          _id: '',
          avatarIndex: 0,
          nickname: that.data.labels.noChild,
          currentPoints: 0,
          avatarUrl: ''
        }
        var emptyNav = getNavInfo(null, that.data.labels)
        var fallbackLine = buildZeroLineData()

        that.setData({
          loading: false,
          hasLoadedOnce: true,
          hasChildren: false,
          children: [],
          child: emptyChild,
          navSubtitle: emptyNav.navSubtitle,
          navAvatar: emptyNav.navAvatar,
          navAvatarEmpty: emptyNav.navAvatarEmpty,
          currentChildId: '',
          tasks: [],
          completedCount: 0,
          totalCount: 0,
          linePoints: fallbackLine.points,
          lineSegments: fallbackLine.segments,
          weeklyTrend: [],
          maxTrend: 100
        })
        setGlobalCurrentChildId('')
        app.markScopeFetched('parent.dashboard')
        return null
      }

      var globalCurrentChildId = (app && app.globalData ? app.globalData.currentChildId : '') || ''
      var selectedId = globalCurrentChildId || that.data.currentChildId
      var selected = list.find(function (item) { return item._id === selectedId }) || list[0]
      var navInfo = getNavInfo(selected, that.data.labels)
      that.setData({
        hasChildren: true,
        children: list,
        child: selected,
        navSubtitle: navInfo.navSubtitle,
        navAvatar: navInfo.navAvatar,
        navAvatarEmpty: navInfo.navAvatarEmpty,
        currentChildId: selected._id || ''
      })
      setGlobalCurrentChildId(selected._id || '')

      return that.loadChildScopedData(selected._id, opts)
    }).catch(function (err) {
      console.error('load dashboard failed', err)
      that.setData({
        loading: false,
        error: '\u6570\u636e\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u540e\u91cd\u8bd5'
      })
    })
  },

  loadChildScopedData: function (childId, options) {
    var that = this
    var opts = options || {}
    var readOptions = that.getReadOptions(opts)
    var today = format.getToday()
    if (!childId) {
      that.setData({
        loading: false,
        hasLoadedOnce: true,
        tasks: [],
        completedCount: 0,
        totalCount: 0
      })
      return Promise.resolve(null)
    }

    return api.getTasks(childId, today, readOptions).then(function (tasks) {
      var taskList = tasks || []
      var completed = taskList.filter(function (task) { return task.status === 'completed' }).length
      that.setData({
        loading: false,
        hasLoadedOnce: true,
        tasks: taskList,
        completedCount: completed,
        totalCount: taskList.length
      })
      return api.getWeeklyTrend(childId, readOptions).then(function (trend) {
        var points = (trend || []).map(function (item) { return item.points || 0 })
        var max = points.length ? Math.max.apply(null, points) : 100
        var lineData = buildLineData(trend || [])
        that.setData({
          weeklyTrend: trend || [],
          maxTrend: max || 100,
          linePoints: lineData.points,
          lineSegments: lineData.segments
        })
        app.markScopeFetched('parent.dashboard')
      }).catch(function (err) {
        console.error('load trend failed', err)
        var fallbackLine = buildZeroLineData()
        that.setData({
          linePoints: fallbackLine.points,
          lineSegments: fallbackLine.segments
        })
        app.markScopeFetched('parent.dashboard')
      }).then(function () {
        return api.getStreakAndWeeklyDigest({ childId: childId }).then(function (digest) {
          var info = digest || {}
          that.setData({
            weeklyDigest: {
              reflectionStreak: Number(info.reflectionStreak || 0),
              weekCompletedCount: Number(info.weekCompletedCount || 0),
              weekPoints: Number(info.weekPoints || 0),
              digestText: String(info.digestText || ''),
              challengeList: Array.isArray(info.challengeList) ? info.challengeList : []
            }
          })
        }).catch(function (err) {
          console.error('load weekly digest failed', err)
          that.setData({
            weeklyDigest: {
              reflectionStreak: 0,
              weekCompletedCount: 0,
              weekPoints: 0,
              digestText: '',
              challengeList: []
            }
          })
        })
      })
    })
  },

  loadAuditBadge: function (options) {
    var that = this
    var readOptions = that.getReadOptions(options || {})
    return api.getPendingAuditSummary(readOptions).then(function (summary) {
      var info = summary || {}
      var count = Number(info.totalPending) || 0
      var overduePending = Number(info.overduePending) || 0
      var oldestText = info.oldestPendingAt ? formatMonthDayTime(info.oldestPendingAt) : ''
      that.setData({
        pendingAuditCount: count,
        badgeText: getBadgeText(count),
        overdueHint: oldestText ? (that.data.labels.overdueOldestPrefix + oldestText) : '',
        auditSummary: {
          taskPending: Number(info.taskPending) || 0,
          rewardPending: Number(info.rewardPending) || 0,
          wishPending: Number(info.wishPending) || 0,
          totalPending: count,
          overdueTask: Number(info.overdueTask) || 0,
          overdueReward: Number(info.overdueReward) || 0,
          overdueWish: Number(info.overdueWish) || 0,
          overduePending: overduePending,
          hasOverdue: !!info.hasOverdue || overduePending > 0,
          oldestPendingAt: String(info.oldestPendingAt || '')
        }
      })
      syncAuditTabBadge(count)
    }).catch(function (err) {
      console.error('load audit summary failed, fallback to legacy lists', err)
      return Promise.all([
        api.getRewardRequests('pending', readOptions),
        api.getWishRequests('pending', readOptions)
      ]).then(function (res) {
        var rewardList = res[0] || []
        var wishList = res[1] || []
        var count = rewardList.length + wishList.length
        that.setData({
          pendingAuditCount: count,
          badgeText: getBadgeText(count),
          overdueHint: '',
          auditSummary: {
            taskPending: 0,
            rewardPending: rewardList.length,
            wishPending: wishList.length,
            totalPending: count,
            overdueTask: 0,
            overdueReward: 0,
            overdueWish: 0,
            overduePending: 0,
            hasOverdue: false,
            oldestPendingAt: ''
          }
        })
        syncAuditTabBadge(count)
      }).catch(function (fallbackErr) {
        console.error('load audit count failed', fallbackErr)
        syncAuditTabBadge(0)
        that.setData({
          pendingAuditCount: 0,
          badgeText: '',
          overdueHint: '',
          auditSummary: {
            taskPending: 0,
            rewardPending: 0,
            wishPending: 0,
            totalPending: 0,
            overdueTask: 0,
            overdueReward: 0,
            overdueWish: 0,
            overduePending: 0,
            hasOverdue: false,
            oldestPendingAt: ''
          }
        })
      })
    })
  },

  onSelectChild: function (e) {
    var id = e.currentTarget.dataset.id
    if (!id || id === this.data.currentChildId) return
    var selected = (this.data.children || []).find(function (item) { return item._id === id })
    if (!selected) return
    var navInfo = getNavInfo(selected, this.data.labels)
    this.setData({
      currentChildId: selected._id,
      child: selected,
      navSubtitle: navInfo.navSubtitle,
      navAvatar: navInfo.navAvatar,
      navAvatarEmpty: navInfo.navAvatarEmpty
    })
    setGlobalCurrentChildId(selected._id)
    this.loadChildScopedData(selected._id, { silent: true, force: true })
  },

  onSwitchChild: function () {
    var that = this
    var names = this.data.children.map(function (item) { return item.nickname })
    if (names.length <= 1) return
    wx.showActionSheet({
      itemList: names,
      success: function (res) {
        var selected = that.data.children[res.tapIndex]
        if (!selected) return
        var navInfo = getNavInfo(selected, that.data.labels)
        that.setData({
          currentChildId: selected._id,
          child: selected,
          navSubtitle: navInfo.navSubtitle,
          navAvatar: navInfo.navAvatar,
          navAvatarEmpty: navInfo.navAvatarEmpty
        })
        setGlobalCurrentChildId(selected._id)
        that.loadChildScopedData(selected._id, { silent: true, force: true })
      }
    })
  },

  onGoAddChild: function () {
    wx.navigateTo({ url: '/pages/parent/add-child/index' })
  },

  onAuditCenter: function () {
    wx.navigateTo({ url: '/pages/parent/audit-center/index' })
  },

  onWeeklyReport: function () {
    var childId = this.data.currentChildId || ''
    var suffix = childId ? ('?id=' + childId) : ''
    wx.navigateTo({ url: '/pages/parent/weekly-report/index' + suffix })
  }
})
