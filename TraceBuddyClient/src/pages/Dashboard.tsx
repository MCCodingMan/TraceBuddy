import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'
const LogTable = lazy(() => import('../components/LogTable'))
const LogStats = lazy(() => import('../components/LogStats'))
const LogFilters = lazy(() => import('../components/LogFilters'))
const LogDetailDrawer = lazy(() => import('../components/LogDetailDrawer'))
import { 
  LogOut, 
  User, 
  Activity,
  FileText,
  BarChart3
} from 'lucide-react'
import type { UILogRow, LogFilters as LogFiltersType, LogSortConfig, LogPagination, LogStats as LogStatsType } from '../types/log'
import { logApiService } from '../services/logApi'
import { formatTimestamp } from '../utils/logUtils'

const Dashboard: React.FC = () => {
  const [logs, setLogs] = useState<UILogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<LogStatsType | null>(null)
  const [filters, setFilters] = useState<LogFiltersType>({})
  const [sortConfig, setSortConfig] = useState<LogSortConfig>({
    key: 'created_at',
    direction: 'desc'
  })
  const [pagination, setPagination] = useState<LogPagination>({
    current: 1,
    pageSize: 50,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: true
  })
  const [activeTab, setActiveTab] = useState<'logs' | 'stats'>('logs')
  // const [showFilters, setShowFilters] = useState(false)
  const [services, setServices] = useState<string[]>([])
  const [modules, setModules] = useState<string[]>([])
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [selectedLog, setSelectedLog] = useState<UILogRow | null>(null)
  
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  // 获取日志数据
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      
      const queryParams = {
        page: pagination.current,
        page_size: pagination.pageSize,
        sort_by: sortConfig.key,
        sort_order: sortConfig.direction,
        ...filters
      }

      const response = await logApiService.searchLogs(queryParams)
      
      const sorted = [...response.logs]
      if (sortConfig.key === 'duration_ms') {
        sorted.sort((a, b) => {
          const av = a.duration_ms || 0
          const bv = b.duration_ms || 0
          return sortConfig.direction === 'asc' ? av - bv : bv - av
        })
      }
      setLogs(sorted)
      setStats(response.stats)
      setPagination(prev => ({
        ...prev,
        total: response.total
      }))
      
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast.error('获取日志数据失败')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.current, pagination.pageSize, sortConfig])

  // 获取服务列表
  const fetchServices = useCallback(async () => {
    try {
      const servicesList = await logApiService.getServices()
      setServices(servicesList)
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }, [])

  // 获取模块列表
  const fetchModules = useCallback(async () => {
    try {
      const modulesList = await logApiService.getModules(filters.service)
      setModules(modulesList)
    } catch (error) {
      console.error('Error fetching modules:', error)
    }
  }, [filters.service])

  // 处理分页变化
  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize
    }))
  }

  // 处理排序变化
  const handleSortChange = (config: LogSortConfig) => {
    setSortConfig(config)
  }

  // 处理筛选变化
  const handleFiltersChange = (newFilters: LogFiltersType) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, current: 1 })) // 重置到第一页
  }

  // 处理导出
  const handleExport = (logsToExport: UILogRow[]) => {
    try {
      const csvContent = [
        // CSV头部
        [
          'ID', '时间', '级别', '消息', '服务', '模块', '用户ID', 
          'IP地址', '追踪ID', '耗时(ms)', '环境', '错误码', '错误消息'
        ].join(','),
        // 数据行
        ...logsToExport.map(log => [
          log.id,
          formatTimestamp(log.created_at.toISOString()),
          log.level,
          `"${(log.message || '').replace(/"/g, '""')}"`, // 转义引号
          log.service || '',
          log.module || '',
          log.user_id || '',
          log.ip_address || '',
          log.trace_id || '',
          log.duration_ms || '',
          log.environment || '',
          log.error_code || '',
          log.error_message ? `"${log.error_message.replace(/"/g, '""')}"` : ''
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `logs_${new Date().toISOString().slice(0, 10)}_${Date.now()}.csv`
      link.click()
      window.URL.revokeObjectURL(url)
      
      toast.success(`成功导出 ${logsToExport.length} 条日志`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('导出失败')
    }
  }

  // 处理退出登录
  const handleLogout = () => {
    logout()
    navigate('/login')
    toast.success('已安全退出登录')
  }

  // 设置自动刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs()
      }, 30000) // 30秒刷新一次
      setRefreshInterval(interval)
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [autoRefresh, fetchLogs])

  // 初始加载数据
  useEffect(() => {
    fetchLogs()
    fetchServices()
  }, [fetchLogs, fetchServices])

  // 当服务变化时重新获取模块
  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  // 标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'logs':
        return (
          <div className="space-y-8">
            <Suspense fallback={<div className="h-24 tech-card" />}> 
              <LogFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                services={services}
                modules={modules}
                onRefresh={fetchLogs}
                loading={loading}
                showPresets={true}
                className="tech-card hover-lift fade-in p-6 md:p-8"
              />
            </Suspense>
            
            <Suspense fallback={<div className="h-64 tech-card" />}> 
              <LogTable
                logs={logs}
                loading={loading}
                pagination={pagination}
                onPageChange={handlePageChange}
                onSort={handleSortChange}
                onFilter={handleFiltersChange}
                onExport={handleExport}
                onRefresh={fetchLogs}
                showToolbar={true}
                selectable={true}
                expandable={false}
                responsive={true}
                className="tech-card hover-lift fade-in p-6 md:p-8"
                onRowClick={(log) => setSelectedLog(log)}
              />
            </Suspense>
          </div>
        )
      
      case 'stats':
        return (
          <div className="space-y-8">
            {stats && (
              <Suspense fallback={<div className="h-48 tech-card" />}> 
                <LogStats
                  stats={stats}
                  loading={loading}
                  showTrends={true}
                  compact={false}
                  className="tech-card hover-lift fade-in p-6 md:p-8"
                />
              </Suspense>
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/40 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="w-full px-6 sm:px-8 lg:px-10">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">日志监控中心</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 自动刷新开关 */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-slate-300">自动刷新</label>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoRefresh ? 'bg-cyan-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoRefresh ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center space-x-2 text-slate-300">
                <User className="h-4 w-4" />
                <span className="text-sm">{user?.username}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>退出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={`w-full px-6 sm:px-8 lg:px-10 py-8 ${selectedLog ? 'pr-[90vw] sm:pr-[420px] md:pr-[480px] lg:pr-[540px]' : ''}`}>
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-slate-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('logs')}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'logs'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-500'
                }`}
              >
                <FileText className={`mr-2 h-5 w-5 ${
                  activeTab === 'logs' ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'
                }`} />
                日志监控
              </button>
              
              <button
                onClick={() => setActiveTab('stats')}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'stats'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-500'
                }`}
              >
                <BarChart3 className={`mr-2 h-5 w-5 ${
                  activeTab === 'stats' ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'
                }`} />
                统计分析
              </button>
              
              
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
      <Suspense fallback={<div />}> 
        <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      </Suspense>
    </div>
  )
}

export default Dashboard
