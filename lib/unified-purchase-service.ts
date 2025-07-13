import { db as adminDb } from "@/lib/firebase-admin"
import { db as clientDb } from "@/lib/firebase"
import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore"

// Use admin DB for server-side operations, client DB for client-side
const getDb = () => {
  if (typeof window === "undefined") {
    return adminDb // Server-side
  } else {
    return clientDb // Client-side
  }
}

export interface UnifiedPurchaseItem {
  id: string
  title: string
  fileUrl: string
  mimeType: string
  fileSize: number
  thumbnailUrl?: string
  contentType: "video" | "audio" | "image" | "document"
  duration?: number
  filename: string

  // Enhanced metadata matching UI display
  resolution?: string
  width?: number
  height?: number
  aspectRatio?: string
  quality?: string
  format?: string
  codec?: string
  bitrate?: number
  frameRate?: number
  audioCodec?: string
  audioSampleRate?: number

  // Display formatting (exactly as shown in UI)
  displayTitle: string
  displaySize: string
  displayResolution?: string
  displayDuration?: string

  // Additional metadata
  description?: string
  tags?: string[]
  category?: string
  uploadedAt?: Date
  creatorId?: string
  encoding?: string
  isPublic?: boolean
}

export interface UnifiedPurchase {
  id: string
  productBoxId: string
  itemId?: string // Add compatibility field
  productBoxTitle: string
  productBoxDescription?: string
  productBoxThumbnail?: string
  creatorId: string
  creatorName: string
  creatorUsername: string

  // Enhanced user identification
  buyerUid: string
  userId: string
  userEmail: string
  userName: string
  isAuthenticated: boolean

  purchasedAt: Date
  amount: number
  currency: string
  sessionId: string
  items: UnifiedPurchaseItem[]
  itemNames: string[] // Explicit content names
  contentTitles: string[] // Alternative field name
  totalItems: number
  totalSize: number
}

