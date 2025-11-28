/**
 * 日志级别枚举
 * 与后端数据库字段保持严格一致
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * 后端原始日志数据结构
 * 完全匹配后端API返回的所有字段
 */
export interface BackendLogItem {
  track_id: string
  timestamp: string
  duration_ms?: number
  request?: {
    method?: string
    url?: string
    proto?: string
    headers?: Record<string, string>
    query_params?: Record<string, string>
    body?: any
  }
  response?: {
    status_code?: number
    headers?: Record<string, string>
    body?: any
    size?: number
  }
  client_ip?: string
  service?: string
  environment?: string
  level?: LogLevel | string
  message?: string
}

/**
 * 日志搜索响应结构
 * 包含分页信息和日志列表
 */
export interface BackendSearchResponse {
  data: BackendLogItem[]
  total: number
  page: number
  size: number
}

/**
 * 查询参数接口
 * 支持所有后端筛选和排序参数
 */
export interface LogQueryParams {
  page?: number
  page_size?: number
  size?: number
  level?: string
  method?: string
  status?: number
  path?: string
  trace_id?: string
  keyword?: string
  searchTerm?: string
  environment?: string
  service?: string
  start_time?: string
  end_time?: string
  startTime?: Date
  endTime?: Date
}

/**
 * UI层日志数据结构
 * 经过安全转换和字段标准化处理
 */
export interface UILogRow {
  id: string
  created_at: Date
  level: LogLevel | string
  message: string
  service?: string
  module?: string
  function?: string
  line?: number
  file?: string
  trace_id?: string
  span_id?: string
  request_id?: string
  user_id?: string
  ip_address?: string
  user_agent?: string
  environment?: string
  tags?: Record<string, any> | string | null
  metadata?: Record<string, any> | string | null
  error_code?: string
  error_message?: string
  http_method?: string
  api_endpoint?: string
  status_code?: number
  duration_ms?: number
  updated_at?: Date
  request_headers?: Record<string, string>
  request_body?: any
  response_headers?: Record<string, string>
  response_body?: any
  protocol?: string
  response_size?: number
  query_params?: Record<string, string>
}

/**
 * 日志统计信息
 * 用于展示概览数据
 */
export interface LogStats {
  total_logs: number
  error_count: number
  warn_count: number
  info_count: number
  debug_count: number
  fatal_count: number
  error_rate: number
  avg_response_time?: number
  active_users: number
  time_range: string
}

/**
 * 表格列配置接口
 */
export interface LogTableColumn {
  key: keyof UILogRow | 'actions'
  title: string
  width?: number
  sortable?: boolean
  filterable?: boolean
  visible: boolean
  tooltip?: string
}

/**
 * 筛选条件接口
 */
export interface LogFilters {
  level?: LogLevel | string
  service?: string
  module?: string
  environment?: string
  searchTerm?: string
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d' | 'custom'
  startTime?: Date
  endTime?: Date
  hasError?: boolean
}

/**
 * 排序配置接口
 */
export interface LogSortConfig {
  key: keyof UILogRow
  direction: 'asc' | 'desc'
}

/**
 * 分页配置接口
 */
export interface LogPagination {
  current: number
  pageSize: number
  total: number
  showSizeChanger: boolean
  showQuickJumper: boolean
  showTotal: boolean
}

/**
 * 字段提示信息
 * 用于悬浮显示字段说明
 */
export const fieldTooltips: Record<string, string> = {
  id: '日志唯一标识符',
  created_at: '日志创建时间（后端时区）',
  level: '日志级别 - 表示日志的重要程度',
  message: '日志消息内容',
  service: '服务名称 - 产生日志的微服务',
  module: '业务模块 - 日志所属的功能模块',
  function: '函数名称 - 产生日志的代码函数',
  line: '代码行号 - 日志产生的具体行号',
  file: '文件名 - 日志产生的源文件',
  trace_id: '分布式追踪TraceID - 用于链路追踪',
  span_id: '分布式追踪SpanID - 用于链路追踪',
  request_id: '请求ID - 同一请求链路标识',
  user_id: '关联用户ID - 产生日志的用户',
  ip_address: '来源IP地址 - 客户端IP',
  user_agent: '用户代理 - 客户端浏览器/设备信息',
  environment: '运行环境 - 如development, production等',
  tags: '标签信息 - 用于分类和搜索',
  metadata: '元数据 - 额外的结构化信息',
  error_code: '错误类型或错误码',
  error_message: '错误详情信息',
  http_method: 'HTTP方法 - 如GET, POST等',
  api_endpoint: '接口URL - 请求的API端点',
  status_code: '响应状态码 - HTTP状态码',
  duration_ms: '处理耗时（毫秒）- 请求处理时间',
  updated_at: '更新时间 - 日志最后修改时间'
}
