export interface UploadChunk {
  chunkIndex: number
  chunkData: Blob
  chunkSize: number
  startByte: number
  endByte: number
}

export interface UploadProgress {
  uploadId: string
  fileName: string
  fileSize: number
  uploadedBytes: number
  totalChunks: number
  completedChunks: number
  speed: number // bytes per second
  eta: number // seconds remaining
  status: 'queued' | 'uploading' | 'completed' | 'error' | 'paused'
  error?: string
}

export interface ChunkedUploadSession {
  uploadId: string
  fileName: string
  fileSize: number
  fileType: string
  totalChunks: number
  chunkSize: number
  uploadedChunks: Set<number>
  publicUrl: string
  r2Key: string
  startTime: number
  lastProgressTime: number
  uploadedBytes: number
}

export class ChunkedUploadService {
  private static readonly CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
  private static readonly MAX_CONCURRENT_CHUNKS = 3
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000 // 1 second

  private sessions = new Map<string, ChunkedUploadSession>()
  private progressCallbacks = new Map<string, (progress: UploadProgress) => void>()
  private authToken: string | null = null
  private tokenExpiry: number = 0

  async setAuthToken(token: string) {
    this.authToken = token
    this.tokenExpiry = Date.now() + (50 * 60 * 1000) // 50 minutes
  }

  private async getValidAuthToken(): Promise<string> {
    if (!this.authToken || Date.now() > this.tokenExpiry) {
      throw new Error('Auth token expired or not set')
    }
    return this.authToken
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private createChunks(file: File): UploadChunk[] {
    const chunks: UploadChunk[] = []
    const chunkSize = ChunkedUploadService.CHUNK_SIZE
    const totalChunks = Math.ceil(file.size / chunkSize)

    for (let i = 0; i < totalChunks; i++) {
      const startByte = i * chunkSize
      const endByte = Math.min(startByte + chunkSize, file.size)
      const chunkData = file.slice(startByte, endByte)

      chunks.push({
        chunkIndex: i,
        chunkData,
        chunkSize: endByte - startByte,
        startByte,
        endByte
      })
    }

    return chunks
  }

  async initializeUpload(file: File, onProgress?: (progress: UploadProgress) => void): Promise<string> {
    const uploadId = this.generateUploadId()
    const chunks = this.createChunks(file)
    const token = await this.getValidAuthToken()

    console.log(`🚀 [Chunked Upload] Initializing upload: ${file.name} (${file.size} bytes, ${chunks.length} chunks)`)

    try {
      // Initialize upload session on server
      const response = await fetch('/api/uploads/chunked/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          uploadId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          totalChunks: chunks.length,
          chunkSize: ChunkedUploadService.CHUNK_SIZE
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [Chunked Upload] Initialization failed:', error)
        throw new Error(error.error || 'Failed to initialize upload')
      }

      const { publicUrl, r2Key } = await response.json()
      console.log(`✅ [Chunked Upload] Initialized: ${uploadId}`)

      // Create local session
      const session: ChunkedUploadSession = {
        uploadId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks: chunks.length,
        chunkSize: ChunkedUploadService.CHUNK_SIZE,
        uploadedChunks: new Set(),
        publicUrl,
        r2Key,
        startTime: Date.now(),
        lastProgressTime: Date.now(),
        uploadedBytes: 0
      }

      this.sessions.set(uploadId, session)
      
      if (onProgress) {
        this.progressCallbacks.set(uploadId, onProgress)
      }

      // Start uploading chunks
      this.uploadChunks(uploadId, chunks)

      return uploadId

    } catch (error) {
      console.error('❌ [Chunked Upload] Failed to initialize:', error)
      throw error
    }
  }

  private async uploadChunks(uploadId: string, chunks: UploadChunk[]) {
    const session = this.sessions.get(uploadId)
    if (!session) return

    console.log(`📦 [Chunked Upload] Starting chunk uploads for ${uploadId}`)
    this.updateProgress(uploadId, 'uploading')

    try {
      // Process chunks in batches
      const chunkQueue = [...chunks]
      const activeUploads = new Set<Promise<void>>()

      while (chunkQueue.length > 0 || activeUploads.size > 0) {
        // Start new uploads up to the concurrent limit
        while (chunkQueue.length > 0 && activeUploads.size < ChunkedUploadService.MAX_CONCURRENT_CHUNKS) {
          const chunk = chunkQueue.shift()!
          const uploadPromise = this.uploadSingleChunk(uploadId, chunk)
          activeUploads.add(uploadPromise)

          uploadPromise.finally(() => {
            activeUploads.delete(uploadPromise)
          })
        }

        // Wait for at least one upload to complete
        if (activeUploads.size > 0) {
          await Promise.race(activeUploads)
        }
      }

      // Wait for all remaining uploads to complete
      await Promise.all(activeUploads)

      console.log(`✅ [Chunked Upload] All chunks uploaded for ${uploadId}`)

      // Finalize upload
      await this.finalizeUpload(uploadId)

    } catch (error) {
      console.error(`❌ [Chunked Upload] Chunk upload failed for ${uploadId}:`, error)
      this.updateProgress(uploadId, 'error', error instanceof Error ? error.message : 'Chunk upload failed')
    }
  }

  private async uploadSingleChunk(uploadId: string, chunk: UploadChunk, retryCount = 0): Promise<void> {
    const session = this.sessions.get(uploadId)
    if (!session) return

    console.log(`📤 [Chunked Upload] Uploading chunk ${chunk.chunkIndex}/${session.totalChunks} for ${uploadId}`)

    try {
      const token = await this.getValidAuthToken()

      // Get presigned URL for this chunk
      const urlResponse = await fetch('/api/uploads/chunked/chunk-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          uploadId,
          chunkIndex: chunk.chunkIndex,
          chunkSize: chunk.chunkSize
        })
      })

