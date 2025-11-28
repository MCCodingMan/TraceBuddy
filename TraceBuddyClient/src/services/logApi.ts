/**
 * 日志API服务
 * 提供与后端日志系统的完整集成
 */

import type {
  BackendLogItem,
  BackendSearchResponse,
  LogQueryParams,
  LogStats,
  UILogRow
} from '../types/log'
import { mapResponseToUI, generateLogStats } from '../utils/logUtils'

export const API_BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080'


/**
 * API错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 日志API服务类
 */
class LogApiService {
  private baseURL: string
  private timeout: number
  private cache: Map<string, { ts: number; payload: {
    logs: UILogRow[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    stats: LogStats
  } }>

  constructor(baseURL = API_BASE_URL, timeout = 30000) {
    this.baseURL = baseURL
    this.timeout = timeout
    this.cache = new Map()
  }

  /**
   * 获取认证token
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('token')
  }

  /**
   * 构建完整的URL
   */
  private buildURL(endpoint: string): string {
    return `${this.baseURL}${endpoint}`
  }

  /**
   * 构建请求配置
   */
  private buildRequestConfig(method = 'GET', body?: any): RequestInit {
    const token = this.getAuthToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const config: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    }

    if (body) {
      config.body = JSON.stringify(body)
    }

    return config
  }

  /**
   * 处理API响应
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.message || `HTTP ${response.status}`,
        errorData.code || 'UNKNOWN_ERROR',
        response.status,
        errorData.details
      )
    }

    const data = await response.json()
    return data as T
  }

  /**
   * 搜索日志
   */
  async searchLogs(params: LogQueryParams = {}): Promise<{
    logs: UILogRow[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    stats: LogStats
  }> {
    try {
      if (params.trace_id) {
        try {
          const log = await this.getLogById(params.trace_id)
          const payload = {
            logs: [log],
            total: 1,
            page: 1,
            pageSize: 1,
            totalPages: 1,
            stats: generateLogStats([log], 'TraceID 精确查询')
          }
          return payload
        } catch {
          return {
            logs: [],
            total: 0,
            page: 1,
            pageSize: 1,
            totalPages: 1,
            stats: generateLogStats([], 'TraceID 精确查询')
          }
        }
      }
      const queryParams = new URLSearchParams()
      const page = (params.page as number) || 1
      const size = (params.page_size as number) || (params.size as number) || 50

      queryParams.append('page', String(page))
      queryParams.append('size', String(size))

      if (params.level) queryParams.append('level', String(params.level))
      if (params.searchTerm) queryParams.append('keyword', String(params.searchTerm))
      if (params.trace_id) queryParams.append('trace_id', String(params.trace_id))

      const start = (params.start_time as string) || (params.startTime instanceof Date ? params.startTime.toISOString() : undefined)
      const end = (params.end_time as string) || (params.endTime instanceof Date ? params.endTime.toISOString() : undefined)
      if (start) queryParams.append('start_time', start)
      if (end) queryParams.append('end_time', end)

      if (params.method) queryParams.append('method', String(params.method))
      if (params.status !== undefined) queryParams.append('status', String(params.status))
      if (params.path) queryParams.append('path', String(params.path))

      const url = `${this.buildURL('/api/logs/search')}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      const config = this.buildRequestConfig()

      // 前端缓存：命中则直接返回
      const cacheTTL = 60 * 1000 // 1分钟
      const cached = this.cache.get(url)
      if (cached && Date.now() - cached.ts < cacheTTL) {
        return cached.payload
      }

      const response = await fetch(url, config)
      const data = await this.handleResponse<BackendSearchResponse>(response)

      const uiLogs = mapResponseToUI(data)
      const timeRange = this.getTimeRangeDescription(params)
      const stats = generateLogStats(uiLogs, timeRange)

      const payload = {
        logs: uiLogs,
        total: data.total,
        page: data.page,
        pageSize: data.size,
        totalPages: Math.max(1, Math.ceil((data.total || 0) / (data.size || 1))),
        stats
      }

      this.cache.set(url, { ts: Date.now(), payload })
      // 控制缓存大小
      if (this.cache.size > 20) {
        const it = this.cache.keys()
        const first = it.next()
        if (!first.done && typeof first.value === 'string') {
          this.cache.delete(first.value)
        }
      }
      return payload
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        '搜索日志失败',
        'SEARCH_FAILED',
        undefined,
        error
      )
    }
  }

  /**
   * 获取单个日志详情
   */
  async getLogById(id: string): Promise<UILogRow> {
    try {
      const url = this.buildURL(`/api/logs/${id}`)
      const config = this.buildRequestConfig()
      
      const response = await fetch(url, config)
      const data = await this.handleResponse<BackendLogItem>(response)
      
      return mapResponseToUI({ data: [data], total: 1, page: 1, size: 1 })[0]
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        '获取日志详情失败',
        'GET_LOG_FAILED',
        undefined,
        error
      )
    }
  }

  /**
   * 获取日志统计信息
   */
  async getLogStats(timeRange?: { start?: Date; end?: Date }): Promise<LogStats> {
    try {
      const queryParams = new URLSearchParams()
      
      if (timeRange?.start) {
        queryParams.append('start_time', timeRange.start.toISOString())
      }
      if (timeRange?.end) {
        queryParams.append('end_time', timeRange.end.toISOString())
      }

      const url = `${this.buildURL('/api/v1/unified-logs/stats')}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      const config = this.buildRequestConfig()
      
      const response = await fetch(url, config)
      const data = await this.handleResponse<any>(response)
      
      return data as LogStats
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        '获取日志统计失败',
        'GET_STATS_FAILED',
        undefined,
        error
      )
    }
  }

