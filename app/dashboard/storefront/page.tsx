"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Users, Heart, Loader2, Check } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useRouter } from 'next/navigation'

interface StorefrontTheme {
  mainColor: string
  accentColor: string
  gradientType: "none" | "linear" | "radial"
  gradientDirection?: string
}

const defaultTheme: StorefrontTheme = {
  mainColor: "#ffffff",
  accentColor: "#3b82f6",
  gradientType: "linear",
  gradientDirection: "to-br",
}

const gradientDirections = [
  { value: "to-br", label: "Diagonal ↘" },
  { value: "to-r", label: "Right →" },
  { value: "to-b", label: "Down ↓" },
  { value: "to-tr", label: "Diagonal ↗" },
]

export default function StorefrontCustomization() {
  const [user, loading] = useAuthState(auth)
  const [theme, setTheme] = useState<StorefrontTheme>(defaultTheme)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const loadTheme = async () => {
      if (!user) return

      try {
        // Load user data
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData(data)

          // Load saved theme if exists
          if (data.storefrontTheme) {
            setTheme(data.storefrontTheme)
          }
        }
      } catch (error) {
        console.error("Error loading theme:", error)
      }
    }

    loadTheme()
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          storefrontTheme: theme,
        },
        { merge: true },
      )

      toast({
        title: "Theme Saved",
        description: "Your storefront theme has been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving theme:", error)
      toast({
        title: "Error",
        description: "Failed to save theme. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getGradientStyle = () => {
    if (theme.gradientType === "none") {
      return { background: "#000000" }
    }

    const opacity = "0d" // ~5% opacity
    if (theme.gradientType === "linear") {
      return {
        background: `linear-gradient(${theme.gradientDirection}, ${theme.mainColor}${opacity} 0%, #000000 50%, ${theme.accentColor}14 100%)`,
      }
    }

    return {
      background: `radial-gradient(circle at top right, ${theme.mainColor}${opacity}, #000000 50%, ${theme.accentColor}14)`,
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Storefront Customization</h1>
          <p className="text-zinc-400">Customize the look and feel of your creator storefront</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-lg p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Color Settings</h2>

                {/* Main Color */}
                <div className="space-y-3 mb-6">
                  <label className="text-sm font-medium text-zinc-300">Main Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.mainColor}
                      onChange={(e) => setTheme({ ...theme, mainColor: e.target.value })}
                      className="w-16 h-16 rounded-lg cursor-pointer border-2 border-zinc-700"
                    />
                    <input
                      type="text"
                      value={theme.mainColor}
                      onChange={(e) => setTheme({ ...theme, mainColor: e.target.value })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm font-mono"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                      className="w-16 h-16 rounded-lg cursor-pointer border-2 border-zinc-700"
                    />
                    <input
                      type="text"
                      value={theme.accentColor}
                      onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm font-mono"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
              </div>

              {/* Gradient Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Gradient Style</h3>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">Gradient Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setTheme({ ...theme, gradientType: "none" })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme.gradientType === "none"
                          ? "bg-white text-black"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      None
                    </button>
                    <button
                      onClick={() => setTheme({ ...theme, gradientType: "linear", gradientDirection: "to-br" })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme.gradientType === "linear"
                          ? "bg-white text-black"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      Linear
                    </button>
                    <button
                      onClick={() => setTheme({ ...theme, gradientType: "radial" })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme.gradientType === "radial"
                          ? "bg-white text-black"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      Radial
                    </button>
                  </div>
                </div>

                {theme.gradientType === "linear" && (
                  <div className="space-y-3 mt-4">
                    <label className="text-sm font-medium text-zinc-300">Direction</label>
                    <div className="grid grid-cols-2 gap-2">
                      {gradientDirections.map((dir) => (
                        <button
                          key={dir.value}
                          onClick={() => setTheme({ ...theme, gradientDirection: dir.value })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            theme.gradientDirection === dir.value
                              ? "bg-white text-black"
                              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          }`}
                        >
                          {dir.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <Button onClick={handleSave} disabled={saving} className="w-full bg-white text-black hover:bg-zinc-200">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Theme
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Live Preview</h2>
              {userData?.username && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/creator/${userData.username}`, "_blank")}
                  className="text-sm"
                >
                  View Live Storefront
                </Button>
              )}
            </div>

            <div className="bg-zinc-900 rounded-lg p-4 overflow-hidden">
              {/* Preview Container */}
              <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "9/16", maxHeight: "600px" }}>
                {/* Background with gradient */}
                <div className="absolute inset-0" style={getGradientStyle()} />

                {/* Content Preview */}
                <div className="relative h-full p-6 overflow-y-auto">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="w-16 h-16 border-2 border-white/20">
                      <AvatarImage src={userData?.profilePic || userData?.photoURL} />
                      <AvatarFallback className="bg-zinc-800 text-white">
                        {userData?.displayName?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{userData?.displayName || "Your Name"}</h3>
                      <p className="text-sm text-zinc-400">@{userData?.username || "username"}</p>
                    </div>
                  </div>

                  {/* Bio */}
                  {userData?.bio && <p className="text-sm text-zinc-300 mb-6 leading-relaxed">{userData.bio}</p>}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-6 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Calendar className="w-3 h-3" />
                      <span>Member since 2025</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Users className="w-3 h-3" />
                      <span>0 free</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Heart className="w-3 h-3" />
                      <span>0 premium</span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-zinc-800/50 mb-6">
                    <div className="flex gap-6">
                      <div className="pb-3 text-sm font-medium text-white relative">
                        Free Content
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />
                      </div>
                      <div className="pb-3 text-sm font-medium text-zinc-400">Premium Content</div>
                    </div>
                  </div>

                  {/* Content Grid Placeholder */}
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="aspect-[9/16] bg-zinc-800/50 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-500 text-center">
              This is a preview of how your storefront will look with the selected theme
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
