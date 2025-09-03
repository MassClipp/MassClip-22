"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DataDebugPage() {
  const { user } = useAuth()
  const [profileViewsData, setProfileViewsData] = useState<any>(null)
  const [salesData, setSalesData] = useState<any>(null)
  const [earningsData, setEarningsData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(`[v0] ${message}`)
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testProfileViews = async () => {
    addLog("Testing Profile Views API...")
    addLog(`User ID: ${user?.uid}`)
    addLog(`User Email: ${user?.email}`)

    try {
      const response = await fetch("/api/profile-view-stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      addLog(`Profile Views API Response Status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        addLog(`Profile Views API Response: ${JSON.stringify(data, null, 2)}`)
        setProfileViewsData(data)
      } else {
        const errorText = await response.text()
        addLog(`Profile Views API Error: ${errorText}`)
      }
    } catch (error) {
      addLog(`Profile Views API Exception: ${error}`)
    }
  }

  const testSalesData = async () => {
    addLog("Testing Sales Data API...")

    try {
      const response = await fetch("/api/dashboard/earnings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      addLog(`Sales API Response Status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        addLog(`Sales API Response: ${JSON.stringify(data, null, 2)}`)
        setSalesData(data)
      } else {
        const errorText = await response.text()
        addLog(`Sales API Error: ${errorText}`)
      }
    } catch (error) {
      addLog(`Sales API Exception: ${error}`)
    }
  }

  const testEarningsData = async () => {
    addLog("Testing Enhanced Stats API...")

    try {
      const response = await fetch("/api/dashboard/enhanced-stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      addLog(`Enhanced Stats API Response Status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        addLog(`Enhanced Stats API Response: ${JSON.stringify(data, null, 2)}`)
        setEarningsData(data)
      } else {
        const errorText = await response.text()
        addLog(`Enhanced Stats API Error: ${errorText}`)
      }
    } catch (error) {
      addLog(`Enhanced Stats API Exception: ${error}`)
    }
  }

  const runAllTests = async () => {
    setLoading(true)
    setLogs([])

    addLog("Starting comprehensive data debug tests...")
    addLog(`Current user: ${user?.email || "Not logged in"}`)

    await testProfileViews()
    await testSalesData()
    await testEarningsData()

    setLoading(false)
    addLog("All tests completed!")
  }

  const clearLogs = () => {
    setLogs([])
    setProfileViewsData(null)
    setSalesData(null)
    setEarningsData(null)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Data Debug Test Page</h1>
        <div className="space-x-2">
          <Button onClick={runAllTests} disabled={loading}>
            {loading ? "Testing..." : "Run All Tests"}
          </Button>
          <Button variant="outline" onClick={clearLogs}>
            Clear Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Current User Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>UID:</strong> {user?.uid || "Not available"}
              </p>
              <p>
                <strong>Email:</strong> {user?.email || "Not available"}
              </p>
              <p>
                <strong>Display Name:</strong> {user?.displayName || "Not available"}
              </p>
              <p>
                <strong>Auth Status:</strong> {user ? "Authenticated" : "Not authenticated"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Individual Test Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={testProfileViews} className="w-full bg-transparent" variant="outline">
              Test Profile Views API
            </Button>
            <Button onClick={testSalesData} className="w-full bg-transparent" variant="outline">
              Test Sales Data API
            </Button>
            <Button onClick={testEarningsData} className="w-full bg-transparent" variant="outline">
              Test Enhanced Stats API
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* API Response Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Views Data */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Views Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
              {profileViewsData ? JSON.stringify(profileViewsData, null, 2) : "No data yet"}
            </pre>
          </CardContent>
        </Card>

        {/* Sales Data */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
              {salesData ? JSON.stringify(salesData, null, 2) : "No data yet"}
            </pre>
          </CardContent>
        </Card>

        {/* Enhanced Stats Data */}
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Stats Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
              {earningsData ? JSON.stringify(earningsData, null, 2) : "No data yet"}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Debug Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-auto">
            {logs.length === 0 ? (
              <p>No logs yet. Click "Run All Tests" to start debugging.</p>
            ) : (
              logs.map((log, index) => <div key={index}>{log}</div>)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
