import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error)
  }
}

const db = getFirestore()

export interface BundleContentItem {
  id: string
  title: string
  filename: string
  originalFileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  category: string
  contentType: string
  r2Key?: string
  bucketName?: string
  uploadedAt: any // Firestore Timestamp
  createdAt: any // Firestore Timestamp
  updatedAt: any // Firestore Timestamp
  creatorId: string
  bundleId: string
  status: string
}

export interface BundleDiagnosticResult {
  bundleId: string
  bundleTitle: string
  contentCount: number
  contentItemsWithMissingUrls: number
  contentItemsWithMissingMetadata: number
  contentItemsWithInconsistentData: number
  urlFieldConsistency: {
    hasFileUrl: number
    hasPublicUrl: number
    hasDownloadUrl: number
    missingAllUrls: number
  }
  metadataFieldsPresence: {
    [key: string]: {
      present: number
      missing: number
      percentage: number
    }
  }
  cloudflareR2Consistency: {
    hasR2Key: number
    hasBucketName: number
    hasPublicDomain: number
    missingR2Metadata: number
  }
  contentTypeDistribution: {
    [key: string]: number
  }
  issues: DiagnosticIssue[]
  recommendations: string[]
  overallHealth: "good" | "fair" | "poor"
  timestamp: string
}

export interface DiagnosticIssue {
  severity: "high" | "medium" | "low"
  type: string
  description: string
  affectedItems: number
  recommendation: string
}

export interface BundleDiagnosticSummary {
  totalBundles: number
  totalContentItems: number
  bundlesWithIssues: number
  contentItemsWithIssues: number
  severityDistribution: {
    high: number
    medium: number
    low: number
  }
  commonIssues: {
    type: string
    count: number
    percentage: number
  }[]
  overallSystemHealth: "good" | "fair" | "poor"
}

/**
 * Runs a comprehensive diagnostic on a specific bundle
 */
