interface VimeoConfigType {
  accessToken: string
  userId: string
  clientId?: string
  clientSecret?: string
}

// Get Vimeo credentials from environment variables
export const vimeoConfig: VimeoConfigType = {
  accessToken: process.env.VIMEO_ACCESS_TOKEN || "",
  userId: process.env.VIMEO_USER_ID || "",
  clientId: process.env.VIMEO_CLIENT_ID,
  clientSecret: process.env.VIMEO_CLIENT_SECRET,
}

// Helper function to check if Vimeo is properly configured
export function isVimeoConfigured(): boolean {
  return Boolean(vimeoConfig.accessToken && vimeoConfig.userId)
}

// Function to validate Vimeo configuration
export function validateVimeoConfig(): { isValid: boolean; issues: string[]; config: VimeoConfigType } {
  const issues: string[] = []

  if (!process.env.VIMEO_ACCESS_TOKEN) {
    issues.push("VIMEO_ACCESS_TOKEN is missing")
  }

  if (!process.env.VIMEO_USER_ID) {
    issues.push("VIMEO_USER_ID is missing")
  }

  const isValid = issues.length === 0

  return {
    isValid: isValid,
    issues: issues,
    config: vimeoConfig,
  }
}
