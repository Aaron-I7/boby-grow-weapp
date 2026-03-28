var api = require('../../../utils/api')
var format = require('../../../utils/format')
var avatar = require('../../../utils/avatar')
var constants = require('../../../utils/constants')
var app = getApp()

var PIE_COLORS = ['#0F9D92', '#2D7FF9', '#F39C12', '#E74C3C', '#9B59B6', '#7F8C8D']

function getRoleLabel(level) {
  if ((level || 0) >= 10) return '\u63a2\u7d22\u8005'
  if ((level || 0) >= 6) return '\u5c0f\u80fd\u624b'
  return '\u6210\u957f\u65b0\u661f'
}

function toDisplayDate(dateKey) {
  if (!dateKey) return '\u672a\u77e5\u65e5\u671f'
  var d = new Date(dateKey + 'T00:00:00')
  if (isNaN(d.getTime())) return dateKey
  return d.getMonth() + 1 + '\u6708' + d.getDate() + '\u65e5'
}

function buildTimelineGroups(list) {
  var groups = []
  var map = {}
  ;(list || []).forEach(function (item) {
    var key = item.completedDateKey || 'unknown'
    if (!map[key]) {
      map[key] = {
        dateKey: key,
        dateLabel: toDisplayDate(key),
        items: []
      }
      groups.push(map[key])
    }
    map[key].items.push(item)
  })
  return groups
}

function normalizeChildCard(child) {
  var c = child || {}
  return {
    id: c._id || '',
    nickname: c.nickname || '\u5b69\u5b50',
    level: c.level || 1,
    levelTag: 'LV.' + (c.level || 1),
    roleLabel: getRoleLabel(c.level),
    avatarUrl: avatar.resolveAvatar(c, 'child'),
    currentPoints: c.currentPoints || 0
  }
}

