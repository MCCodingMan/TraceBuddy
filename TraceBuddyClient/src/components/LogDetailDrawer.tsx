import React from 'react'
import { X, Info, Code, Search, AlertTriangle, Tag, Copy } from 'lucide-react'
import type { UILogRow } from '../types/log'
import { formatTimestamp, simplifyFileName, maskIP } from '../utils/logUtils'
import { maskSensitiveHeaders } from '../utils/logUtils'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'

interface LogDetailDrawerProps {
  log: UILogRow | null
  onClose: () => void
}

const LogDetailDrawer: React.FC<LogDetailDrawerProps> = ({ log, onClose }) => {
  const open = !!log
  return (
    <div
      className={`fixed top-0 right-0 h-full z-50 transform transition-transform duration-300 ease-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      } w-[90vw] sm:w-[420px] md:w-[480px] lg:w-[540px]`}
      aria-hidden={!open}
    >
      <div className="h-full tech-card border-l backdrop-blur-xl bg-slate-900/70 flex flex-col">
        <div className="flex items-start justify-between p-4 border-b border-slate-700/50">
          <div className="space-y-1">
            <div className="text-sm text-slate-400">日志详情</div>
            {log && (
              <div className="text-base text-white">
                <span className="font-mono text-cyan-300 mr-2">{log.http_method || '—'}</span>
                <span className="break-all">{log.api_endpoint || '—'}</span>
              </div>
            )}
            {log && (
              <div className="text-xs text-slate-400">
                <span className="mr-2">{formatTimestamp(log.created_at.toISOString())}</span>
                <span className="mr-2">{log.service || '—'}</span>
                <span className="font-mono">{log.status_code ?? '—'}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {log && (
              <button
                onClick={async () => { if (log?.id) await navigator.clipboard.writeText(log.id) }}
                className="tech-button tech-button--ghost px-2 py-1"
                title="复制日志ID"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="tech-button tech-button--secondary px-2 py-1"
              title="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {log && (
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-300 flex items-center">
                  <Info className="h-4 w-4 mr-1" />基本信息
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-400">ID:</span><span className="text-slate-300 font-mono">{log.id}</span></div>
                  {log.file && (
                    <div className="flex justify-between"><span className="text-slate-400">文件:</span><span className="text-slate-300 font-mono" title={log.file}>{simplifyFileName(log.file)}:{log.line || '?'}</span></div>
                  )}
                  {log.function && (
                    <div className="flex justify-between"><span className="text-slate-400">函数:</span><span className="text-slate-300 font-mono">{log.function}</span></div>
                  )}
                  {log.ip_address && (
                    <div className="flex justify-between"><span className="text-slate-400">IP:</span><span className="text-slate-300 font-mono">{maskIP(log.ip_address)}</span></div>
                  )}
                  {log.environment && (
                    <div className="flex justify-between"><span className="text-slate-400">环境:</span><span className="text-slate-300">{log.environment}</span></div>
                  )}
                </div>
              </div>

              {(log.trace_id || log.span_id || log.request_id) && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    <Search className="h-4 w-4 mr-1" />追踪信息
                  </div>
                  <div className="text-xs space-y-1">
                    {log.trace_id && (<div className="flex justify-between"><span className="text-slate-400">TraceID:</span><span className="text-slate-300 font-mono">{log.trace_id}</span></div>)}
                    {log.span_id && (<div className="flex justify-between"><span className="text-slate-400">SpanID:</span><span className="text-slate-300 font-mono">{log.span_id}</span></div>)}
                    {log.request_id && (<div className="flex justify-between"><span className="text-slate-400">RequestID:</span><span className="text-slate-300 font-mono">{log.request_id}</span></div>)}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-300 flex items-center">
                  <Code className="h-4 w-4 mr-1" />请求
                </div>
                <div className="text-xs space-y-2">
                  {log.request_headers && (
                    <div>
                      <div className="text-slate-400 mb-1">请求头</div>
                      <pre className="text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto">{JSON.stringify(maskSensitiveHeaders(log.request_headers), null, 2)}</pre>
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

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-300 flex items-center">
                  <Code className="h-4 w-4 mr-1" />响应
                </div>
                <div className="text-xs space-y-2">
                  {log.response_headers && (
                    <div>
                      <div className="text-slate-400 mb-1">响应头</div>
                      <pre className="text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto">{JSON.stringify(maskSensitiveHeaders(log.response_headers), null, 2)}</pre>
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

              {(log.error_code || log.error_message) && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />错误信息
                  </div>
                  <div className="space-y-1 text-xs">
                    {log.error_code && (<div className="flex justify-between"><span className="text-slate-400">错误码:</span><span className="text-red-400 font-mono">{log.error_code}</span></div>)}
                    {log.error_message && (
                      <div>
                        <span className="text-slate-400">错误详情:</span>
                        <div className="text-red-300 mt-1 p-2 bg-red-900/20 rounded text-xs">{log.error_message}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {log.tags && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    <Tag className="h-4 w-4 mr-1" />标签
                  </div>
                  <div className="text-xs">
                    {typeof log.tags === 'string' ? (
                      <div className="text-slate-300">{log.tags}</div>
                    ) : (
                      <pre className="text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto">{JSON.stringify(log.tags, null, 2)}</pre>
                    )}
                  </div>
                </div>
              )}

              {log.metadata && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    <Code className="h-4 w-4 mr-1" />元数据
                  </div>
                  <div className="text-xs">
                    {typeof log.metadata === 'string' ? (
                      <div className="text-slate-300">{log.metadata}</div>
                    ) : (
                      <pre className="text-slate-300 bg-slate-900/50 p-3 rounded overflow-x-auto max-h-40">{JSON.stringify(log.metadata, null, 2)}</pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LogDetailDrawer
