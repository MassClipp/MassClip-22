"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import EnhancedProfileViewStats from "@/components/enhanced-profile-view-stats"

export default function ProfileViewDiagnosticsPage() {
  const [userId, setUserId] = useState("")
  const [showStats, setShowStats] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userId.trim()) {
      setShowStats(true)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile View Diagnostics</h1>
        <p className="text-gray-600 mt-2">Test and verify the new profile view tracking system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Profile View Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID to test"
                required
              />
            </div>
            <Button type="submit">Load Profile Stats</Button>
          </form>
        </CardContent>
      </Card>

      {showStats && userId && <EnhancedProfileViewStats userId={userId} showAdminControls={true} />}
    </div>
  )
}
