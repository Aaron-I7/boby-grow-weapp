Component({
  properties: {
    mode: {
      type: String,
      value: 'sub'
    },
    title: {
      type: String,
      value: ''
    },
    subtitle: {
      type: String,
      value: ''
    },
    avatarUrl: {
      type: String,
      value: '/images/png/avatar/default/child-default.png'
    },
    avatarEmpty: {
      type: Boolean,
      value: false
    },
    showBack: {
      type: Boolean,
      value: true
    },
    showSwitch: {
      type: Boolean,
      value: true
    }
  },
  data: {
    safeTop: 20,
    navHeight: 44
  },
  lifetimes: {
    attached: function () {
      this.computeMetrics()
    }
  },
  pageLifetimes: {
    show: function () {
      this.computeMetrics()
    }
  },
  methods: {
    computeMetrics: function () {
      var sys = wx.getSystemInfoSync()
      var menuRect = wx.getMenuButtonBoundingClientRect()
      var statusBarHeight = sys.statusBarHeight || 20
      var menuTop = (menuRect && menuRect.top) ? menuRect.top : statusBarHeight
      var menuHeight = (menuRect && menuRect.height) ? menuRect.height : 32
      var navHeight = (menuTop - statusBarHeight) * 2 + menuHeight
      if (!isFinite(navHeight) || navHeight < 32 || navHeight > 96) {
        navHeight = 44
      }
      this.setData({
        safeTop: statusBarHeight,
        navHeight: navHeight
      })
    },
    onBackTap: function () {
      this.triggerEvent('back')
    },
    onSwitchTap: function () {
      this.triggerEvent('switchchild')
    }
  }
})
