"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function DebugCreatorProfiles() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        // Get all creator profiles
        const snapshot = await db.collection("creatorProfiles").limit(10).get()
        const profilesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setProfiles(profilesData)

        // Get current user's profile if logged in
        if (user) {
          const userProfileDoc = await db.collection("creatorProfiles").doc(user.uid).get()
          if (userProfileDoc.exists) {
            setUserProfile({
              id: userProfileDoc.id,
              ...userProfileDoc.data(),
            })
          }
        }
      } catch (error) {
        console.error("Error fetching profiles:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfiles()
  }, [user])

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Debug Creator Profiles</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-crimson" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Current user profile */}
          <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {userProfile ? (
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-400">Profile URL:</p>
                    <p className="font-mono bg-gray-800 p-2 rounded">
                      {window.location.origin}/creator/{userProfile.username}
                    </p>
                  </div>

                  <pre className="bg-gray-900 p-4 rounded overflow-auto max-h-96 text-xs">
                    {JSON.stringify(userProfile, null, 2)}
                  </pre>

                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => window.open(`/creator/${userProfile.username}`, "_blank")} size="sm">
                      Open Profile
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">
                  You don't have a creator profile yet.{" "}
                  <Button variant="link" className="p-0 h-auto" asChild>
                    <a href="/dashboard/creator/setup">Create one</a>
                  </Button>
                </p>
              )}
            </CardContent>
          </Card>

          {/* All profiles */}
          <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>All Creator Profiles (First 10)</CardTitle>
            </CardHeader>
            <CardContent>
              {profiles.length > 0 ? (
                <div className="space-y-4">
                  {profiles.map((profile) => (
                    <div key={profile.id} className="border-b border-gray-800 pb-4 last:border-0 last:pb-0">
                      <p className="font-medium text-white">
                        {profile.displayName} (@{profile.username})
                      </p>
                      <p className="text-sm text-gray-400 mb-2">ID: {profile.id}</p>
                      <Button
                        onClick={() => window.open(`/creator/${profile.username}`, "_blank")}
                        size="sm"
                        variant="outline"
                      >
                        View Profile
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No creator profiles found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
