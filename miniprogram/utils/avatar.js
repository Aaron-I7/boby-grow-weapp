var manifest = require('./avatar-manifest')

function normalizeCdnBase(base) {
  if (!base || typeof base !== 'string') return ''
  return base.trim().replace(/\/+$/, '')
}

function readGlobalCdnBase() {
  try {
    if (typeof getApp !== 'function') return ''
    var app = getApp()
    var globalData = app && app.globalData ? app.globalData : {}
    return normalizeCdnBase(globalData.avatarCdnBaseUrl || '')
  } catch (err) {
    return ''
  }
}

function readStorageCdnBase() {
  try {
    if (typeof wx === 'undefined' || typeof wx.getStorageSync !== 'function') return ''
    return normalizeCdnBase(wx.getStorageSync('avatarCdnBaseUrl') || '')
  } catch (err) {
    return ''
  }
}

function getAvatarCdnBase() {
  return readGlobalCdnBase() || readStorageCdnBase()
}

function resolvePresetPath(preset) {
  if (!preset) return ''
  var cloudPath = typeof preset.cloudPath === 'string' ? preset.cloudPath.trim().replace(/^\/+/, '') : ''
  var cdnBase = getAvatarCdnBase()
  if (cdnBase && cloudPath) {
    return cdnBase + '/' + cloudPath
  }
  return preset.path || ''
}

function getDefaultAvatar(scene) {
  return manifest.defaults[scene] || manifest.defaults.adult
}

function getPresetByKey(key) {
  if (!key || typeof key !== 'string') return null
  var clean = key.trim()
  if (!clean) return null

  var actualKey = manifest.legacyKeyMap[clean] || clean
  var presets = manifest.presets || []
  for (var i = 0; i < presets.length; i++) {
    if (presets[i].key === actualKey) return presets[i]
  }
  return null
}

function getPresetAvatarPathByKey(key) {
  var preset = getPresetByKey(key)
  return resolvePresetPath(preset)
}

function getAudienceByScene(scene) {
  return scene === 'child' ? 'child' : 'adult'
}

function getPresetOptions(options) {
  var opt = options || {}
  var audience = opt.audience || 'adult'
  var role = opt.role || ''
  var gender = opt.gender || ''
  var mode = opt.mode || 'recommended'
  var list = (manifest.presets || []).filter(function (item) {
    return item.audience === audience
  })

  if (mode === 'all') return list

  return list.filter(function (item) {
    var roleMatch = !role || !item.roles || item.roles.indexOf(role) > -1
    var genderMatch = !gender || !item.genders || item.genders.indexOf(gender) > -1
    return roleMatch && genderMatch
  })
}

function getPresetKeys(options) {
  return getPresetOptions(options).map(function (item) {
    return item.key
  })
}

function getPresetAvatarPathByIndex(index, audience) {
  var n = Number(index)
  if (isNaN(n) || n < 0) return ''
  var keys = getPresetKeys({ audience: audience || 'child', mode: 'all' })
  if (!keys.length) return ''
  var key = keys[Math.floor(n) % keys.length]
  return getPresetAvatarPathByKey(key)
}

function resolveAvatar(entity, scene) {
  var data = entity || {}
  var avatarUrl = typeof data.avatarUrl === 'string' ? data.avatarUrl.trim() : ''
  if (avatarUrl) return avatarUrl

  var byKey = getPresetAvatarPathByKey(data.avatarKey)
  if (byKey) return byKey

  var audience = getAudienceByScene(scene)
  var byIndex = getPresetAvatarPathByIndex(data.avatarIndex, audience)
  if (byIndex) return byIndex

  return getDefaultAvatar(scene)
}

function withResolvedAvatar(entity, scene) {
  if (!entity) return null
  var out = Object.assign({}, entity)
  out.avatarUrl = resolveAvatar(out, scene)
  return out
}

module.exports = {
  getDefaultAvatar: getDefaultAvatar,
  getPresetOptions: getPresetOptions,
  getPresetKeys: getPresetKeys,
  getPresetAvatarPathByIndex: getPresetAvatarPathByIndex,
  getPresetAvatarPathByKey: getPresetAvatarPathByKey,
  resolveAvatar: resolveAvatar,
  withResolvedAvatar: withResolvedAvatar
}
