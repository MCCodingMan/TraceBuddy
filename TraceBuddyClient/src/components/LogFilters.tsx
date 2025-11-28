import React, { useState, useEffect } from 'react'
import {
  Filter,
  X,
  Calendar,
  Clock,
  Search,
  User,
  Globe,
  Tag,
  Settings,
  ChevronDown,
  RefreshCw,
  Save,
  // Trash2,
  AlertCircle
} from 'lucide-react'
import type { LogFilters } from '../types/log'
// import { logApiService } from '../services/logApi'

interface LogFiltersProps {
  filters: LogFilters
  onFiltersChange: (filters: LogFilters) => void
  className?: string
  collapsible?: boolean
  showPresets?: boolean
  services?: string[]
  modules?: string[]
  environments?: string[]
  onRefresh?: () => void
  loading?: boolean
}

interface FilterPreset {
  name: string
  filters: LogFilters
}

const DEFAULT_PRESETS: FilterPreset[] = [
  {
    name: '最近错误',
    filters: {
      level: 'error',
      timeRange: '24h'
    }
  },
  {
    name: '生产环境警告',
    filters: {
      level: 'warn',
      environment: 'production',
      timeRange: '6h'
    }
  },
  {
    name: '用户相关',
    filters: {
      searchTerm: 'user',
      timeRange: '1h'
    }
  },
  {
    name: '性能问题',
    filters: {
      searchTerm: 'slow',
      timeRange: '1h'
    }
  }
]

