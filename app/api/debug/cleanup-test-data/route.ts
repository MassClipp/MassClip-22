import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { olderThanHours = 24, dryRun = false } = await request.json()

    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    const deletedItems = {
      purchases: 0,
      productBoxes: 0,
      uploads: 0,
      userPurchases: 0,
    }

    // Find test purchases to clean up
    const purchasesQuery = await db
      .collection("purchases")
      .where("metadata.createdBy", "in", ["debug-tool", "simulation-tool"])
      .where("createdAt", "<", cutoffTime)
      .get()

    const purchasesToDelete = purchasesQuery.docs
    const productBoxIds = new Set<string>()
    const userIds = new Set<string>()
    const itemIds = new Set<string>()

    // Collect related IDs
    for (const doc of purchasesToDelete) {
      const data = doc.data()
      if (data.productBoxId) productBoxIds.add(data.productBoxId)
      if (data.userId) userIds.add(data.userId)
      if (data.items) {
        data.items.forEach((itemId: string) => itemIds.add(itemId))
      }
    }

    if (!dryRun) {
      // Delete purchases
      const purchaseDeletePromises = purchasesToDelete.map((doc) => doc.ref.delete())
      await Promise.all(purchaseDeletePromises)
      deletedItems.purchases = purchasesToDelete.length

      // Delete product boxes
      const productBoxDeletePromises = Array.from(productBoxIds).map(async (id) => {
        const doc = await db.collection("productBoxes").doc(id).get()
        if (doc.exists && doc.data()?.metadata?.createdBy) {
          await doc.ref.delete()
          deletedItems.productBoxes++
        }
      })
      await Promise.all(productBoxDeletePromises)

      // Delete uploads
      const uploadDeletePromises = Array.from(itemIds).map(async (id) => {
        const doc = await db.collection("uploads").doc(id).get()
        if (doc.exists && doc.data()?.metadata?.createdBy) {
          await doc.ref.delete()
          deletedItems.uploads++
        }
      })
      await Promise.all(uploadDeletePromises)

      // Delete user purchase records
      const userPurchaseDeletePromises = Array.from(userIds).map(async (userId) => {
        const userPurchasesQuery = await db
          .collection("users")
          .doc(userId)
          .collection("purchases")
          .where("metadata.createdBy", "in", ["debug-tool", "simulation-tool"])
          .get()

        const deletePromises = userPurchasesQuery.docs.map((doc) => doc.ref.delete())
        await Promise.all(deletePromises)
        deletedItems.userPurchases += userPurchasesQuery.docs.length
      })
      await Promise.all(userPurchaseDeletePromises)
    } else {
      // Dry run - just count what would be deleted
      deletedItems.purchases = purchasesToDelete.length
      deletedItems.productBoxes = productBoxIds.size
      deletedItems.uploads = itemIds.size

      // Count user purchases
      for (const userId of userIds) {
        const userPurchasesQuery = await db
          .collection("users")
          .doc(userId)
          .collection("purchases")
          .where("metadata.createdBy", "in", ["debug-tool", "simulation-tool"])
          .get()
        deletedItems.userPurchases += userPurchasesQuery.docs.length
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      cutoffTime: cutoffTime.toISOString(),
      deletedItems,
      message: dryRun
        ? `Would delete ${Object.values(deletedItems).reduce((a, b) => a + b, 0)} items`
        : `Successfully deleted ${Object.values(deletedItems).reduce((a, b) => a + b, 0)} items`,
    })
  } catch (error: any) {
    console.error("Failed to cleanup test data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // Get statistics about test data
    const stats = {
      purchases: 0,
      productBoxes: 0,
      uploads: 0,
      oldestTestItem: null as Date | null,
      newestTestItem: null as Date | null,
    }

    // Count test purchases
    const purchasesQuery = await db
      .collection("purchases")
      .where("metadata.createdBy", "in", ["debug-tool", "simulation-tool"])
      .get()

    stats.purchases = purchasesQuery.docs.length

    // Find oldest and newest
    for (const doc of purchasesQuery.docs) {
      const createdAt = doc.data().createdAt?.toDate()
      if (createdAt) {
        if (!stats.oldestTestItem || createdAt < stats.oldestTestItem) {
          stats.oldestTestItem = createdAt
        }
        if (!stats.newestTestItem || createdAt > stats.newestTestItem) {
          stats.newestTestItem = createdAt
        }
      }
    }

    // Count test product boxes
    const productBoxesQuery = await db
      .collection("productBoxes")
      .where("metadata.createdBy", "in", ["debug-tool", "simulation-tool"])
      .get()

    stats.productBoxes = productBoxesQuery.docs.length

    // Count test uploads
    const uploadsQuery = await db
      .collection("uploads")
      .where("metadata.createdBy", "in", ["debug-tool", "simulation-tool"])
      .get()

    stats.uploads = uploadsQuery.docs.length

    return NextResponse.json({
      success: true,
      stats,
      recommendations: [
        stats.purchases > 100 ? "Consider cleaning up old test purchases" : null,
        stats.uploads > 500 ? "Large number of test uploads detected" : null,
        stats.oldestTestItem && Date.now() - stats.oldestTestItem.getTime() > 7 * 24 * 60 * 60 * 1000
          ? "Test data older than 7 days found"
          : null,
      ].filter(Boolean),
    })
  } catch (error: any) {
    console.error("Failed to get cleanup stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
