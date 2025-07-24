// Firebase configuration with fallbacks and validation
export const getFirebaseConfig = () => {
  // Check if all required Firebase config variables are present
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  }

  // Log the config for debugging (will be visible in browser console)
  console.log("Firebase config check:", {
    apiKey: !!config.apiKey,
    authDomain: !!config.authDomain,
    projectId: !!config.projectId,
    storageBucket: !!config.storageBucket,
    messagingSenderId: !!config.messagingSenderId,
    appId: !!config.appId,
  })

  // Check if required fields are present
  const missingFields = Object.entries(config)
    .filter(([key, value]) => !value && key !== "measurementId") // measurementId is optional
    .map(([key]) => key)

  if (missingFields.length > 0) {
    console.error(`Missing Firebase configuration fields: ${missingFields.join(", ")}`)
    throw new Error(`Firebase configuration incomplete. Missing: ${missingFields.join(", ")}`)
  }

  return config
}
