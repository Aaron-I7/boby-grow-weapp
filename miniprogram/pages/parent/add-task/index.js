var api = require('../../../utils/api')

Page({
  data: {
    quickMode: true,
    advancedExpanded: false,
    categoryOptions: [
      { key: 'habit', name: '习惯', icon: 'habit' },
      { key: 'study', name: '学习', icon: 'study' },
      { key: 'chore', name: '家务', icon: 'chore' },
      { key: 'custom', name: '自定义', icon: 'edit' }
    ],
    customCategoryName: '',
    customCategoryDraft: '',
    customCategoryIcon: 'edit',
    showCustomCategoryEditor: false,
    categoryIconOptions: [
      { icon: 'stars' },
      { icon: 'study' },
      { icon: 'chore' },
      { icon: 'virtue' },
      { icon: 'soccer' },
      { icon: 'toy' },
      { icon: 'star' },
      { icon: 'clean-hands' }
    ],
    pointOptions: [5, 10, 20],
    basePointOptions: [5, 10, 20],
    name: '',
    category: 'study',
    points: 10,
    customPoints: '',
    showCustomInput: false,
    customAddedPoint: 0,
    frequencyType: 'loop',
    loopMode: 'daily',
    purposeText: '',
    reflectionRequired: true,
    intrinsicTag: 'mixed',
    intrinsicOptions: [
      { key: 'autonomy', label: '自主感' },
      { key: 'competence', label: '胜任感' },
      { key: 'relatedness', label: '关系感' },
      { key: 'mixed', label: '综合' }
    ],
    weekdayOptions: [
      { key: 'mon', label: '周一', value: 1, active: true },
      { key: 'tue', label: '周二', value: 2, active: true },
      { key: 'wed', label: '周三', value: 3, active: true },
      { key: 'thu', label: '周四', value: 4, active: true },
      { key: 'fri', label: '周五', value: 5, active: true },
      { key: 'sat', label: '周六', value: 6, active: false },
      { key: 'sun', label: '周日', value: 7, active: false }
    ],
    selectedWeekdays: [1, 2, 3, 4, 5],
    dailyLimit: '1',
    labels: {
      navTitle: '任务详情',
      fieldName: '任务名称',
      fieldNamePlaceholder: '例如：每天阅读30分钟',
      fieldCategory: '任务分类',
      customCategoryPlaceholder: '输入自定义类别',
      customCategoryTip: '选择一个图标',
      fieldPoints: '奖励积分',
      customPoints: '自定义',
      fieldFrequency: '完成频率',
      freqLoop: '循环',
      freqOnce: '单次',
      loopDaily: '每日',
      loopCustom: '自定义',
      fieldPurpose: '任务意义（对孩子）',
      fieldPurposePlaceholder: '例如：练习自我管理，让早晨更从容。',
      fieldIntrinsic: '内驱力标签',
      fieldReflection: '是否要求孩子反思',
      reflectionOn: '要求',
      reflectionOff: '不要求',
      fieldLimit: '每日可完成次数',
      fieldLimitPlaceholder: '默认1次',
      tipTitle: '专家建议',
      tipText: '设置具体且可量化的任务目标（如“阅读30分钟”），能显著提升完成率。',
      quickMode: '快速创建',
      advancedMode: '高级模式',
      expandAdvanced: '展开高级设置',
      collapseAdvanced: '收起高级设置',
      cancel: '取消',
      save: '保存任务'
    }
  },

  _pointTapMeta: {
    value: null,
    time: 0
  },

  onLoad: function () {
    this.syncWeekdayActive()
  },

  onInput: function (e) {
    var field = e.currentTarget.dataset.field
    var obj = {}
    obj[field] = e.detail.value
    this.setData(obj)
  },

  onSwitchMode: function (e) {
    var mode = e.currentTarget.dataset.mode
    if (mode !== 'quick' && mode !== 'advanced') return

    var quickMode = mode === 'quick'
    var nextCategory = this.data.category
    if (quickMode && (!nextCategory || nextCategory === 'custom')) nextCategory = 'study'

    this.setData({
      quickMode: quickMode,
      advancedExpanded: quickMode ? false : true,
      category: nextCategory
    })

    if (quickMode) this.setData({ loopMode: 'daily' })
  },

  onToggleAdvanced: function () {
    if (!this.data.quickMode) return
    this.setData({ advancedExpanded: !this.data.advancedExpanded })
  },

  onSelectCategory: function (e) {
    var key = e.currentTarget.dataset.key
    if (key !== 'custom') {
      this.setData({
        category: key,
        showCustomCategoryEditor: false
      })
      return
    }

    if (!this.data.customCategoryName || this.data.category === 'custom') {
      this.setData({
        category: 'custom',
        showCustomCategoryEditor: true,
        customCategoryDraft: this.data.customCategoryName || ''
      })
      return
    }

    this.setData({ category: 'custom' })
  },

  onCustomCategoryInput: function (e) {
    this.setData({ customCategoryDraft: e.detail.value })
  },

  onCustomCategoryBlur: function () {
    var name = (this.data.customCategoryDraft || '').trim()
    if (!name) {
      if (!this.data.customCategoryName) {
        return wx.showToast({ title: '请输入类别名称', icon: 'none' })
      }
      this.setData({
        showCustomCategoryEditor: false,
        customCategoryDraft: ''
      })
      return
    }
    this.applyCustomCategory(name, this.data.customCategoryIcon)
  },

  onSelectCustomIcon: function (e) {
    var icon = e.currentTarget.dataset.icon
    this.setData({ customCategoryIcon: icon, category: 'custom' })
    if (this.data.customCategoryName) {
      this.applyCustomCategory(this.data.customCategoryName, icon, true)
    }
  },

  applyCustomCategory: function (name, icon, keepEditor) {
    var list = (this.data.categoryOptions || []).map(function (item) {
      if (item.key !== 'custom') return item
      return {
        key: 'custom',
        name: name,
        icon: icon || 'edit'
      }
    })
    this.setData({
      categoryOptions: list,
      customCategoryName: name,
      customCategoryIcon: icon || 'edit',
      category: 'custom',
      showCustomCategoryEditor: !!keepEditor,
      customCategoryDraft: keepEditor ? name : ''
    })
  },

  onSelectPoints: function (e) {
    var selected = e.currentTarget.dataset.val
    var now = Date.now()
    var isCustom = this.data.customAddedPoint && selected === this.data.customAddedPoint
    var isDoubleTap = isCustom &&
      this._pointTapMeta.value === selected &&
      now - this._pointTapMeta.time < 320

    this._pointTapMeta = {
      value: selected,
      time: now
    }

    if (isDoubleTap) {
      return this.onEditCustomPoint(selected)
    }

    this.setData({
      points: selected,
      customPoints: '',
      showCustomInput: false
    })
  },

  onShowCustomInput: function () {
    this.setData({
      showCustomInput: true,
      customPoints: ''
    })
  },

  onCustomPoints: function (e) {
    this.setData({
      customPoints: e.detail.value,
      points: 0
    })
  },

  onCustomBlur: function () {
    var raw = (this.data.customPoints || '').trim()
    if (!raw) {
      this.setData({ showCustomInput: false })
      return
    }

    var val = parseInt(raw, 10)
    if (!val || val <= 0) {
      this.setData({
        showCustomInput: false,
        customPoints: ''
      })
      return wx.showToast({ title: '请输入正整数', icon: 'none' })
    }

    var base = this.data.basePointOptions || [5, 10, 20]
    var list = base.slice()
    if (base.indexOf(val) === -1) list.push(val)

    this.setData({
      pointOptions: list,
      customAddedPoint: base.indexOf(val) === -1 ? val : 0,
      points: val,
      showCustomInput: false,
      customPoints: ''
    })
  },

  onEditCustomPoint: function (val) {
    var base = this.data.basePointOptions || [5, 10, 20]
    this.setData({
      pointOptions: base.slice(),
      customAddedPoint: 0,
      showCustomInput: true,
      customPoints: String(val),
      points: 0
    })
  },

  onSelectFreqType: function (e) {
    var val = e.currentTarget.dataset.val
    if (this.data.quickMode && val === 'loop') {
      this.setData({
        frequencyType: val,
        loopMode: 'daily'
      })
      return
    }
    this.setData({ frequencyType: val })
  },

  onSelectLoopMode: function (e) {
    this.setData({ loopMode: e.currentTarget.dataset.val })
  },

  onToggleReflectionRequired: function () {
    this.setData({ reflectionRequired: !this.data.reflectionRequired })
  },

  onSelectIntrinsicTag: function (e) {
    var key = e.currentTarget.dataset.key
    this.setData({ intrinsicTag: key || 'mixed' })
  },

  onToggleWeekday: function (e) {
    var day = parseInt(e.currentTarget.dataset.day, 10)
    var list = (this.data.selectedWeekdays || []).slice()
    var idx = list.indexOf(day)
    if (idx > -1) {
      list.splice(idx, 1)
    } else {
      list.push(day)
      list.sort(function (a, b) { return a - b })
    }
    this.setData({ selectedWeekdays: list })
    this.syncWeekdayActive()
  },

  syncWeekdayActive: function () {
    var selected = this.data.selectedWeekdays || []
    var options = (this.data.weekdayOptions || []).map(function (item) {
      return {
        key: item.key,
        label: item.label,
        value: item.value,
        active: selected.indexOf(item.value) > -1
      }
    })
    this.setData({ weekdayOptions: options })
  },

  onBack: function () {
    wx.navigateBack()
  },

  onCancel: function () {
    wx.navigateBack()
  },

  onSave: function () {
    var d = this.data
    var pts = d.customPoints ? parseInt(d.customPoints, 10) : d.points
    var frequency = d.frequencyType === 'once' ? 'once' : (d.loopMode === 'daily' ? 'daily' : 'custom')
    if (d.quickMode && frequency !== 'once') frequency = 'daily'

    var category = d.category === 'custom' ? d.customCategoryName : d.category
    if (d.quickMode && !category) category = 'study'

    if (!d.name.trim()) {
      return wx.showToast({ title: '请输入任务名称', icon: 'none' })
    }
    if (!pts || pts <= 0) {
      return wx.showToast({ title: '请设置积分', icon: 'none' })
    }
    if (!d.quickMode && d.category === 'custom' && !d.customCategoryName) {
      return wx.showToast({ title: '请完成自定义类别', icon: 'none' })
    }
    if (!d.quickMode && frequency === 'custom' && (!d.selectedWeekdays || !d.selectedWeekdays.length)) {
      return wx.showToast({ title: '至少选择一天', icon: 'none' })
    }

    api.createRule({
      name: d.name.trim(),
      category: category,
      categoryIcon: d.category === 'custom' ? d.customCategoryIcon : '',
      points: pts,
      frequency: frequency,
      weekdays: (!d.quickMode && frequency === 'custom') ? d.selectedWeekdays : [],
      dailyLimit: d.quickMode ? 1 : (parseInt(d.dailyLimit, 10) || 1),
      purposeText: d.quickMode ? '' : (d.purposeText || '').trim(),
      reflectionRequired: d.quickMode ? false : !!d.reflectionRequired,
      intrinsicTag: d.quickMode ? 'mixed' : (d.intrinsicTag || 'mixed')
    }).then(function () {
      wx.showToast({ title: '任务已创建', icon: 'success' })
      setTimeout(function () {
        wx.navigateBack()
      }, 420)
    }).catch(function (err) {
      wx.showToast({
        title: (err && err.message) ? err.message : '创建失败，请重试',
        icon: 'none'
      })
    })
  }
})
