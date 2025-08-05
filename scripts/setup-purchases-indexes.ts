// Script to set up Firestore indexes for purchases
console.log("🔧 Setting up Firestore indexes for purchases...")

const indexCommands = [
  {
    collection: "purchases",
    fields: ["buyerUid", "createdAt"],
    description: "Index for user purchases ordered by date",
  },
  {
    collection: "purchases",
    fields: ["buyerUid", "type", "createdAt"],
    description: "Index for user purchases filtered by type and ordered by date",
  },
]

console.log("📋 Required Firestore indexes:")
indexCommands.forEach((index, i) => {
  console.log(`${i + 1}. Collection: ${index.collection}`)
  console.log(`   Fields: ${index.fields.join(", ")}`)
  console.log(`   Description: ${index.description}`)
  console.log("")
})

console.log("🔗 To create these indexes, visit:")
console.log("https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/indexes")

console.log("\n📝 Or use the Firebase CLI:")
console.log("firebase deploy --only firestore:indexes")

console.log("\n✅ Indexes setup guide completed!")
