"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, getRedirectResult } from "firebase/auth"
import { auth } from "@/firebase/config"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

export default function LoginTestPage() {
  const { user } = useAuth()
  const [testResults, setTestResults] = useState<Record<string, "pending" | "success" | "error" | "info">>({})
  const [testMessages, setTestMessages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const updateTest = (testName: string, status: "pending" | "success" | "error" | "info", message: string) => {
    setTestResults((prev) => ({ ...prev, [testName]: status }))
    setTestMessages((prev) => ({ ...prev, [testName]: message }))
  }

  const setTestLoading = (testName: string, isLoading: boolean) => {
    setLoading((prev) => ({ ...prev, [testName]: isLoading }))
  }

  const testGooglePopup = async () => {
    const testName = "googlePopup"
    setTestLoading(testName, true)
    updateTest(testName, "pending", "Testing Google popup login...")

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      const result = await signInWithPopup(auth, provider)
      updateTest(testName, "success", `✅ Popup login successful: ${result.user.email}`)
    } catch (error: any) {
      console.error("Popup test error:", error)
      if (error.code === "auth/popup-blocked") {
        updateTest(testName, "info", "🚫 Popup blocked (expected behavior) - fallback should trigger")
      } else if (error.code === "auth/popup-closed-by-user") {
        updateTest(testName, "info", "❌ User closed popup (expected behavior)")
      } else {
        updateTest(testName, "error", `❌ Popup error: ${error.message}`)
      }
    } finally {
      setTestLoading(testName, false)
    }
  }

  const testGoogleRedirect = async () => {
    const testName = "googleRedirect"
    setTestLoading(testName, true)
    updateTest(testName, "pending", "Testing Google redirect login...")

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      // This will redirect the page
      await signInWithRedirect(auth, provider)
      updateTest(testName, "info", "🔄 Redirecting to Google... (page will reload)")
    } catch (error: any) {
      console.error("Redirect test error:", error)
      updateTest(testName, "error", `❌ Redirect error: ${error.message}`)
      setTestLoading(testName, false)
    }
  }

  const testRedirectResult = async () => {
    const testName = "redirectResult"
    setTestLoading(testName, true)
    updateTest(testName, "pending", "Checking for redirect result...")

    try {
      const result = await getRedirectResult(auth)
      if (result) {
        updateTest(testName, "success", `✅ Redirect result found: ${result.user.email}`)
      } else {
        updateTest(testName, "info", "ℹ️ No redirect result (user didn't come from redirect)")
      }
    } catch (error: any) {
      console.error("Redirect result error:", error)
      updateTest(testName, "error", `❌ Redirect result error: ${error.message}`)
    } finally {
      setTestLoading(testName, false)
    }
  }

  const testPopupBlocking = () => {
    const testName = "popupBlocking"
    updateTest(testName, "pending", "Testing popup blocking detection...")

    // Test if popups are blocked by trying to open a simple popup
    const popup = window.open("", "_blank", "width=1,height=1")
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      updateTest(testName, "info", "🚫 Popups are blocked - fallback should work")
    } else {
      popup.close()
      updateTest(testName, "success", "✅ Popups are allowed")
    }
  }

  const clearTests = () => {
    setTestResults({})
    setTestMessages({})
    setLoading({})
  }

  const getStatusIcon = (status: "pending" | "success" | "error" | "info") => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "info":
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
    }
  }

  const getStatusBadge = (status: "pending" | "success" | "error" | "info") => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-600">
            Success
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "info":
        return <Badge variant="secondary">Info</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-thin">
              <span className="text-white">Mass</span>
              <span className="bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
                Clip
              </span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Login System Test Page</h1>
          <p className="text-gray-400">Test the login fixes and authentication flow</p>
        </div>

        {/* Current Auth Status */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Current Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-400 font-medium">Authenticated</span>
                </div>
                <p className="text-gray-300">Email: {user.email}</p>
                <p className="text-gray-300">UID: {user.uid}</p>
                <p className="text-gray-300">Display Name: {user.displayName || "Not set"}</p>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-400 font-medium">Not Authenticated</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Authentication Tests</CardTitle>
            <CardDescription className="text-gray-400">
              Test various login scenarios to verify the fixes are working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={testPopupBlocking}
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                disabled={loading.popupBlocking}
              >
                {loading.popupBlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Popup Blocking
              </Button>

              <Button
                onClick={testGooglePopup}
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                disabled={loading.googlePopup}
              >
                {loading.googlePopup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Google Popup
              </Button>

              <Button
                onClick={testGoogleRedirect}
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                disabled={loading.googleRedirect}
              >
                {loading.googleRedirect && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Google Redirect
              </Button>

              <Button
                onClick={testRedirectResult}
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                disabled={loading.redirectResult}
              >
                {loading.redirectResult && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check Redirect Result
              </Button>
            </div>

            <div className="flex space-x-4">
              <Button onClick={clearTests} variant="secondary" className="bg-gray-700 text-white hover:bg-gray-600">
                Clear Results
              </Button>

              <Link href="/login">
                <Button className="bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white text-black hover:opacity-90">
                  Go to Login Page
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Test Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(testResults).map(([testName, status]) => (
                <div key={testName} className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">{getStatusIcon(status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-white font-medium capitalize">
                        {testName.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      {getStatusBadge(status)}
                    </div>
                    <p className="text-gray-300 text-sm">{testMessages[testName]}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            <div className="space-y-2">
              <h4 className="font-medium text-white">1. Test Popup Blocking</h4>
              <p className="text-sm">
                This checks if your browser blocks popups. If blocked, the login form should automatically fall back to
                redirect method.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-white">2. Test Google Popup</h4>
              <p className="text-sm">
                Attempts Google login via popup. If blocked, you should see the fallback behavior.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-white">3. Test Google Redirect</h4>
              <p className="text-sm">
                Forces redirect method for Google login. This will redirect the entire page to Google.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-white">4. Check Redirect Result</h4>
              <p className="text-sm">
                Checks if you returned from a Google redirect login. Run this after being redirected back.
              </p>
            </div>

            <Alert className="border-blue-800 bg-blue-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-blue-300">
                <strong>Note:</strong> The redirect test will navigate away from this page. Bookmark this page or
                navigate back to /test-login to continue testing.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
