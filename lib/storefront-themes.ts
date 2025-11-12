import type React from "react"
export interface StorefrontTheme {
  primaryColor: string
  accentGradient: string[]
  preset?: string
}

export const STOREFRONT_PRESETS = [
  {
    id: "default",
    name: "Pure Black",
    primaryColor: "#000000",
    accentGradient: ["#1a1a1a", "#262626"],
    preview: "Classic black theme",
  },
  {
    id: "crimson",
    name: "Black & Crimson",
    primaryColor: "#000000",
    accentGradient: ["#1a0000", "#330000"],
    preview: "Deep red accents",
  },
  {
    id: "sapphire",
    name: "Black & Sapphire",
    primaryColor: "#000000",
    accentGradient: ["#000a1a", "#001433"],
    preview: "Rich blue accents",
  },
  {
    id: "emerald",
    name: "Black & Emerald",
    primaryColor: "#000000",
    accentGradient: ["#001a0a", "#00331a"],
    preview: "Vibrant green accents",
  },
  {
    id: "amethyst",
    name: "Black & Amethyst",
    primaryColor: "#000000",
    accentGradient: ["#0f001a", "#1a0033"],
    preview: "Purple luxury",
  },
  {
    id: "gold",
    name: "Black & Gold",
    primaryColor: "#000000",
    accentGradient: ["#1a1400", "#332800"],
    preview: "Premium gold",
  },
  {
    id: "cyan",
    name: "Black & Cyan",
    primaryColor: "#000000",
    accentGradient: ["#001a1a", "#003333"],
    preview: "Electric cyan",
  },
  {
    id: "coral",
    name: "Black & Coral",
    primaryColor: "#000000",
    accentGradient: ["#1a0a00", "#331400"],
    preview: "Warm coral tones",
  },
  {
    id: "mint",
    name: "Black & Mint",
    primaryColor: "#000000",
    accentGradient: ["#001a14", "#003328"],
    preview: "Fresh mint green",
  },
  {
    id: "rose",
    name: "Black & Rose",
    primaryColor: "#000000",
    accentGradient: ["#1a0014", "#330028"],
    preview: "Vibrant rose pink",
  },
] as const

export const getThemeById = (id: string) => {
  return STOREFRONT_PRESETS.find((preset) => preset.id === id) || STOREFRONT_PRESETS[0]
}

export const applyThemeToStyles = (theme: StorefrontTheme) => {
  return {
    "--accent-start": theme.accentGradient[0],
    "--accent-end": theme.accentGradient[1],
  } as React.CSSProperties
}
