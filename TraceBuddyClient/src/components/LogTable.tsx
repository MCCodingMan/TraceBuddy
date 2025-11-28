import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SortAsc,
  SortDesc,
  Info,
  Copy,
  Tag,
  Code,
  User,
  Globe,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react'
import type {
  UILogRow,
  LogLevel,
  LogTableColumn,
  LogFilters,
  LogSortConfig,
  LogPagination
} from '../types/log'
import { fieldTooltips } from '../types/log'
import {
  getLogLevelColor,
  formatTimestamp,
  formatDuration,
  truncateText,
  simplifyFileName,
  maskIP
} from '../utils/logUtils'
import { maskSensitiveHeaders } from '../utils/logUtils'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'

interface LogTableProps {
  logs: UILogRow[]
  loading?: boolean
  pagination?: LogPagination
  onPageChange?: (page: number, pageSize: number) => void
  onSort?: (config: LogSortConfig) => void
  onFilter?: (filters: LogFilters) => void
  onExport?: (logs: UILogRow[]) => void
  onRefresh?: () => void
  onRowClick?: (log: UILogRow) => void
  className?: string
  showToolbar?: boolean
  selectable?: boolean
  expandable?: boolean
  responsive?: boolean
}

interface ExpandedRow {
  [key: string]: boolean
}

interface SelectedRows {
  [key: string]: boolean
}