export async function diagnoseBundleIntegrity(bundleId: string): Promise<BundleDiagnosticResult> {
  console.log(`🔍 [Bundle Diagnostic] Starting diagnostic for bundle: ${bundleId}`)

  try {
    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      throw new Error(`Bundle with ID ${bundleId} not found`)
    }

    const bundle = { id: bundleDoc.id, ...bundleDoc.data() } as any

    // Initialize diagnostic result
    const result: BundleDiagnosticResult = {
      bundleId: bundle.id,
      bundleTitle: bundle.title || "Unnamed Bundle",
      contentCount: 0,
      contentItemsWithMissingUrls: 0,
      contentItemsWithMissingMetadata: 0,
      contentItemsWithInconsistentData: 0,
      urlFieldConsistency: {
        hasFileUrl: 0,
        hasPublicUrl: 0,
        hasDownloadUrl: 0,
        missingAllUrls: 0,
      },
      metadataFieldsPresence: {},
      cloudflareR2Consistency: {
        hasR2Key: 0,
        hasBucketName: 0,
        hasPublicDomain: 0,
        missingR2Metadata: 0,
      },
      contentTypeDistribution: {},
      issues: [],
      recommendations: [],
      overallHealth: "good",
      timestamp: new Date().toISOString(),
    }

    // Get content items from both collections for comparison
    const contentItems: BundleContentItem[] = []

    // Check if bundle has contentItems array
    if (!bundle.contentItems || !Array.isArray(bundle.contentItems)) {
      result.issues.push({
        severity: "high",
        type: "missing_content_array",
        description: "Bundle does not have a contentItems array or it's not properly formatted",
        affectedItems: 1,
        recommendation: "Initialize the contentItems array for this bundle",
      })
      result.overallHealth = "poor"
      return result
    }

    // First check: Get content from the bundle's subcollection (new structure)
    const bundleContentsSnapshot = await db.collection("bundles").doc(bundleId).collection("contents").get()

    bundleContentsSnapshot.forEach((doc) => {
      contentItems.push({
        id: doc.id,
        ...doc.data(),
      } as BundleContentItem)
    })

    // Second check: Get content from the bundleContent collection (legacy structure)
    // This uses a query to find content items associated with this bundle
    const legacyContentSnapshot = await db.collection("bundleContent").where("bundleId", "==", bundleId).get()

    // Add any items found in the legacy collection that aren't already in our array
    legacyContentSnapshot.forEach((doc) => {
      const data = doc.data() as BundleContentItem
      // Check if this item is already in our array by comparing content ID
      const exists = contentItems.some((item) => item.id === data.id || item.id === doc.id)
      if (!exists) {
        contentItems.push({
          id: doc.id,
          ...data,
        } as BundleContentItem)
      }
    })

    // Update content count
    result.contentCount = contentItems.length

    // If no content items found, add an issue
    if (contentItems.length === 0) {
      result.issues.push({
        severity: "medium",
        type: "empty_bundle",
        description: "Bundle does not contain any content items",
        affectedItems: 1,
        recommendation: "Add content to this bundle or consider removing it if unused",
      })
      result.overallHealth = "fair"
      return result
    }

    // Initialize metadata fields tracking
    const metadataFields = [
      "title",
      "filename",
      "originalFileName",
      "fileUrl",
      "fileSize",
      "mimeType",
      "category",
      "contentType",
      "r2Key",
      "bucketName",
      "uploadedAt",
      "createdAt",
      "updatedAt",
      "creatorId",
      "bundleId",
      "status",
    ]

    metadataFields.forEach((field) => {
      result.metadataFieldsPresence[field] = {
        present: 0,
        missing: 0,
        percentage: 0,
      }
    })

    // Analyze each content item
    contentItems.forEach((item) => {
      // Track content type distribution
      const contentType = item.contentType || item.category || "unknown"
      result.contentTypeDistribution[contentType] = (result.contentTypeDistribution[contentType] || 0) + 1

      // Check URL field consistency
      let hasAnyUrl = false

      if (item.fileUrl) {
        result.urlFieldConsistency.hasFileUrl++
        hasAnyUrl = true
      }

      // Check for legacy URL fields
      if ((item as any).publicUrl) {
        result.urlFieldConsistency.hasPublicUrl++
        hasAnyUrl = true
      }

      if ((item as any).downloadUrl) {
        result.urlFieldConsistency.hasDownloadUrl++
        hasAnyUrl = true
      }

      if (!hasAnyUrl) {
        result.urlFieldConsistency.missingAllUrls++
        result.contentItemsWithMissingUrls++
      }

      // Check Cloudflare R2 metadata
      if (item.r2Key) {
        result.cloudflareR2Consistency.hasR2Key++
      }

      if (item.bucketName) {
        result.cloudflareR2Consistency.hasBucketName++
      }

      // Check for public domain in any URL field
      const hasPublicDomain =
        (item.fileUrl && item.fileUrl.includes("r2.dev")) ||
        ((item as any).publicUrl && (item as any).publicUrl.includes("r2.dev")) ||
        ((item as any).downloadUrl && (item as any).downloadUrl.includes("r2.dev"))

      if (hasPublicDomain) {
        result.cloudflareR2Consistency.hasPublicDomain++
      }

      // If missing R2 metadata but has R2 URL
      if (hasPublicDomain && (!item.r2Key || !item.bucketName)) {
        result.cloudflareR2Consistency.missingR2Metadata++
      }

      // Check metadata field presence
      let missingMetadataCount = 0

      metadataFields.forEach((field) => {
        if (item[field as keyof BundleContentItem]) {
          result.metadataFieldsPresence[field].present++
        } else {
          result.metadataFieldsPresence[field].missing++
          missingMetadataCount++
        }
      })

      // Count items with significant missing metadata
      if (missingMetadataCount > 3) {
        result.contentItemsWithMissingMetadata++
      }

      // Check for data inconsistencies
      const inconsistencies = checkItemConsistency(item)
      if (inconsistencies) {
        result.contentItemsWithInconsistentData++
      }
    })

    // Calculate percentages for metadata fields
    Object.keys(result.metadataFieldsPresence).forEach((field) => {
      const { present, missing } = result.metadataFieldsPresence[field]
      const total = present + missing
      result.metadataFieldsPresence[field].percentage = total > 0 ? (present / total) * 100 : 0
    })

    // Generate issues based on findings
    generateDiagnosticIssues(result)

    // Generate recommendations
    generateRecommendations(result)

    // Determine overall health
    determineOverallHealth(result)

    console.log(`✅ [Bundle Diagnostic] Completed diagnostic for bundle: ${bundleId}`)
    return result
  } catch (error) {
    console.error(`❌ [Bundle Diagnostic] Error analyzing bundle ${bundleId}:`, error)
    throw error
  }
}

