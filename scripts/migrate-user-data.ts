/**
 * Migration script to move favorites and history data to user-specific subcollections
 * Run with: npx ts-node -r tsconfig-paths/register scripts/migrate-user-data.ts
 */
import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore"

// Initialize Firebase (use your own config)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrateUserData() {
  console.log("Starting migration of user data...")

  // Get all unique user IDs from favorites and viewed collections
  const userIds = new Set<string>()

  // Process favorites
  console.log("Fetching favorites...")
  const favoritesSnapshot = await getDocs(collection(db, "favorites"))
  favoritesSnapshot.forEach((doc) => {
    const data = doc.data()
    if (data.userId) {
      userIds.add(data.userId)
    }
  })

  // Process viewed history
  console.log("Fetching viewing history...")
  const viewedSnapshot = await getDocs(collection(db, "viewed"))
  viewedSnapshot.forEach((doc) => {
    const data = doc.data()
    if (data.userId) {
      userIds.add(data.userId)
    }
  })

  console.log(`Found ${userIds.size} users to migrate`)

  // Process each user
  for (const userId of userIds) {
    console.log(`Migrating data for user ${userId}...`)

    // Migrate favorites
    const userFavorites = query(collection(db, "favorites"), where("userId", "==", userId))
    const userFavoritesSnapshot = await getDocs(userFavorites)

    console.log(`Migrating ${userFavoritesSnapshot.size} favorites for user ${userId}...`)

    for (const favoriteDoc of userFavoritesSnapshot.docs) {
      const favoriteData = favoriteDoc.data()

      // Add to user's favorites subcollection
      await addDoc(collection(db, `users/${userId}/favorites`), {
        videoId: favoriteData.videoId,
        video: favoriteData.video,
        createdAt: favoriteData.createdAt || serverTimestamp(),
      })

      // Optionally delete the old document
      // await deleteDoc(doc(db, "favorites", favoriteDoc.id));
    }

    // Migrate viewing history
    const userViewed = query(collection(db, "viewed"), where("userId", "==", userId))
    const userViewedSnapshot = await getDocs(userViewed)

    console.log(`Migrating ${userViewedSnapshot.size} history items for user ${userId}...`)

    for (const viewedDoc of userViewedSnapshot.docs) {
      const viewedData = viewedDoc.data()

      // Add to user's history subcollection
      await addDoc(collection(db, `users/${userId}/history`), {
        videoId: viewedData.videoId,
        video: viewedData.video,
        viewedAt: viewedData.viewedAt || serverTimestamp(),
      })

      // Optionally delete the old document
      // await deleteDoc(doc(db, "viewed", viewedDoc.id));
    }
  }

  console.log("Migration completed successfully!")
}

migrateUserData().catch((error) => {
  console.error("Migration failed:", error)
  process.exit(1)
})
