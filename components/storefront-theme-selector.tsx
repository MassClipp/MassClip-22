"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { STOREFRONT_PRESETS, type StorefrontTheme } from "@/lib/storefront-themes"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface StorefrontThemeSelectorProps {
  currentTheme: StorefrontTheme
  onThemeChange: (theme: StorefrontTheme) => void
  canCustomize: boolean // Facelessprenuer only
}

export function StorefrontThemeSelector({ currentTheme, onThemeChange, canCustomize }: StorefrontThemeSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState(currentTheme.preset || "default")
  const [customPrimary, setCustomPrimary] = useState(currentTheme.primaryColor)
  const [customGradient1, setCustomGradient1] = useState(currentTheme.accentGradient[0])
  const [customGradient2, setCustomGradient2] = useState(currentTheme.accentGradient[1])
  const [isCustomMode, setIsCustomMode] = useState(false)

  const handlePresetSelect = (presetId: string) => {
    const preset = STOREFRONT_PRESETS.find((p) => p.id === presetId)
    if (!preset) return

    setSelectedPreset(presetId)
    setIsCustomMode(false)
    onThemeChange({
      primaryColor: preset.primaryColor,
      accentGradient: [...preset.accentGradient],
      preset: presetId,
    })
  }

  const handleCustomChange = () => {
    if (!canCustomize) return

    setIsCustomMode(true)
    onThemeChange({
      primaryColor: customPrimary,
      accentGradient: [customGradient1, customGradient2],
      preset: "custom",
    })
  }

  return (
    <div className="space-y-6">
      {/* Preset Grid */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Theme Presets</h3>
        <div className="grid grid-cols-2 gap-3">
          {STOREFRONT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedPreset === preset.id && !isCustomMode
                  ? "border-white bg-zinc-800"
                  : "border-zinc-700 hover:border-zinc-600 bg-zinc-900"
              }`}
            >
              {/* Preview gradient */}
              <div
                className="h-12 rounded-md mb-2"
                style={{
                  background: `linear-gradient(135deg, ${preset.accentGradient[0]}, ${preset.accentGradient[1]})`,
                }}
              />

              <div className="text-left">
                <p className="text-xs font-medium text-white">{preset.name}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{preset.preview}</p>
              </div>

              {selectedPreset === preset.id && !isCustomMode && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                  <Check className="w-3 h-3 text-black" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Color Wheels - Facelessprenuer Only */}
      {canCustomize && (
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Custom Colors</h3>
            <span className="text-xs text-zinc-500">Facelessprenuer Exclusive</span>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-400 mb-2 block">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customPrimary}
                  onChange={(e) => {
                    setCustomPrimary(e.target.value)
                    if (isCustomMode) handleCustomChange()
                  }}
                  className="w-12 h-12 rounded border-2 border-zinc-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={customPrimary}
                  onChange={(e) => {
                    setCustomPrimary(e.target.value)
                    if (isCustomMode) handleCustomChange()
                  }}
                  className="flex-1 h-10 bg-zinc-900 border border-zinc-700 rounded px-3 text-sm text-white font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-2 block">Accent Gradient Start</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customGradient1}
                  onChange={(e) => {
                    setCustomGradient1(e.target.value)
                    if (isCustomMode) handleCustomChange()
                  }}
                  className="w-12 h-12 rounded border-2 border-zinc-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={customGradient1}
                  onChange={(e) => {
                    setCustomGradient1(e.target.value)
                    if (isCustomMode) handleCustomChange()
                  }}
                  className="flex-1 h-10 bg-zinc-900 border border-zinc-700 rounded px-3 text-sm text-white font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-2 block">Accent Gradient End</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customGradient2}
                  onChange={(e) => {
                    setCustomGradient2(e.target.value)
                    if (isCustomMode) handleCustomChange()
                  }}
                  className="w-12 h-12 rounded border-2 border-zinc-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={customGradient2}
                  onChange={(e) => {
                    setCustomGradient2(e.target.value)
                    if (isCustomMode) handleCustomChange()
                  }}
                  className="flex-1 h-10 bg-zinc-900 border border-zinc-700 rounded px-3 text-sm text-white font-mono"
                  placeholder="#8B0000"
                />
              </div>
            </div>

            <Button
              onClick={() => {
                setIsCustomMode(true)
                handleCustomChange()
              }}
              className="w-full bg-white text-black hover:bg-zinc-100"
            >
              Apply Custom Theme
            </Button>
          </div>

          {/* Live preview */}
          {isCustomMode && (
            <div
              className="mt-4 p-4 rounded-lg border border-zinc-700"
              style={{
                background: `linear-gradient(135deg, ${customGradient1}, ${customGradient2})`,
              }}
            >
              <p className="text-white text-sm font-medium">Custom Theme Preview</p>
              <p className="text-white/70 text-xs mt-1">This is how your storefront will look</p>
            </div>
          )}
        </div>
      )}

      {!canCustomize && (
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <p className="text-xs text-zinc-400">
            Upgrade to <span className="text-white font-medium">Facelessprenuer</span> to unlock custom color wheels and
            full design control
          </p>
        </div>
      )}
    </div>
  )
}
