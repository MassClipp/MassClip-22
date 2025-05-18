"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FirestoreConnectivityTest } from "@/components/firestore-connectivity-test"
import { db } from "@/lib/firebase"
import { Loader2, Check, X } from "lucide-react"

export default function FirestoreDebugPage() {
  const [username, setUsername] = useState("")
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "error">("idle")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const checkUsername = async () => {
    if (username.length < 3) {
      setError("Username must be at least 3 characters")
      return
    }

    setStatus("checking")
    setMessage("Checking username availability...")
    setError("")

    try {
      console.log("Checking username:", username)

      // Direct Firestore query
      const snapshot = await db.collection("creatorProfiles").where("username", "==", username.toLowerCase()).get()

      console.log("Query result:", snapshot.empty ? "Available" : "Taken")

      if (snapshot.empty) {
        setStatus("available")
        setMessage("Username is available")
      } else {
        setStatus("unavailable")
        setMessage("Username is already taken")
      }
    } catch (error) {
      console.error("Error checking username:", error)
      setStatus("error")
      setMessage("Error checking username")
      setError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="min-h-screen bg-black p-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Firestore Debug Tools</h1>

        <div className="grid gap-6">
          <FirestoreConnectivityTest />

          <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Username Availability Checker</CardTitle>
              <CardDescription>Test if a username is available in the database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username to check</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="username_to_check"
                        className="pr-10"
                      />
                      {status === "checking" && (
                        <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-gray-400" />
                      )}
                      {status === "available" && <Check className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />}
                      {status === "unavailable" && <X className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />}
                    </div>
                    <Button onClick={checkUsername} disabled={status === "checking" || username.length < 3}>
                      Check
                    </Button>
                  </div>
                </div>

                {message && (
                  <p
                    className={`${
                      status === "available"
                        ? "text-green-500"
                        : status === "unavailable"
                          ? "text-red-500"
                          : "text-gray-300"
                    }`}
                  >
                    {message}
                  </p>
                )}

                {error && <p className="text-red-500 text-sm">Error: {error}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
