// Firebase Configuration Setup Helper
console.log("🔥 Firebase Configuration Setup Helper")
console.log("=====================================")

// Check current environment variables
const currentConfig = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

console.log("\n📋 Current Configuration Status:")
console.log("================================")

Object.entries(currentConfig).forEach(([key, value]) => {
  const status = value ? (value.includes("demo") ? "⚠️  DEMO" : "✅ SET") : "❌ MISSING"
  console.log(`${status} ${key}: ${value || "undefined"}`)
})

console.log("\n🚀 Next Steps:")
console.log("==============")
console.log("1. Go to https://console.firebase.google.com")
console.log("2. Select your project (or create a new one)")
console.log("3. Go to Project Settings → General → Your apps")
console.log("4. Add a web app or select existing one")
console.log("5. Copy the config values and update your .env.local file")

console.log("\n📝 Example .env.local format:")
console.log("============================")
console.log(`# Replace these with your actual Firebase config values
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX`)

console.log("\n⚠️  Important Notes:")
console.log("===================")
console.log("- After updating .env.local, restart your development server")
console.log("- For Vercel deployment, add these to your Vercel environment variables")
console.log("- Make sure to enable Authentication in Firebase Console")
console.log("- Configure your authentication providers (Google, Email/Password, etc.)")

// Check if we're in demo mode
const isDemoMode =
  currentConfig.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("demo") ||
  currentConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.includes("demo")

if (isDemoMode) {
  console.log("\n🔴 CURRENT STATUS: Demo Mode Active")
  console.log("Authentication and real Firebase features will not work until you configure real values.")
} else {
  console.log("\n🟢 CURRENT STATUS: Real Configuration Detected")
  console.log("Your Firebase should be properly configured!")
}
