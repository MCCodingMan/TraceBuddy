/**
 * 日志数据转换工具函数
 * 提供后端数据到UI数据的安全转换
 */

import type {
  BackendLogItem,
  UILogRow,
  LogLevel,
  LogStats,
  BackendSearchResponse
} from '../types/log'

/**
 * 安全解析JSON字符串
 * 处理可能的解析错误，返回null作为默认值
 */
export function safeJSON<T = any>(text: string | null | undefined): T | null {
  if (!text || typeof text !== 'string') return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/**
 * 判断是否为有效的日志级别
 */
export function isValidLogLevel(level: string): level is LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
  return validLevels.includes(level as LogLevel)
}

/**
 * 标准化日志级别
 * 将后端返回的级别转换为有效的枚举值
 */
export function normalizeLogLevel(level: string): LogLevel {
  if (!level || typeof level !== 'string') return 'info'
  const normalized = level.toLowerCase()
  if (isValidLogLevel(normalized)) {
    return normalized
  }
  // 处理可能的变体
  if (normalized.includes('warning')) return 'warn'
  if (normalized.includes('err')) return 'error'
  if (normalized.includes('critical')) return 'fatal'
  return 'info' // 默认级别
}

/**
 * 将后端日志数据转换为UI层数据
 * 处理字段缺失和格式转换
 */
export function normalizeLogItem(item: BackendLogItem): UILogRow {
  const level = item.level ? normalizeLogLevel(String(item.level)) : 'info'
  const created = item.timestamp ? new Date(item.timestamp) : new Date()
  const req = item.request || {}
  const res = item.response || {}

  // 提取UA摘要
  const uaHeader = req.headers ? (req.headers['User-Agent'] || req.headers['user-agent'] || '') : ''

  return {
    id: item.track_id,
    created_at: created,
    level,
    message: item.message || '',
    service: item.service,
    module: undefined,
    function: undefined,
    line: undefined,
    file: undefined,
    trace_id: item.track_id,
    span_id: undefined,
    request_id: undefined,
    user_id: undefined,
    ip_address: item.client_ip,
    user_agent: uaHeader,
    environment: item.environment,
    tags: null,
    metadata: null,
    error_code: undefined,
    error_message: undefined,
    http_method: req.method,
    api_endpoint: req.url,
    status_code: res.status_code,
    duration_ms: item.duration_ms,
    updated_at: undefined,
    request_headers: req.headers,
    request_body: req.body,
    response_headers: res.headers,
    response_body: res.body,
    protocol: req.proto,
    response_size: res.size,
    query_params: req.query_params
  }
}

/**
 * 将搜索响应转换为UI数据列表
 */
export function mapResponseToUI(response: BackendSearchResponse): UILogRow[] {
  return (response.data || []).map(normalizeLogItem)
}

/**
 * 生成日志统计信息
 */
export function generateLogStats(logs: UILogRow[], timeRange: string): LogStats {
  const total = logs.length
  const levelCounts = {
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
    fatal: 0
  }
  
  let totalDuration = 0
  let durationCount = 0
  const uniqueUsers = new Set<string>()
  
  logs.forEach(log => {
    // 统计各级别数量
    if (isValidLogLevel(log.level)) {
      levelCounts[log.level as keyof typeof levelCounts]++
    }
    
    // 计算平均响应时间
    if (log.duration_ms && log.duration_ms > 0) {
      totalDuration += log.duration_ms
      durationCount++
    }
    
    // 统计活跃用户
    if (log.user_id) {
      uniqueUsers.add(log.user_id)
    }
  })
  
  const errorRate = total > 0 ? (levelCounts.error + levelCounts.fatal) / total * 100 : 0
  const avgResponseTime = durationCount > 0 ? totalDuration / durationCount : 0
  
  return {
    total_logs: total,
    error_count: levelCounts.error,
    warn_count: levelCounts.warn,
    info_count: levelCounts.info,
    debug_count: levelCounts.debug,
    fatal_count: levelCounts.fatal,
    error_rate: Number(errorRate.toFixed(2)),
    avg_response_time: Number(avgResponseTime.toFixed(2)),
    active_users: uniqueUsers.size,
    time_range: timeRange
  }
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: string): string {
  if (!timestamp || typeof timestamp !== 'string') return ''
  
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return timestamp
    
    // 统一格式 YYYY-MM-DD HH:mm:ss
    const pad = (n: number) => n.toString().padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    const ss = pad(date.getSeconds())
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
  } catch {
    return timestamp
  }
}

/**
 * 脱敏请求/响应头中的敏感信息
 */
export function maskSensitiveHeaders(headers: Record<string, string> | undefined | null): Record<string, string> | undefined {
  if (!headers) return headers || undefined
  const masked: Record<string, string> = {}
  const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'token', 'set-cookie']
  Object.entries(headers).forEach(([k, v]) => {
    const keyLower = k.toLowerCase()
    if (sensitiveKeys.includes(keyLower)) {
      masked[k] = '***'
    } else {
      masked[k] = v
    }
  })
  return masked
}

/**
 * 简单IP脱敏
 */
export function maskIP(ip?: string): string | undefined {
  if (!ip) return ip
  // IPv4 简单处理: a.b.c.d -> a.b.*.d
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1].slice(0, 1)}*.${parts[3]}`
  }
  // 对IPv6或其他格式仅截断
  return truncateText(ip, 15)
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms === null || isNaN(ms)) return ''
  
  if (ms < 1000) {
    return `${ms}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  } else {
    return `${(ms / 60000).toFixed(1)}min`
  }
}

/**
 * 获取日志级别颜色配置
 */
export function getLogLevelColor(level: LogLevel | string): {
  bg: string
  text: string
  border: string
  icon: string
} {
  const colors = {
    debug: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      icon: '🔍'
    },
    info: {
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      border: 'border-green-500/20',
      icon: 'ℹ️'
    },
    warn: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/20',
      icon: '⚠️'
    },
    error: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/20',
      icon: '❌'
    },
    fatal: {
      bg: 'bg-red-600/20',
      text: 'text-red-300',
      border: 'border-red-400/30',
      icon: '💀'
    }
  }
  
  if (isValidLogLevel(level as string)) {
    return colors[level as keyof typeof colors]
  }
  
  // 默认级别颜色
  return {
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    border: 'border-gray-500/20',
    icon: '📝'
  }
}

/**
 * 获取状态码颜色配置
 */
export function getStatusCodeColor(statusCode?: number): {
  bg: string
  text: string
  border: string
} {
  if (!statusCode) {
    return {
      bg: 'bg-gray-500/10',
      text: 'text-gray-400',
      border: 'border-gray-500/20'
    }
  }
  
  if (statusCode >= 200 && statusCode < 300) {
    return {
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      border: 'border-green-500/20'
    }
  } else if (statusCode >= 300 && statusCode < 400) {
    return {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/20'
    }
  } else if (statusCode >= 400 && statusCode < 500) {
    return {
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/20'
    }
  } else {
    return {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/20'
    }
  }
}

/**
 * 验证IP地址格式
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * 截断长文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * 获取文件名的简化版本
 */
export function simplifyFileName(filePath?: string): string {
  if (!filePath) return ''
  const parts = filePath.split('/')
  return parts[parts.length - 1] || filePath
}