      if (!urlResponse.ok) {
        const error = await urlResponse.json()
        console.error(`❌ [Chunked Upload] Failed to get chunk URL for ${chunk.chunkIndex}:`, error)
        throw new Error(error.error || 'Failed to get chunk upload URL')
      }

      const { uploadUrl } = await urlResponse.json()
      console.log(`🔗 [Chunked Upload] Got upload URL for chunk ${chunk.chunkIndex}`)

      // Upload chunk to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: chunk.chunkData,
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      })

      if (!uploadResponse.ok) {
        console.error(`❌ [Chunked Upload] R2 upload failed for chunk ${chunk.chunkIndex}:`, uploadResponse.status, uploadResponse.statusText)
        throw new Error(`Chunk upload failed: ${uploadResponse.statusText}`)
      }

      // Mark chunk as completed
      session.uploadedChunks.add(chunk.chunkIndex)
      session.uploadedBytes += chunk.chunkSize

      console.log(`✅ [Chunked Upload] Chunk ${chunk.chunkIndex} uploaded successfully`)
      this.updateProgress(uploadId, 'uploading')

    } catch (error) {
      console.error(`❌ [Chunked Upload] Chunk ${chunk.chunkIndex} upload failed:`, error)

      if (retryCount < ChunkedUploadService.MAX_RETRIES) {
        // Exponential backoff retry
        const delay = ChunkedUploadService.RETRY_DELAY * Math.pow(2, retryCount)
        console.log(`🔄 [Chunked Upload] Retrying chunk ${chunk.chunkIndex} in ${delay}ms (attempt ${retryCount + 1}/${ChunkedUploadService.MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.uploadSingleChunk(uploadId, chunk, retryCount + 1)
      } else {
        console.error(`💥 [Chunked Upload] Chunk ${chunk.chunkIndex} failed after ${ChunkedUploadService.MAX_RETRIES} retries`)
        this.updateProgress(uploadId, 'error', error instanceof Error ? error.message : 'Chunk upload failed')
        throw error
      }
    }
  }

  private async finalizeUpload(uploadId: string) {
    const session = this.sessions.get(uploadId)
    if (!session) return

    console.log(`🏁 [Chunked Upload] Finalizing upload ${uploadId}`)

    try {
      const token = await this.getValidAuthToken()

      // Finalize upload on server
      const response = await fetch('/api/uploads/chunked/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          uploadId,
          completedChunks: Array.from(session.uploadedChunks)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [Chunked Upload] Finalization failed:', error)
        throw new Error(error.error || 'Failed to finalize upload')
      }

      console.log(`✅ [Chunked Upload] Upload completed: ${uploadId}`)
      this.updateProgress(uploadId, 'completed')

    } catch (error) {
      console.error('❌ [Chunked Upload] Upload finalization failed:', error)
      this.updateProgress(uploadId, 'error', error instanceof Error ? error.message : 'Finalization failed')
    }
  }

  private updateProgress(uploadId: string, status: UploadProgress['status'], error?: string) {
    const session = this.sessions.get(uploadId)
    const callback = this.progressCallbacks.get(uploadId)
    
    if (!session || !callback) return

    const now = Date.now()
    const timeDiff = (now - session.lastProgressTime) / 1000 // seconds
    const bytesDiff = session.uploadedBytes
    
    // Calculate speed (bytes per second)
    const totalTime = (now - session.startTime) / 1000
    const speed = totalTime > 0 ? session.uploadedBytes / totalTime : 0
    
    // Calculate ETA
    const remainingBytes = session.fileSize - session.uploadedBytes
    const eta = speed > 0 ? remainingBytes / speed : 0

    const progress: UploadProgress = {
      uploadId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      uploadedBytes: session.uploadedBytes,
      totalChunks: session.totalChunks,
      completedChunks: session.uploadedChunks.size,
      speed,
      eta,
      status,
      error
    }

    session.lastProgressTime = now
    callback(progress)
  }

  pauseUpload(uploadId: string) {
    const session = this.sessions.get(uploadId)
    if (session) {
      this.updateProgress(uploadId, 'paused')
    }
  }

  resumeUpload(uploadId: string) {
    const session = this.sessions.get(uploadId)
    if (session) {
      this.updateProgress(uploadId, 'uploading')
      // Resume logic would go here
    }
  }

  cancelUpload(uploadId: string) {
    this.sessions.delete(uploadId)
    this.progressCallbacks.delete(uploadId)
  }

  getUploadProgress(uploadId: string): UploadProgress | null {
    const session = this.sessions.get(uploadId)
    if (!session) return null

    return {
      uploadId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      uploadedBytes: session.uploadedBytes,
      totalChunks: session.totalChunks,
      completedChunks: session.uploadedChunks.size,
      speed: 0,
      eta: 0,
      status: 'uploading'
    }
  }
}

// Singleton instance
export const chunkedUploadService = new ChunkedUploadService()
