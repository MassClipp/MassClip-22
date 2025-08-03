import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { adminDb } from "@/lib/firebase-admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, User, FileText, Package } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface BundlePageProps {
  params: { id: string }
}

async function getBundleData(bundleId: string) {
  try {
    console.log(`🔍 [Bundle Page] Fetching bundle: ${bundleId}`)

    const bundleDoc = await adminDb.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle Page] Bundle not found: ${bundleId}`)
      return null
    }

    const bundleData = bundleDoc.data()!

    // Get creator information
    let creatorData = null
    if (bundleData.creatorId) {
      try {
        const creatorDoc = await adminDb.collection("users").doc(bundleData.creatorId).get()
        if (creatorDoc.exists) {
          creatorData = creatorDoc.data()
        }
      } catch (error) {
        console.warn(`⚠️ [Bundle Page] Could not fetch creator data:`, error)
      }
    }

    return {
      id: bundleId,
      title: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "",
      thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || "",
      creatorId: bundleData.creatorId || "",
      creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
      creatorUsername: creatorData?.username || "",
      fileSize: bundleData.fileSize || bundleData.size || 0,
      fileType: bundleData.fileType || bundleData.mimeType || "application/octet-stream",
      tags: bundleData.tags || [],
      isPublic: bundleData.isPublic !== false,
      downloadUrl: bundleData.downloadUrl || bundleData.fileUrl || "",
      createdAt: bundleData.createdAt || bundleData.uploadedAt || new Date(),
      updatedAt: bundleData.updatedAt || new Date(),
    }
  } catch (error) {
    console.error(`❌ [Bundle Page] Error fetching bundle:`, error)
    return null
  }
}

export async function generateMetadata({ params }: BundlePageProps): Promise<Metadata> {
  const bundle = await getBundleData(params.id)

  if (!bundle) {
    return {
      title: "Bundle Not Found",
      description: "The requested bundle could not be found.",
    }
  }

  return {
    title: `${bundle.title} - Bundle`,
    description: bundle.description || `Bundle by ${bundle.creatorName}`,
    openGraph: {
      title: bundle.title,
      description: bundle.description || `Bundle by ${bundle.creatorName}`,
      images: bundle.thumbnailUrl ? [{ url: bundle.thumbnailUrl }] : [],
    },
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

function formatDate(date: any): string {
  if (!date) return "Unknown"
  const d = date.toDate ? date.toDate() : new Date(date)
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function BundlePage({ params }: BundlePageProps) {
  const bundle = await getBundleData(params.id)

  if (!bundle) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{bundle.title}</h1>
          <p className="text-gray-600">{bundle.description}</p>
        </div>

        {/* Bundle Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Bundle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bundle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">File Size:</p>
                  <p>{formatFileSize(bundle.fileSize)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">File Type:</p>
                  <p>{bundle.fileType}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Created:</p>
                  <p>{formatDate(bundle.createdAt)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Status:</p>
                  <Badge variant={bundle.isPublic ? "default" : "secondary"}>
                    {bundle.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>
              </div>

              {bundle.tags && bundle.tags.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700 mb-2">Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {bundle.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creator Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Creator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold">{bundle.creatorName}</p>
                {bundle.creatorUsername && <p className="text-gray-600">@{bundle.creatorUsername}</p>}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/creator/${bundle.creatorUsername || bundle.creatorId}`}>View Profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bundle Thumbnail */}
        {bundle.thumbnailUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full max-w-md mx-auto h-64 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={bundle.thumbnailUrl || "/placeholder.svg"}
                  alt={bundle.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {bundle.downloadUrl && (
                <Button asChild className="flex-1">
                  <Link href={bundle.downloadUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download Bundle
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild className="flex-1 bg-transparent">
                <Link href="/test-add-bundle-purchase">
                  <FileText className="h-4 w-4 mr-2" />
                  Test Purchase
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debug Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Debug Information
            </CardTitle>
            <CardDescription>Technical details for development and testing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm font-mono bg-gray-100 p-4 rounded-lg">
              <p>
                <strong>Bundle ID:</strong> {bundle.id}
              </p>
              <p>
                <strong>Creator ID:</strong> {bundle.creatorId}
              </p>
              <p>
                <strong>Download URL:</strong> {bundle.downloadUrl || "Not available"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