export class UnifiedPurchaseService {
  /**
   * Create a unified purchase record after successful payment
   */
  static async createUnifiedPurchase(
    userId: string,
    purchaseData: {
      productBoxId: string
      sessionId: string
      amount: number
      currency: string
      creatorId: string
      userEmail?: string
      userName?: string
    },
  ): Promise<string> {
    try {
      console.log(`🔄 [Unified Purchase] Creating unified purchase for user ${userId}`)

      // Get user details if authenticated
      let userEmail = purchaseData.userEmail || ""
      let userName = purchaseData.userName || "Anonymous User"
      const isAuthenticated = userId !== "anonymous"

      if (isAuthenticated && typeof window === "undefined") {
        // Server-side: try to get user details from Firebase Auth
        try {
          const { auth } = await import("@/lib/firebase-admin")
          const userRecord = await auth.getUser(userId)
          userEmail = userRecord.email || userEmail
          userName = userRecord.displayName || userRecord.email?.split("@")[0] || userName
          console.log(`✅ [Unified Purchase] User details retrieved: ${userName} (${userEmail})`)
        } catch (error) {
          console.warn(`⚠️ [Unified Purchase] Could not retrieve user details:`, error)
        }
      }

      // Get product box details
      const productBoxDoc = await getDb().collection("productBoxes").doc(purchaseData.productBoxId).get()
      if (!productBoxDoc.exists) {
        throw new Error(`Product box ${purchaseData.productBoxId} not found`)
      }
      const productBoxData = productBoxDoc.data()!

      // Get creator details
      const creatorDoc = await getDb().collection("users").doc(purchaseData.creatorId).get()
      const creatorData = creatorDoc.exists ? creatorDoc.data() : null

      // Get all content items for this product box with enhanced metadata
      const contentItems = await this.fetchAllContentItems(purchaseData.productBoxId)

      console.log(`📦 [Unified Purchase] Found ${contentItems.length} content items`)

      // Create unified purchase document with proper user identification
      const unifiedPurchase: UnifiedPurchase = {
        id: purchaseData.sessionId,
        productBoxId: purchaseData.productBoxId, // Primary field
        itemId: purchaseData.productBoxId, // Compatibility field
        productBoxTitle: productBoxData.title || "Untitled Product Box",
        productBoxDescription: productBoxData.description || "",
        productBoxThumbnail: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail || "",
        creatorId: purchaseData.creatorId,
        creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
        creatorUsername: creatorData?.username || "",

        // Enhanced user identification - CRITICAL FIX
        buyerUid: userId,
        userId: userId,
        userEmail: userEmail,
        userName: userName,
        isAuthenticated: isAuthenticated,

        purchasedAt: new Date(),
        amount: purchaseData.amount,
        currency: purchaseData.currency,
        sessionId: purchaseData.sessionId,
        items: contentItems,
        itemNames: contentItems.map((item) => item.displayTitle), // Explicit content names
        contentTitles: contentItems.map((item) => item.displayTitle), // Alternative field
        totalItems: contentItems.length,
        totalSize: contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0),
      }

      console.log(`💾 [Unified Purchase] Saving unified purchase with user identification:`, {
        userId: unifiedPurchase.userId,
        userEmail: unifiedPurchase.userEmail,
        userName: unifiedPurchase.userName,
        isAuthenticated: unifiedPurchase.isAuthenticated,
        itemNames: unifiedPurchase.itemNames,
      })

      // Save to userPurchases collection
      const purchaseRef = doc(getDb(), "userPurchases", userId, "purchases", purchaseData.sessionId)
      await setDoc(purchaseRef, unifiedPurchase)

      // Also save to bundlePurchases collection for easy access
      await setDoc(doc(getDb(), "bundlePurchases", purchaseData.sessionId), unifiedPurchase)

      console.log(
        `✅ [Unified Purchase] Created unified purchase ${purchaseData.sessionId} for user ${userId} (${userName})`,
      )
      return purchaseData.sessionId
    } catch (error) {
      console.error(`❌ [Unified Purchase] Error creating unified purchase:`, error)
      throw error
    }
  }

  /**
   * Fetch all content items for a product box from various sources with enhanced metadata
   */
  private static async fetchAllContentItems(productBoxId: string): Promise<UnifiedPurchaseItem[]> {
    const items: UnifiedPurchaseItem[] = []

    try {
      console.log(`📊 [Content Fetch] Starting comprehensive content fetch for: ${productBoxId}`)

      // Method 1: Try uploads collection first (most comprehensive data)
      const uploadsQuery = query(collection(getDb(), "uploads"), where("productBoxId", "==", productBoxId))
      const uploadsSnapshot = await getDocs(uploadsQuery)

      console.log(`📊 [Content Fetch] uploads query found ${uploadsSnapshot.size} items`)

      uploadsSnapshot.forEach((doc) => {
        const data = doc.data()
        const item = this.normalizeContentItem(doc.id, data, "uploads")
        if (item) items.push(item)
      })

      // Method 2: Try productBoxContent collection and cross-reference with uploads
      if (items.length === 0) {
        const contentQuery = query(collection(getDb(), "productBoxContent"), where("productBoxId", "==", productBoxId))
        const contentSnapshot = await getDocs(contentQuery)

        console.log(`📊 [Content Fetch] productBoxContent query found ${contentSnapshot.size} items`)

        for (const doc of contentSnapshot.docs) {
          const data = doc.data()
          let enhancedData = data

          // If we have an uploadId, try to get the full upload data
          if (data.uploadId) {
            try {
              const uploadDoc = await getDoc(doc(getDb(), "uploads", data.uploadId))
              if (uploadDoc.exists()) {
                enhancedData = { ...data, ...uploadDoc.data() }
                console.log(`✅ [Content Fetch] Enhanced data from uploads for: ${data.uploadId}`)
              }
            } catch (error) {
              console.warn(`⚠️ [Content Fetch] Could not fetch upload data for: ${data.uploadId}`)
            }
          }

          const item = this.normalizeContentItem(doc.id, enhancedData, "productBoxContent")
          if (item) items.push(item)
        }
      }

      // Method 3: Try with boxId field
      if (items.length === 0) {
        const boxIdQuery = query(collection(getDb(), "productBoxContent"), where("boxId", "==", productBoxId))
        const boxIdSnapshot = await getDocs(boxIdQuery)

        console.log(`📊 [Content Fetch] boxId query found ${boxIdSnapshot.size} items`)

        boxIdSnapshot.forEach((doc) => {
          const data = doc.data()
          const item = this.normalizeContentItem(doc.id, data, "productBoxContent (boxId)")
          if (item) items.push(item)
        })
      }

      // Method 4: Check product box contentItems array
      if (items.length === 0) {
        const productBoxDoc = await getDb().collection("productBoxes").doc(productBoxId).get()
        if (productBoxDoc.exists) {
          const productBoxData = productBoxDoc.data()!
          const contentItemIds = productBoxData.contentItems || []

          console.log(`📊 [Content Fetch] Product box has ${contentItemIds.length} content item IDs`)

          for (const itemId of contentItemIds) {
            try {
              const uploadDoc = await getDb().collection("uploads").doc(itemId).get()
              if (uploadDoc.exists) {
                const data = uploadDoc.data()!
                const item = this.normalizeContentItem(itemId, data, "uploads (via productBox)")
                if (item) items.push(item)
              }
            } catch (error) {
              console.warn(`⚠️ [Content Fetch] Error fetching upload ${itemId}:`, error)
            }
          }
        }
      }

      console.log(`✅ [Content Fetch] Total items found: ${items.length}`)
      console.log(
        `📝 [Content Fetch] Item details:`,
        items.map((item) => ({
          title: item.displayTitle,
          contentType: item.contentType,
          fileSize: item.displaySize,
          hasValidUrl: !!item.fileUrl && item.fileUrl.startsWith("http"),
        })),
      )

      return items
    } catch (error) {
      console.error(`❌ [Content Fetch] Error fetching content items:`, error)
      return []
    }
  }

  /**
   * Normalize content item data with comprehensive metadata and validation
   */
  private static normalizeContentItem(id: string, data: any, source: string): UnifiedPurchaseItem | null {
    try {
      // Get the best available URL with validation
      const fileUrl = data.fileUrl || data.publicUrl || data.downloadUrl || ""

      // Skip items without valid URLs
      if (!fileUrl || !fileUrl.startsWith("http")) {
        console.warn(`⚠️ [Content Normalize] Skipping item ${id} from ${source} - no valid URL (${fileUrl})`)
        return null
      }

      // Determine content type with better detection
      const mimeType = data.mimeType || data.fileType || "application/octet-stream"
      let contentType: "video" | "audio" | "image" | "document" = "document"

      if (mimeType.startsWith("video/")) {
        contentType = "video"
      } else if (mimeType.startsWith("audio/")) {
        contentType = "audio"
      } else if (mimeType.startsWith("image/")) {
        contentType = "image"
      } else if (fileUrl) {
        // Fallback: check file extension in URL
        const url = fileUrl.toLowerCase()
        if (
          url.includes(".mp4") ||
          url.includes(".mov") ||
          url.includes(".avi") ||
          url.includes(".mkv") ||
          url.includes(".webm")
        ) {
          contentType = "video"
          console.log(`🔍 [Content Normalize] Detected video from URL for ${id}`)
        } else if (url.includes(".mp3") || url.includes(".wav")) {
          contentType = "audio"
        } else if (url.includes(".jpg") || url.includes(".jpeg") || url.includes(".png") || url.includes(".gif")) {
          contentType = "image"
        }
      }

      // Get the best available title with multiple fallbacks
      const rawTitle =
        data.title || data.filename || data.originalFileName || data.name || `Content Item ${id.slice(-6)}`

      // Clean up the title - remove file extensions
      const displayTitle = rawTitle.replace(/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|jpg|jpeg|png|gif|pdf)$/i, "")

      // Format display values exactly as shown in UI
      const fileSize = data.fileSize || data.size || 0
      const displaySize = this.formatFileSize(fileSize)
      const displayResolution = data.resolution || (data.height ? `${data.height}p` : undefined)
      const displayDuration = data.duration ? this.formatDuration(data.duration) : undefined

      const item: UnifiedPurchaseItem = {
        // Basic metadata
        id,
        title: displayTitle,
        fileUrl,
        mimeType,
        fileSize,
        thumbnailUrl: data.thumbnailUrl || data.previewUrl || "",
        contentType,
        duration: data.duration || data.videoDuration || undefined,
        filename: data.filename || data.originalFileName || `${displayTitle}.${this.getFileExtension(mimeType)}`,

        // Enhanced video metadata
        resolution: data.resolution || data.videoResolution || undefined,
        width: data.width || data.videoWidth || undefined,
        height: data.height || data.videoHeight || undefined,
        aspectRatio: data.aspectRatio || undefined,
        quality: data.quality || (data.height >= 1080 ? "HD" : data.height >= 720 ? "HD" : "SD"),
        format: data.format || data.videoFormat || undefined,
        codec: data.codec || data.videoCodec || undefined,
        bitrate: data.bitrate || data.videoBitrate || undefined,
        frameRate: data.frameRate || data.fps || undefined,
        audioCodec: data.audioCodec || undefined,
        audioSampleRate: data.audioSampleRate || undefined,

        // Display formatting (matching UI exactly)
        displayTitle,
        displaySize,
        displayResolution,
        displayDuration,

        // Additional metadata
        description: data.description || undefined,
        tags: data.tags || [],
        category: data.category || undefined,
        uploadedAt: data.uploadedAt || data.createdAt || new Date(),
        creatorId: data.creatorId || data.userId || undefined,
        encoding: data.encoding || undefined,
        isPublic: data.isPublic !== false,
      }

      console.log(`✅ [Content Normalize] Enhanced item from ${source}:`, {
        id: item.id,
        title: item.displayTitle,
        contentType: item.contentType,
        size: item.displaySize,
        duration: item.displayDuration,
        resolution: item.displayResolution,
        hasValidUrl: !!item.fileUrl && item.fileUrl.startsWith("http"),
        hasThumbnail: !!item.thumbnailUrl,
      })

      return item
    } catch (error) {
      console.error(`❌ [Content Normalize] Error normalizing item ${id} from ${source}:`, error)
      return null
    }
  }

  /**
   * Format file size exactly as shown in UI
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  /**
   * Format duration exactly as shown in UI
   */
  private static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  /**
   * Get file extension from MIME type
   */
  private static getFileExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "image/jpeg": "jpg",
      "image/png": "png",
      "application/pdf": "pdf",
    }
    return extensions[mimeType] || "file"
  }

  /**
   * Get all purchases for a user with proper identification
   */
  static async getUserPurchases(userId: string): Promise<UnifiedPurchase[]> {
    try {
      console.log(`🔍 [Unified Purchase] Fetching purchases for user ${userId}`)

      const purchasesRef = collection(getDb(), "userPurchases", userId, "purchases")
      const purchasesQuery = query(purchasesRef, orderBy("purchasedAt", "desc"))
      const snapshot = await getDocs(purchasesQuery)

      const purchases: UnifiedPurchase[] = []
      snapshot.forEach((doc) => {
        const data = doc.data() as UnifiedPurchase
        purchases.push({
          ...data,
          purchasedAt: data.purchasedAt || new Date(),
          // Ensure user identification fields are present
          buyerUid: data.buyerUid || userId,
          userId: data.userId || userId,
          userEmail: data.userEmail || "",
          userName: data.userName || "User",
          isAuthenticated: data.isAuthenticated !== false,
          itemNames: data.itemNames || data.items?.map((item) => item.displayTitle) || [],
          contentTitles: data.contentTitles || data.items?.map((item) => item.displayTitle) || [],
        })
      })

      console.log(`✅ [Unified Purchase] Found ${purchases.length} purchases for user ${userId}`)
      return purchases
    } catch (error) {
      console.error(`❌ [Unified Purchase] Error fetching user purchases:`, error)
      return []
    }
  }

  /**
   * Get a specific purchase for a user
   */
  static async getUserPurchase(userId: string, purchaseId: string): Promise<UnifiedPurchase | null> {
    try {
      const purchaseRef = doc(getDb(), "userPurchases", userId, "purchases", purchaseId)
      const purchaseDoc = await getDoc(purchaseRef)

      if (!purchaseDoc.exists) {
        return null
      }

      const data = purchaseDoc.data() as UnifiedPurchase
      return {
        ...data,
        purchasedAt: data.purchasedAt || new Date(),
        // Ensure user identification fields are present
        buyerUid: data.buyerUid || userId,
        userId: data.userId || userId,
        userEmail: data.userEmail || "",
        userName: data.userName || "User",
        isAuthenticated: data.isAuthenticated !== false,
        itemNames: data.itemNames || data.items?.map((item) => item.displayTitle) || [],
        contentTitles: data.contentTitles || data.items?.map((item) => item.displayTitle) || [],
      }
    } catch (error) {
      console.error(`❌ [Unified Purchase] Error fetching purchase ${purchaseId}:`, error)
      return null
    }
  }

  /**
   * Check if user has purchased a specific product box
   */
  static async hasUserPurchased(userId: string, productBoxId: string): Promise<boolean> {
    try {
      const purchasesRef = collection(getDb(), "userPurchases", userId, "purchases")
      const purchasesQuery = query(purchasesRef, where("productBoxId", "==", productBoxId))
      const snapshot = await getDocs(purchasesQuery)

      return !snapshot.empty
    } catch (error) {
      console.error(`❌ [Unified Purchase] Error checking purchase status:`, error)
      return false
    }
  }
}
