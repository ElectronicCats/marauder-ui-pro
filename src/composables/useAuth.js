import { ref, computed } from 'vue'

const TOKEN_KEY = 'marauder_platform_jwt'
const REFRESH_KEY = 'marauder_platform_refresh'

function readStoredToken () {
  if (typeof sessionStorage === 'undefined') return ''
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

const tokenRef = ref(readStoredToken())

/** FastAPI / DRF style errors: detail string | {loc,msg}[] */
export function formatApiErrorMessage (data) {
  if (!data || typeof data !== 'object') return null
  const d = data.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) {
    return d
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item.msg === 'string') return item.msg
        return JSON.stringify(item)
      })
      .filter(Boolean)
      .join('; ')
  }
  if (d != null && typeof d === 'object' && typeof d.msg === 'string') return d.msg
  if (typeof data.message === 'string') return data.message
  if (typeof data.error === 'string') return data.error
  return null
}

export function useAuth () {
  const isAuthenticated = computed(() => Boolean(tokenRef.value))

  function setToken (t) {
    tokenRef.value = t || ''
    if (t) {
      sessionStorage.setItem(TOKEN_KEY, t)
    } else {
      sessionStorage.removeItem(TOKEN_KEY)
    }
  }

  function logout () {
    setToken('')
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(REFRESH_KEY)
    }
  }

  function storeRefresh (refresh) {
    if (typeof sessionStorage === 'undefined') return
    const r = refresh && String(refresh).trim()
    if (r) sessionStorage.setItem(REFRESH_KEY, r)
    else sessionStorage.removeItem(REFRESH_KEY)
  }

  function normalizeJwt (value) {
    if (value == null) return null
    const s = String(value).trim()
    return s || null
  }

  /**
   * Login: { access, refresh, username } (root-level SimpleJWT-style)
   * Register: { user: {...}, tokens: { access, refresh } }
   * Legacy: access_token, token, jwt
   */
  function extractAccessFromPayload (data) {
    if (!data || typeof data !== 'object') return null
    return normalizeJwt(
      data.tokens?.access ||
        data.access ||
        data.access_token ||
        data.token ||
        data.jwt ||
        data.data?.tokens?.access ||
        data.data?.access ||
        data.data?.access_token ||
        data.data?.token ||
        null
    )
  }

  function extractRefreshFromPayload (data) {
    if (!data || typeof data !== 'object') return null
    return normalizeJwt(
      data.tokens?.refresh ||
        data.refresh ||
        data.data?.tokens?.refresh ||
        data.data?.refresh ||
        null
    )
  }

  async function parseJsonResponse (res) {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  /**
   * POST JSON { username, password } to VITE_LOGIN_URL.
   */
  async function login (username, password) {
    const loginUrl = import.meta.env.VITE_LOGIN_URL
    if (!loginUrl) {
      throw new Error('VITE_LOGIN_URL is not configured')
    }

    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        password
      })
    })

    const data = await parseJsonResponse(res)

    if (!res.ok) {
      const msg =
        formatApiErrorMessage(data) ||
        (typeof data === 'string' ? data : null) ||
        `Login failed (${res.status})`
      throw new Error(msg)
    }

    const jwt = extractAccessFromPayload(data)
    if (!jwt) {
      throw new Error(
        'No access token in login response (expected access or tokens.access)'
      )
    }

    setToken(jwt)
    storeRefresh(extractRefreshFromPayload(data))
    return jwt
  }

  /**
   * POST JSON { username, email, password, password_confirm } to VITE_REGISTER_URL.
   * Response: { user, tokens: { access, refresh } }
   */
  async function register ({ username, email, password, password_confirm }) {
    const registerUrl = import.meta.env.VITE_REGISTER_URL
    if (!registerUrl) {
      throw new Error('VITE_REGISTER_URL is not configured')
    }

    const res = await fetch(registerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        email: email.trim(),
        password,
        password_confirm
      })
    })

    const data = await parseJsonResponse(res)

    if (!res.ok) {
      const msg =
        formatApiErrorMessage(data) ||
        (typeof data === 'string' ? data : null) ||
        `Registration failed (${res.status})`
      throw new Error(msg)
    }

    const jwt = extractAccessFromPayload(data)
    if (jwt) {
      setToken(jwt)
      storeRefresh(extractRefreshFromPayload(data))
    }
    return { data, token: jwt }
  }

  function getToken () {
    return tokenRef.value
  }

  return {
    token: computed(() => tokenRef.value),
    isAuthenticated,
    login,
    register,
    logout,
    setToken,
    getToken
  }
}
