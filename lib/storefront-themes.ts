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
    accentGradient: ["#000000", "#0a0a0a"],
    preview: "Classic black theme",
  },
  {
    id: "crimson",
    name: "Black & Crimson",
    primaryColor: "#000000",
    accentGradient: ["#000000", "#8B0000"],
    preview: "Deep red accents",
  },
  {
    id: "sapphire",
    name: "Black & Sapphire",
    primaryColor: "#000000",
    accentGradient: ["#000000", "#0F52BA"],
    preview: "Rich blue accents",
  },
  {
    id: "emerald",
    name: "Black & Emerald",
    primaryColor: "#000000",
    accentGradient: ["#000000", "#50C878"],
    preview: "Vibrant green accents",
  },
  {
    id: "amethyst",
    name: "Black & Amethyst",
    primaryColor: "#000000",
    accentGradient: ["#000000", "#9966CC"],
    preview: "Purple luxury",
  },
  {
    id: "gold",
    name: "Black & Gold",
    primaryColor: "#000000",
    accentGradient: ["#000000", "#FFD700"],
    preview: "Premium gold",
  },
  {
    id: "cyan",
    name: "Black & Cyan",
    primaryColor: "#000000",
    accentGradient: ["#000000", "#00CED1"],
    preview: "Electric cyan",
  },
  {
    id: "coral",
    name: "Black & Coral",
    primaryColor: "#000000",
    accentGradient: ["#000000", "#FF7F50"],
    preview: "Warm coral tones",
  },
  {
    id: "mint",
    name: "Black & Mint",
    primaryColor: "#000000",
    accentGradient: ["#000000", "#98FF98"],
    preview: "Fresh mint green",
  },
  {
    id: "rose",
    name: "Black & Rose",
    primaryColor: "#000000",
    accentGradient: ["#000000", "#FF007F"],
    preview: "Vibrant rose pink",
  },
] as const

export const getThemeById = (id: string) => {
  return STOREFRONT_PRESETS.find((preset) => preset.id === id) || STOREFRONT_PRESETS[0]
}

export const applyThemeToStyles = (theme: StorefrontTheme) => {
  return {
    backgroundColor: theme.primaryColor,
    backgroundImage: `linear-gradient(135deg, ${theme.accentGradient[0]}, ${theme.accentGradient[1]})`,
  }
}
