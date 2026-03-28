var api = require('../../../utils/api')
var constants = require('../../../utils/constants')
var avatar = require('../../../utils/avatar')
var app = getApp()

function getNavState(child) {
  var c = child || {}
  if (!c._id) {
    return {
      navSubtitle: '\u5f53\u524d\u5b69\u5b50\uff1a\u672a\u6dfb\u52a0\u5b69\u5b50',
      navAvatar: '',
      navAvatarEmpty: true
    }
  }
  return {
    navSubtitle: '\u5f53\u524d\u5b69\u5b50\uff1a' + (c.nickname || '\u672a\u6dfb\u52a0\u5b69\u5b50'),
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
      if (typeof app.syncSession === 'function') {
        app.syncSession({ currentChildId: childId || '' })
      }
    }
  }
}

Page({
  data: {
    navTitle: '\u4efb\u52a1\u4e2d\u5fc3',
    hasLoadedOnce: false,
    navSubtitle: '\u5f53\u524d\u5b69\u5b50\uff1a\u672a\u6dfb\u52a0\u5b69\u5b50',
    navAvatar: '',
    navAvatarEmpty: true,
    children: [],
    currentChildId: '',
    labels: {
      all: '\u5168\u90e8',
      pointsPrefix: '+',
      pointsUnit: '\u5206',
      freqDaily: '\u6bcf\u65e5',
      freqWeekly: '\u6bcf\u5468',
      freqOnce: '\u5355\u6b21',
      dailyLimitPrefix: '\u6bcf\u65e5',
      dailyLimitSuffix: '\u6b21',
      empty: '\u6682\u65e0\u4efb\u52a1\u89c4\u5219'
    },
    categories: constants.CATEGORY_LIST,
    currentCategory: '',
    rules: [],
    categoryMap: constants.CATEGORY
  },

  getReadOptions: function (options) {
    var opts = options || {}
    var readOptions = { ttlMs: app.getRefreshTTL() }
    if (opts.force) readOptions.force = true
    return readOptions
  },

  syncCurrentChildFromGlobal: function () {
    var children = this.data.children || []
    if (!children.length) return false
    var globalId = (app && app.globalData ? app.globalData.currentChildId : '') || ''
    if (!globalId || globalId === this.data.currentChildId) return false
    var selected = children.find(function (item) { return item._id === globalId })
    if (!selected) return false
    var nav = getNavState(selected)
    this.setData({
      currentChildId: selected._id,
      navSubtitle: nav.navSubtitle,
      navAvatar: nav.navAvatar,
      navAvatarEmpty: nav.navAvatarEmpty
    })
    return true
  },

  onShow: function () {
    var that = this
    app.guardPage('/pages/parent/task-manage/index').then(function (redirected) {
      if (redirected) return
      if (that.data.hasLoadedOnce && that.syncCurrentChildFromGlobal()) return
      var shouldRefresh = !that.data.hasLoadedOnce || app.shouldScopeRefresh('parent.taskManage')
      if (!shouldRefresh) return
      that.refreshData({ silent: that.data.hasLoadedOnce })
    })
  },

  refreshData: function (options) {
    var that = this
    var opts = options || {}
    return Promise.all([
      that.loadNavChildren(opts),
      that.loadRules(opts)
    ]).then(function () {
      that.setData({ hasLoadedOnce: true })
      app.markScopeFetched('parent.taskManage')
    }).catch(function (err) {
      console.error('refresh task-manage failed', err)
    })
  },

  loadNavChildren: function (options) {
    var that = this
    var readOptions = that.getReadOptions(options)
    return api.getChildren(readOptions).then(function (list) {
      var children = list || []
      if (!children.length) {
        var emptyNav = getNavState(null)
        that.setData({
          children: [],
          currentChildId: '',
          navSubtitle: emptyNav.navSubtitle,
          navAvatar: emptyNav.navAvatar,
          navAvatarEmpty: emptyNav.navAvatarEmpty
        })
        setGlobalCurrentChildId('')
        return
      }
      var globalCurrentChildId = (app && app.globalData ? app.globalData.currentChildId : '') || ''
      var preferredId = globalCurrentChildId || that.data.currentChildId
      var selected = children.find(function (item) { return item._id === preferredId }) || children[0]
      var nav = getNavState(selected)
      that.setData({
        children: children,
        currentChildId: selected._id,
        navSubtitle: nav.navSubtitle,
        navAvatar: nav.navAvatar,
        navAvatarEmpty: nav.navAvatarEmpty
      })
      setGlobalCurrentChildId(selected._id)
    })
  },

  loadRules: function (options) {
    var that = this
    var readOptions = that.getReadOptions(options)
    return api.getRules(this.data.currentCategory || undefined, readOptions).then(function (rules) {
      that.setData({ rules: rules })
    })
  },

  onCategoryChange: function (e) {
    var key = e.currentTarget.dataset.key
    this.setData({ currentCategory: key === this.data.currentCategory ? '' : key })
    this.loadRules({ force: true })
  },

  onToggleRule: function (e) {
    var id = e.currentTarget.dataset.id
    var enabled = !e.currentTarget.dataset.enabled
    var that = this
    api.toggleRule(id, enabled).then(function () { that.loadRules({ force: true }) })
  },
  onSelectChild: function (e) {
    var id = e.currentTarget.dataset.id
    if (!id || id === this.data.currentChildId) return
    var selected = (this.data.children || []).find(function (item) { return item._id === id })
    if (!selected) return
    var nav = getNavState(selected)
    this.setData({
      currentChildId: selected._id,
      navSubtitle: nav.navSubtitle,
      navAvatar: nav.navAvatar,
      navAvatarEmpty: nav.navAvatarEmpty
    })
    setGlobalCurrentChildId(selected._id)
  },
  onSwitchChild: function () {
    var that = this
    var names = (this.data.children || []).map(function (item) { return item.nickname })
    if (names.length <= 1) return
    wx.showActionSheet({
      itemList: names,
      success: function (res) {
        var selected = that.data.children[res.tapIndex]
        if (!selected) return
        var nav = getNavState(selected)
        that.setData({
          currentChildId: selected._id,
          navSubtitle: nav.navSubtitle,
          navAvatar: nav.navAvatar,
          navAvatarEmpty: nav.navAvatarEmpty
        })
        setGlobalCurrentChildId(selected._id)
      }
    })
  },
  onAddTask: function () {
    wx.navigateTo({ url: '/pages/parent/add-task/index' })
  }
})