/**
 * Checks an individual content item for internal data consistency
 */
function checkItemConsistency(item: BundleContentItem): boolean {
  let hasInconsistency = false

  // Check if URLs match between different fields
  const fileUrl = item.fileUrl
  const publicUrl = (item as any).publicUrl
  const downloadUrl = (item as any).downloadUrl

  if (fileUrl && publicUrl && fileUrl !== publicUrl) {
    hasInconsistency = true
  }

  if (fileUrl && downloadUrl && fileUrl !== downloadUrl) {
    hasInconsistency = true
  }

  if (publicUrl && downloadUrl && publicUrl !== downloadUrl) {
    hasInconsistency = true
  }

  // Check if r2Key is consistent with URLs
  if (item.r2Key && item.fileUrl && !item.fileUrl.includes(item.r2Key)) {
    hasInconsistency = true
  }

  // Check if content type and category are consistent
  if (
    item.contentType &&
    item.category &&
    item.contentType !== item.category &&
    !item.contentType.includes(item.category) &&
    !item.category.includes(item.contentType)
  ) {
    hasInconsistency = true
  }

  return hasInconsistency
}

/**
 * Generates diagnostic issues based on the analysis results
 */
function generateDiagnosticIssues(result: BundleDiagnosticResult): void {
  // Check for missing URLs
  if (result.contentItemsWithMissingUrls > 0) {
    const percentage = (result.contentItemsWithMissingUrls / result.contentCount) * 100
    const severity = percentage > 20 ? "high" : percentage > 5 ? "medium" : "low"

    result.issues.push({
      severity,
      type: "missing_urls",
      description: `${result.contentItemsWithMissingUrls} content items (${percentage.toFixed(1)}%) are missing URL references`,
      affectedItems: result.contentItemsWithMissingUrls,
      recommendation: "Run the URL repair utility to restore missing URLs",
    })
  }

  // Check for missing metadata
  if (result.contentItemsWithMissingMetadata > 0) {
    const percentage = (result.contentItemsWithMissingMetadata / result.contentCount) * 100
    const severity = percentage > 20 ? "high" : percentage > 5 ? "medium" : "low"

    result.issues.push({
      severity,
      type: "incomplete_metadata",
      description: `${result.contentItemsWithMissingMetadata} content items (${percentage.toFixed(1)}%) have incomplete metadata`,
      affectedItems: result.contentItemsWithMissingMetadata,
      recommendation: "Run the metadata repair utility to restore missing fields",
    })
  }

  // Check for inconsistent data
  if (result.contentItemsWithInconsistentData > 0) {
    const percentage = (result.contentItemsWithInconsistentData / result.contentCount) * 100
    const severity = percentage > 20 ? "high" : percentage > 5 ? "medium" : "low"

    result.issues.push({
      severity,
      type: "inconsistent_data",
      description: `${result.contentItemsWithInconsistentData} content items (${percentage.toFixed(1)}%) have inconsistent internal data`,
      affectedItems: result.contentItemsWithInconsistentData,
      recommendation: "Run the data consistency checker to identify and resolve inconsistencies",
    })
  }

  // Check for missing R2 metadata
  if (result.cloudflareR2Consistency.missingR2Metadata > 0) {
    const percentage = (result.cloudflareR2Consistency.missingR2Metadata / result.contentCount) * 100
    const severity = percentage > 20 ? "high" : percentage > 5 ? "medium" : "low"

    result.issues.push({
      severity,
      type: "incomplete_r2_metadata",
      description: `${result.cloudflareR2Consistency.missingR2Metadata} content items (${percentage.toFixed(1)}%) have incomplete Cloudflare R2 metadata`,
      affectedItems: result.cloudflareR2Consistency.missingR2Metadata,
      recommendation: "Run the R2 metadata repair utility to restore missing fields",
    })
  }

  // Check critical metadata fields
  const criticalFields = ["fileUrl", "title", "filename", "mimeType"]

  criticalFields.forEach((field) => {
    const fieldData = result.metadataFieldsPresence[field]
    if (fieldData && fieldData.missing > 0) {
      const percentage = (fieldData.missing / result.contentCount) * 100
      const severity = percentage > 20 ? "high" : percentage > 5 ? "medium" : "low"

      result.issues.push({
        severity,
        type: `missing_${field}`,
        description: `${fieldData.missing} content items (${percentage.toFixed(1)}%) are missing the ${field} field`,
        affectedItems: fieldData.missing,
        recommendation: `Run the metadata repair utility to restore missing ${field} values`,
      })
    }
  })
}

