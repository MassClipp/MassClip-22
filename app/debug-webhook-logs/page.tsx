"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Clock, Database, Filter, Download } from "lucide-react"

interface WebhookLog {
  id: string
  timestamp: string
  level: "info" | "error" | "warn"
  message: string
  requestId?: string
  sessionId?: string
  buyerUid?: string
  bundleId?: string
  error?: string
  processingTimeMs?: number
  [key: string]: any
}

interface LogSummary {
  total: number
  errors: number
  warnings: number
  info: number
  timeRange: string
  oldestLog?: string
  newestLog?: string
}

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [summary, setSummary] = useState<LogSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    level: "all",
    hours: "24",
    limit: "50",
  })
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.level !== "all") params.set("level", filters.level)
      params.set("hours", filters.hours)
      params.set("limit", filters.limit)

      const response = await fetch(`/api/debug/webhook-logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setSummary(data.summary)
      } else {
        console.error("Failed to fetch logs:", data.error)
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [filters])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh, filters])

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "warn":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "info":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "bg-red-50 border-red-200"
      case "warn":
        return "bg-yellow-50 border-yellow-200"
      case "info":
        return "bg-green-50 border-green-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `webhook-logs-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6" />
                Webhook Logs Monitor
              </CardTitle>
              <CardDescription>Real-time monitoring of webhook processing logs and errors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <Button onClick={fetchLogs} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>

                <Button variant={autoRefresh ? "default" : "outline"} onClick={() => setAutoRefresh(!autoRefresh)}>
                  <Clock className="h-4 w-4 mr-2" />
                  Auto Refresh {autoRefresh ? "ON" : "OFF"}
                </Button>

                <Button variant="outline" onClick={exportLogs} disabled={logs.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Logs
                </Button>

                {summary && (
                  <div className="flex gap-2 ml-auto">
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {summary.errors} Errors
                    </Badge>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {summary.warnings} Warnings
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {summary.info} Info
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Log Level</label>
                  <Select
                    value={filters.level}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="error">Errors Only</SelectItem>
                      <SelectItem value="warn">Warnings Only</SelectItem>
                      <SelectItem value="info">Info Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Time Range</label>
                  <Select
                    value={filters.hours}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, hours: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Last Hour</SelectItem>
                      <SelectItem value="6">Last 6 Hours</SelectItem>
                      <SelectItem value="24">Last 24 Hours</SelectItem>
                      <SelectItem value="168">Last Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Limit</label>
                  <Select
                    value={filters.limit}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, limit: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 logs</SelectItem>
                      <SelectItem value="50">50 logs</SelectItem>
                      <SelectItem value="100">100 logs</SelectItem>
                      <SelectItem value="200">200 logs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
                  <div className="text-sm text-gray-600">Errors</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-yellow-600">{summary.warnings}</div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{summary.info}</div>
                  <div className="text-sm text-gray-600">Info</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                  <div className="text-sm text-gray-600">Total Logs</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Logs Display */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Webhook Logs</CardTitle>
              <CardDescription>
                {logs.length > 0
                  ? `Showing ${logs.length} logs from the ${summary?.timeRange}`
                  : "No logs found for the selected criteria"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No webhook logs found. This could mean:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>No webhook events have been processed recently</li>
                      <li>All webhooks are processing successfully (no errors to log)</li>
                      <li>The time range or filters are too restrictive</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <Card key={log.id} className={getLevelColor(log.level)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getLevelIcon(log.level)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{log.message}</span>
                                {log.processingTimeMs && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.processingTimeMs}ms
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>Time: {formatTimestamp(log.timestamp)}</div>
                                {log.requestId && <div>Request ID: {log.requestId}</div>}
                                {log.sessionId && <div>Session ID: {log.sessionId}</div>}
                                {log.buyerUid && <div>Buyer UID: {log.buyerUid}</div>}
                                {log.bundleId && <div>Bundle ID: {log.bundleId}</div>}
                                {log.error && (
                                  <div className="bg-red-100 p-2 rounded text-red-800 text-xs mt-2">
                                    Error: {log.error}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
