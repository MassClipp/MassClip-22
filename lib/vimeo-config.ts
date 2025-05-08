// Vimeo API configuration
export const vimeoConfig = {
  // Vimeo user ID
  userId: process.env.VIMEO_USER_ID || "238844896",
  // Vimeo access token (must have upload permissions)
  accessToken: process.env.VIMEO_ACCESS_TOKEN || "4c9c08b23b9f4241983f643fbcea75e6",
  // Ensure the token is properly formatted with Bearer prefix if needed
  get authHeader() {
    return `Bearer ${this.accessToken}`
  },
}

// Validate Vimeo config
export function validateVimeoConfig() {
  const issues = []

  if (!vimeoConfig.userId) {
    issues.push("Missing Vimeo User ID")
  }

  if (!vimeoConfig.accessToken) {
    issues.push("Missing Vimeo Access Token")
  } else if (vimeoConfig.accessToken.length < 20) {
    issues.push("Vimeo Access Token appears to be invalid (too short)")
  }

  return {
    isValid: issues.length === 0,
    issues,
    config: {
      userId: vimeoConfig.userId,
      accessToken: vimeoConfig.accessToken.substring(0, 5) + "...", // Show only first 5 chars for security
    },
  }
}