/**
 * Generates recommendations based on the diagnostic results
 */
function generateRecommendations(result: BundleDiagnosticResult): void {
  // Base recommendations on issues found
  if (result.contentItemsWithMissingUrls > 0) {
    result.recommendations.push(
      "Run the URL repair utility to restore missing file URLs",
      "Implement URL validation in the content addition workflow",
    )
  }

  if (result.contentItemsWithMissingMetadata > 0) {
    result.recommendations.push(
      "Run the metadata repair utility to restore missing metadata fields",
      "Enhance metadata validation during content upload",
    )
  }

  if (result.contentItemsWithInconsistentData > 0) {
    result.recommendations.push(
      "Run the data consistency checker to identify and resolve inconsistencies",
      "Implement data consistency validation in the content management workflow",
    )
  }

  if (result.cloudflareR2Consistency.missingR2Metadata > 0) {
    result.recommendations.push(
      "Run the R2 metadata repair utility to restore missing Cloudflare R2 metadata",
      "Enhance R2 metadata capture during file upload",
    )
  }

  // Add general recommendations
  result.recommendations.push(
    "Implement regular automated integrity checks for bundle content",
    "Consider migrating all content to the new bundle content structure",
  )
}

/**
 * Determines the overall health of the bundle based on diagnostic results
 */
function determineOverallHealth(result: BundleDiagnosticResult): void {
  // Count issues by severity
  const highSeverityIssues = result.issues.filter((issue) => issue.severity === "high").length
  const mediumSeverityIssues = result.issues.filter((issue) => issue.severity === "medium").length

  // Calculate percentage of affected content
  const affectedPercentage =
    result.contentCount > 0
      ? ((result.contentItemsWithMissingUrls +
          result.contentItemsWithMissingMetadata +
          result.contentItemsWithInconsistentData) /
          result.contentCount) *
        100
      : 0

  // Determine health based on issues and affected content
  if (highSeverityIssues > 0 || affectedPercentage > 20) {
    result.overallHealth = "poor"
  } else if (mediumSeverityIssues > 0 || affectedPercentage > 5) {
    result.overallHealth = "fair"
  } else {
    result.overallHealth = "good"
  }
}

/**
 * Runs diagnostics on all bundles in the system
 */