Page({
  data: {
    routeChildId: '',
    currentChildId: '',
    loading: true,
    error: '',
    childCard: null,
    queryStartTime: '',
    queryEndTime: '',
    currentTab: 'overview',
    labels: {
      navTitle: '\u6210\u957f\u6863\u6848',
      heroTitle: '\u6210\u957f\u6863\u6848',
      heroDesc: '\u8bb0\u5f55\u5f53\u524d\u5b69\u5b50\u4efb\u52a1\u5b8c\u6210\u8f68\u8ff9\uff0c\u9ed8\u8ba4\u5c55\u793a\u5168\u91cf\u5386\u53f2\uff08\u5df2\u9884\u7559\u65f6\u95f4\u7b5b\u9009\u80fd\u529b\uff09\u3002',
      currentPoints: '\u5f53\u524d\u79ef\u5206',
      totalDone: '\u7d2f\u8ba1\u5b8c\u6210',
      doneUnit: '\u6b21',
      tabOverview: '\u603b\u89c8',
      tabDetail: '\u8be6\u7ec6',
      chartTitle: '\u4efb\u52a1\u5b8c\u6210\u7ed3\u6784',
      chartEmpty: '\u6682\u65e0\u5b8c\u6210\u8bb0\u5f55',
      allCategory: '\u5168\u90e8',
      rankTitle: '\u4efb\u52a1\u5b8c\u6210\u699c',
      rankCountSuffix: '\u6b21',
      growthTitle: '\u5185\u9a71\u6210\u957f\u4fe1\u53f7',
      growthReflection: '\u53cd\u601d\u63d0\u4ea4',
      growthFeedback: '\u8fc7\u7a0b\u53cd\u9988',
      growthRewardBehavior: '\u5956\u52b1\u884c\u4e3a',
      growthStreak: '\u53cd\u601d\u8fde\u7eed',
      growthStreakUnit: '\u5929',
      detailTitle: '\u4efb\u52a1\u5b8c\u6210\u65f6\u95f4\u7ebf',
      loadMore: '\u52a0\u8f7d\u66f4\u591a',
      noMore: '\u5df2\u7ecf\u5230\u5e95\u4e86',
      emptyDetail: '\u6682\u65e0\u53ef\u5c55\u793a\u7684\u5b8c\u6210\u8bb0\u5f55',
      loadingMore: '\u52a0\u8f7d\u4e2d...'
    },
    totalCompleted: 0,
    categorySummary: [],
    selectedCategory: '',
    taskRankingAll: [],
    taskRankingDisplay: [],
    overviewLoading: false,
    growthOverview: {
      reflectionCount: 0,
      feedbackCount: 0,
      rewardBehaviorCount: 0,
      reflectionStreak: 0
    },
    timelineList: [],
    timelineGroups: [],
    timelinePageNo: 1,
    timelinePageSize: 10,
    timelineHasMore: true,
    timelineLoading: false,
    timelineLoadingMore: false
  },

  onLoad: function (options) {
    this.setData({
      routeChildId: options && options.id ? options.id : ''
    })
  },

  onShow: function () {
    this.bootstrapData()
  },

  onReachBottom: function () {
    if (this.data.currentTab !== 'detail') return
    this.loadTimelinePage(false)
  },

  onBack: function () {
    wx.navigateBack()
  },

  bootstrapData: function () {
    var that = this
    this.setData({ loading: true, error: '' })
    api.getChildren().then(function (children) {
      var list = children || []
      if (!list.length) {
        that.setData({
          loading: false,
          error: '\u6682\u65e0\u5b69\u5b50\u6863\u6848\uff0c\u8bf7\u5148\u6dfb\u52a0\u5b69\u5b50',
          childCard: null,
          currentChildId: ''
        })
        if (app && app.globalData) app.globalData.currentChildId = ''
        return
      }

      var routeId = that.data.routeChildId
      var globalId = app && app.globalData ? app.globalData.currentChildId : ''
      var current = list.find(function (item) { return item._id === routeId }) ||
        list.find(function (item) { return item._id === globalId }) ||
        list[0]

      if (app && app.globalData) {
        app.globalData.currentChildId = current._id
      }

      that.setData({
        loading: false,
        currentChildId: current._id,
        childCard: normalizeChildCard(current)
      })

      that.refreshOverview()
      that.loadTimelinePage(true)
    }).catch(function (err) {
      console.error('\u52a0\u8f7d\u6210\u957f\u6863\u6848\u5931\u8d25', err)
      that.setData({
        loading: false,
        error: '\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'
      })
    })
  },

  refreshOverview: function () {
    var that = this
    var childId = this.data.currentChildId
    if (!childId) return

    this.setData({ overviewLoading: true })
    Promise.all([
      api.getTaskCompletionOverview({
        childId: childId,
        startTime: this.data.queryStartTime || undefined,
        endTime: this.data.queryEndTime || undefined
      }),
      api.getGrowthOverview({
        childId: childId,
        startTime: this.data.queryStartTime || undefined,
        endTime: this.data.queryEndTime || undefined
      })
    ]).then(function (allRes) {
      var res = allRes[0] || {}
      var growth = allRes[1] || {}
      var categorySummary = (res && res.categorySummary ? res.categorySummary : []).map(function (item, index) {
        return Object.assign({}, item, {
          color: PIE_COLORS[index % PIE_COLORS.length]
        })
      })
      var taskRankingAll = res && res.taskRanking ? res.taskRanking : []
      var totalCompleted = res && res.totalCompleted ? res.totalCompleted : 0

      var selectedCategory = that.data.selectedCategory
      var hasSelected = categorySummary.some(function (item) { return item.categoryKey === selectedCategory })
      if (!hasSelected) selectedCategory = ''

      that.setData({
        categorySummary: categorySummary,
        totalCompleted: totalCompleted,
        taskRankingAll: taskRankingAll,
        selectedCategory: selectedCategory,
        taskRankingDisplay: that.filterTaskRanking(taskRankingAll, selectedCategory),
        growthOverview: {
          reflectionCount: growth.reflectionCount || 0,
          feedbackCount: growth.feedbackCount || 0,
          rewardBehaviorCount: growth.rewardBehaviorCount || 0,
          reflectionStreak: growth.reflectionStreak || 0
        }
      })
      that.drawPieChart()
    }).finally(function () {
      that.setData({ overviewLoading: false })
    })
  },

  drawPieChart: function () {
    var list = this.data.categorySummary || []
    var total = list.reduce(function (sum, item) { return sum + (item.count || 0) }, 0)
    var ctx = wx.createCanvasContext('overviewPie', this)
    var center = 150
    var radius = 120
    var start = -Math.PI / 2

    ctx.clearRect(0, 0, 300, 300)

    if (!total) {
      ctx.beginPath()
      ctx.setFillStyle('#E6ECF1')
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, 0, Math.PI * 2)
      ctx.closePath()
      ctx.fill()
    } else {
      list.forEach(function (item) {
        var angle = (item.count || 0) / total * Math.PI * 2
        ctx.beginPath()
        ctx.setFillStyle(item.color || '#7F8C8D')
        ctx.moveTo(center, center)
        ctx.arc(center, center, radius, start, start + angle)
        ctx.closePath()
        ctx.fill()
        start += angle
      })
    }

    ctx.beginPath()
    ctx.setFillStyle('#FFFFFF')
    ctx.moveTo(center, center)
    ctx.arc(center, center, 64, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()

    ctx.setFillStyle('#8A99A4')
    ctx.setTextAlign('center')
    ctx.setFontSize(20)
    ctx.fillText('\u5b8c\u6210', center, center - 8)
    ctx.setFillStyle('#23303A')
    ctx.setFontSize(34)
    ctx.fillText(String(total), center, center + 34)
    ctx.draw()
  },

  filterTaskRanking: function (list, categoryKey) {
    var source = list || []
    if (!categoryKey) return source
    return source.filter(function (item) { return item.categoryKey === categoryKey })
  },

  onSelectCategory: function (e) {
    var key = e.currentTarget.dataset.key || ''
    var selected = key === this.data.selectedCategory ? '' : key
    this.setData({
      selectedCategory: selected,
      taskRankingDisplay: this.filterTaskRanking(this.data.taskRankingAll, selected)
    })
  },

  mapTimelineItem: function (item) {
    var completedAt = item.completedAt || ''
    return {
      taskId: item.taskId || '',
      ruleName: item.ruleName || '\u672a\u547d\u540d\u4efb\u52a1',
      category: item.category || 'other',
      categoryLabel: constants.CATEGORY[item.category] || '\u5176\u4ed6',
      points: item.points || 0,
      completedAt: completedAt,
      completedDateKey: item.completedDateKey || '',
      completedTimeText: completedAt ? format.formatTime(completedAt) : '--:--'
    }
  },

  loadTimelinePage: function (reset) {
    var that = this
    if (this.data.timelineLoadingMore) return
    if (!reset && !this.data.timelineHasMore) return
    if (!this.data.currentChildId) return

    var pageNo = reset ? 1 : this.data.timelinePageNo
    this.setData({
      timelineLoading: reset,
      timelineLoadingMore: !reset
    })

    api.getTaskCompletionTimeline({
      childId: this.data.currentChildId,
      startTime: this.data.queryStartTime || undefined,
      endTime: this.data.queryEndTime || undefined,
      pageNo: pageNo,
      pageSize: this.data.timelinePageSize
    }).then(function (res) {
      var incoming = (res && res.list ? res.list : []).map(function (item) {
        return that.mapTimelineItem(item)
      })
      var merged = reset ? incoming : that.data.timelineList.concat(incoming)
      that.setData({
        timelineList: merged,
        timelineGroups: buildTimelineGroups(merged),
        timelineHasMore: !!(res && res.hasMore),
        timelinePageNo: (res && res.pageNo ? res.pageNo : pageNo) + 1
      })
    }).finally(function () {
      that.setData({
        timelineLoading: false,
        timelineLoadingMore: false
      })
    })
  },

  onLoadMoreTap: function () {
    this.loadTimelinePage(false)
  },

  onTabChange: function (e) {
    var tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.currentTab) return
    this.setData({ currentTab: tab })
    if (tab === 'detail' && !this.data.timelineList.length) {
      this.loadTimelinePage(true)
    }
  }
})
