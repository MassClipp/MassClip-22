/**
 * Utility to check and sync environment variables
 */

// Define the expected environment variables
export const expectedEnvVars = {
  firebase: [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
  ],
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "NEXT_PUBLIC_SITE_URL"],
  vimeo: ["VIMEO_USER_ID", "VIMEO_ACCESS_TOKEN"],
}

// Check if environment variables are set
export function checkEnvVars() {
  const status = {
    firebase: {
      complete: true,
      missing: [] as string[],
    },
    stripe: {
      complete: true,
      missing: [] as string[],
    },
    vimeo: {
      complete: true,
      missing: [] as string[],
    },
  }

  // Check Firebase variables
  expectedEnvVars.firebase.forEach((varName) => {
    if (!process.env[varName]) {
      status.firebase.complete = false
      status.firebase.missing.push(varName)
    }
  })

  // Check Stripe variables
  expectedEnvVars.stripe.forEach((varName) => {
    if (!process.env[varName]) {
      status.stripe.complete = false
      status.stripe.missing.push(varName)
    }
  })

  // Check Vimeo variables
  expectedEnvVars.vimeo.forEach((varName) => {
    if (!process.env[varName]) {
      status.vimeo.complete = false
      status.vimeo.missing.push(varName)
    }
  })

  return status
}

// Get current environment variables (client-safe version)
export function getCurrentEnvVars() {
  const envVars: Record<string, string | undefined> = {}

  // Only include NEXT_PUBLIC_ variables for client-side
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("NEXT_PUBLIC_")) {
      envVars[key] = process.env[key]
    }
  })

  // Add safe versions of other variables (just showing if they exist)
  expectedEnvVars.stripe.forEach((varName) => {
    if (!varName.startsWith("NEXT_PUBLIC_")) {
      envVars[varName] = process.env[varName] ? "[SET]" : undefined
    }
  })

  expectedEnvVars.vimeo.forEach((varName) => {
    envVars[varName] = process.env[varName] ? "[SET]" : undefined
  })

  return envVars
}