const LogTable: React.FC<LogTableProps> = ({
  logs,
  loading = false,
  pagination,
  onPageChange,
  onSort,
  onExport,
  onRefresh,
  onRowClick,
  className = '',
  showToolbar = true,
  selectable = true,
  expandable = true,
  // responsive = true
}) => {
  const [expandedRows, setExpandedRows] = useState<ExpandedRow>({})
  const [selectedRows, setSelectedRows] = useState<SelectedRows>({})
  const [sortConfig, setSortConfig] = useState<LogSortConfig>({
    key: 'created_at',
    direction: 'desc'
  })
  const [columnVisibility] = useState<Record<string, boolean>>({})
  const listRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  const rowHeight = 48
  const virtualizationEnabled = useMemo(() => Object.values(expandedRows).every(v => !v), [expandedRows])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const handleScroll = () => setScrollTop(el.scrollTop)
    const resize = () => setContainerHeight(el.clientHeight || 600)
    el.addEventListener('scroll', handleScroll)
    resize()
    window.addEventListener('resize', resize)
    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // 默认列配置
  const defaultColumns: LogTableColumn[] = [
    {
      key: 'created_at',
      title: '时间',
      width: 180,
      sortable: true,
      filterable: true,
      visible: true,
      tooltip: fieldTooltips.created_at
    },
    {
      key: 'trace_id',
      title: 'Trace ID',
      width: 280,
      sortable: true,
      filterable: true,
      visible: true,
      tooltip: fieldTooltips.trace_id
    },
    {
      key: 'api_endpoint',
      title: 'API',
      width: 360,
      sortable: false,
      filterable: true,
      visible: true,
      tooltip: fieldTooltips.api_endpoint
    },
    {
      key: 'duration_ms',
      title: '耗时(ms)',
      width: 120,
      sortable: true,
      filterable: true,
      visible: true,
      tooltip: fieldTooltips.duration_ms
    },
    {
      key: 'status_code',
      title: '状态码',
      width: 100,
      sortable: true,
      filterable: true,
      visible: true,
      tooltip: fieldTooltips.status_code
    },
    {
      key: 'ip_address',
      title: '来源IP',
      width: 160,
      sortable: false,
      filterable: true,
      visible: true,
      tooltip: fieldTooltips.ip_address
    },
    {
      key: 'user_agent',
      title: 'UA',
      width: 240,
      sortable: false,
      filterable: false,
      visible: true,
      tooltip: fieldTooltips.user_agent
    },
    {
      key: 'level',
      title: '级别',
      width: 100,
      sortable: true,
      filterable: true,
      visible: false,
      tooltip: fieldTooltips.level
    }
  ]

  // 获取可见列
  const visibleColumns = useMemo(() => {
    return defaultColumns.filter(col => {
      if (columnVisibility[col.key] !== undefined) {
        return columnVisibility[col.key]
      }
      return col.visible
    })
  }, [columnVisibility])

  // 排序处理
  const handleSort = useCallback((key: keyof UILogRow) => {
    const newConfig: LogSortConfig = {
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    }
    setSortConfig(newConfig)
    onSort?.(newConfig)
  }, [sortConfig, onSort])

  // 筛选处理
  // const handleFilterChange = useCallback((newFilters: LogFilters) => {
  //   setFilters(newFilters)
  // }, []) onFilter?.(newFilters)
  // }, [onFilter])

  // 切换行展开
  const toggleRowExpansion = useCallback((logId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }))
  }, [])

  // 处理键盘事件
  const handleRowKeyDown = useCallback((e: React.KeyboardEvent, logId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleRowExpansion(logId)
    }
  }, [toggleRowExpansion])

  // 选择行处理
  const handleRowSelection = useCallback((logId: string) => {
    setSelectedRows(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }))
  }, [])

  // 全选处理
  const handleSelectAll = useCallback(() => {
    const allSelected = logs.length > 0 && logs.every(log => selectedRows[log.id])
    const newSelection: SelectedRows = {}
    
    if (!allSelected) {
      logs.forEach(log => {
        newSelection[log.id] = true
      })
    }
    
    setSelectedRows(newSelection)
  }, [logs, selectedRows])

  // 复制日志ID
  const copyLogId = useCallback(async (logId: string) => {
    try {
      await navigator.clipboard.writeText(logId)
      // 这里可以添加toast提示
    } catch (error) {
      console.error('Failed to copy log ID:', error)
    }
  }, [])

  // 渲染日志级别标签
  const renderLogLevel = (level: LogLevel | string) => {
    const colors = getLogLevelColor(level)
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
        title={`日志级别: ${level}`}
      >
        <span className="mr-1">{colors.icon}</span>
        {level.toUpperCase()}
      </span>
    )
  }

  // 渲染状态码
  // const renderStatusCode = (statusCode?: number) => {
  //   if (!statusCode) return <span className="text-gray-400">—</span>
  //   
  //   const colors = getStatusCodeColor(statusCode)
  //   return (
  //     <span
  //       className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
  //       title={`HTTP状态码: ${statusCode}`}
  //     >
  //       {statusCode}
  //     </span>
  //   )
  // }

  // 渲染时间戳
  const renderTimestamp = (date: Date) => {
    const isoString = date instanceof Date && !isNaN(date.getTime()) 
      ? date.toISOString() 
      : String(date)
    
    return (
      <span className="text-sm text-gray-300" title={isoString}>
        {formatTimestamp(date.toISOString())}
      </span>
    )
  }

  // 渲染用户信息
  const renderUserInfo = (userId?: string) => {
    if (!userId) return <span className="text-gray-400">—</span>
    
    return (
      <div className="flex items-center space-x-1" title={`用户ID: ${userId}`}>
        <User className="h-3 w-3 text-gray-400" />
        <span className="text-sm text-gray-300 truncate">
          {truncateText(userId, 8)}
        </span>
      </div>
    )
  }

  // 渲染IP地址
  const renderIPAddress = (ip?: string) => {
    if (!ip) return <span className="text-gray-400">—</span>
    
    return (
      <div className="flex items-center space-x-1" title={`IP地址: ${ip}`}>
        <Globe className="h-3 w-3 text-gray-400" />
        <span className="text-sm text-gray-300 font-mono">
          {maskIP(ip)}
        </span>
      </div>
    )
  }

  // 渲染追踪信息
  const renderTraceInfo = (traceId?: string, spanId?: string) => {
    if (!traceId) return <span className="text-gray-400">—</span>
    
    return (
      <div className="flex items-center space-x-1" title={`追踪ID: ${traceId}${spanId ? `, SpanID: ${spanId}` : ''}`}>
        <Search className="h-3 w-3 text-gray-400" />
        <span className="text-sm text-gray-300 font-mono">
          {traceId}
        </span>
      </div>
    )
  }

  // 渲染耗时
  const renderDuration = (duration?: number) => {
    if (!duration || duration <= 0) return <span className="text-gray-400">—</span>
    
    const formatted = formatDuration(duration)
    const color = duration > 1000 ? 'text-red-400' : duration > 500 ? 'text-yellow-400' : 'text-green-400'
    
    return (
      <span className={`text-sm font-mono ${color}`} title={`处理耗时: ${duration}ms`}>
        {formatted}
      </span>
    )
  }

  // 渲染消息内容
  const renderMessage = (message: string) => {
    const truncated = truncateText(message, 80)
    const isTruncated = truncated !== message
    
    return (
      <div className="text-sm text-gray-200" title={message}>
        {truncated}
        {isTruncated && <span className="text-gray-400 ml-1">...</span>}
      </div>
    )
  }

  // 渲染服务/模块信息
  const renderServiceModule = (service?: string, module?: string) => {
    const serviceText = service || '—'
    const moduleText = module || '—'
    
    return (
      <div className="text-sm text-gray-300">
        <div title={`服务: ${serviceText}`}>{serviceText}</div>
        {module && (
          <div className="text-xs text-gray-400" title={`模块: ${moduleText}`}>
            {moduleText}
          </div>
        )}
      </div>
    )
  }

  // 渲染展开详情
  const renderExpandedDetails = (log: UILogRow) => {
    return (
      <div className="bg-slate-800/50 border-t border-slate-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 基本信息 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300 flex items-center">
              <Info className="h-4 w-4 mr-1" />
              基本信息
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">ID:</span>
                <span className="text-slate-300 font-mono">{log.id}</span>
              </div>
              {log.file && (
                <div className="flex justify-between">
                  <span className="text-slate-400">文件:</span>
                  <span className="text-slate-300 font-mono" title={log.file}>
                    {simplifyFileName(log.file)}:{log.line || '?'}
                  </span>
                </div>
              )}
              {log.function && (
                <div className="flex justify-between">
                  <span className="text-slate-400">函数:</span>
                  <span className="text-slate-300 font-mono">{log.function}</span>
                </div>
              )}
              {log.environment && (
                <div className="flex justify-between">
                  <span className="text-slate-400">环境:</span>
                  <span className="text-slate-300">{log.environment}</span>
                </div>
              )}
            </div>
          </div>

          {/* 追踪信息 */}
          {(log.trace_id || log.span_id || log.request_id) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300 flex items-center">
                <Search className="h-4 w-4 mr-1" />
                追踪信息
              </h4>
              <div className="space-y-1 text-xs">
                {log.trace_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">TraceID:</span>
                    <span className="text-slate-300 font-mono">{log.trace_id}</span>
                  </div>
                )}
                {log.span_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">SpanID:</span>
                    <span className="text-slate-300 font-mono">{log.span_id}</span>
                  </div>
                )}
                {log.request_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">RequestID:</span>
                    <span className="text-slate-300 font-mono">{log.request_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 请求信息 */}
          <div className="space-y-2 md:col-span-2">
            <h4 className="text-sm font-medium text-slate-300 flex items-center">
              <Code className="h-4 w-4 mr-1" />
              请求
            </h4>
            <div className="text-xs space-y-2">
              {log.request_headers && (
                <div>
                  <div className="text-slate-400 mb-1">请求头</div>
                  <pre className="text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(maskSensitiveHeaders(log.request_headers), null, 2)}
                  </pre>
                </div>
              )}
              {log.request_body !== undefined && log.request_body !== null && (
                <div>
                  <div className="text-slate-400 mb-1">请求体</div>
                  <div className="max-h-60 overflow-auto rounded">
                    <SyntaxHighlighter language="json" style={atomOneDark} customStyle={{ background: 'transparent' }}>
                      {typeof log.request_body === 'string' ? log.request_body : JSON.stringify(log.request_body, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 响应信息 */}
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <h4 className="text-sm font-medium text-slate-300 flex items-center">
              <Code className="h-4 w-4 mr-1" />
              响应
            </h4>
            <div className="text-xs space-y-2">
              {log.response_headers && (
                <div>
                  <div className="text-slate-400 mb-1">响应头</div>
                  <pre className="text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(maskSensitiveHeaders(log.response_headers), null, 2)}
                  </pre>
                </div>
              )}
              {log.response_body !== undefined && log.response_body !== null && (
                <div>
                  <div className="text-slate-400 mb-1">响应体</div>
                  <div className="max-h-60 overflow-auto rounded">
                    <SyntaxHighlighter language="json" style={atomOneDark} customStyle={{ background: 'transparent' }}>
                      {typeof log.response_body === 'string' ? log.response_body : JSON.stringify(log.response_body, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 错误信息 */}
          {(log.error_code || log.error_message) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                错误信息
              </h4>
              <div className="space-y-1 text-xs">
                {log.error_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">错误码:</span>
                    <span className="text-red-400 font-mono">{log.error_code}</span>
                  </div>
                )}
                {log.error_message && (
                  <div>
                    <span className="text-slate-400">错误详情:</span>
                    <div className="text-red-300 mt-1 p-2 bg-red-900/20 rounded text-xs">
                      {log.error_message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 标签信息 */}
          {log.tags && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300 flex items-center">
                <Tag className="h-4 w-4 mr-1" />
                标签信息
              </h4>
              <div className="text-xs">
                {typeof log.tags === 'string' ? (
                  <div className="text-slate-300">{log.tags}</div>
                ) : (
                  <pre className="text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(log.tags, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* 元数据 */}
          {log.metadata && (
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <h4 className="text-sm font-medium text-slate-300 flex items-center">
                <Code className="h-4 w-4 mr-1" />
                元数据
              </h4>
              <div className="text-xs">
                {typeof log.metadata === 'string' ? (
                  <div className="text-slate-300">{log.metadata}</div>
                ) : (
                  <pre className="text-slate-300 bg-slate-900/50 p-3 rounded overflow-x-auto max-h-40">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-700">
          <button
            onClick={() => copyLogId(log.id)}
            className="flex items-center space-x-1 px-3 py-1 text-xs text-slate-400 hover:text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded transition-colors"
          >
            <Copy className="h-3 w-3" />
            <span>复制ID</span>
          </button>
        </div>
      </div>
    )
  }

  // 渲染表头
  const renderTableHeader = () => {
    return (
      <thead className="bg-slate-800/60">
        <tr>
          {selectable && (
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                onChange={handleSelectAll}
                checked={logs.length > 0 && logs.every(log => selectedRows[log.id])}
              />
            </th>
          )}
          {expandable && <th className="px-2 py-3"></th>}
          {visibleColumns.map((column) => (
            <th
              key={String(column.key)}
              className={`px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider ${
                column.sortable ? 'cursor-pointer select-none hover:text-slate-200' : ''
              }`}
              style={{ width: column.width }}
              onClick={() => column.sortable && handleSort(column.key as keyof UILogRow)}
              title={column.tooltip}
            >
              <div className="flex items-center space-x-1">
                <span>{column.title}</span>
                {column.sortable && (
                  <span className="text-slate-500">
                    {sortConfig.key === column.key ? (
                      sortConfig.direction === 'asc' ? (
                        <SortAsc className="h-3 w-3" />
                      ) : (
                        <SortDesc className="h-3 w-3" />
                      )
                    ) : (
                      <SortAsc className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                )}
              </div>
            </th>
          ))}
          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
            操作
          </th>
        </tr>
      </thead>
    )
  }

  // 渲染表格行
  const renderTableRow = (log: UILogRow) => {
    const isExpanded = expandedRows[log.id]
    const isSelected = selectedRows[log.id]

    const isError = (log.status_code || 0) >= 400
    const isSlow = (log.duration_ms || 0) > 500
    return (
      <React.Fragment key={log.id}>
        <tr 
          className={`transition-colors ${
            isSelected ? 'bg-slate-700/40' : ''
          } ${isError ? 'bg-red-900/20' : ''} ${!isError && isSlow ? 'bg-yellow-900/20' : 'hover:bg-slate-700/30'} cursor-pointer`}
          tabIndex={0}
          onKeyDown={(e) => handleRowKeyDown(e, log.id)}
          onClick={() => onRowClick ? onRowClick(log) : toggleRowExpansion(log.id)}
        >
          {selectable && (
            <td className="px-4 py-3">
              <input
                type="checkbox"
                className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                checked={isSelected}
                onChange={() => handleRowSelection(log.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </td>
          )}
          {expandable && (
            <td className="px-2 py-3">
              <button
                onClick={(e) => { e.stopPropagation(); toggleRowExpansion(log.id) }}
                className="text-slate-400 hover:text-slate-300 transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </td>
          )}
          {visibleColumns.map((column) => (
            <td key={String(column.key)} className="px-4 py-3">
              {renderCellContent(log, column.key as keyof UILogRow)}
            </td>
          ))}
          <td className="px-4 py-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => { e.stopPropagation(); copyLogId(log.id) }}
                className="text-slate-400 hover:text-slate-300 transition-colors"
                title="复制日志ID"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={visibleColumns.length + (selectable ? 2 : 1) + (expandable ? 1 : 0)} className="p-0">
              {renderExpandedDetails(log)}
            </td>
          </tr>
        )}
      </React.Fragment>
    )
  }

  // 渲染单元格内容
  const renderCellContent = (log: UILogRow, key: keyof UILogRow) => {
    switch (key) {
      case 'created_at':
        return renderTimestamp(log.created_at)
      case 'level':
        return renderLogLevel(log.level)
      case 'message':
        return renderMessage(log.message)
      case 'service':
      case 'module':
        return renderServiceModule(log.service, log.module)
      case 'user_id':
        return renderUserInfo(log.user_id)
      case 'ip_address':
        return renderIPAddress(log.ip_address)
      case 'trace_id':
        return renderTraceInfo(log.trace_id, log.span_id)
      case 'api_endpoint':
        return renderApi(log.http_method, log.api_endpoint)
      case 'duration_ms':
        return renderDuration(log.duration_ms)
      case 'status_code':
        return <span className={`text-sm font-mono ${log.status_code && log.status_code >= 400 ? 'text-red-400' : 'text-slate-300'}`}>{log.status_code ?? '—'}</span>
      case 'user_agent':
        return renderUserAgent(log.user_agent)
      case 'environment':
        return <span className="text-sm text-gray-300">{log.environment || '—'}</span>
      default:
        const value = log[key]
        if (value === null || value === undefined) {
          return <span className="text-gray-400">—</span>
        }
        return <span className="text-sm text-gray-300">{String(value)}</span>
    }
  }

  // 渲染工具栏
  const renderToolbar = () => {
    if (!showToolbar) return null

    const selectedCount = Object.keys(selectedRows).filter(id => selectedRows[id]).length

    return (
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-t-xl p-4 border-b border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-white">
              日志列表 ({pagination?.total || logs.length})
            </h3>
            {selectedCount > 0 && (
              <span className="text-sm text-cyan-400">
                已选择 {selectedCount} 条
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-cyan-600/20 border-cyan-500/30 text-cyan-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:text-slate-200'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm">筛选</span>
            </button> */}

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-slate-200 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">刷新</span>
              </button>
            )}

            {onExport && (
              <button
                onClick={() => {
                  const logsToExport = selectedCount > 0 
                    ? logs.filter(log => selectedRows[log.id])
                    : logs
                  onExport(logsToExport)
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-400 hover:text-green-300 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm">导出</span>
              </button>
            )}

            <button
              onClick={() => {/* TODO: 列配置弹窗 */}}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-slate-200 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm">配置</span>
            </button>
          </div>
        </div>

        {/* 筛选面板 */}
        {/* {showFilters && (
          <div className="mt-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            <div className="text-sm text-slate-400">筛选功能开发中...</div>
          </div>
        )} */}
      </div>
    )
  }

  // 渲染分页
  const renderPagination = () => {
    if (!pagination || !onPageChange) return null

    const { current, pageSize, total } = pagination
    const totalPages = Math.ceil(total / pageSize)
    const hasPrev = current > 1
    const hasNext = current < totalPages

    return (
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-b-xl p-4 border-t border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="text-sm text-slate-400">
            第 {(current - 1) * pageSize + 1}-{Math.min(current * pageSize, total)} 条，共 {total} 条
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(1, pageSize)}
              disabled={!hasPrev}
              className="flex items-center px-3 py-2 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => onPageChange(current - 1, pageSize)}
              disabled={!hasPrev}
              className="flex items-center px-3 py-2 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-4 py-2 text-sm text-slate-300">
              {current} / {totalPages}
            </span>

            <button
              onClick={() => onPageChange(current + 1, pageSize)}
              disabled={!hasNext}
              className="flex items-center px-3 py-2 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => onPageChange(totalPages, pageSize)}
              disabled={!hasNext}
              className="flex items-center px-3 py-2 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 渲染加载状态
  if (loading) {
    return (
      <div className={`bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 ${className}`}>
        {showToolbar && renderToolbar()}
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-400">加载日志数据中...</p>
        </div>
      </div>
    )
  }

  // 渲染空状态
  if (logs.length === 0) {
    return (
      <div className={`bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 ${className}`}>
        {showToolbar && renderToolbar()}
        <div className="p-8 text-center">
          <Search className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">暂无日志数据</h3>
          <p className="text-slate-500">尝试调整筛选条件或刷新数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {showToolbar && renderToolbar()}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700">
          {renderTableHeader()}
        </table>
        <div ref={listRef} className="max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <tbody className="bg-slate-800/20 divide-y divide-slate-700">
              {(() => {
                if (!virtualizationEnabled) {
                  return logs.map(renderTableRow)
                }
                const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 10)
                const visibleCount = Math.ceil(containerHeight / rowHeight) + 20
                const end = Math.min(logs.length, start + visibleCount)
                const topSpacer = start * rowHeight
                const bottomSpacer = (logs.length - end) * rowHeight
                const colSpan = visibleColumns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0) + 1
                return (
                  <>
                    {topSpacer > 0 && (
                      <tr>
                        <td colSpan={colSpan} style={{ height: topSpacer }}></td>
                      </tr>
                    )}
                    {logs.slice(start, end).map(renderTableRow)}
                    {bottomSpacer > 0 && (
                      <tr>
                        <td colSpan={colSpan} style={{ height: bottomSpacer }}></td>
                      </tr>
                    )}
                  </>
                )
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && renderPagination()}
    </div>
  )
}

export default LogTable
  const renderApi = (method?: string, url?: string) => {
    const m = method || '—'
    const u = url || '—'
    return (
      <div className="text-sm text-gray-200" title={`${m} ${u}`}>
        <span className="font-mono text-cyan-300 mr-2">{m}</span>
        <span className="text-gray-300">{u}</span>
      </div>
    )
  }

  const renderUserAgent = (ua?: string) => {
    if (!ua) return <span className="text-gray-400">—</span>
    return (
      <div className="text-xs text-gray-300" title={ua}>{truncateText(ua, 40)}</div>
    )
  }
