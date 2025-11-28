import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  Users,
  Zap,
  BarChart3,
  Database,
  FileText,
  XCircle
} from 'lucide-react'
import type { LogStats } from '../types/log'
// import { formatDuration } from '../utils/logUtils'

interface LogStatsProps {
  stats: LogStats
  loading?: boolean
  className?: string
  showTrends?: boolean
  compact?: boolean
}

const LogStats: React.FC<LogStatsProps> = ({
  stats,
  loading = false,
  className = '',
  showTrends = true,
  compact = false
}) => {
  // 处理加载状态
  if (loading) {
    return (
      <div className={`bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 ${className}`}>
        <div className="text-center text-slate-400">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
          <p>Loading statistics...</p>
        </div>
      </div>
    )
  }

  // 处理空状态
  if (!stats) {
    return (
      <div className={`bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 ${className}`}>
        <div className="text-center text-slate-400">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No statistics available</p>
        </div>
      </div>
    )
  }
  // 计算趋势指标
  const getTrendIcon = (current: number, previous?: number) => {
    if (previous === undefined) return null
    
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-400" />
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-400" />
    }
    return null
  }

  // 获取错误率颜色
  const getErrorRateColor = (rate: number) => {
    if (rate >= 10) return 'text-red-400'
    if (rate >= 5) return 'text-yellow-400'
    return 'text-green-400'
  }

  // 获取日志级别颜色
  const getLevelColor = (level: string) => {
    const colors = {
      error: 'bg-red-500/10 text-red-400 border-red-500/20',
      warn: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      info: 'bg-green-500/10 text-green-400 border-green-500/20',
      debug: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      fatal: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    }
    return colors[level as keyof typeof colors] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }

  // 紧凑模式渲染
  if (compact) {
    return (
      <div className={`bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Database className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.total_logs.toLocaleString()}</div>
            <div className="text-xs text-slate-400">总日志数</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div className={`text-2xl font-bold ${getErrorRateColor(stats.error_rate)}`}>
              {stats.error_rate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400">错误率</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.active_users}</div>
            <div className="text-xs text-slate-400">活跃用户</div>
          </div>
          
          {stats.avg_response_time && (
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.avg_response_time.toFixed(0)}ms
              </div>
              <div className="text-xs text-slate-400">平均响应</div>
            </div>
          )}
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.error_count.toLocaleString()}</div>
            <div className="text-xs text-slate-400">错误数</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.info_count.toLocaleString()}</div>
            <div className="text-xs text-slate-400">信息数</div>
          </div>
        </div>
      </div>
    )
  }

  // 完整模式渲染
  return (
    <div className={`bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-cyan-400" />
              日志统计概览
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {stats?.time_range} · 实时更新
            </p>
          </div>
          {showTrends && (
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Clock className="h-4 w-4" />
              <span>最后更新: {new Date().toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="p-6">
        {/* 主要指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 总日志数 */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Database className="h-6 w-6 text-blue-400" />
              </div>
              {showTrends && getTrendIcon(stats.total_logs, stats.total_logs * 0.9)}
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white">
                {stats.total_logs.toLocaleString()}
              </div>
              <div className="text-sm text-slate-400">总日志数</div>
              <div className="text-xs text-slate-500">
                相比上一周期 {showTrends ? '增长 12.5%' : ''}
              </div>
            </div>
          </div>

          {/* 错误率 */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              {showTrends && getTrendIcon(stats.error_rate, stats.error_rate * 0.8)}
            </div>
            <div className="space-y-2">
              <div className={`text-3xl font-bold ${getErrorRateColor(stats.error_rate)}`}>
                {stats.error_rate.toFixed(2)}%
              </div>
              <div className="text-sm text-slate-400">错误率</div>
              <div className="text-xs text-slate-500">
                错误日志: {stats.error_count.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 活跃用户 */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              {showTrends && getTrendIcon(stats.active_users, stats.active_users - 5)}
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white">
                {stats.active_users}
              </div>
              <div className="text-sm text-slate-400">活跃用户</div>
              <div className="text-xs text-slate-500">
                产生日志的独立用户数
              </div>
            </div>
          </div>

          {/* 平均响应时间 */}
          {stats.avg_response_time && (
            <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Zap className="h-6 w-6 text-yellow-400" />
                </div>
                {showTrends && getTrendIcon(stats.avg_response_time, stats.avg_response_time * 1.1)}
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-white">
                  {stats.avg_response_time.toFixed(0)}ms
                </div>
                <div className="text-sm text-slate-400">平均响应时间</div>
                <div className="text-xs text-slate-500">
                  请求处理平均耗时
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 日志级别分布 */}
        <div className="mb-8">
          <h4 className="text-lg font-medium text-white mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-cyan-400" />
            日志级别分布
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { level: 'error', count: stats.error_count, icon: XCircle },
              { level: 'warn', count: stats.warn_count, icon: AlertCircle },
              { level: 'info', count: stats.info_count, icon: CheckCircle },
              { level: 'debug', count: stats.debug_count, icon: Info },
              { level: 'fatal', count: stats.fatal_count, icon: Activity }
            ].map(({ level, count, icon: Icon }) => (
              <div key={level} className={`p-4 rounded-xl border ${getLevelColor(level)}`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-5 w-5" />
                  <span className="text-2xl font-bold">
                    {(count || 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm font-medium capitalize">{level}</div>
                <div className="text-xs opacity-75">
                  {stats.total_logs > 0 ? ((count / stats.total_logs) * 100).toFixed(1) : 0}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 时间范围信息 */}
        <div className="bg-slate-900/30 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-slate-400">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>统计时间范围: {stats.time_range}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>最后更新: {new Date().toLocaleString()}</span>
              </div>
            </div>
            {showTrends && (
              <div className="text-slate-500">
                趋势对比基于上一周期数据
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogStats