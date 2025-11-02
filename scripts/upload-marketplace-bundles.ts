/**
 * Upload generated bundles to Firebase
 * Run after seed-marketplace-bundles.py
 */

import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { readFileSync } from "fs"
import { join } from "path"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()

interface GeneratedBundle {
  title: string
  description: string
  creatorName: string
  creatorUsername: string
  price: number
  contentCount: number
  tags: string[]
  category: string
  niche: string
  rating: number
  reviewCount: number
  salesCount: number
  thumbnailQuery: string
  createdAt: string
}

async function uploadBundles() {
  console.log("📦 Loading generated bundles...")

  // Read the generated JSON file
  const bundlesData = JSON.parse(readFileSync(join(process.cwd(), "marketplace-bundles.json"), "utf-8"))

  console.log(`✅ Loaded ${bundlesData.length} bundles`)
  console.log("🚀 Starting upload to Firebase...")

  let successCount = 0
  let errorCount = 0

  for (const bundle of bundlesData as GeneratedBundle[]) {
    try {
      const bundleId = db.collection("bundles").doc().id

      const bundleData = {
        id: bundleId,
        title: bundle.title,
        description: bundle.description,
        price: bundle.price,
        currency: "usd",
        type: "one_time",
        billingType: "one_time",

        // Creator info (marketplace seed - no real creator)
        creatorId: "marketplace_seed",
        creatorName: bundle.creatorName,
        creatorUsername: bundle.creatorUsername,
        isMarketplaceSeed: true, // Flag to identify seeded bundles

        // Content metadata
        contentItems: [], // Empty for now - can be populated later
        detailedContentItems: [],
        contentMetadata: {
          totalItems: bundle.contentCount,
          totalSize: 0,
          totalSizeFormatted: "0 MB",
        },

        // Visual
        thumbnailUrl: `/placeholder.svg?height=400&width=600&query=${encodeURIComponent(bundle.thumbnailQuery)}`,
        coverImage: `/placeholder.svg?height=400&width=600&query=${encodeURIComponent(bundle.thumbnailQuery)}`,

        // Categorization
        category: bundle.category,
        niche: bundle.niche,
        tags: bundle.tags,

        // Social proof
        rating: bundle.rating,
        reviewCount: bundle.reviewCount,
        salesCount: bundle.salesCount,

        // Status
        status: "active",
        active: true,
        isPublic: true,

        // Timestamps
        createdAt: new Date(bundle.createdAt),
        updatedAt: new Date(),
      }

      await db.collection("bundles").doc(bundleId).set(bundleData)

      successCount++
      console.log(`✅ Uploaded: ${bundle.title} (${successCount}/${bundlesData.length})`)
    } catch (error) {
      errorCount++
      console.error(`❌ Error uploading ${bundle.title}:`, error)
    }
  }

  console.log("\n🎉 Upload complete!")
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
}

uploadBundles().catch(console.error)
