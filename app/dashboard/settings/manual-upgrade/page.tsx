"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"

export default function ManualUpgradePage() {
  const { user } = useAuth()
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      setResult({ success: false, message: "Please enter a user ID" })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/manual-upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          adminId: user?.uid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upgrade user")
      }

      setResult({ success: true, message: data.message || "User upgraded successfully" })
    } catch (error) {
      console.error("Error upgrading user:", error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to upgrade user",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8 pt-24">
        <h1 className="text-2xl font-bold mb-6">Manual User Upgrade</h1>

        <div className="bg-gray-900 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Admin Tools</h2>
          <p className="text-yellow-500 mb-4">
            Warning: This tool allows you to manually upgrade a user to Pro plan. Use with caution.
          </p>

          <form onSubmit={handleUpgrade} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium mb-1">
                User ID to Upgrade
              </label>
              <input
                type="text"
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter user ID"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-crimson text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "Upgrade User"}
            </button>
          </form>

          {result && (
            <div
              className={`mt-4 p-3 rounded-md ${
                result.success ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
              }`}
            >
              {result.message}
            </div>
          )}
        </div>

        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Enter the Firebase user ID of the user you want to upgrade</li>
            <li>Click "Upgrade User" to manually set their plan to Pro</li>
            <li>This action will be logged for audit purposes</li>
            <li>The user will have immediate access to Pro features</li>
            <li>This does NOT create a Stripe subscription - it only updates the user's plan in Firestore</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