export async function diagnoseAllBundles(): Promise<BundleDiagnosticSummary> {
  console.log("🔍 [Bundle Diagnostic] Starting system-wide bundle diagnostic")

  try {
    // Get all bundles
    const bundlesSnapshot = await db.collection("bundles").get()
    const bundles = bundlesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    console.log(`📊 [Bundle Diagnostic] Found ${bundles.length} bundles to analyze`)

    // Initialize summary
    const summary: BundleDiagnosticSummary = {
      totalBundles: bundles.length,
      totalContentItems: 0,
      bundlesWithIssues: 0,
      contentItemsWithIssues: 0,
      severityDistribution: {
        high: 0,
        medium: 0,
        low: 0,
      },
      commonIssues: [],
      overallSystemHealth: "good",
    }

    // Track issue types
    const issueTypeCounts: Record<string, number> = {}

    // Run diagnostics on each bundle
    const diagnosticResults: BundleDiagnosticResult[] = []

    for (const bundle of bundles) {
      try {
        const result = await diagnoseBundleIntegrity(bundle.id)
        diagnosticResults.push(result)

        // Update summary statistics
        summary.totalContentItems += result.contentCount

        if (result.issues.length > 0) {
          summary.bundlesWithIssues++
        }

        // Count content items with issues
        const contentItemsWithIssues = Math.max(
          result.contentItemsWithMissingUrls,
          result.contentItemsWithMissingMetadata,
          result.contentItemsWithInconsistentData,
        )
        summary.contentItemsWithIssues += contentItemsWithIssues

        // Count issues by severity
        result.issues.forEach((issue) => {
          summary.severityDistribution[issue.severity]++

          // Track issue types
          issueTypeCounts[issue.type] = (issueTypeCounts[issue.type] || 0) + 1
        })
      } catch (error) {
        console.error(`❌ [Bundle Diagnostic] Error analyzing bundle ${bundle.id}:`, error)
      }
    }

    // Calculate common issues
    const issueTypes = Object.keys(issueTypeCounts)
    summary.commonIssues = issueTypes
      .map((type) => ({
        type,
        count: issueTypeCounts[type],
        percentage: (issueTypeCounts[type] / summary.totalBundles) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Top 5 issues

    // Determine overall system health
    if (summary.severityDistribution.high > 0 || summary.contentItemsWithIssues / summary.totalContentItems > 0.2) {
      summary.overallSystemHealth = "poor"
    } else if (
      summary.severityDistribution.medium > 0 ||
      summary.contentItemsWithIssues / summary.totalContentItems > 0.05
    ) {
      summary.overallSystemHealth = "fair"
    } else {
      summary.overallSystemHealth = "good"
    }

    console.log("✅ [Bundle Diagnostic] Completed system-wide bundle diagnostic")
    return summary
  } catch (error) {
    console.error("❌ [Bundle Diagnostic] Error in system-wide diagnostic:", error)
    throw error
  }
}

/**
 * Repairs missing URLs in bundle content items
 */
export async function repairBundleContentUrls(bundleId: string): Promise<{
  bundleId: string
  fixed: number
  failed: number
  details: string[]
}> {
  console.log(`🔧 [Bundle Repair] Starting URL repair for bundle: ${bundleId}`)

  const result = {
    bundleId,
    fixed: 0,
    failed: 0,
    details: [] as string[],
  }

  try {
    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      throw new Error(`Bundle with ID ${bundleId} not found`)
    }

    // Get content items from both collections
    const contentItems: any[] = []

    // Get from subcollection
    const bundleContentsSnapshot = await db.collection("bundles").doc(bundleId).collection("contents").get()
    bundleContentsSnapshot.forEach((doc) => {
      contentItems.push({
        id: doc.id,
        ref: doc.ref,
        source: "subcollection",
        ...doc.data(),
      })
    })

    // Get from legacy collection
    const legacyContentSnapshot = await db.collection("bundleContent").where("bundleId", "==", bundleId).get()

    legacyContentSnapshot.forEach((doc) => {
      const exists = contentItems.some((item) => item.id === doc.id)
      if (!exists) {
        contentItems.push({
          id: doc.id,
          ref: doc.ref,
          source: "legacy",
          ...doc.data(),
        })
      }
    })

    // Process each content item
    for (const item of contentItems) {
      try {
        // Skip items that already have fileUrl
        if (item.fileUrl && item.fileUrl.startsWith("http")) {
          continue
        }

        let fixedUrl = null

        // Try to find a valid URL from other fields
        if (item.publicUrl && item.publicUrl.startsWith("http")) {
          fixedUrl = item.publicUrl
        } else if (item.downloadUrl && item.downloadUrl.startsWith("http")) {
          fixedUrl = item.downloadUrl
        } else if (item.r2Key && item.bucketName) {
          // Reconstruct from R2 metadata
          const publicDomain = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL
          if (publicDomain) {
            fixedUrl = `${publicDomain}/${item.r2Key}`
          } else {
            fixedUrl = `https://pub-${item.bucketName}.r2.dev/${item.r2Key}`
          }
        }

        if (fixedUrl) {
          // Update the item
          await item.ref.update({
            fileUrl: fixedUrl,
            updatedAt: new Date(),
          })

          result.fixed++
          result.details.push(`Fixed URL for item ${item.id} (${item.title || "Untitled"})`)
        } else {
          result.failed++
          result.details.push(
            `Could not fix URL for item ${item.id} (${item.title || "Untitled"}) - no source URL found`,
          )
        }
      } catch (error) {
        result.failed++
        result.details.push(
          `Error fixing URL for item ${item.id}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    console.log(
      `✅ [Bundle Repair] Completed URL repair for bundle: ${bundleId}. Fixed: ${result.fixed}, Failed: ${result.failed}`,
    )
    return result
  } catch (error) {
    console.error(`❌ [Bundle Repair] Error repairing URLs for bundle ${bundleId}:`, error)
    throw error
  }
}
