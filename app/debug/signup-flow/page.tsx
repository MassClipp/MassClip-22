"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase-safe"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function SignupFlowDebugPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      addLog(`Auth state changed: ${user ? `User ${user.uid}` : "No user"}`)
      setUser(user)
    })
    return () => unsubscribe()
  }, [])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
    console.log(`[v0 Debug] ${message}`)
  }

  const testSignupFlow = async () => {
    addLog("Starting signup flow test...")

    if (!user) {
      addLog("ERROR: No user logged in. Please sign up first.")
      return
    }

    try {
      addLog(`Current user: ${user.uid}`)
      addLog(`User email: ${user.email}`)

      addLog("Getting ID token...")
      const idToken = await user.getIdToken()
      addLog(`ID token obtained, length: ${idToken.length}`)

      addLog("Calling /api/auth/create-user...")
      const response = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          username: user.displayName || "Test User",
          displayName: user.displayName,
        }),
      })

      const data = await response.json()
      addLog(`API Response: ${JSON.stringify(data, null, 2)}`)

      if (response.ok) {
        addLog("✅ Server-side records created successfully")
        addLog("Redirecting to /welcome/free-trial in 2 seconds...")
        setTimeout(() => {
          router.push("/welcome/free-trial")
        }, 2000)
      } else {
        addLog(`❌ API Error: ${data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      addLog(`❌ Exception: ${error.message}`)
      console.error(error)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Signup Flow Debug</h1>
          <p className="text-gray-400">Test and debug the signup to free trial redirect flow</p>
        </div>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Current User Status</h2>
          {user ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-400">UID:</span> {user.uid}
              </p>
              <p>
                <span className="text-gray-400">Email:</span> {user.email}
              </p>
              <p>
                <span className="text-gray-400">Display Name:</span> {user.displayName || "None"}
              </p>
            </div>
          ) : (
            <p className="text-gray-400">No user logged in. Please sign up or log in first.</p>
          )}
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Test Actions</h2>
            <Button onClick={clearLogs} variant="outline" size="sm">
              Clear Logs
            </Button>
          </div>
          <div className="space-y-3">
            <Button onClick={testSignupFlow} disabled={!user} className="w-full">
              Test Signup Flow (Create Records + Redirect)
            </Button>
            <Button onClick={() => router.push("/welcome/free-trial")} variant="outline" className="w-full">
              Go to Free Trial Page
            </Button>
            <Button onClick={() => router.push("/signup")} variant="outline" className="w-full">
              Go to Signup Page
            </Button>
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm space-y-1">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click a test button to start.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-gray-300">
                  {log}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
