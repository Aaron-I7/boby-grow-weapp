var api = require('../../../utils/api')
var format = require('../../../utils/format')
var avatar = require('../../../utils/avatar')

Page({
  data: {
    child: { avatarIndex: 0, avatarUrl: '/images/png/avatar/default/child-default.png', nickname: '', currentPoints: 0 },
    tasks: [],
    pendingCount: 0,
    submittingTaskId: '',
    showReflectionModal: false,
    reflectionText: '',
    reflectingTaskId: '',
    reflectionQuickPhrases: ['我按时开始并坚持完成了', '我先做计划再执行', '我遇到困难后主动解决了'],
    showWishDrawer: false,
    wishName: '',
    wishIconIndex: 0,
    wishSubmitting: false,
    wishIcons: [
      '/images/svg/task/icon-soccer.svg',
      '/images/svg/task/icon-study.svg',
      '/images/svg/ui/icon-redeem.svg',
      '/images/svg/task/icon-star.svg',
      '/images/svg/ui/icon-bike.svg',
      '/images/svg/ui/icon-icecream.svg',
      '/images/svg/task/icon-toy.svg',
      '/images/svg/task/icon-stars.svg'
    ]
  },

  loadTodayTasks: function (childId) {
    var that = this
    return api.getTasks(childId, format.getToday()).then(function (tasks) {
      var list = tasks || []
      var pending = list.filter(function (t) { return t.status === 'pending' }).length
      that.setData({ tasks: list, pendingCount: pending })
    })
  },

  onShow: function () {
    var that = this
    api.getChildren().then(function (children) {
      var rawChild = (children || [])[0]
      if (!rawChild) return
      var child = avatar.withResolvedAvatar(rawChild, 'child')
      that.setData({ child: child })
      return that.loadTodayTasks(child._id)
    })
  },

  submitTaskDirect: function (taskId, reflection) {
    var that = this
    if (!taskId || this.data.submittingTaskId) return

    this.setData({ submittingTaskId: taskId })
    api.submitTask(taskId, reflection || '').then(function () {
      wx.showToast({ title: '已提交审核', icon: 'success' })
      that.setData({
        showReflectionModal: false,
        reflectionText: '',
        reflectingTaskId: ''
      })
      if (that.data.child && that.data.child._id) {
        that.loadTodayTasks(that.data.child._id)
      }
    }).catch(function (err) {
      wx.showToast({ title: err && err.message ? err.message : '提交失败', icon: 'none' })
    }).finally(function () {
      that.setData({ submittingTaskId: '' })
    })
  },

  onTapTask: function (e) {
    var id = e.currentTarget.dataset.id
    var task = (this.data.tasks || []).find(function (item) { return item._id === id })
    if (!task || task.status !== 'pending') return

    if (task.auditStatus === 'pending') {
      wx.showToast({ title: '这项任务已提交，等待家长审核', icon: 'none' })
      return
    }

    if (task.reflectionRequired) {
      this.setData({
        showReflectionModal: true,
        reflectionText: task.reflection || '',
        reflectingTaskId: id
      })
      return
    }

    this.submitTaskDirect(id, '')
  },

  onReflectionInput: function (e) {
    this.setData({ reflectionText: e.detail.value })
  },

  onSelectReflectionPhrase: function (e) {
    var phrase = e.currentTarget.dataset.phrase
    if (!phrase) return
    this.setData({ reflectionText: phrase })
  },

  onCancelReflection: function () {
    this.setData({
      showReflectionModal: false,
      reflectionText: '',
      reflectingTaskId: ''
    })
  },

  onSubmitReflection: function () {
    var taskId = this.data.reflectingTaskId
    var reflection = (this.data.reflectionText || '').trim()
    if (!taskId) return
    if (!reflection) {
      return wx.showToast({ title: '写一句今天的感受吧', icon: 'none' })
    }

    this.submitTaskDirect(taskId, reflection)
  },

  onRewards: function () { wx.navigateTo({ url: '/pages/child/rewards/index' }) },
  onPointManage: function () { wx.navigateTo({ url: '/pages/child/point-manage/index' }) },
  onSubmitManage: function () { wx.navigateTo({ url: '/pages/child/submit-manage/index' }) },

  onSubmitWish: function () {
    this.setData({
      showWishDrawer: true,
      wishName: '',
      wishIconIndex: 0
    })
  },

  onCloseWishDrawer: function () {
    if (this.data.wishSubmitting) return
    this.setData({
      showWishDrawer: false,
      wishName: '',
      wishIconIndex: 0
    })
  },

  onKeepDrawer: function () {},

  onWishInput: function (e) {
    this.setData({ wishName: e.detail.value })
  },

  onSelectWishIcon: function (e) {
    this.setData({ wishIconIndex: parseInt(e.currentTarget.dataset.idx, 10) || 0 })
  },

  onConfirmWish: function () {
    var that = this
    var name = (this.data.wishName || '').trim()
    var childId = this.data.child && this.data.child._id
    if (!name) {
      wx.showToast({ title: '请写下你的愿望', icon: 'none' })
      return
    }
    if (!childId) {
      wx.showToast({ title: '未找到孩子信息', icon: 'none' })
      return
    }
    if (this.data.wishSubmitting) return

    this.setData({ wishSubmitting: true })
    api.submitWish({
      childId: childId,
      name: name,
      iconIndex: this.data.wishIconIndex
    }).then(function () {
      wx.showToast({ title: '愿望已提交', icon: 'success' })
      that.setData({
        showWishDrawer: false,
        wishName: '',
        wishIconIndex: 0
      })
    }).catch(function (err) {
      wx.showToast({ title: err && err.message ? err.message : '提交失败', icon: 'none' })
    }).finally(function () {
      that.setData({ wishSubmitting: false })
    })
  }
})
