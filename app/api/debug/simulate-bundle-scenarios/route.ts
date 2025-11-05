import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

interface ScenarioConfig {
  name: string
  description: string
  itemCount: number
  failureRate: number
  contentTypes: string[]
  sizeRange: [number, number]
  specialConditions?: string[]
}

const SCENARIOS: Record<string, ScenarioConfig> = {
  perfect: {
    name: "Perfect Bundle",
    description: "All items valid and accessible",
    itemCount: 10,
    failureRate: 0,
    contentTypes: ["video/mp4", "audio/mp3", "image/jpeg"],
    sizeRange: [1000000, 50000000], // 1MB to 50MB
  },
  mixed_content: {
    name: "Mixed Content Types",
    description: "Various content types with some issues",
    itemCount: 25,
    failureRate: 0.2,
    contentTypes: ["video/mp4", "audio/mp3", "image/jpeg", "application/pdf", "text/plain"],
    sizeRange: [100000, 100000000], // 100KB to 100MB
  },
  large_bundle: {
    name: "Large Bundle",
    description: "100+ items with various sizes",
    itemCount: 150,
    failureRate: 0.1,
    contentTypes: ["video/mp4", "audio/mp3"],
    sizeRange: [10000000, 500000000], // 10MB to 500MB
  },
  high_failure: {
    name: "High Failure Rate",
    description: "Many broken or missing items",
    itemCount: 20,
    failureRate: 0.6,
    contentTypes: ["video/mp4", "audio/mp3", "image/jpeg"],
    sizeRange: [1000000, 50000000],
    specialConditions: ["broken_urls", "missing_files", "invalid_metadata"],
  },
  edge_cases: {
    name: "Edge Cases",
    description: "Unusual file types and edge conditions",
    itemCount: 15,
    failureRate: 0.3,
    contentTypes: ["video/webm", "audio/ogg", "image/webp", "application/zip", "text/csv"],
    sizeRange: [1, 1000000000], // 1 byte to 1GB
    specialConditions: ["zero_size", "huge_size", "special_chars", "unicode_names"],
  },
}

export async function POST(request: NextRequest) {
  try {
    const { scenario = "perfect", customConfig } = await request.json()

    const config = customConfig || SCENARIOS[scenario]
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown scenario: ${scenario}. Available: ${Object.keys(SCENARIOS).join(", ")}`,
        },
        { status: 400 },
      )
    }

    const simulationId = `sim_${scenario}_${Date.now()}`
    const bundleId = `bundle_${simulationId}`
    const userId = `user_${simulationId}`

    // Generate items based on scenario
    const items = []
    for (let i = 0; i < config.itemCount; i++) {
      const shouldFail = Math.random() < config.failureRate
      const contentType = config.contentTypes[Math.floor(Math.random() * config.contentTypes.length)]
      const size = Math.floor(Math.random() * (config.sizeRange[1] - config.sizeRange[0])) + config.sizeRange[0]

      const itemId = `item_${simulationId}_${i + 1}`
      const item = {
        id: itemId,
        title: `${config.name} Item ${i + 1}`,
        filename: `${itemId}.${getFileExtension(contentType)}`,
        fileUrl: shouldFail ? "https://broken-url.example.com/file" : `https://cdn.example.com/${itemId}`,
        fileSize: config.specialConditions?.includes("zero_size") && i === 0 ? 0 : size,
        mimeType: contentType,
        fileType: contentType,
        thumbnailUrl: shouldFail ? null : `https://cdn.example.com/${itemId}_thumb.jpg`,
        uploaderId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          scenario,
          simulationId,
          shouldFail,
          itemIndex: i,
        },
      }

      // Apply special conditions
      if (config.specialConditions) {
        if (config.specialConditions.includes("special_chars") && i % 5 === 0) {
          item.title = `Special!@#$%^&*()_+{}|:"<>?[]\\;',./ Item ${i + 1}`
          item.filename = `special!@#$%^&*()_+{}|:"<>?[]\\;',./${itemId}.${getFileExtension(contentType)}`
        }
        if (config.specialConditions.includes("unicode_names") && i % 7 === 0) {
          item.title = `🎬🎵📸 Unicode Item ${i + 1} 中文 العربية русский`
          item.filename = `unicode_${itemId}_中文_العربية_русский.${getFileExtension(contentType)}`
        }
        if (config.specialConditions.includes("huge_size") && i === config.itemCount - 1) {
          item.fileSize = 5000000000 // 5GB
        }
      }

      items.push(item)
    }

    // Create bundle in Firestore
    const bundleData = {
      id: bundleId,
      title: `${config.name} - Simulation`,
      description: config.description,
      price: 999,
      currency: "usd",
      creatorId: userId,
      active: true,
      contentItems: items.map((item) => item.id),
      detailedContentItems: items,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        scenario,
        simulationId,
        itemCount: config.itemCount,
        failureRate: config.failureRate,
        createdBy: "simulation-tool",
      },
    }

    await db.collection("productBoxes").doc(bundleId).set(bundleData)

    // Create individual upload records (only for non-failing items)
    const uploadPromises = items
      .filter((item) => !item.metadata.shouldFail)
      .map((item) => db.collection("uploads").doc(item.id).set(item))

    await Promise.all(uploadPromises)

    // Create simulation purchase record
    const sessionId = `cs_test_${simulationId}`
    const purchaseData = {
      sessionId,
      userId,
      productBoxId: bundleId,
      status: "completed",
      amount: 999,
      currency: "usd",
      items: items.map((item) => item.id),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        scenario,
        simulationId,
        createdBy: "simulation-tool",
      },
    }

    await db.collection("purchases").doc(sessionId).set(purchaseData)

    // Create user access record
    await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .doc(sessionId)
      .set({
        productBoxId: bundleId,
        sessionId,
        status: "completed",
        purchasedAt: new Date(),
        items: items.map((item) => item.id),
        metadata: {
          scenario,
          simulationId,
          createdBy: "simulation-tool",
        },
      })

    // Calculate expected results
    const expectedResults = {
      totalItems: items.length,
      validItems: items.filter((item) => !item.metadata.shouldFail).length,
      invalidItems: items.filter((item) => item.metadata.shouldFail).length,
      totalSize: items.reduce((sum, item) => sum + item.fileSize, 0),
      contentTypes: [...new Set(items.map((item) => item.mimeType))],
      specialConditions: config.specialConditions || [],
    }

    return NextResponse.json({
      success: true,
      data: {
        simulationId,
        sessionId,
        bundleId,
        userId,
        scenario: config.name,
        description: config.description,
        expectedResults,
        debugUrl: `/debug-purchase-comprehensive?sessionId=${sessionId}&userId=${userId}&simulationMode=true`,
        message: `Simulation "${config.name}" created successfully`,
      },
    })
  } catch (error: any) {
    console.error("Failed to create bundle simulation:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "application/zip": "zip",
    "text/plain": "txt",
    "text/csv": "csv",
  }
  return extensions[mimeType] || "bin"
}

export async function GET() {
  return NextResponse.json({
    success: true,
    scenarios: Object.entries(SCENARIOS).map(([key, config]) => ({
      key,
      name: config.name,
      description: config.description,
      itemCount: config.itemCount,
      failureRate: config.failureRate,
      contentTypes: config.contentTypes,
      specialConditions: config.specialConditions || [],
    })),
  })
}
