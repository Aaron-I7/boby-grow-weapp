var api = require('../../../utils/api')
var avatar = require('../../../utils/avatar')
var app = getApp()

function getNavState(child) {
  var c = child || {}
  if (!c._id) {
    return {
      navSubtitle: '\u5f53\u524d\u5b69\u5b50\uff1a' + '\u672a\u6dfb\u52a0\u5b69\u5b50',
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

Page({
  data: {
    navTitle: '\u5b69\u5b50\u7ba1\u7406',
    hasLoadedOnce: false,
    navSubtitle: '\u5f53\u524d\u5b69\u5b50\uff1a\u672a\u6dfb\u52a0\u5b69\u5b50',
    navAvatar: '',
    navAvatarEmpty: true,
    currentChildId: '',
    labels: {
      addChild: '\u6dfb\u52a0\u5b69\u5b50',
      bindGuide: '\u7ed1\u5b9a\u4e0e\u6838\u9a8c\u7801',
      coadminManage: '\u534f\u7ba1\u5458\u7ba1\u7406',
      levelPrefix: 'Lv.',
      ageUnit: '\u5c81',
      points: '\u79ef\u5206',
      verifyCode: '\u6838\u9a8c\u7801\uff1a',
      edit: '\u4fee\u6539',
      addMore: '+ \u6dfb\u52a0\u66f4\u591a\u5b69\u5b50',
      editTitle: '\u4fee\u6539\u5b69\u5b50\u4fe1\u606f',
      nickname: '\u6635\u79f0',
      age: '\u5e74\u9f84',
      gender: '\u6027\u522b',
      avatar: '\u5934\u50cf',
      avatarRecommended: '\u63a8\u8350',
      avatarAll: '\u5168\u90e8',
      cancel: '\u53d6\u6d88',
      confirm: '\u4fdd\u5b58',
      needNickname: '\u8bf7\u8f93\u5165\u6635\u79f0',
      needAge: '\u8bf7\u8f93\u5165\u5e74\u9f84',
      saveSuccess: '\u4fee\u6539\u6210\u529f'
    },
    children: [],
    showEditModal: false,
    editChildId: '',
    editNickname: '',
    editAge: '',
    editGenderIndex: 0,
    editGenderList: ['\u7537\u5b69', '\u5973\u5b69'],
    editGenderKeys: ['male', 'female'],
    editAvatarMode: 'recommended',
    editAvatarOptions: [],
    editAvatarKey: '',
    editAvatarUrl: ''
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
    app.guardPage('/pages/parent/child-manage/index').then(function (redirected) {
      if (redirected) return
      if (that.data.hasLoadedOnce && that.syncCurrentChildFromGlobal()) return
      var shouldRefresh = !that.data.hasLoadedOnce || app.shouldScopeRefresh('parent.childManage')
      if (!shouldRefresh) return
      that.loadChildren({ silent: that.data.hasLoadedOnce })
    })
  },

  setGlobalCurrentChildId: function (childId) {
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
  },

  loadChildren: function (options) {
    var that = this
    var readOptions = that.getReadOptions(options)
    return api.getChildren(readOptions).then(function (list) {
      var children = (list || []).map(function (item) {
        return avatar.withResolvedAvatar(item, 'child')
      })
      if (!children.length) {
        var emptyNav = getNavState(null)
        that.setData({
          hasLoadedOnce: true,
          children: [],
          currentChildId: '',
          navSubtitle: emptyNav.navSubtitle,
          navAvatar: emptyNav.navAvatar,
          navAvatarEmpty: emptyNav.navAvatarEmpty
        })
        that.setGlobalCurrentChildId('')
        app.markScopeFetched('parent.childManage')
        return
      }

      var globalId = app && app.globalData ? app.globalData.currentChildId : ''
      var preferredId = (globalId || '') || that.data.currentChildId
      var selected = children.find(function (item) { return item._id === preferredId }) || children[0]
      var nav = getNavState(selected)
      that.setData({
        hasLoadedOnce: true,
        children: children,
        currentChildId: selected._id,
        navSubtitle: nav.navSubtitle,
        navAvatar: nav.navAvatar,
        navAvatarEmpty: nav.navAvatarEmpty
      })
      that.setGlobalCurrentChildId(selected._id)
      app.markScopeFetched('parent.childManage')
    })
  },

  patchChildInList: function (payload) {
    var children = (this.data.children || []).map(function (item) {
      if (item._id !== payload._id) return item
      return avatar.withResolvedAvatar(Object.assign({}, item, payload), 'child')
    })
    var selected = children.find(function (item) { return item._id === this.data.currentChildId }, this)
    var nav = getNavState(selected || null)
    this.setData({
      children: children,
      navSubtitle: nav.navSubtitle,
      navAvatar: nav.navAvatar,
      navAvatarEmpty: nav.navAvatarEmpty
    })
    app.markScopeFetched('parent.childManage')
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
        that.setGlobalCurrentChildId(selected._id)
      }
    })
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
    this.setGlobalCurrentChildId(selected._id)
  },

  onAddChild: function () { wx.navigateTo({ url: '/pages/parent/add-child/index' }) },
  onBindGuide: function () { wx.navigateTo({ url: '/pages/parent/bind-guide/index' }) },
  onCoadminManage: function () { wx.navigateTo({ url: '/pages/parent/coadmin-manage/index' }) },

  onChildDetail: function (e) {
    var id = e.currentTarget.dataset.id
    if (!id) return
    this.setGlobalCurrentChildId(id)
    wx.navigateTo({ url: '/pages/parent/child-profiles/index?id=' + id })
  },

  syncEditAvatarOptions: function () {
    var gender = this.data.editGenderKeys[this.data.editGenderIndex] || 'male'
    var mode = this.data.editAvatarMode || 'recommended'
    var options = avatar.getPresetOptions({
      audience: 'child',
      role: 'child',
      gender: gender,
      mode: mode
    })
    if (!options.length) {
      options = avatar.getPresetOptions({ audience: 'child', mode: 'all' })
    }

    var picked = options.find(function (item) { return item.key === this.data.editAvatarKey }, this) || options[0]
    this.setData({
      editAvatarOptions: options,
      editAvatarKey: picked ? picked.key : '',
      editAvatarUrl: picked ? picked.path : avatar.getDefaultAvatar('child')
    })
  },

  onEditChild: function (e) {
    var id = e.currentTarget.dataset.id
    var child = (this.data.children || []).find(function (item) { return item._id === id })
    if (!child) return

    var genderKey = child.gender === 'female' ? 'female' : 'male'
    var genderIndex = this.data.editGenderKeys.indexOf(genderKey)
    if (genderIndex < 0) genderIndex = 0

    this.setData({
      showEditModal: true,
      editChildId: child._id,
      editNickname: child.nickname || '',
      editAge: String(child.age || ''),
      editGenderIndex: genderIndex,
      editAvatarMode: 'recommended',
      editAvatarKey: child.avatarKey || '',
      editAvatarUrl: child.avatarUrl || avatar.resolveAvatar(child, 'child')
    })
    this.syncEditAvatarOptions()
  },

  onEditInput: function (e) {
    var field = e.currentTarget.dataset.field
    var value = e.detail.value
    if (!field) return
    var patch = {}
    patch[field] = value
    this.setData(patch)
  },

  onEditGenderChange: function (e) {
    this.setData({ editGenderIndex: Number(e.detail.value) || 0 })
    this.syncEditAvatarOptions()
  },

  onEditAvatarModeChange: function (e) {
    var mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.editAvatarMode) return
    this.setData({ editAvatarMode: mode })
    this.syncEditAvatarOptions()
  },

  onSelectEditAvatar: function (e) {
    var key = e.currentTarget.dataset.key
    var url = e.currentTarget.dataset.url
    if (!key || !url) return
    this.setData({
      editAvatarKey: key,
      editAvatarUrl: url
    })
  },

  onCancelEdit: function () {
    this.setData({
      showEditModal: false,
      editChildId: ''
    })
  },

  onConfirmEdit: function () {
    var nickname = (this.data.editNickname || '').trim()
    var age = parseInt(this.data.editAge, 10)
    if (!nickname) {
      wx.showToast({ title: this.data.labels.needNickname, icon: 'none' })
      return
    }
    if (!age || age <= 0) {
      wx.showToast({ title: this.data.labels.needAge, icon: 'none' })
      return
    }

    var allChildKeys = avatar.getPresetKeys({ audience: 'child', mode: 'all' })
    var avatarIndex = allChildKeys.indexOf(this.data.editAvatarKey)
    if (avatarIndex < 0) avatarIndex = 0

    var payload = {
      _id: this.data.editChildId,
      nickname: nickname,
      age: age,
      gender: this.data.editGenderKeys[this.data.editGenderIndex] || 'male',
      avatarKey: this.data.editAvatarKey,
      avatarUrl: this.data.editAvatarUrl || avatar.getDefaultAvatar('child'),
      avatarIndex: avatarIndex
    }

    var that = this
    api.editChild(payload).then(function () {
      that.setData({
        showEditModal: false,
        editChildId: ''
      })
      wx.showToast({ title: that.data.labels.saveSuccess, icon: 'success' })
      that.patchChildInList(payload)
    })
  }
})
