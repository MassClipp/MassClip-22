// Firebase Environment Diagnostic
console.log("🔍 Firebase Environment Diagnostic")
console.log("==================================")

// Check each Firebase environment variable individually
const firebaseVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
]

console.log("\n📋 Individual Variable Check:")
firebaseVars.forEach((varName) => {
  const value = process.env[varName]
  const status = value ? "✅ SET" : "❌ MISSING"
  const preview = value ? `${value.substring(0, 15)}...` : "undefined"
  const length = value ? value.length : 0

  console.log(`${status} ${varName}:`)
  console.log(`   Value: ${preview}`)
  console.log(`   Length: ${length} characters`)
  console.log(`   Type: ${typeof value}`)
  console.log("")
})

// Check if any are empty strings
console.log("🔍 Empty String Check:")
const emptyVars = firebaseVars.filter((varName) => {
  const value = process.env[varName]
  return value === ""
})

if (emptyVars.length > 0) {
  console.log("❌ Found empty string variables:", emptyVars)
} else {
  console.log("✅ No empty string variables found")
}

// Check if any are undefined vs empty
console.log("\n🔍 Undefined vs Empty Check:")
firebaseVars.forEach((varName) => {
  const value = process.env[varName]
  if (value === undefined) {
    console.log(`❌ ${varName}: undefined`)
  } else if (value === "") {
    console.log(`⚠️  ${varName}: empty string`)
  } else if (value.trim() === "") {
    console.log(`⚠️  ${varName}: whitespace only`)
  } else {
    console.log(`✅ ${varName}: has value`)
  }
})

console.log("\n🎯 Conclusion:")
const allSet = firebaseVars.every((varName) => {
  const value = process.env[varName]
  return value && value.trim() !== ""
})

if (allSet) {
  console.log("✅ All Firebase environment variables are properly set!")
  console.log("The issue might be in the validation logic or Firebase initialization.")
} else {
  console.log("❌ Some Firebase environment variables are missing or empty.")
  console.log("This explains why Firebase is falling back to demo mode.")
}
