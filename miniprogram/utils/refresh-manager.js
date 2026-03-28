var DEFAULT_SCOPES = [
  'guard.onboarding',
  'shared.children',
  'shared.rules',
  'shared.audit',
  'parent.dashboard',
  'parent.taskManage',
  'parent.childManage'
]

var store = {}

function createScopeState() {
  return {
    lastFetchAt: 0,
    dirtyVersion: 0,
    seenVersion: 0,
    inflightPromise: {},
    cache: {}
  }
}

function ensureScope(scope) {
  var key = String(scope || '').trim()
  if (!key) key = '__default__'
  if (!store[key]) store[key] = createScopeState()
  return store[key]
}

function isNumber(value) {
  return typeof value === 'number' && !isNaN(value)
}

function resolveTtl(ttlMs) {
  if (!isNumber(ttlMs) || ttlMs < 0) return 0
  return ttlMs
}

function shouldRefresh(scope, ttlMs) {
  var state = ensureScope(scope)
  var ttl = resolveTtl(ttlMs)
  var expired = !state.lastFetchAt || (Date.now() - state.lastFetchAt >= ttl)
  var dirty = state.dirtyVersion > state.seenVersion
  return expired || dirty
}

function markFetched(scope) {
  var state = ensureScope(scope)
  state.lastFetchAt = Date.now()
  state.seenVersion = state.dirtyVersion
  return state.lastFetchAt
}

function markDirty(scope) {
  var state = ensureScope(scope)
  state.dirtyVersion += 1
  return state.dirtyVersion
}

function withInflight(scope, key, fetcher) {
  var state = ensureScope(scope)
  var inflightKey = String(key || '__default__')
  var inflightMap = state.inflightPromise

  if (inflightMap[inflightKey]) return inflightMap[inflightKey]

  var runner = Promise.resolve().then(function () {
    return fetcher()
  }).finally(function () {
    delete inflightMap[inflightKey]
  })

  inflightMap[inflightKey] = runner
  return runner
}

function getCache(scope, key) {
  var state = ensureScope(scope)
  var cacheKey = String(key || '__default__')
  if (!Object.prototype.hasOwnProperty.call(state.cache, cacheKey)) return undefined
  return state.cache[cacheKey]
}

function setCache(scope, key, value) {
  var state = ensureScope(scope)
  var cacheKey = String(key || '__default__')
  state.cache[cacheKey] = value
  return value
}

DEFAULT_SCOPES.forEach(ensureScope)

module.exports = {
  DEFAULT_SCOPES: DEFAULT_SCOPES,
  shouldRefresh: shouldRefresh,
  markFetched: markFetched,
  markDirty: markDirty,
  withInflight: withInflight,
  getCache: getCache,
  setCache: setCache
}
