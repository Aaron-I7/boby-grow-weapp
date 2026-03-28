var api = require('../../../utils/api')
var avatar = require('../../../utils/avatar')
var app = getApp()

function getFileExt(path) {
  var m = /\.([a-zA-Z0-9]+)$/.exec(path || '')
  return m ? ('.' + m[1]) : '.png'
}

Page({
  data: {
    saving: false,
    profileId: '',
    avatarUrl: avatar.getDefaultAvatar('self'),
    avatarKey: '',
    avatarMode: 'recommended',
    avatarOptions: [],
    nickname: '',
    isOnboarding: false,
    showBack: true,
    saveText: '',
    identityList: ['\u7238\u7238', '\u5988\u5988', '\u7237\u7237', '\u5976\u5976', '\u5176\u4ed6'],
    identityKeys: ['dad', 'mom', 'grandpa', 'grandma', 'other'],
    identityIndex: 0,
    genderList: ['\u7537', '\u5973', '\u4e0d\u8bbe\u9650'],
    genderKeys: ['male', 'female', 'neutral'],
    genderIndex: 0,
    childNickname: '',
    childAge: '',
    childInitPoints: '',
    childGenderList: ['\u7537\u5b69', '\u5973\u5b69'],
    childGenderKeys: ['male', 'female'],
    childGenderIndex: 0,
    childAvatarMode: 'recommended',
    childAvatarOptions: [],
    childAvatarKey: '',
    childAvatarUrl: avatar.getDefaultAvatar('child'),
    labels: {
      navTitle: '\u4e2a\u4eba\u4fe1\u606f\u4fee\u6539',
      avatarHint: '\u53ef\u4e0a\u4f20\u81ea\u5b9a\u4e49\u5934\u50cf\uff0c\u4e5f\u53ef\u4ece\u63a8\u8350\u5934\u50cf\u4e2d\u9009\u62e9',
      fieldName: '\u6635\u79f0',
      fieldIdentity: '\u5f53\u524d\u8eab\u4efd',
      fieldGender: '\u6027\u522b\u504f\u597d',
      fieldPresetAvatar: '\u9884\u8bbe\u5934\u50cf',
      avatarRecommended: '\u63a8\u8350',
      avatarAll: '\u5168\u90e8',
      namePlaceholder: '\u8f93\u5165\u60a8\u7684\u6635\u79f0',
      securityTitle: '\u4fe1\u606f\u5b89\u5168',
      securityDesc: '\u60a8\u7684\u4e2a\u4eba\u8d44\u6599\u4ec5\u5728\u5bb6\u5ead\u7ec4\u5185\u53ef\u89c1\uff0c\u6211\u4eec\u4f1a\u4fdd\u62a4\u9690\u79c1\u5b89\u5168\u3002',
      roleTitle: '\u89d2\u8272\u540c\u6b65',
      roleDesc: '\u8eab\u4efd\u4fee\u6539\u540e\uff0c\u5b69\u5b50\u7aef\u663e\u793a\u7684\u79f0\u547c\u4f1a\u540c\u6b65\u66f4\u65b0\u3002',
      childSectionTitle: '\u53ef\u9009\uff1a\u7acb\u5373\u6dfb\u52a0\u5b69\u5b50\u6863\u6848',
      childSectionDesc: '\u586b\u5199\u4ee5\u4e0b\u4fe1\u606f\u53ef\u4e00\u6b65\u5b8c\u6210\u5f00\u901a\uff0c\u4e5f\u53ef\u7a0d\u540e\u5728\u5b69\u5b50\u7ba1\u7406\u4e2d\u6dfb\u52a0\u3002',
      childName: '\u5b69\u5b50\u6635\u79f0\uff08\u53ef\u9009\uff09',
      childNamePlaceholder: '\u4f8b\u5982\uff1a\u5c0f\u661f',
      childAge: '\u5e74\u9f84\uff08\u586b\u5199\u6635\u79f0\u540e\u5fc5\u586b\uff09',
      childAgePlaceholder: '\u4f8b\u5982\uff1a7',
      childInitPoints: '\u521d\u59cb\u79ef\u5206\uff08\u53ef\u9009\uff09',
      childInitPointsPlaceholder: '\u9ed8\u8ba4 0',
      childGender: '\u6027\u522b',
      childAvatar: '\u9884\u8bbe\u5934\u50cf',
      needChildAge: '\u8bf7\u4e3a\u5b69\u5b50\u586b\u5199\u5e74\u9f84',
      needChildName: '\u8bf7\u586b\u5199\u5b69\u5b50\u6635\u79f0',
      onboardingDone: '\u5f00\u901a\u5b8c\u6210',
      onboardingDoneDesc: '\u9996\u6b21\u5f15\u5bfc\u5df2\u5b8c\u6210\uff0c\u73b0\u5728\u53ef\u4ee5\u5f00\u59cb\u4f7f\u7528\u4e86\u3002',
      codeTip: '\u5b69\u5b50\u67e5\u8be2\u6838\u9a8c\u7801\uff1a',
      copyCode: '\u590d\u5236\u6838\u9a8c\u7801',
      enterHome: '\u8fdb\u5165\u9996\u9875',
      save: '\u786e\u8ba4\u4fdd\u5b58',
      saveNext: '\u5b8c\u6210\u5f00\u901a'
    }
  },

  onLoad: function (options) {
    var isOnboarding = options && options.mode === 'onboarding'
    this.setData({
      isOnboarding: isOnboarding,
      showBack: !isOnboarding,
      saveText: isOnboarding ? this.data.labels.saveNext : this.data.labels.save
    })
    this.loadProfile()
    if (isOnboarding) {
      this.syncChildAvatarOptions()
    }
  },

  loadProfile: function () {
    var that = this
    api.getProfile().then(function (profile) {
      var current = profile || {}
      var identityIndex = that.data.identityKeys.indexOf(current.identity || 'dad')
      var genderIndex = that.data.genderKeys.indexOf(current.gender || 'neutral')
      that.setData({
        profileId: current._id || '',
        avatarUrl: avatar.resolveAvatar(current, 'self'),
        avatarKey: current.avatarKey || '',
        nickname: current.nickname || '\u5bb6\u957f',
        identityIndex: identityIndex > -1 ? identityIndex : 0,
        genderIndex: genderIndex > -1 ? genderIndex : 2
      })
      that.syncAvatarOptions()
      if (that.data.isOnboarding) that.syncChildAvatarOptions()
    }).catch(function () {
      that.setData({
        avatarUrl: avatar.getDefaultAvatar('self'),
        avatarKey: ''
      })
      that.syncAvatarOptions()
      if (that.data.isOnboarding) that.syncChildAvatarOptions()
    })
  },

  onBack: function () {
    if (this.data.isOnboarding) return
    wx.navigateBack()
  },

  onInput: function (e) {
    this.setData({ nickname: e.detail.value })
  },

  onIdentityChange: function (e) {
    this.setData({ identityIndex: Number(e.detail.value) || 0 })
    this.syncAvatarOptions()
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

  syncAvatarOptions: function () {
    var role = this.data.identityKeys[this.data.identityIndex] || 'other'
    var gender = this.data.genderKeys[this.data.genderIndex] || 'neutral'
    var options = avatar.getPresetOptions({
      audience: 'adult',
      role: role,
      gender: gender,
      mode: this.data.avatarMode
    })
    if (!options.length) options = avatar.getPresetOptions({ audience: 'adult', mode: 'all' })

    var picked = options.find(function (item) { return item.key === this.data.avatarKey }, this)
    if (!picked && !this.data.avatarKey) {
      var currentByUrl = options.find(function (item) { return item.path === this.data.avatarUrl }, this)
      picked = currentByUrl || null
    }
    if (!picked) picked = options[0]

    this.setData({
      avatarOptions: options,
      avatarKey: picked ? picked.key : '',
      avatarUrl: picked ? picked.path : (this.data.avatarUrl || avatar.getDefaultAvatar('self'))
    })
  },

  onSelectPresetAvatar: function (e) {
    var key = e.currentTarget.dataset.key
    var url = e.currentTarget.dataset.url
    if (!key || !url) return
    this.setData({
      avatarKey: key,
      avatarUrl: url
    })
  },

  onChildInput: function (e) {
    var field = e.currentTarget.dataset.field
    if (!field) return
    var patch = {}
    patch[field] = e.detail.value
    this.setData(patch)
  },

  onChildGenderChange: function (e) {
    this.setData({ childGenderIndex: Number(e.detail.value) || 0 })
    this.syncChildAvatarOptions()
  },

  onChildAvatarModeChange: function (e) {
    var mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.childAvatarMode) return
    this.setData({ childAvatarMode: mode })
    this.syncChildAvatarOptions()
  },

  syncChildAvatarOptions: function () {
    var gender = this.data.childGenderKeys[this.data.childGenderIndex] || 'male'
    var mode = this.data.childAvatarMode || 'recommended'
    var options = avatar.getPresetOptions({
      audience: 'child',
      role: 'child',
      gender: gender,
      mode: mode
    })
    if (!options.length) options = avatar.getPresetOptions({ audience: 'child', mode: 'all' })

    var picked = options.find(function (item) { return item.key === this.data.childAvatarKey }, this) || options[0]
    this.setData({
      childAvatarOptions: options,
      childAvatarKey: picked ? picked.key : '',
      childAvatarUrl: picked ? picked.path : avatar.getDefaultAvatar('child')
    })
  },

  onSelectChildAvatar: function (e) {
    var key = e.currentTarget.dataset.key
    var url = e.currentTarget.dataset.url
    if (!key || !url) return
    this.setData({
      childAvatarKey: key,
      childAvatarUrl: url
    })
  },

  createOnboardingChildIfNeeded: function () {
    var d = this.data
    var nickname = String(d.childNickname || '').trim()
    var ageText = String(d.childAge || '').trim()

    if (!nickname && !ageText) return Promise.resolve(null)
    if (nickname && !ageText) {
      wx.showToast({ title: d.labels.needChildAge, icon: 'none' })
      return Promise.reject(new Error('child age required'))
    }
    if (!nickname && ageText) {
      wx.showToast({ title: d.labels.needChildName, icon: 'none' })
      return Promise.reject(new Error('child nickname required'))
    }

    var age = parseInt(ageText, 10)
    if (!age || age <= 0) {
      wx.showToast({ title: d.labels.needChildAge, icon: 'none' })
      return Promise.reject(new Error('child age invalid'))
    }

    var allChildKeys = avatar.getPresetKeys({ audience: 'child', mode: 'all' })
    var avatarIndex = allChildKeys.indexOf(d.childAvatarKey)
    if (avatarIndex < 0) avatarIndex = 0

    return api.addChild({
      nickname: nickname,
      age: age,
      gender: d.childGenderKeys[d.childGenderIndex] || 'male',
      avatarIndex: avatarIndex,
      avatarKey: d.childAvatarKey,
      avatarUrl: d.childAvatarUrl || avatar.getDefaultAvatar('child'),
      currentPoints: parseInt(d.childInitPoints, 10) || 0,
      totalPoints: parseInt(d.childInitPoints, 10) || 0
    })
  },

  finishOnboarding: function (child) {
    var that = this
    var hasChild = !!(child && child._id)
    if (hasChild) {
      app.globalData.currentChildId = child._id
    } else {
      app.globalData.currentChildId = ''
    }

    app.completeOnboarding({
      profileDone: true,
      childStepDone: true,
      childSkipped: !hasChild,
      bindGuideDone: true,
      bindGuideSkipped: true
    })
    app.syncSession({
      loggedIn: true,
      userInfo: app.globalData.userInfo || null,
      currentChildId: app.globalData.currentChildId || ''
    })

    var toHome = function () {
      wx.switchTab({ url: '/pages/parent/dashboard/index' })
    }

    if (hasChild && child.verifyCode) {
      wx.showModal({
        title: that.data.labels.onboardingDone,
        content: that.data.labels.codeTip + child.verifyCode,
        confirmText: that.data.labels.copyCode,
        cancelText: that.data.labels.enterHome,
        success: function (res) {
          if (res.confirm) {
            wx.setClipboardData({
              data: String(child.verifyCode),
              success: function () {
                wx.showToast({ title: '\u5df2\u590d\u5236\u6838\u9a8c\u7801', icon: 'success' })
              }
            })
          }
          toHome()
        },
        fail: function () {
          toHome()
        }
      })
      return
    }

    wx.showToast({ title: that.data.labels.onboardingDone, icon: 'success' })
    setTimeout(toHome, 480)
  },

  onChangeAvatar: function () {
    var that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var filePath = (res.tempFilePaths || [])[0]
        if (!filePath) return

        var saveAvatar = function (url) {
          api.updateProfile({
            avatarUrl: url,
            avatarKey: ''
          }).then(function () {
            that.setData({ avatarUrl: url, avatarKey: '' })
            if (app && app.globalData && app.globalData.userInfo) {
              app.globalData.userInfo.avatarUrl = url
              app.globalData.userInfo.avatarKey = ''
              app.syncSession({ userInfo: app.globalData.userInfo })
            }
            wx.showToast({ title: '\u5934\u50cf\u5df2\u66f4\u65b0', icon: 'success' })
          }).catch(function () {
            wx.showToast({ title: '\u5934\u50cf\u66f4\u65b0\u5931\u8d25', icon: 'none' })
          })
        }

        if (!wx.cloud || !wx.cloud.uploadFile) {
          saveAvatar(filePath)
          return
        }

        var userId = that.data.profileId || 'self'
        var ext = getFileExt(filePath)
        var cloudPath = 'avatar/user/' + userId + '_' + Date.now() + ext

        wx.showLoading({ title: '\u4e0a\u4f20\u4e2d' })
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: filePath,
          success: function (uploadRes) {
            var fileID = (uploadRes || {}).fileID || ''
            saveAvatar(fileID || filePath)
          },
          fail: function () {
            wx.showToast({ title: '\u4e0a\u4f20\u5931\u8d25', icon: 'none' })
          },
          complete: function () {
            wx.hideLoading()
          }
        })
      }
    })
  },

  onSave: function () {
    var d = this.data
    if (d.saving) return
    var nickname = String(d.nickname || '').trim()
    if (!nickname) {
      wx.showToast({ title: '\u8bf7\u8f93\u5165\u6635\u79f0', icon: 'none' })
      return
    }
    if (!d.avatarUrl && !d.avatarKey) {
      wx.showToast({ title: '\u8bf7\u9009\u62e9\u5934\u50cf', icon: 'none' })
      return
    }

    var payload = {
      nickname: nickname,
      identity: d.identityKeys[d.identityIndex],
      gender: d.genderKeys[d.genderIndex] || 'neutral',
      avatarUrl: d.avatarUrl,
      avatarKey: d.avatarKey
    }

    var that = this
    that.setData({ saving: true })
    api.updateProfile(payload).then(function (res) {
      var profile = (res && res.profile) || payload
      app.globalData.userInfo = Object.assign({}, app.globalData.userInfo || {}, profile)
      app.syncSession({
        loggedIn: true,
        userInfo: app.globalData.userInfo
      })

      if (that.data.isOnboarding) {
        return that.createOnboardingChildIfNeeded().then(function (child) {
          that.finishOnboarding(child)
        })
      }

      wx.showToast({ title: '\u5df2\u4fdd\u5b58', icon: 'success' })
      setTimeout(function () {
        wx.navigateBack()
      }, 700)
    }).catch(function (err) {
      console.error('update profile failed', err)
      wx.showToast({ title: '\u4fdd\u5b58\u5931\u8d25', icon: 'none' })
    }).finally(function () {
      that.setData({ saving: false })
    })
  }
})
