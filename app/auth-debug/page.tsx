"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase-safe"
import { useRouter, usePathname } from "next/navigation"

export default function AuthDebugPage() {
  const [authState, setAuthState] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const router = useRouter()
  const pathname = usePathname()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `${timestamp}: ${message}`])
    console.log(message)
  }

  useEffect(() => {
    addLog("Setting up auth state listener...")

    if (!auth) {
      addLog("❌ Auth is null - Firebase not initialized")
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      addLog(`🔄 Auth state changed: ${user ? `User logged in (${user.email})` : "No user"}`)
      setAuthState(user)
      setAuthChecked(true)

      // Log what would happen with redirects
      if (user && (pathname === "/login" || pathname === "/signup")) {
        addLog("🔄 Would redirect to dashboard (user on auth page)")
      } else if (!user && pathname.startsWith("/dashboard")) {
        addLog("🔄 Would redirect to login (no user on protected page)")
      } else {
        addLog("✅ No redirect needed")
      }
    })

    return () => {
      addLog("🧹 Cleaning up auth listener")
      unsubscribe()
    }
  }, [pathname])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth State Debug</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Current State</h2>
            <div className="space-y-2">
              <p>
                <strong>Path:</strong> {pathname}
              </p>
              <p>
                <strong>Auth Checked:</strong> {authChecked ? "✅ Yes" : "❌ No"}
              </p>
              <p>
                <strong>User:</strong> {authState ? `✅ Logged in (${authState.email})` : "❌ Not logged in"}
              </p>
              <p>
                <strong>Firebase Auth:</strong> {auth ? "✅ Available" : "❌ Not available"}
              </p>
            </div>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Manual Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => router.push("/login")}
                className="block w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                Go to Login
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="block w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
              >
                Go to Signup
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="block w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  if (auth?.currentUser) {
                    auth.signOut()
                    addLog("🚪 Manual sign out triggered")
                  }
                }}
                className="block w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-lg mt-8">
          <h2 className="text-xl font-semibold mb-4">Auth State Logs</h2>
          <div className="bg-black p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
          <button onClick={() => setLogs([])} className="mt-4 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm">
            Clear Logs
          </button>
        </div>
      </div>
    </div>
  )
}
