// Environment configuration with proper validation
export const ENV_CONFIG = {
  // Firebase Client Config (required for client-side)
  FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,

  // Firebase Admin Config (server-side only)
  FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,

  // Stripe Config
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

  // Other Config
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  VIMEO_ACCESS_TOKEN: process.env.VIMEO_ACCESS_TOKEN,
}

export function validateEnvironment() {
  const requiredClientVars = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ]

  const requiredServerVars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]

  // Check if variables exist AND are not empty strings
  const missingClientVars = requiredClientVars.filter((varName) => {
    const value = process.env[varName]
    return !value || value.trim() === ""
  })

  const missingServerVars = requiredServerVars.filter((varName) => {
    const value = process.env[varName]
    return !value || value.trim() === ""
  })

  return {
    isClientConfigured: missingClientVars.length === 0,
    isServerConfigured: missingServerVars.length === 0,
    missingClientVars,
    missingServerVars,
    isFullyConfigured: missingClientVars.length === 0 && missingServerVars.length === 0,
  }
}

// Remove the demo fallback - use real config directly
export function getFirebaseClientConfig() {
  return {
    apiKey: ENV_CONFIG.FIREBASE_API_KEY!,
    authDomain: ENV_CONFIG.FIREBASE_AUTH_DOMAIN!,
    projectId: ENV_CONFIG.FIREBASE_PROJECT_ID!,
    storageBucket: ENV_CONFIG.FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: ENV_CONFIG.FIREBASE_MESSAGING_SENDER_ID!,
    appId: ENV_CONFIG.FIREBASE_APP_ID!,
    measurementId: ENV_CONFIG.FIREBASE_MEASUREMENT_ID,
  }
}

// This should now return false since we're not using demo mode
export function isFirebaseInDemoMode(): boolean {
  return false
}

// Add a function to get environment summary
export function getEnvironmentSummary() {
  const validation = validateEnvironment()

  return {
    environment: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    isVercel: !!process.env.VERCEL,
    firebaseConfigured: validation.isClientConfigured,
    stripeConfigured: !!ENV_CONFIG.STRIPE_SECRET_KEY,
    openaiConfigured: !!ENV_CONFIG.OPENAI_API_KEY,
    totalEnvVars: Object.keys(process.env).length,
    publicEnvVars: Object.keys(process.env).filter((key) => key.startsWith("NEXT_PUBLIC_")).length,
  }
}
