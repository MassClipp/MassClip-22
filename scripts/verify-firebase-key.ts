/**
 * This script verifies the format of the Firebase private key
 * Run it with: npx ts-node scripts/verify-firebase-key.ts
 */

// Load environment variables
require("dotenv").config()

console.log("Verifying Firebase private key format...")

const privateKey = process.env.FIREBASE_PRIVATE_KEY

if (!privateKey) {
  console.error("FIREBASE_PRIVATE_KEY is not defined in environment variables")
  process.exit(1)
}

// Check if the key starts and ends correctly
const hasCorrectStart = privateKey.startsWith("-----BEGIN PRIVATE KEY-----")
const hasCorrectEnd =
  privateKey.endsWith("-----END PRIVATE KEY-----\n") || privateKey.endsWith("-----END PRIVATE KEY-----")

console.log("Key starts correctly:", hasCorrectStart)
console.log("Key ends correctly:", hasCorrectEnd)

// Check for newlines
const hasEscapedNewlines = privateKey.includes("\\n")
const hasActualNewlines = privateKey.includes("\n")

console.log("Contains escaped newlines (\\n):", hasEscapedNewlines)
console.log("Contains actual newlines:", hasActualNewlines)

// Print the first and last few characters
console.log("First 30 characters:", privateKey.substring(0, 30))
console.log("Last 30 characters:", privateKey.substring(privateKey.length - 30))

// Suggest the correct format
console.log("\nThe private key should be in this format in your .env file:")
console.log('FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY_DATA\\n-----END PRIVATE KEY-----\\n"')

console.log("\nAnd in Vercel environment variables, it should be:")
console.log('"-----BEGIN PRIVATE KEY-----\\nYOUR_KEY_DATA\\n-----END PRIVATE KEY-----\\n"')

console.log("\nNote: The key should be wrapped in double quotes and use escaped newlines (\\n)")
