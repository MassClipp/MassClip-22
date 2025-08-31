"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-firebase-auth-safe"
import { toast } from "sonner"

interface NotificationPreferences {
  purchaseNotifications: boolean
  downloadNotifications: boolean
  emailNotifications: boolean
}

export default function SettingsPage() {
  const authResult = useAuth()
  const user = authResult?.user
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    purchaseNotifications: true,
    downloadNotifications: true,
    emailNotifications: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    if (authResult !== undefined) {
      setAuthLoading(false)
    }
  }, [authResult])

  useEffect(() => {
    if (!authLoading && user?.email) {
      loadPreferences()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading])

  const loadPreferences = async () => {
    try {
      const response = await fetch("/api/user/notification-preferences")
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences || preferences)
      }
    } catch (error) {
      console.error("Error loading preferences:", error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!user?.email) return

    setSaving(true)
    try {
      const response = await fetch("/api/user/notification-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferences }),
      })

      if (response.ok) {
        toast.success("Notification preferences saved successfully")
      } else {
        throw new Error("Failed to save preferences")
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast.error("Failed to save notification preferences")
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Please log in to access your notification settings.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose which notifications you'd like to receive when activity happens on your content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-base font-medium">Purchase Notifications</div>
                <div className="text-sm text-muted-foreground">Get notified when someone purchases your bundles</div>
              </div>
              <Switch
                checked={preferences.purchaseNotifications}
                onCheckedChange={(checked) => updatePreference("purchaseNotifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-base font-medium">Download Notifications</div>
                <div className="text-sm text-muted-foreground">Get notified when someone downloads your content</div>
              </div>
              <Switch
                checked={preferences.downloadNotifications}
                onCheckedChange={(checked) => updatePreference("downloadNotifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-base font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Receive notifications via email in addition to in-app notifications
                </div>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => updatePreference("emailNotifications", checked)}
              />
            </div>

            <div className="pt-4">
              <Button onClick={savePreferences} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Management</CardTitle>
            <CardDescription>Manage your email subscription and preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>
                  You can unsubscribe from all MassClip emails at any time. This will stop all email communications
                  including purchase notifications, download alerts, and promotional emails.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (user?.email) {
                    window.open(`/api/unsubscribe?email=${encodeURIComponent(user.email)}`, "_blank")
                  }
                }}
              >
                Unsubscribe from All Emails
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
