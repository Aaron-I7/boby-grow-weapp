var api = require('../../../utils/api')
var app = getApp()

function resolveTicketLink(ticket) {
  var data = ticket || {}
  return String(data.shareLink || data.sharePath || '').trim()
}

function toChildView(item) {
  var child = item || {}
  return {
    _id: child._id || '',
    nickname: child.nickname || '未命名孩子',
    avatarUrl: child.avatarUrl || '/images/png/avatar/default/child-default.png',
    verifyCode: child.verifyCode || '',
    bindOpenId: child.bindOpenId || '',
    bindText: child.bindOpenId ? '已绑定微信' : '未绑定微信'
  }
}

Page({
  data: {
    loading: true,
    isOnboarding: false,
    showBack: true,
    children: [],
    currentShare: null,
    qrVisible: false,
    qrFileId: '',
    qrSharePath: '',
    qrShareLink: '',
    qrChildName: '',
      labels: {
      navTitle: '绑定孩子微信',
      title: '绑定孩子微信（可跳过）',
      subtitle: '支持生成一次性绑定二维码，也可通过微信转发给孩子。',
      bindStatus: '绑定状态',
      verifyCode: '核验码',
      copyCode: '复制核验码',
      genQr: '生成绑定二维码',
      prepareShare: '准备微信转发',
      copyInviteLink: '复制邀请链接',
      unbindWechat: '解除绑定',
      goChildManage: '去孩子管理页补全',
      skip: '跳过，稍后再绑定',
      finish: '完成引导，进入首页',
      emptyTitle: '还没有孩子档案',
      emptyDesc: '请先添加孩子，之后即可在这里引导绑定',
      addChild: '去添加孩子',
      qrTitle: '绑定二维码',
      qrHint: '请让孩子微信扫码进入后确认绑定。',
      qrFallbackHint: '二维码生成失败时，请优先使用微信转发或复制邀请路径。',
      close: '关闭',
      copyLink: '复制链接'
    }
  },

  onLoad: function (options) {
    var isOnboarding = options && options.mode === 'onboarding'
    this.ticketCache = {}
    this.setData({
      isOnboarding: isOnboarding,
      showBack: !isOnboarding
    })

    wx.showShareMenu({
      withShareTicket: false
    })
  },

  onShow: function () {
    this.loadChildren()
  },

  onShareAppMessage: function () {
    var share = this.data.currentShare || {}
    var title = share.childName ? ('请绑定孩子微信：' + share.childName) : '邀请你加入家庭成长管理'
    var path = share.sharePath || '/pages/auth/entry/index'

    return {
      title: title,
      path: path
    }
  },

  onBack: function () {
    wx.navigateBack()
  },

  noop: function () {},

  loadChildren: function () {
    var that = this
    that.setData({ loading: true })
    api.getChildren().then(function (list) {
      var children = (list || []).map(toChildView)
      that.setData({
        loading: false,
        children: children
      })
    }).catch(function (err) {
      console.error('load children failed', err)
      that.setData({ loading: false, children: [] })
      wx.showToast({ title: '加载孩子信息失败', icon: 'none' })
    })
  },

  getChildById: function (childId) {
    return (this.data.children || []).find(function (item) { return item._id === childId }) || null
  },

  createTicketForChild: function (childId, forceRefresh) {
    var cached = this.ticketCache[childId]
    var now = Date.now()
    if (!forceRefresh && cached && cached.expiresAt && new Date(cached.expiresAt).getTime() > now + 60 * 1000) {
      return Promise.resolve(cached)
    }

    return api.createChildBindTicket({ childId: childId }).then(function (res) {
      var ticket = res || {}
      ticket.childId = childId
      return ticket
    })
  },

  onCopyCode: function (e) {
    var code = String(e.currentTarget.dataset.code || '')
    if (!code) {
      wx.showToast({ title: '暂无核验码', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: code,
      success: function () {
        wx.showToast({ title: '已复制核验码', icon: 'success' })
      }
    })
  },

  onGenerateQr: function (e) {
    var that = this
    var childId = String(e.currentTarget.dataset.id || '')
    var child = this.getChildById(childId)
    if (!childId || !child) return

    wx.showLoading({ title: '生成中...' })
    this.createTicketForChild(childId, true).then(function (ticket) {
      that.ticketCache[childId] = ticket || {}
      that.setData({
        currentShare: {
          childId: childId,
          childName: child.nickname || '',
          sharePath: ticket.sharePath || ''
        },
        qrVisible: true,
        qrFileId: ticket.qrFileId || '',
        qrSharePath: ticket.sharePath || '',
        qrShareLink: ticket.shareLink || '',
        qrChildName: child.nickname || ''
      })
      if (!ticket.qrFileId) {
        var msg = ticket.qrError
          ? ('二维码生成失败：' + String(ticket.qrError).slice(0, 22))
          : '未生成图片，可复制链接使用'
        wx.showToast({ title: msg, icon: 'none' })
      }
    }).catch(function (err) {
      console.error('create child ticket failed', err)
      wx.showToast({ title: '二维码生成失败', icon: 'none' })
    }).finally(function () {
      wx.hideLoading()
    })
  },

  onPrepareShare: function (e) {
    var that = this
    var childId = String(e.currentTarget.dataset.id || '')
    var child = this.getChildById(childId)
    if (!childId || !child) return

    wx.showLoading({ title: '准备中...' })
    this.createTicketForChild(childId, true).then(function (ticket) {
      that.ticketCache[childId] = ticket || {}
      that.setData({
        currentShare: {
          childId: childId,
          childName: child.nickname || '',
          sharePath: ticket.sharePath || ''
        }
      })
      wx.showToast({ title: '已准备，请点击右上角转发', icon: 'none' })
    }).catch(function (err) {
      console.error('prepare share failed', err)
      wx.showToast({ title: '分享准备失败', icon: 'none' })
    }).finally(function () {
      wx.hideLoading()
    })
  },

  onCopyInviteLink: function (e) {
    var that = this
    var childId = String(e.currentTarget.dataset.id || '')
    var child = this.getChildById(childId)
    if (!childId || !child) return

    this.createTicketForChild(childId, true).then(function (ticket) {
      that.ticketCache[childId] = ticket || {}
      var link = resolveTicketLink(ticket)
      if (!link) {
        wx.showToast({ title: '暂无邀请链接', icon: 'none' })
        return
      }
      that.setData({
        currentShare: {
          childId: childId,
          childName: child.nickname || '',
          sharePath: ticket.sharePath || ''
        }
      })
      wx.setClipboardData({
        data: link,
        success: function () {
          wx.showToast({ title: '已复制邀请链接', icon: 'success' })
        }
      })
    }).catch(function (err) {
      console.error('copy invite link failed', err)
      wx.showToast({ title: '链接生成失败', icon: 'none' })
    })
  },

  onUnbindChild: function (e) {
    var that = this
    var childId = String(e.currentTarget.dataset.id || '')
    if (!childId) return
    wx.showModal({
      title: '解除绑定',
      content: '解除后孩子需要重新扫码确认绑定，是否继续？',
      success: function (res) {
        if (!res.confirm) return
        api.unbindChildWechat(childId).then(function () {
          wx.showToast({ title: '已解除绑定', icon: 'success' })
          that.loadChildren()
        }).catch(function (err) {
          console.error('unbind child failed', err)
          wx.showToast({ title: '解除绑定失败', icon: 'none' })
        })
      }
    })
  },

  onCopySharePath: function () {
    var link = String(this.data.qrShareLink || this.data.qrSharePath || '').trim()
    if (!link) {
      wx.showToast({ title: '暂无可复制链接', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: link,
      success: function () {
        wx.showToast({ title: '链接已复制', icon: 'success' })
      }
    })
  },

  onCloseQr: function () {
    this.setData({
      qrVisible: false,
      qrFileId: '',
      qrSharePath: '',
      qrShareLink: '',
      qrChildName: ''
    })
  },

  onGoChildManage: function () {
    wx.switchTab({ url: '/pages/parent/child-manage/index' })
  },

  onGoAddChild: function () {
    var suffix = this.data.isOnboarding ? '?mode=onboarding' : ''
    wx.navigateTo({ url: '/pages/parent/add-child/index' + suffix })
  },

  finishOnboarding: function (skip) {
    if (this.data.isOnboarding) {
      app.completeOnboarding({
        bindGuideDone: true,
        bindGuideSkipped: !!skip
      })
      app.syncSession({ loggedIn: true })
      wx.switchTab({ url: '/pages/parent/dashboard/index' })
      return
    }
    wx.navigateBack()
  },

  onSkip: function () {
    this.finishOnboarding(true)
  },

  onFinish: function () {
    this.finishOnboarding(false)
  }
})