  /**
   * 获取可用服务列表
   */
  async getServices(): Promise<string[]> {
    try {
      const url = `${this.buildURL('/api/logs/search')}?page=1&size=200`
      const config = this.buildRequestConfig()
      const response = await fetch(url, config)
      const data = await this.handleResponse<BackendSearchResponse>(response)
      const services = Array.from(new Set((data.data || []).map((l: any) => l.service).filter(Boolean)))
      return services
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        '获取服务列表失败',
        'GET_SERVICES_FAILED',
        undefined,
        error
      )
    }
  }

  /**
   * 获取可用模块列表
   */
  async getModules(service?: string): Promise<string[]> {
    try {
      const url = `${this.buildURL('/api/logs/search')}?page=1&size=200${service ? `&service=${encodeURIComponent(service)}` : ''}`
      const config = this.buildRequestConfig()
      const response = await fetch(url, config)
      const data = await this.handleResponse<BackendSearchResponse>(response)
      const modules = Array.from(new Set((data.data || [])
        .filter((l: any) => !service || l.service === service)
        .map((l: any) => (l.request && typeof l.request.url === 'string' ? String(l.request.url).split('/')[2] : undefined))
        .filter((m): m is string => typeof m === 'string')))
      return modules
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        '获取模块列表失败',
        'GET_MODULES_FAILED',
        undefined,
        error
      )
    }
  }

  /**
   * 获取时间范围描述
   */
  private getTimeRangeDescription(params: LogQueryParams): string {
    if (params.start_time && params.end_time) {
      return '自定义时间范围'
    }
    
    // 根据其他参数推断时间范围
    if (params.start_time) {
      const startDate = new Date(params.start_time)
      const now = new Date()
      const diffHours = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60)
      
      if (diffHours <= 1) return '最近1小时'
      if (diffHours <= 6) return '最近6小时'
      if (diffHours <= 24) return '最近24小时'
      if (diffHours <= 168) return '最近7天'
      return '历史数据'
    }
    
    return '全部时间'
  }
}

// 创建单例实例
export const logApiService = new LogApiService()