const LogFilters: React.FC<LogFiltersProps> = ({
  filters,
  onFiltersChange,
  className = '',
  collapsible = true,
  showPresets = true,
  services = [],
  modules = [],
  environments = ['development', 'testing', 'staging', 'production'],
  onRefresh,
  loading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [localFilters, setLocalFilters] = useState<LogFilters>(filters)
  const [customPresets, setCustomPresets] = useState<FilterPreset[]>([])
  const [isDirty, setIsDirty] = useState(false)

  // 监听外部filters变化
  useEffect(() => {
    setLocalFilters(filters)
    setIsDirty(false)
  }, [filters])

  // 处理筛选器变化
  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    setIsDirty(true)
  }

  // 应用筛选器
  const applyFilters = () => {
    onFiltersChange(localFilters)
    setIsDirty(false)
  }

  // 重置筛选器
  const resetFilters = () => {
    const emptyFilters: LogFilters = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
    setIsDirty(false)
  }

  // 应用预设
  const applyPreset = (preset: FilterPreset) => {
    setLocalFilters(preset.filters)
    onFiltersChange(preset.filters)
    setIsDirty(false)
  }

  // 保存自定义预设
  const saveAsPreset = () => {
    const name = prompt('请输入预设名称:')
    if (name && name.trim()) {
      const newPreset: FilterPreset = {
        name: name.trim(),
        filters: { ...localFilters }
      }
      setCustomPresets([...customPresets, newPreset])
    }
  }

  // 删除自定义预设
  const deletePreset = (index: number) => {
    setCustomPresets(customPresets.filter((_, i) => i !== index))
  }

  // 处理时间范围变化
  const handleTimeRangeChange = (timeRange: LogFilters['timeRange']) => {
    let startTime: Date | undefined
    let endTime: Date | undefined
    
    const now = new Date()
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        // 自定义时间范围将在高级筛选中处理
        break
    }
    
    handleFilterChange('timeRange', timeRange)
    if (startTime) {
      handleFilterChange('startTime', startTime)
      handleFilterChange('endTime', endTime)
    }
  }

  // 渲染预设按钮
  const renderPresets = () => {
    if (!showPresets) return null

    const allPresets = [...DEFAULT_PRESETS, ...customPresets]

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-300">快速筛选</h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={saveAsPreset}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded transition-colors"
            >
              <Save className="h-3 w-3" />
              <span>保存</span>
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {allPresets.map((preset, index) => (
            <div key={preset.name} className="flex items-center">
              <button
                onClick={() => applyPreset(preset)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  JSON.stringify(localFilters) === JSON.stringify(preset.filters)
                    ? 'bg-cyan-600/20 border-cyan-500/30 text-cyan-400'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {preset.name}
              </button>
              {index >= DEFAULT_PRESETS.length && (
                <button
                  onClick={() => deletePreset(index - DEFAULT_PRESETS.length)}
                  className="ml-1 p-1 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 渲染基础筛选
  const renderBasicFilters = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 时间范围 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Clock className="h-4 w-4 inline mr-1" />
            时间范围
          </label>
          <select
            value={localFilters.timeRange || ''}
            onChange={(e) => handleTimeRangeChange(e.target.value as LogFilters['timeRange'])}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <option value="">全部时间</option>
            <option value="1h">最近1小时</option>
            <option value="6h">最近6小时</option>
            <option value="24h">最近24小时</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="custom">自定义时间</option>
          </select>
        </div>

        {/* 日志级别 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            日志级别
          </label>
          <select
            value={localFilters.level || ''}
            onChange={(e) => handleFilterChange('level', e.target.value || undefined)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <option value="">全部级别</option>
            <option value="debug">DEBUG</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
            <option value="fatal">FATAL</option>
          </select>
        </div>

        {/* 服务筛选 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Settings className="h-4 w-4 inline mr-1" />
            服务
          </label>
          <select
            value={localFilters.service || ''}
            onChange={(e) => handleFilterChange('service', e.target.value || undefined)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <option value="">全部服务</option>
            {services.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </div>

        {/* 环境筛选 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Globe className="h-4 w-4 inline mr-1" />
            环境
          </label>
          <select
            value={localFilters.environment || ''}
            onChange={(e) => handleFilterChange('environment', e.target.value || undefined)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <option value="">全部环境</option>
            {environments.map(env => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  // 渲染高级筛选
  const renderAdvancedFilters = () => {
    return (
      <div className="border-t border-slate-700 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 搜索关键词 */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Search className="h-4 w-4 inline mr-1" />
              搜索关键词
            </label>
            <input
              type="text"
              value={localFilters.searchTerm || ''}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value || undefined)}
              placeholder="搜索日志消息、标签、元数据等..."
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* Trace ID 精确搜索 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Trace ID
            </label>
            <input
              type="text"
              value={(localFilters as any).trace_id || ''}
              onChange={(e) => handleFilterChange('trace_id' as any, e.target.value || undefined)}
              placeholder="输入完整 Trace ID"
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* API 路径模糊搜索 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API 路径
            </label>
            <input
              type="text"
              value={(localFilters as any).path || ''}
              onChange={(e) => handleFilterChange('path' as any, e.target.value || undefined)}
              placeholder="例如 /api/logs/search"
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* 用户ID */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              用户ID
            </label>
            <input
              type="text"
              value={''}
              onChange={() => {}}
              placeholder="用户ID筛选功能开发中"
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled
            />
          </div>

          {/* 模块筛选 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Tag className="h-4 w-4 inline mr-1" />
              模块
            </label>
            <select
              value={localFilters.module || ''}
              onChange={(e) => handleFilterChange('module', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">全部模块</option>
              {modules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </div>

          {/* 错误筛选 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              错误日志
            </label>
            <select
              value={localFilters.hasError ? 'true' : ''}
              onChange={(e) => handleFilterChange('hasError', e.target.value === 'true' ? true : undefined)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">全部日志</option>
              <option value="true">仅错误日志</option>
            </select>
          </div>

          {/* 自定义时间范围 */}
          {localFilters.timeRange === 'custom' && (
            <>
              <div className="md:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  开始时间
                </label>
                <input
                  type="datetime-local"
                  step={1}
                  value={localFilters.startTime ? new Date(localFilters.startTime.getTime() - new Date().getTimezoneOffset()*60000).toISOString().slice(0, 19) : ''}
                  onChange={(e) => handleFilterChange('startTime', e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  结束时间
                </label>
                <input
                  type="datetime-local"
                  step={1}
                  value={localFilters.endTime ? new Date(localFilters.endTime.getTime() - new Date().getTimezoneOffset()*60000).toISOString().slice(0, 19) : ''}
                  onChange={(e) => handleFilterChange('endTime', e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // 渲染操作按钮
  const renderActions = () => {
    return (
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={applyFilters}
            disabled={!isDirty}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            应用筛选
          </button>
          
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            重置
          </button>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>
          )}
        </div>
        
        <div className="text-sm text-slate-400">
          {isDirty && <span className="text-yellow-400">● 筛选条件已修改</span>}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 ${className}`}>
      {/* 头部 */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">日志筛选</h3>
            {isDirty && (
              <span className="px-2 py-1 text-xs bg-yellow-500/10 text-yellow-400 rounded-full">
                已修改
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {collapsible && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-slate-400 hover:text-slate-300 transition-colors"
              >
                <ChevronDown className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 内容 */}
      {isExpanded && (
        <div className="p-4">
          {showPresets && renderPresets()}
          {renderBasicFilters()}
          {renderAdvancedFilters()}
          {renderActions()}
        </div>
      )}
    </div>
  )
}

export default LogFilters
