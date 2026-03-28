var MAX_TEXT_LEN = 180

function safeGetApp() {
  try {
    return typeof getApp === 'function' ? getApp() : null
  } catch (err) {
    return null
  }
}

function trimText(text) {
  var value = String(text || '')
  if (value.length <= MAX_TEXT_LEN) return value
  return value.slice(0, MAX_TEXT_LEN)
}

function normalizeValue(value) {
  if (value === null || value === undefined) return ''
  var valueType = typeof value
  if (valueType === 'number') return isNaN(value) ? 0 : value
  if (valueType === 'boolean') return value ? 1 : 0
  if (valueType === 'string') return trimText(value)
  if (value instanceof Date) return value.toISOString()
  try {
    return trimText(JSON.stringify(value))
  } catch (err) {
    return ''
  }
}

function normalizePayload(payload) {
  var source = payload || {}
  var output = {}
  Object.keys(source).forEach(function (key) {
    if (!key) return
    output[key] = normalizeValue(source[key])
  })
  return output
}

function withBaseFields(payload) {
  var app = safeGetApp()
  var globalData = app && app.globalData ? app.globalData : {}
  var user = globalData.userInfo || {}
  var input = payload || {}
  return Object.assign({
    role: normalizeValue(input.role || user.role || ''),
    childId: normalizeValue(input.childId || globalData.currentChildId || user.childId || ''),
    familyId: normalizeValue(input.familyId || globalData.familyId || user.familyId || ''),
    ts: Date.now(),
    source: normalizeValue(input.source || '')
  }, input)
}

function report(eventName, payload) {
  var name = String(eventName || '').trim()
  if (!name) return

  var body = normalizePayload(withBaseFields(payload))

  try {
    if (wx && typeof wx.reportEvent === 'function') {
      wx.reportEvent(name, body)
      return
    }
  } catch (err) {}

  try {
    if (wx && typeof wx.reportAnalytics === 'function') {
      wx.reportAnalytics(name, body)
      return
    }
  } catch (err) {}

  try {
    console.info('[analytics:fallback]', name, body)
  } catch (err) {}
}

function calcTurnaroundMinutes(startAt, endAt) {
  var start = new Date(startAt || '').getTime()
  if (isNaN(start)) return -1
  var end = new Date(endAt || '').getTime()
  if (isNaN(end)) end = Date.now()
  var diff = end - start
  if (diff < 0) return -1
  return Number((diff / 60000).toFixed(2))
}

function trackOnboardingStep(step, payload) {
  report('onboarding_step_completed', Object.assign({
    step: step || ''
  }, payload || {}))
}

function trackTaskCycleClosed(payload) {
  report('task_cycle_closed', payload || {})
}

function trackAuditTurnaround(payload) {
  report('audit_turnaround_time', payload || {})
}

function trackRewardLoopClosed(payload) {
  report('reward_loop_closed', payload || {})
}

module.exports = {
  report: report,
  calcTurnaroundMinutes: calcTurnaroundMinutes,
  trackOnboardingStep: trackOnboardingStep,
  trackTaskCycleClosed: trackTaskCycleClosed,
  trackAuditTurnaround: trackAuditTurnaround,
  trackRewardLoopClosed: trackRewardLoopClosed
}
