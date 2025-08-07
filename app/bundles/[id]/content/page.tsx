'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuthContext } from '@/contexts/auth-context'

interface BundleContent {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  videoUrl?: string
  type: 'video' | 'audio' | 'image' | 'document'
  fileSize?: number
  duration?: number
  createdAt: any
}

interface Bundle {
  id: string
  title: string
  description?: string
  price: number
  creatorId: string
  creatorName?: string
  thumbnailUrl?: string
  content: BundleContent[]
  createdAt: any
}

const VideoPlayer = ({ content }: { content: BundleContent }) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()
  const params = useParams()
  const bundleId = params.id as string

  const handleDownload = async () => {
    if (isDownloading) return
    
    setIsDownloading(true)
    
    try {
      const response = await fetch(`/api/bundles/${bundleId}/content/${content.id}/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      // Get the blob and create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Get file extension from content type or default to mp4
      const contentType = response.headers.get('content-type') || ''
      let extension = 'mp4'
      if (contentType.includes('video/mp4')) extension = 'mp4'
      else if (contentType.includes('video/webm')) extension = 'webm'
      else if (contentType.includes('video/quicktime')) extension = 'mov'
      
      a.download = `${content.title}.${extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Download Started",
        description: `${content.title} is downloading...`,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Download Failed",
        description: "There was an error downloading the video. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="relative group">
      <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden relative">
        {content.videoUrl ? (
          <video
            src={content.videoUrl}
            poster={content.thumbnailUrl}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
        ) : content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl || "/placeholder.svg"}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No preview available
          </div>
        )}
        
        {/* Download Button */}
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          size="sm"
          className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white border-0 h-8 w-8 p-0"
        >
          <Download className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} />
        </Button>
      </div>
      
      <div className="mt-2">
        <h3 className="font-medium text-sm truncate">{content.title}</h3>
        {content.duration && (
          <p className="text-xs text-gray-500 mt-1">
            {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>
    </div>
  )
}

export default function BundleContentPage() {
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const bundleId = params.id as string

  useEffect(() => {
    const fetchBundleContent = async () => {
      if (!user) {
        setError('Please log in to view bundle content')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/bundles/${bundleId}/content`, {
          headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`,
          },
        })

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('You do not have access to this bundle')
          }
          throw new Error('Failed to fetch bundle content')
        }

        const data = await response.json()
        setBundle(data)
      } catch (err) {
        console.error('Error fetching bundle content:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchBundleContent()
  }, [bundleId, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchases
            </Button>
          </div>
          
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-800 rounded w-32 mb-8"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[9/16] bg-gray-800 rounded-lg"></div>
                  <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchases
            </Button>
          </div>
          
          <Card className="bg-red-900/20 border-red-800">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
              <p className="text-red-300">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchases
            </Button>
          </div>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <p className="text-gray-400">Bundle not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>
        </div>

        {/* Bundle Info */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{bundle.title}</h1>
          <div className="flex items-center gap-4 text-gray-400">
            <span>{bundle.content?.length || 0} videos</span>
            <span>•</span>
            <span>by {bundle.creatorName}</span>
          </div>
          {bundle.description && (
            <p className="text-gray-300 mt-4 max-w-2xl">{bundle.description}</p>
          )}
        </div>

        {/* Content Grid */}
        {bundle.content && bundle.content.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {bundle.content.map((content) => (
              <VideoPlayer key={content.id} content={content} />
            ))}
          </div>
        ) : (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <p className="text-gray-400">No content available in this bundle</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
