// Script to create the required Firestore index for purchases
console.log("🔧 Setting up Firestore index for purchases...")

const indexInfo = {
  collection: "purchases",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "createdAt", order: "DESCENDING" },
  ],
  description: "Index for querying user purchases ordered by creation date",
}

console.log("📋 Required Firestore Index:")
console.log(`Collection: ${indexInfo.collection}`)
console.log(`Fields: ${indexInfo.fields.map((f) => `${f.field} (${f.order})`).join(", ")}`)
console.log(`Description: ${indexInfo.description}`)
console.log("")

console.log("🔗 To create this index manually:")
console.log("1. Go to: https://console.firebase.google.com")
console.log("2. Select your project")
console.log("3. Go to Firestore Database > Indexes")
console.log("4. Click 'Create Index'")
console.log("5. Set Collection ID: purchases")
console.log("6. Add field: userId (Ascending)")
console.log("7. Add field: createdAt (Descending)")
console.log("8. Click 'Create'")
console.log("")

console.log("📝 Or use Firebase CLI:")
console.log("firebase deploy --only firestore:indexes")
console.log("")

console.log("⚡ The API will work without the index but will be slower")
console.log("✅ Index setup instructions completed!")
