var api = require('../../../utils/api')
var avatar = require('../../../utils/avatar')

function getAvatarUrl(child) {
  return avatar.resolveAvatar(child, 'child')
}

function padCode(code) {
  var text = String(code || '').replace(/\D/g, '')
  if (text.length < 6) text = (text + '000000').slice(0, 6)
  return text
}

Page({
  data: {
    children: [],
    currentIdx: 0,
    currentChild: {},
    code: '888666',
    labels: {
      navTitle: 'MCP \u67e5\u8be2\u6838\u9a8c\u7801',
      privacyText: '\u6bcf\u4e2a\u5b69\u5b50\u62e5\u6709\u72ec\u7acb\u7684 6 \u4f4d\u6838\u9a8c\u7801\uff0c\u786e\u4fdd\u6570\u636e\u9690\u79c1\u5b89\u5168\u3002',
      codeLabelSuffix: '\u7684\u6838\u9a8c\u7801',
      copy: '\u70b9\u51fb\u590d\u5236',
      reset: '\u91cd\u7f6e\u6838\u9a8c\u7801',
      tipText: '\u8bf7\u5c06\u6b64\u6838\u9a8c\u7801\u63d0\u4f9b\u7ed9\u5b69\u5b50\uff0c\u4ee5\u4fbf\u5728 AI \u5de5\u5177\u4e2d\u67e5\u8be2\u79ef\u5206\u3002',
      securityTitle: '\u5b89\u5168\u63d0\u793a',
      securityDesc: '\u6838\u9a8c\u7801\u4ec5\u4f9b\u67e5\u8be2\uff0c\u65e0\u6cd5\u64cd\u4f5c\u79ef\u5206\u3002'
    }
  },

  onLoad: function () {
  },

  onShow: function () {
    this.loadChildren()
  },

  loadChildren: function () {
    var that = this
    api.getChildren().then(function (list) {
      var children = (list || []).map(function (item) {
        return {
          id: item._id,
          nickname: item.nickname || '\u5b69\u5b50',
          avatarUrl: getAvatarUrl(item)
        }
      })
      if (!children.length) {
        that.setData({ children: [], currentChild: {}, code: '000000' })
        return
      }

      that.setData({
        children: children,
        currentIdx: 0,
        currentChild: children[0]
      })
      that.loadCode(children[0].id)
    })
  },

  loadCode: function (childId) {
    var that = this
    api.getMcpVerifyCode(childId).then(function (res) {
      that.setData({ code: padCode((res || {}).code) })
    }).catch(function () {
      that.setData({ code: '000000' })
    })
  },

  onBack: function () {
    wx.navigateBack()
  },

  onSelectChild: function (e) {
    var idx = e.currentTarget.dataset.idx
    var child = this.data.children[idx]
    if (!child) return
    this.setData({
      currentIdx: idx,
      currentChild: child
    })
    this.loadCode(child.id)
  },

  onCopy: function () {
    wx.setClipboardData({
      data: this.data.code,
      success: function () {
        wx.showToast({ title: '\u5df2\u590d\u5236', icon: 'success' })
      }
    })
  },

  onReset: function () {
    wx.showModal({
      title: '\u91cd\u7f6e\u6838\u9a8c\u7801',
      content: '\u91cd\u7f6e\u540e\u65e7\u6838\u9a8c\u7801\u5c06\u5931\u6548\uff0c\u786e\u8ba4\u91cd\u7f6e\uff1f',
      success: function (res) {
        if (res.confirm) {
          wx.showToast({ title: '\u91cd\u7f6e\u529f\u80fd\u5f00\u53d1\u4e2d', icon: 'none' })
        }
      }
    })
  }
})
