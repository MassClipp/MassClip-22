"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Wifi, WifiOff, RefreshCw } from "lucide-react"

// Mock components to simulate dashboard loading states
const MockSalesMetrics = ({
  isLoading,
  hasError,
  onRetry,
}: { isLoading: boolean; hasError: boolean; onRetry: () => void }) => {
  if (hasError) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load sales data</span>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">$1,234.56</div>
        <p className="text-sm text-muted-foreground">Total earnings this month</p>
      </CardContent>
    </Card>
  )
}

const MockProfileStats = ({
  isLoading,
  hasError,
  onRetry,
}: { isLoading: boolean; hasError: boolean; onRetry: () => void }) => {
  if (hasError) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load profile stats</span>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Views</p>
            <p className="text-xl font-semibold">1,234</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Downloads</p>
            <p className="text-xl font-semibold">567</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TestDashboardLoading() {
  const [salesLoading, setSalesLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [salesError, setSalesError] = useState(false)
  const [profileError, setProfileError] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [progressiveLoadingStep, setProgressiveLoadingStep] = useState(0)

  // Network status detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const simulateLoading = (component: "sales" | "profile") => {
    if (component === "sales") {
      setSalesLoading(true)
      setSalesError(false)
      setTimeout(() => {
        setSalesLoading(false)
      }, 2000)
    } else {
      setProfileLoading(true)
      setProfileError(false)
      setTimeout(() => {
        setProfileLoading(false)
      }, 2000)
    }
  }

  const simulateError = (component: "sales" | "profile") => {
    if (component === "sales") {
      setSalesLoading(false)
      setSalesError(true)
    } else {
      setProfileLoading(false)
      setProfileError(true)
    }
  }

  const simulateProgressiveLoading = () => {
    setProgressiveLoadingStep(0)
    const steps = [1, 2, 3, 4]
    steps.forEach((step, index) => {
      setTimeout(
        () => {
          setProgressiveLoadingStep(step)
        },
        (index + 1) * 1000,
      )
    })
  }

  const retryComponent = (component: "sales" | "profile") => {
    if (component === "sales") {
      setSalesError(false)
      simulateLoading("sales")
    } else {
      setProfileError(false)
      simulateLoading("profile")
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Loading Test</h1>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={() => simulateLoading("sales")} variant="outline">
              Test Sales Loading
            </Button>
            <Button onClick={() => simulateLoading("profile")} variant="outline">
              Test Profile Loading
            </Button>
            <Button onClick={() => simulateError("sales")} variant="destructive">
              Simulate Sales Error
            </Button>
            <Button onClick={() => simulateError("profile")} variant="destructive">
              Simulate Profile Error
            </Button>
          </div>
          <div className="mt-4">
            <Button onClick={simulateProgressiveLoading} className="w-full">
              Test Progressive Loading
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progressive Loading Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Progressive Loading Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${progressiveLoadingStep >= 1 ? "bg-green-500" : "bg-gray-300"}`} />
              <span className={progressiveLoadingStep >= 1 ? "text-green-600" : "text-gray-500"}>Basic UI Loaded</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${progressiveLoadingStep >= 2 ? "bg-green-500" : "bg-gray-300"}`} />
              <span className={progressiveLoadingStep >= 2 ? "text-green-600" : "text-gray-500"}>User Data Loaded</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${progressiveLoadingStep >= 3 ? "bg-green-500" : "bg-gray-300"}`} />
              <span className={progressiveLoadingStep >= 3 ? "text-green-600" : "text-gray-500"}>
                Analytics Data Loaded
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${progressiveLoadingStep >= 4 ? "bg-green-500" : "bg-gray-300"}`} />
              <span className={progressiveLoadingStep >= 4 ? "text-green-600" : "text-gray-500"}>All Data Loaded</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MockSalesMetrics isLoading={salesLoading} hasError={salesError} onRetry={() => retryComponent("sales")} />
        <MockProfileStats
          isLoading={profileLoading}
          hasError={profileError}
          onRetry={() => retryComponent("profile")}
        />
      </div>

      {/* Loading State Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Skeleton Loading Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Status Simulation */}
      <Card>
        <CardHeader>
          <CardTitle>Network Status Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Test offline/online detection by toggling your network connection or using browser dev tools.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOnline(false)}>
                Simulate Offline
              </Button>
              <Button variant="outline" onClick={() => setIsOnline(true)}>
                Simulate Online
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
