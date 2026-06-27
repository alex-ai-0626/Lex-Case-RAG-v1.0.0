// API配置文件
// 默认使用同源 /api，避免远程访问前端时浏览器错误地请求本机 localhost:5000。
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export function buildApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

// API端点配置
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: buildApiUrl('/api/auth/login'),
    REGISTER: buildApiUrl('/api/auth/register'),
    PROFILE: buildApiUrl('/api/auth/profile')
  },
  
  // 查询相关
  QUERY: buildApiUrl('/api/query'),
  
  // 文件相关
  FILE: {
    UPLOAD: buildApiUrl('/api/files/upload'),
    PREVIEW: (fileName) => buildApiUrl(`/api/preview/${fileName}`),
    DELETE: (fileName) => buildApiUrl(`/api/files/${fileName}`)
  },
  
  // 健康检查
  HEALTH: buildApiUrl('/api/health')
}

// 获取认证headers
export function getAuthHeaders() {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

// 获取上传headers（不包含Content-Type，让浏览器自动设置）
export function getUploadHeaders() {
  const token = localStorage.getItem('access_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function isAuthEndpoint(url) {
  return /\/api\/auth\/(login|register)$/.test(url)
}

function buildRequestUrl(url, params) {
  if (!params || Object.keys(params).length === 0) {
    return url
  }
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  const query = searchParams.toString()
  return query ? `${url}?${query}` : url
}

// 通用API请求函数
export async function apiRequest(url, options = {}) {
  const { data, params, headers, ...restOptions } = options
  const requestUrl = buildRequestUrl(url, params)
  const defaultOptions = {
    headers: {
      ...getAuthHeaders(),
      ...headers
    },
    ...restOptions
  }

  if (data !== undefined) {
    defaultOptions.body = JSON.stringify(data)
  }

  try {
    const response = await fetch(requestUrl, defaultOptions)
    const responseData = await response.json().catch(() => null)

    // 登录/注册接口的 401 交给页面处理，避免误清 token 或整页刷新
    if (response.status === 401 && isAuthEndpoint(url)) {
      return responseData
    }

    // 其他接口 401：token 失效，清除登录态并跳转
    if (response.status === 401) {
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      return responseData
    }

    return responseData
  } catch (error) {
    console.error('API请求失败:', error)
    throw error
  }
}

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl,
  getAuthHeaders,
  getUploadHeaders,
  apiRequest
}
