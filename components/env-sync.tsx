"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function EnvSync() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState("")

  // Load environment variables on component mount
  useEffect(() => {
    // Only run in browser
    const loadEnvVars = () => {
      // Get all NEXT_PUBLIC_ environment variables
      const publicVars: Record<string, string> = {}

      // This is safe because it only accesses NEXT_PUBLIC_ vars
      Object.keys(process.env).forEach((key) => {
        if (key.startsWith("NEXT_PUBLIC_")) {
          publicVars[key] = process.env[key] || '"cess.env[key] || "'
        }
      })

      setEnvVars(publicVars)
      setIsLoading(false)
    }

    loadEnvVars()
  }, [])

  // Handle sync button click
  const handleSync = async () => {
    setIsSyncing(true)
    setMessage("")

    try {
      const response = await fetch("/api/update-env", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ syncAll: true }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Environment variables synced successfully!")
      } else {
        setMessage(`Error: ${data.error || "Failed to sync environment variables"}`)
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return <div>Loading environment variables...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment Variables</CardTitle>
        <CardDescription>View and sync your environment variables across environments.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-4">
              <div className="font-mono text-sm">{key}</div>
              <div className="col-span-2 font-mono text-sm">{value ? `${value.substring(0, 10)}...` : "(empty)"}</div>
            </div>
          ))}
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-md ${message.includes("Error") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
          >
            {message}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? "Syncing..." : "Sync Environment Variables"}
        </Button>
      </CardFooter>
    </Card>
  )
}
