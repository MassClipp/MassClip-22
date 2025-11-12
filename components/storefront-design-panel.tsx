"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Paintbrush, Check, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

const PRESET_THEMES = [
  { id: "default", name: "Default", primary: "#000000", accent: "#3b82f6" },
  { id: "crimson", name: "Crimson", primary: "#000000", accent: "#dc2626" },
  { id: "azure", name: "Azure", primary: "#000000", accent: "#0ea5e9" },
  { id: "emerald", name: "Emerald", primary: "#000000", accent: "#10b981" },
  { id: "violet", name: "Violet", primary: "#000000", accent: "#8b5cf6" },
  { id: "amber", name: "Amber", primary: "#000000", accent: "#f59e0b" },
  { id: "rose", name: "Rose", primary: "#000000", accent: "#f43f5e" },
  { id: "teal", name: "Teal", primary: "#000000", accent: "#14b8a6" },
  { id: "indigo", name: "Indigo", primary: "#000000", accent: "#6366f1" },
  { id: "lime", name: "Lime", primary: "#000000", accent: "#84cc16" },
]

interface StorefrontDesignPanelProps {
  userId: string
  userPlan: "free" | "starter" | "faceless_pro" | "facelessprenuer"
  currentDesign?: {
    preset: string
    customColors?: { primary: string; accent: string } | null
  }
  onSave?: () => void
}

export function StorefrontDesignPanel({ userId, userPlan, currentDesign, onSave }: StorefrontDesignPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(currentDesign?.preset || "default")
  const [customPrimary, setCustomPrimary] = useState(currentDesign?.customColors?.primary || "#000000")
  const [customAccent, setCustomAccent] = useState(currentDesign?.customColors?.accent || "#3b82f6")
  const [useCustom, setUseCustom] = useState(currentDesign?.preset === "custom")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { user } = useFirebaseAuth()

  const hasDesignAccess = userPlan === "faceless_pro" || userPlan === "facelessprenuer"
  const hasFullCustomization = userPlan === "facelessprenuer"

  const handleSave = async () => {
    if (!hasDesignAccess) {
      toast({
        title: "Upgrade Required",
        description: "Storefront customization requires Faceless Pro or higher",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save design",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/storefront/design", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preset: useCustom ? "custom" : selectedPreset,
          customColors: useCustom && hasFullCustomization ? { primary: customPrimary, accent: customAccent } : null,
        }),
      })

      if (!response.ok) throw new Error("Failed to save design")

      toast({
        title: "Design Saved",
        description: "Your storefront design has been updated",
      })
      setIsOpen(false)
      onSave?.()
    } catch (error) {
      console.error("[v0] Error saving design:", error)
      toast({
        title: "Error",
        description: "Failed to save design. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getGradientStyle = (primary: string, accent: string) => ({
    background: `linear-gradient(135deg, ${primary} 0%, ${primary} 70%, ${accent}15 100%)`,
  })

  if (!hasDesignAccess) return null

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white"
      >
        <Paintbrush className="w-4 h-4 mr-2" />
        Customize Design
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-zinc-900 rounded-t-2xl sm:rounded-lg border border-zinc-800 w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-semibold text-white">Customize Storefront</h2>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
              {/* Preset Selection */}
              {!useCustom && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-300">Choose a Theme Preset</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {PRESET_THEMES.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`relative p-3 sm:p-4 rounded-lg border-2 transition-all ${
                          selectedPreset === preset.id ? "border-white" : "border-zinc-700 hover:border-zinc-600"
                        }`}
                        style={getGradientStyle(preset.primary, preset.accent)}
                      >
                        <div className="text-white text-sm font-medium mb-1">{preset.name}</div>
                        <div className="flex gap-1">
                          <div
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <div
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        {selectedPreset === preset.id && (
                          <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                            <Check className="w-3 h-3 text-black" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Colors (Facelessprenuer only) */}
              {hasFullCustomization && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-300">Custom Colors</h3>
                    <button
                      onClick={() => setUseCustom(!useCustom)}
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {useCustom ? "Use Presets" : "Customize Colors"}
                    </button>
                  </div>

                  {useCustom && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Primary Color (Base)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customPrimary}
                            onChange={(e) => setCustomPrimary(e.target.value)}
                            className="w-12 h-12 rounded cursor-pointer border border-zinc-700 flex-shrink-0"
                          />
                          <input
                            type="text"
                            value={customPrimary}
                            onChange={(e) => setCustomPrimary(e.target.value)}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white font-mono"
                            placeholder="#000000"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Accent Color (Subtle Gradient)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customAccent}
                            onChange={(e) => setCustomAccent(e.target.value)}
                            className="w-12 h-12 rounded cursor-pointer border border-zinc-700 flex-shrink-0"
                          />
                          <input
                            type="text"
                            value={customAccent}
                            onChange={(e) => setCustomAccent(e.target.value)}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white font-mono"
                            placeholder="#3b82f6"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-300">Preview</h3>
                <div
                  className="w-full h-32 sm:h-40 rounded-lg border border-zinc-700 overflow-hidden"
                  style={
                    useCustom
                      ? getGradientStyle(customPrimary, customAccent)
                      : getGradientStyle(
                          PRESET_THEMES.find((p) => p.id === selectedPreset)?.primary || "#000000",
                          PRESET_THEMES.find((p) => p.id === selectedPreset)?.accent || "#3b82f6",
                        )
                  }
                >
                  <div className="p-4 sm:p-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 border border-white/20 mb-3" />
                    <div className="h-3 sm:h-4 w-24 sm:w-32 bg-white/20 rounded mb-2" />
                    <div className="h-2 sm:h-3 w-16 sm:w-24 bg-white/10 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex gap-3 flex-shrink-0">
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-white text-black hover:bg-zinc-100">
                {saving ? "Saving..." : "Save Design"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
