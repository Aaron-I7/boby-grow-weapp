var api = require('../../utils/api')
var invite = require('../../utils/invite')
var app = getApp()

function mapStatusText(status) {
  var dict = {
    active: '',
    not_found: '邀请不存在或已被撤销',
    expired: '邀请已过期，请让家长重新生成',
    used_up: '邀请已失效，请让家长重新生成',
    consumed: '邀请已被使用，请让家长重新生成',
    permission_denied: '你没有权限处理这个邀请'
  }
  return dict[status] || '邀请状态异常，请稍后重试'
}

function resolveRole(result) {
  return String((result && result.role) || '').trim()
}

function inferLoggedIn() {
  var session = (app && app.globalData && app.globalData.session) || {}
  var user = (app && app.globalData && app.globalData.userInfo) || {}
  return !!(session.loggedIn || user._id || user.openId)
}

Page({
  data: {
    loading: true,
    confirming: false,
    ticket: '',
    preview: null,
    inviteTitle: '邀请处理',
    statusText: '',
    labels: {
      navTitle: '邀请确认',
      titleChildBind: '绑定孩子微信',
      titleCoadmin: '加入家庭协管',
      titleUnknown: '邀请处理',
      subtitle: '请先确认邀请信息，确认后将立即生效。',
      family: '家庭',
      child: '孩子',
      expiresAt: '有效期至',
      status: '状态',
      actionLogin: '先去登录',
      actionConfirm: '确认并继续',
      actionRetry: '刷新状态'
    }
  },

  onLoad: function (options) {
    var token = invite.resolveTicketFromOptions(options)
    if (token) {
      app.setPendingInviteTicket(token)
    } else {
      token = (app.globalData && app.globalData.pendingInviteTicket) || invite.getPendingTicket()
    }

    this.setData({ ticket: token || '' })
    this.loadPreview()
  },

  onBack: function () {
    wx.navigateBack({
      fail: function () {
        wx.reLaunch({ url: '/pages/auth/entry/index' })
      }
    })
  },

  loadPreview: function () {
    var that = this
    var ticket = String(this.data.ticket || '').trim()
    if (!ticket) {
      that.setData({
        loading: false,
        preview: null,
        statusText: mapStatusText('not_found')
      })
      return
    }

    that.setData({ loading: true, statusText: '' })
    api.previewInviteTicket(ticket).then(function (preview) {
      var data = preview || {}
      var status = String(data.status || '')
      that.setData({
        loading: false,
        preview: data,
        inviteTitle: data.type === 'child_bind'
          ? that.data.labels.titleChildBind
          : (data.type === 'coadmin_invite' ? that.data.labels.titleCoadmin : that.data.labels.titleUnknown),
        statusText: mapStatusText(status)
      })
    }).catch(function (err) {
      console.error('preview invite failed', err)
      that.setData({
        loading: false,
        preview: null,
        statusText: '邀请加载失败，请稍后重试'
      })
    })
  },

  onRetry: function () {
    this.loadPreview()
  },

  onLogin: function () {
    var ticket = String(this.data.ticket || '').trim()
    if (ticket) app.setPendingInviteTicket(ticket)
    wx.reLaunch({ url: '/pages/auth/login/index' })
  },

  onConfirm: function () {
    var that = this
    if (that.data.confirming) return

    var ticket = String(that.data.ticket || '').trim()
    if (!ticket) {
      wx.showToast({ title: '邀请信息缺失', icon: 'none' })
      return
    }

    var preview = that.data.preview || {}
    var status = String(preview.status || '')
    if (status && status !== 'active') {
      wx.showToast({ title: mapStatusText(status), icon: 'none' })
      return
    }

    if (!inferLoggedIn()) {
      that.onLogin()
      return
    }

    that.setData({ confirming: true })
    api.confirmInviteTicket(ticket).then(function (res) {
      var result = res || {}
      var user = result.currentUser || result.user || app.globalData.userInfo || null
      var familyId = result.familyId || (user && user.familyId) || app.globalData.familyId || ''
      var childId = result.childId || (user && user.childId) || ''

      if (user) app.globalData.userInfo = user
      app.globalData.familyId = familyId
      app.globalData.currentChildId = childId

      app.syncSession({
        loggedIn: true,
        userInfo: app.globalData.userInfo || null,
        familyId: familyId,
        currentChildId: childId
      })

      app.clearPendingInviteTicket()

      var role = resolveRole(result) || resolveRole(user)
      wx.showToast({ title: '操作成功', icon: 'success' })
      setTimeout(function () {
        if (role === 'child') {
          wx.reLaunch({ url: '/pages/child/home/index' })
        } else {
          wx.reLaunch({ url: '/pages/parent/dashboard/index' })
        }
      }, 260)
    }).catch(function (err) {
      console.error('confirm invite failed', err)
      var message = err && err.message ? String(err.message) : ''
      if (!message) message = '邀请处理失败，请重试'
      if (message.indexOf('invite_') === 0) {
        message = mapStatusText(message.replace('invite_', ''))
      } else if (message === 'permission_denied') {
        message = mapStatusText('permission_denied')
      }
      wx.showToast({ title: message, icon: 'none' })
      that.loadPreview()
    }).finally(function () {
      that.setData({ confirming: false })
    })
  }
})
