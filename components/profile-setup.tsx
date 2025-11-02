"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

interface ProfileSetupProps {
  uid: string
  email?: string | null
  onComplete: (username: string) => void
}

export default function ProfileSetup({ uid, email, onComplete }: ProfileSetupProps) {
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a username to continue",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const response = await fetch("/api/create-user-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await (window as any).firebase.auth().currentUser.getIdToken()}`,
        },
        body: JSON.stringify({
          username,
          displayName: displayName || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create profile")
      }

      const data = await response.json()

      toast({
        title: "Profile Created",
        description: "Your profile has been set up successfully",
      })

      onComplete(username)
    } catch (error) {
      console.error("Error creating profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate a suggested username from email
  const suggestedUsername = email ? email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") : ""

  return (
    <Card className="w-full max-w-md mx-auto bg-zinc-900/60 border-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-xl">Complete Your Profile</CardTitle>
        <CardDescription>Set up your creator profile to start uploading files</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-zinc-200">
              Username <span className="text-red-500">*</span>
            </label>
            <Input
              id="username"
              placeholder={suggestedUsername || "Enter a username"}
              value={username}
              onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
              className="bg-zinc-800 border-zinc-700"
              required
            />
            <p className="text-xs text-zinc-400">This will be used for your creator profile and file organization</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium text-zinc-200">
              Display Name
            </label>
            <Input
              id="displayName"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
            <p className="text-xs text-zinc-400">This will be shown on your public profile (optional)</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting Up...
              </>
            ) : (
              "Complete Setup"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
