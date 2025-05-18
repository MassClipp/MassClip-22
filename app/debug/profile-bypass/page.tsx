"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ProfileBypass() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const createSampleProfile = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Get the user's ID token
      const idToken = await user.getIdToken()

      // Call the API to create a sample profile
      const response = await fetch("/api/debug/create-sample-profile", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create sample profile")
      }

      setProfileData(data.profile)

      toast({
        title: data.message,
        description: `Profile username: ${data.profile.username}`,
      })

      // Wait a moment before redirecting
      setTimeout(() => {
        router.push(`/creator/${data.profile.username}`)
      }, 1500)
    } catch (error) {
      console.error("Error:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")

      toast({
        title: "Error",
        description: "Failed to create sample profile. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <Card className="w-full max-w-md border-gray-800 bg-black/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-crimson" />
              <span className="ml-2 text-gray-300">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Profile Setup Bypass</h1>

        <Card className="border-gray-800 bg-black/50 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle>Skip Profile Setup</CardTitle>
            <CardDescription>
              This will create a sample profile for your account so you can see how the public profile looks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={createSampleProfile} className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Sample Profile...
                  </>
                ) : (
                  "Create Sample Profile & View"
                )}
              </Button>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-800 rounded-md text-red-400 text-sm">{error}</div>
              )}

              {profileData && (
                <div className="p-3 bg-green-900/20 border border-green-800 rounded-md text-green-400 text-sm">
                  <p>Profile created successfully!</p>
                  <p className="mt-1">
                    Username: <span className="font-mono">{profileData.username}</span>
                  </p>
                  <p className="mt-1">Redirecting to your profile page...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
