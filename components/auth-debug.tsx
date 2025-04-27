"use client"

import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"

export function AuthDebug() {
  const { user, loading } = useAuth()
  const [isExpanded, setIsExpanded] = useState(false)

  if (loading) {
    return <div className="text-sm text-gray-500">Loading auth state...</div>
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg text-sm">
      <button onClick={() => setIsExpanded(!isExpanded)} className="text-blue-400 hover:text-blue-300 mb-2">
        {isExpanded ? "Hide" : "Show"} Auth Debug Info
      </button>

      {isExpanded && (
        <div className="space-y-2">
          <div>
            <span className="font-bold">Auth Status:</span> {user ? "Authenticated" : "Not authenticated"}
          </div>

          {user && (
            <>
              <div>
                <span className="font-bold">User ID:</span> {user.uid}
              </div>
              <div>
                <span className="font-bold">Email:</span> {user.email}
              </div>
              <div>
                <span className="font-bold">Email Verified:</span> {user.emailVerified ? "Yes" : "No"}
              </div>
              <div>
                <span className="font-bold">Display Name:</span> {user.displayName || "Not set"}
              </div>
              <div>
                <span className="font-bold">Provider Data:</span>
                <pre className="bg-gray-800 p-2 rounded mt-1 overflow-auto max-h-40">
                  {JSON.stringify(user.providerData, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
