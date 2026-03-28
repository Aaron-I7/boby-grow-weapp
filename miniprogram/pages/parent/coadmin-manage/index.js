var api = require('../../../utils/api')
var avatar = require('../../../utils/avatar')

function resolveTicketLink(ticket) {
  var data = ticket || {}
  return String(data.shareLink || data.sharePath || '').trim()
}

function mapIdentityLabel(identity) {
  var dict = {
    dad: '\u7238\u7238',
    mom: '\u5988\u5988',
    grandpa: '\u7237\u7237',
    grandma: '\u5976\u5976',
    other: '\u5bb6\u4eba'
  }
  return dict[identity] || ''
}

function mapMember(item) {
  var relationText = mapIdentityLabel(item.identity) || item.relation || item.relationship || ''
  var hasRelationInName = /[\(\)\uFF08\uFF09]/.test(item.nickname || '')
  var nickname = item.nickname || '\u5bb6\u5ead\u6210\u5458'
  return {
    id: item._id,
    nickname: nickname,
    displayName: nickname + (relationText && !hasRelationInName ? '\uff08' + relationText + '\uff09' : ''),
    role: item.role || 'coadmin',
    relationText: relationText,
    avatarUrl: avatar.resolveAvatar(item, 'adult'),
    roleText: item.role === 'admin' ? '\u4e3b\u7ba1\u7406\u5458' : '\u534f\u7ba1\u5bb6\u957f',
    roleNote: item.role === 'admin' ? '\u7ba1\u7406\u5168\u6743\u9650' : ''
  }
}

