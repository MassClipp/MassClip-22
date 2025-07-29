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
  productBoxId?: string
  bundleId?: string
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
      bundleId?: string
      productBoxId?: string
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

      // Determine if this is a bundle or product box purchase
      const bundleId = purchaseData.bundleId
      const productBoxId = purchaseData.productBoxId
      const isBundle = !!bundleId
      const itemId = bundleId || productBoxId
      const itemType = isBundle ? "bundle" : "product_box"

      if (!itemId) {
        throw new Error("Either bundleId or productBoxId must be provided")
      }

      console.log(`📦 [Unified Purchase] Processing ${itemType} purchase: ${itemId}`)

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

      // Get item details from the appropriate collection
      const collection = isBundle ? "bundles" : "productBoxes"
      const itemDoc = await getDb().collection(collection).doc(itemId).get()
      if (!itemDoc.exists) {
        throw new Error(`${itemType} ${itemId} not found`)
      }
      const itemData = itemDoc.data()!

      // Get creator details
      const creatorDoc = await getDb().collection("users").doc(purchaseData.creatorId).get()
      const creatorData = creatorDoc.exists ? creatorDoc.data() : null

      // Get all content items for this item
      const contentItems = isBundle
        ? await this.fetchBundleContentItems(itemId)
        : await this.fetchAllContentItems(itemId)

      console.log(`📦 [Unified Purchase] Found ${contentItems.length} content items`)

      // Create unified purchase document
      const unifiedPurchase: UnifiedPurchase = {
        id: purchaseData.sessionId,
        bundleId: bundleId || null,
        productBoxId: productBoxId || null,
        itemId: itemId,
        productBoxTitle: itemData.title || `Untitled ${itemType}`,
        productBoxDescription: itemData.description || "",
        productBoxThumbnail: itemData.thumbnailUrl || itemData.customPreviewThumbnail || "",
        creatorId: purchaseData.creatorId,
        creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
        creatorUsername: creatorData?.username || "",

        // Enhanced user identification
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
        itemNames: contentItems.map((item) => item.displayTitle),
        contentTitles: contentItems.map((item) => item.displayTitle),
        totalItems: contentItems.length,
        totalSize: contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0),
      }

      console.log(`💾 [Unified Purchase] Saving unified purchase for ${itemType}:`, {
        userId: unifiedPurchase.userId,
        userEmail: unifiedPurchase.userEmail,
        userName: unifiedPurchase.userName,
        itemType,
        itemId,
        itemNames: unifiedPurchase.itemNames,
      })

      // Save to userPurchases collection
      const purchaseRef = doc(getDb(), "userPurchases", userId, "purchases", purchaseData.sessionId)
      await setDoc(purchaseRef, unifiedPurchase)

      // Also save to appropriate purchases collection for easy access
      const purchasesCollection = isBundle ? "bundlePurchases" : "productBoxPurchases"
      await setDoc(doc(getDb(), purchasesCollection, purchaseData.sessionId), unifiedPurchase)

      console.log(`✅ [Unified Purchase] Created unified purchase ${purchaseData.sessionId} for ${itemType} ${itemId}`)
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
   * Fetch content items specifically for bundles
   */
  private static async fetchBundleContentItems(bundleId: string): Promise<UnifiedPurchaseItem[]> {
    const items: UnifiedPurchaseItem[] = []

    try {
      console.log(`📊 [Bundle Content Fetch] Fetching content for bundle: ${bundleId}`)

      // Get the bundle document
      const bundleDoc = await getDb().collection("bundles").doc(bundleId).get()

      if (!bundleDoc.exists) {
        console.error(`❌ [Bundle Content Fetch] Bundle ${bundleId} not found`)
        return []
      }

      const bundleData = bundleDoc.data()!
      console.log(`📦 [Bundle Content Fetch] Bundle data:`, {
        title: bundleData.title,
        fileUrl: bundleData.downloadUrl || bundleData.fileUrl,
        fileSize: bundleData.fileSize,
        fileType: bundleData.fileType,
      })

      // For bundles, the bundle itself is typically the content item
      if (bundleData.downloadUrl || bundleData.fileUrl) {
        const item = this.normalizeBundleItem(bundleId, bundleData)
        if (item) {
          items.push(item)
          console.log(`✅ [Bundle Content Fetch] Added bundle as content item`)
        }
      }

      // Also check if the bundle has associated content items
      if (bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
        console.log(`📊 [Bundle Content Fetch] Bundle has ${bundleData.contentItems.length} associated content items`)

        for (const contentItemId of bundleData.contentItems) {
          try {
            const contentDoc = await getDb().collection("uploads").doc(contentItemId).get()
            if (contentDoc.exists) {
              const contentData = contentDoc.data()!
              const item = this.normalizeContentItem(contentItemId, contentData, "uploads (via bundle)")
              if (item) items.push(item)
            }
          } catch (error) {
            console.warn(`⚠️ [Bundle Content Fetch] Error fetching content item ${contentItemId}:`, error)
          }
        }
      }

      console.log(`✅ [Bundle Content Fetch] Total items found: ${items.length}`)
      return items
    } catch (error) {
      console.error(`❌ [Bundle Content Fetch] Error fetching bundle content:`, error)
      return []
    }
  }

  /**
   * Normalize bundle data into a content item
   */
  private static normalizeBundleItem(id: string, data: any): UnifiedPurchaseItem | null {
    try {
      const fileUrl = data.downloadUrl || data.fileUrl || ""

      if (!fileUrl || !fileUrl.startsWith("http")) {
        console.warn(`⚠️ [Bundle Normalize] Skipping bundle ${id} - no valid URL`)
        return null
      }

      // Determine content type from file type
      const fileType = data.fileType || data.mimeType || "application/octet-stream"
      let contentType: "video" | "audio" | "image" | "document" = "document"

      if (fileType.toLowerCase().includes("video") || fileUrl.toLowerCase().includes(".mp4")) {
        contentType = "video"
      } else if (fileType.toLowerCase().includes("audio") || fileUrl.toLowerCase().includes(".mp3")) {
        contentType = "audio"
      } else if (fileType.toLowerCase().includes("image") || fileUrl.toLowerCase().includes(".jpg")) {
        contentType = "image"
      }

      const displayTitle = data.title || `Bundle ${id.slice(-6)}`
      const fileSize = data.fileSize || data.size || 0

      const item: UnifiedPurchaseItem = {
        id,
        title: displayTitle,
        fileUrl,
        mimeType: fileType,
        fileSize,
        thumbnailUrl: data.thumbnailUrl || "",
        contentType,
        duration: data.duration || undefined,
        filename: data.filename || `${displayTitle}.${this.getFileExtension(fileType)}`,

        // Display formatting
        displayTitle,
        displaySize: this.formatFileSize(fileSize),
        displayDuration: data.duration ? this.formatDuration(data.duration) : undefined,

        // Additional metadata
        description: data.description || undefined,
        tags: data.tags || [],
        category: data.category || undefined,
        uploadedAt: data.createdAt || new Date(),
        creatorId: data.creatorId || undefined,
        isPublic: data.isPublic !== false,
      }

      console.log(`✅ [Bundle Normalize] Normalized bundle item:`, {
        id: item.id,
        title: item.displayTitle,
        contentType: item.contentType,
        size: item.displaySize,
        hasValidUrl: !!item.fileUrl,
      })

      return item
    } catch (error) {
      console.error(`❌ [Bundle Normalize] Error normalizing bundle ${id}:`, error)
      return null
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
