"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export default function SetTrialFlagPage() {
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSetFlag = async () => {
    if (!userId.trim()) {
      alert("Please enter a user ID")
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/admin/set-trial-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim() }),
      })

      const data = await res.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Manually Set Trial Flag</h1>

      <Card className="p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">User ID</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID (e.g., SekWrBmMRdZNNTlckeWXCjN1sc53)"
              className="font-mono"
            />
          </div>

          <Button onClick={handleSetFlag} disabled={loading} className="w-full">
            {loading ? "Setting Flag..." : "Set hasEverPurchasedFacelessprenuer = true"}
          </Button>

          {result && (
            <div
              className={`p-4 rounded ${result.success ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}
            >
              <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-900">
            <strong>Warning:</strong> This will prevent the specified user from getting the Facelessprenuer free trial
            on future purchases. Use this for users who already used their trial but the flag wasn't set.
          </p>
        </div>
      </Card>
    </div>
  )
}