Page({
  data: {
    members: [],
    shareContext: null,
    inviteQrVisible: false,
    inviteQrFileId: '',
    inviteSharePath: '',
    inviteShareLink: '',
    labels: {
      navTitle: '\u534f\u7ba1\u5458\u7ba1\u7406',
      heroTag: '\u6743\u9650\u8bf4\u660e',
      heroTitle: '\u5171\u540c\u5b88\u62a4\u6210\u957f',
      heroDesc: '\u534f\u7ba1\u5bb6\u957f\u53ef\u4ee5\u4e3a\u5b69\u5b50\u53d1\u653e\u79ef\u5206\u5956\u7ae0\u3001\u67e5\u770b\u6210\u957f\u62a5\u544a\uff0c\u4f46\u65e0\u6cd5\u4fee\u6539\u4e3b\u7ba1\u7406\u5458\u8bbe\u7f6e\u3002',
      sectionTitle: '\u5df2\u52a0\u5165\u7684\u6210\u5458',
      memberCountPrefix: '\u5171',
      memberCountSuffix: '\u4eba',
      remove: '\u79fb\u9664',
      inviteTitle: '\u9080\u8bf7\u65b0\u6210\u5458',
      inviteDesc: '\u8ba9\u53e6\u4e00\u4f34\u6216\u957f\u8f88\u4e5f\u53c2\u4e0e\u5230\u6210\u957f\u6fc0\u52b1\u4e2d',
      inviteScan: '\u626b\u7801\u9080\u8bf7',
      inviteShare: '\u5fae\u4fe1\u597d\u53cb\u5206\u4eab',
      inviteCopy: '\u590d\u5236\u9080\u8bf7\u94fe\u63a5',
      inviteQrTitle: '\u534f\u7ba1\u9080\u8bf7\u4e8c\u7ef4\u7801',
      inviteQrHint: '\u8bf7\u8ba9\u5bb6\u4eba\u626b\u7801\u6216\u901a\u8fc7\u5fae\u4fe1\u8f6c\u53d1\u8fdb\u5165\u3002',
      inviteQrFallbackHint: '\u82e5\u4e8c\u7ef4\u7801\u672a\u751f\u6210\uff0c\u8bf7\u4f18\u5148\u8f6c\u53d1\u6216\u590d\u5236\u9080\u8bf7\u8def\u5f84\u3002',
      copyLink: '\u590d\u5236\u94fe\u63a5',
      close: '\u5173\u95ed'
    }
  },

  onLoad: function () {
    this.cachedInviteTicket = null
    wx.showShareMenu({ withShareTicket: false })
  },

  onShow: function () {
    this.loadMembers()
  },

  loadMembers: function () {
    var that = this
    api.getCoadmins().then(function (list) {
      var data = (list || []).map(function (item) {
        return mapMember(item)
      })
      that.setData({ members: data })
    })
  },

  onBack: function () {
    wx.navigateBack()
  },

  noop: function () {},

  createInviteTicket: function (forceRefresh) {
    var cached = this.cachedInviteTicket
    var now = Date.now()
    if (!forceRefresh && cached && cached.expiresAt && new Date(cached.expiresAt).getTime() > now + 2 * 60 * 1000) {
      return Promise.resolve(cached)
    }
    return api.createCoadminInviteTicket({}).then(function (res) {
      return res || {}
    })
  },

  onRemove: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    wx.showModal({
      title: '\u786e\u8ba4\u79fb\u9664',
      content: '\u786e\u5b9a\u79fb\u9664\u8be5\u534f\u7ba1\u5bb6\u957f\uff1f',
      success: function (res) {
        if (!res.confirm) return
        api.removeCoadmin(id).then(function () {
          wx.showToast({ title: '\u5df2\u79fb\u9664', icon: 'success' })
          that.loadMembers()
        })
      }
    })
  },

  onInviteScan: function () {
    var that = this
    wx.showLoading({ title: '\u751f\u6210\u4e2d...' })
    this.createInviteTicket(true).then(function (ticket) {
      that.cachedInviteTicket = ticket
      that.setData({
        shareContext: {
          sharePath: ticket.sharePath || ''
        },
        inviteQrVisible: true,
        inviteQrFileId: ticket.qrFileId || '',
        inviteSharePath: ticket.sharePath || '',
        inviteShareLink: ticket.shareLink || ''
      })
      if (!ticket.qrFileId) {
        var msg = ticket.qrError
          ? ('\u4e8c\u7ef4\u7801\u751f\u6210\u5931\u8d25\uff1a' + String(ticket.qrError).slice(0, 18))
          : '\u672a\u751f\u6210\u56fe\u7247\uff0c\u53ef\u590d\u5236\u94fe\u63a5\u4f7f\u7528'
        wx.showToast({ title: msg, icon: 'none' })
      }
    }).catch(function (err) {
      console.error('create coadmin ticket failed', err)
      wx.showToast({ title: '\u9080\u8bf7\u7801\u751f\u6210\u5931\u8d25', icon: 'none' })
    }).finally(function () {
      wx.hideLoading()
    })
  },

  onInviteShare: function () {
    var that = this
    wx.showLoading({ title: '\u51c6\u5907\u4e2d...' })
    this.createInviteTicket(true).then(function (ticket) {
      that.cachedInviteTicket = ticket
      that.setData({
        shareContext: {
          sharePath: ticket.sharePath || ''
        },
        inviteSharePath: ticket.sharePath || '',
        inviteShareLink: ticket.shareLink || ''
      })
      wx.showToast({ title: '\u5df2\u51c6\u5907\uff0c\u8bf7\u70b9\u51fb\u53f3\u4e0a\u89d2\u8f6c\u53d1', icon: 'none' })
    }).catch(function (err) {
      console.error('prepare coadmin share failed', err)
      wx.showToast({ title: '\u5206\u4eab\u51c6\u5907\u5931\u8d25', icon: 'none' })
    }).finally(function () {
      wx.hideLoading()
    })
  },

  onCopyInviteLink: function () {
    var that = this
    this.createInviteTicket(true).then(function (ticket) {
      that.cachedInviteTicket = ticket
      var link = resolveTicketLink(ticket)
      if (!link) {
        wx.showToast({ title: '\u6682\u65e0\u94fe\u63a5', icon: 'none' })
        return
      }
      that.setData({
        shareContext: {
          sharePath: ticket.sharePath || ''
        },
        inviteSharePath: ticket.sharePath || '',
        inviteShareLink: ticket.shareLink || ''
      })
      wx.setClipboardData({
        data: link,
        success: function () {
          wx.showToast({ title: '\u9080\u8bf7\u94fe\u63a5\u5df2\u590d\u5236', icon: 'success' })
        }
      })
    }).catch(function () {
      wx.showToast({ title: '\u590d\u5236\u5931\u8d25', icon: 'none' })
    })
  },

  onCopyQrLink: function () {
    var link = String(this.data.inviteShareLink || this.data.inviteSharePath || '').trim()
    if (!link) {
      wx.showToast({ title: '\u6682\u65e0\u94fe\u63a5', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: link,
      success: function () {
        wx.showToast({ title: '\u5df2\u590d\u5236', icon: 'success' })
      }
    })
  },

  onCloseInviteQr: function () {
    this.setData({
      inviteQrVisible: false,
      inviteQrFileId: '',
      inviteSharePath: '',
      inviteShareLink: ''
    })
  },

  onShareAppMessage: function () {
    var share = this.data.shareContext || {}
    return {
      title: '\u9080\u8bf7\u4f60\u52a0\u5165\u5bb6\u5ead\u534f\u7ba1',
      path: share.sharePath || '/pages/auth/entry/index'
    }
  }
})
