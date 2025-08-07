import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; contentId: string } }
) {
  try {
    const { id: bundleId, contentId } = params
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    
    // Verify the user
    const auth = getFirebaseAdminAuth()
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check if user has purchased this bundle
    const purchasesQuery = await adminDb
      .collection('bundlePurchases')
      .where('userId', '==', userId)
      .where('bundleId', '==', bundleId)
      .where('status', '==', 'completed')
      .limit(1)
      .get()

    if (purchasesQuery.empty) {
      return NextResponse.json({ error: 'Bundle not purchased' }, { status: 403 })
    }

    // Get the bundle to find the content
    const bundleDoc = await adminDb.collection('bundles').doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    const content = bundleData?.content?.find((item: any) => item.id === contentId)
    
    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    if (!content.videoUrl) {
      return NextResponse.json({ error: 'No video URL available' }, { status: 404 })
    }

    // Fetch the actual video file
    const videoResponse = await fetch(content.videoUrl)
    if (!videoResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 })
    }

    const videoBuffer = await videoResponse.arrayBuffer()
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4'
    
    // Determine file extension
    let extension = 'mp4'
    if (contentType.includes('video/webm')) extension = 'webm'
    else if (contentType.includes('video/quicktime')) extension = 'mov'
    
    const filename = `${content.title}.${extension}`

    // Return the video file with proper headers
    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': videoBuffer.byteLength.toString(),
      },
    })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
