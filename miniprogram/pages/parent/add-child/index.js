var api = require('../../../utils/api')
var avatar = require('../../../utils/avatar')
var app = getApp()

Page({
  data: {
    roleLabel: '\u5b69\u5b50',
    genderKeys: ['male', 'female'],
    genderList: ['\u7537\u5b69', '\u5973\u5b69'],
    genderIndex: 0,
    avatarMode: 'recommended',
    avatarOptions: [],
    avatarKey: '',
    avatarUrl: '',
    nickname: '',
    age: '',
    initPoints: '',
    isOnboarding: false,
    showBack: true,
    saveText: '',
    labels: {
      navTitle: '\u6dfb\u52a0\u5b69\u5b50',
      role: '\u89d2\u8272',
      gender: '\u6027\u522b',
      avatar: '\u9009\u62e9\u5934\u50cf',
      avatarRecommended: '\u63a8\u8350',
      avatarAll: '\u5168\u90e8',
      nickname: '\u5b69\u5b50\u6635\u79f0',
      nicknamePlaceholder: '\u8bf7\u8f93\u5165\u6635\u79f0',
      age: '\u5e74\u9f84',
      agePlaceholder: '\u8bf7\u8f93\u5165\u5e74\u9f84',
      initPoints: '\u521d\u59cb\u79ef\u5206\uff08\u53ef\u9009\uff09',
      initPointsPlaceholder: '\u9ed8\u8ba4 0',
      privacy: '\u6211\u4eec\u4e0d\u4f1a\u6536\u96c6\u5b69\u5b50\u7684\u771f\u5b9e\u59d3\u540d\u7b49\u654f\u611f\u4fe1\u606f',
      save: '\u4fdd\u5b58',
      saveNext: '\u4fdd\u5b58\u5e76\u7ee7\u7eed',
      skip: '\u8df3\u8fc7\uff0c\u7a0d\u540e\u518d\u5728\u5b69\u5b50\u7ba1\u7406\u6dfb\u52a0',
      needNickname: '\u8bf7\u8f93\u5165\u6635\u79f0',
      needAge: '\u8bf7\u8f93\u5165\u5e74\u9f84',
      saveSuccess: '\u6dfb\u52a0\u6210\u529f'
    }
  },

  onLoad: function (options) {
    var isOnboarding = options && options.mode === 'onboarding'
    this.setData({
      isOnboarding: isOnboarding,
      showBack: !isOnboarding,
      saveText: isOnboarding ? this.data.labels.saveNext : this.data.labels.save
    })
    this.syncAvatarOptions()
  },

  onBack: function () {
    if (this.data.isOnboarding) return
    wx.navigateBack()
  },

  onInput: function (e) {
    var obj = {}
    obj[e.currentTarget.dataset.field] = e.detail.value
    this.setData(obj)
  },

  onGenderChange: function (e) {
    this.setData({ genderIndex: Number(e.detail.value) || 0 })
    this.syncAvatarOptions()
  },

  onAvatarModeChange: function (e) {
    var mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.avatarMode) return
    this.setData({ avatarMode: mode })
    this.syncAvatarOptions()
  },

  onSelectAvatar: function (e) {
    var key = e.currentTarget.dataset.key
    var url = e.currentTarget.dataset.url
    if (!key || !url) return
    this.setData({ avatarKey: key, avatarUrl: url })
  },

  syncAvatarOptions: function () {
    var gender = this.data.genderKeys[this.data.genderIndex] || 'male'
    var mode = this.data.avatarMode
    var options = avatar.getPresetOptions({
      audience: 'child',
      role: 'child',
      gender: gender,
      mode: mode
    })
    if (!options.length) {
      options = avatar.getPresetOptions({ audience: 'child', mode: 'all' })
    }

    var currentKey = this.data.avatarKey
    var picked = options.find(function (item) { return item.key === currentKey }) || options[0]

    this.setData({
      avatarOptions: options,
      avatarKey: picked ? picked.key : '',
      avatarUrl: picked ? picked.path : avatar.getDefaultAvatar('child')
    })
  },

  onSkip: function () {
    if (!this.data.isOnboarding) return
    app.globalData.currentChildId = ''
    app.completeOnboarding({
      childStepDone: true,
      childSkipped: true,
      bindGuideDone: true,
      bindGuideSkipped: true
    })
    app.syncSession({ loggedIn: true, currentChildId: '' })
    wx.switchTab({ url: '/pages/parent/dashboard/index' })
  },

  handleCreateSuccess: function (child) {
    var that = this
    var code = String((child && child.verifyCode) || '')

    var goNext = function () {
      if (that.data.isOnboarding) {
        app.completeOnboarding({
          profileDone: true,
          childStepDone: true,
          childSkipped: false,
          bindGuideDone: true,
          bindGuideSkipped: true
        })
        app.syncSession({
          loggedIn: true,
          currentChildId: app.globalData.currentChildId || ''
        })
        wx.switchTab({ url: '/pages/parent/dashboard/index' })
        return
      }
      wx.navigateBack()
    }

    if (!code) {
      wx.showToast({ title: that.data.labels.saveSuccess, icon: 'success' })
      setTimeout(goNext, 500)
      return
    }

    wx.showModal({
      title: that.data.labels.saveSuccess,
      content: '\u5b69\u5b50\u67e5\u8be2\u6838\u9a8c\u7801\uff1a' + code,
      confirmText: '\u590d\u5236\u6838\u9a8c\u7801',
      cancelText: '\u7a0d\u540e\u518d\u8bf4',
      success: function (res) {
        if (res.confirm) {
          wx.setClipboardData({
            data: code,
            success: function () {
              wx.showToast({ title: '\u5df2\u590d\u5236', icon: 'success' })
            }
          })
        }
        goNext()
      },
      fail: function () {
        goNext()
      }
    })
  },

  onSave: function () {
    var that = this
    var d = this.data
    if (!String(d.nickname || '').trim()) {
      wx.showToast({ title: d.labels.needNickname, icon: 'none' })
      return
    }
    if (!d.age) {
      wx.showToast({ title: d.labels.needAge, icon: 'none' })
      return
    }

    var allChildKeys = avatar.getPresetKeys({ audience: 'child', mode: 'all' })
    var avatarIndex = allChildKeys.indexOf(d.avatarKey)
    if (avatarIndex < 0) avatarIndex = 0

    var payload = {
      nickname: String(d.nickname || '').trim(),
      age: parseInt(d.age, 10),
      gender: d.genderKeys[d.genderIndex] || 'male',
      avatarIndex: avatarIndex,
      avatarKey: d.avatarKey,
      avatarUrl: d.avatarUrl || avatar.getDefaultAvatar('child'),
      currentPoints: parseInt(d.initPoints, 10) || 0,
      totalPoints: parseInt(d.initPoints, 10) || 0
    }

    api.addChild(payload).then(function (child) {
      if (child && child._id) {
        app.globalData.currentChildId = child._id
      }
      app.syncSession({
        loggedIn: true,
        currentChildId: app.globalData.currentChildId || ''
      })
      that.handleCreateSuccess(child || {})
    }).catch(function (err) {
      console.error('add child failed', err)
      wx.showToast({ title: '\u6dfb\u52a0\u5b69\u5b50\u5931\u8d25', icon: 'none' })
    })
  }
})
