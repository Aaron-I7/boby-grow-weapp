var STORAGE_KEY = '__PENDING_INVITE_TICKET__'

function safeGetStorageSync(key, fallback) {
  try {
    var value = wx.getStorageSync(key)
    return value === undefined || value === '' ? fallback : value
  } catch (err) {
    return fallback
  }
}

function safeSetStorageSync(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (err) {}
}

function safeRemoveStorageSync(key) {
  try {
    wx.removeStorageSync(key)
  } catch (err) {}
}

function sanitizeTicket(ticket) {
  return String(ticket || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
}

function parseScene(scene) {
  var raw = String(scene || '')
  if (!raw) return ''
  var decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch (err) {}

  var parts = decoded.split('&')
  for (var i = 0; i < parts.length; i++) {
    var kv = parts[i].split('=')
    var key = String(kv[0] || '').trim()
    var value = String(kv[1] || '').trim()
    if (key === 't' || key === 'ticket') {
      return sanitizeTicket(value)
    }
  }
  return ''
}

function resolveTicketFromOptions(options) {
  var opts = options || {}
  var fromQuery = sanitizeTicket(opts.ticket)
  if (fromQuery) return fromQuery
  return parseScene(opts.scene)
}

function setPendingTicket(ticket) {
  var token = sanitizeTicket(ticket)
  if (!token) {
    clearPendingTicket()
    return ''
  }
  safeSetStorageSync(STORAGE_KEY, token)
  return token
}

function getPendingTicket() {
  return sanitizeTicket(safeGetStorageSync(STORAGE_KEY, ''))
}

function clearPendingTicket() {
  safeRemoveStorageSync(STORAGE_KEY)
}

module.exports = {
  STORAGE_KEY: STORAGE_KEY,
  sanitizeTicket: sanitizeTicket,
  parseScene: parseScene,
  resolveTicketFromOptions: resolveTicketFromOptions,
  setPendingTicket: setPendingTicket,
  getPendingTicket: getPendingTicket,
  clearPendingTicket: clearPendingTicket
}
