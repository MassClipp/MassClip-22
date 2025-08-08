import { chunkedUploadService, UploadProgress } from './chunked-upload-service'

export interface QueuedUpload {
  id: string
  file: File
  status: 'queued' | 'uploading' | 'completed' | 'error' | 'paused'
  progress: number
  speed: number
  eta: number
  error?: string
  startTime?: number
  completedTime?: number
  uploadedBytes: number
  totalBytes: number
  completedChunks: number
  totalChunks: number
}

export interface UploadQueueCallbacks {
  onQueueUpdate?: (uploads: QueuedUpload[]) => void
  onUploadStart?: (upload: QueuedUpload) => void
  onUploadProgress?: (upload: QueuedUpload) => void
  onUploadComplete?: (upload: QueuedUpload) => void
  onUploadError?: (upload: QueuedUpload) => void
}

export class UploadQueueManager {
  private uploads = new Map<string, QueuedUpload>()
  private callbacks: UploadQueueCallbacks = {}
  private maxConcurrentUploads = 2
  private currentUploads = 0

  constructor(callbacks?: UploadQueueCallbacks) {
    this.callbacks = callbacks || {}
    console.log('🎯 [Queue Manager] Initialized')
  }

  setCallbacks(callbacks: UploadQueueCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  addToQueue(files: File[]): string[] {
    const uploadIds: string[] = []

    files.forEach(file => {
      const uploadId = this.generateUploadId()
      const totalChunks = Math.ceil(file.size / (5 * 1024 * 1024)) // 5MB chunks

      const queuedUpload: QueuedUpload = {
        id: uploadId,
        file,
        status: 'queued',
        progress: 0,
        speed: 0,
        eta: 0,
        uploadedBytes: 0,
        totalBytes: file.size,
        completedChunks: 0,
        totalChunks
      }

      this.uploads.set(uploadId, queuedUpload)
      uploadIds.push(uploadId)

      console.log(`📋 [Queue] Added to queue: ${file.name} (${uploadId})`)
    })

    this.notifyQueueUpdate()
    this.processQueue()

    return uploadIds
  }

  addUpload(file: File): string {
    return this.addToQueue([file])[0]
  }

  private async processQueue() {
    console.log(`🔄 [Queue Manager] Processing queue (${this.currentUploads}/${this.maxConcurrentUploads} active)`)
    
    // Find next queued upload
    const queuedUploads = Array.from(this.uploads.values())
      .filter(upload => upload.status === 'queued')
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0))

    if (queuedUploads.length === 0 || this.currentUploads >= this.maxConcurrentUploads) {
      return
    }

    const nextUpload = queuedUploads[0]
    await this.startUpload(nextUpload)
  }

  private async startUpload(upload: QueuedUpload) {
    this.currentUploads++
    upload.status = 'uploading'
    upload.startTime = Date.now()

    console.log(`🚀 [Queue] Starting upload: ${upload.file.name}`)

    if (this.callbacks.onUploadStart) {
      this.callbacks.onUploadStart(upload)
    }

    this.notifyQueueUpdate()

    try {
      // Set up auth token for chunked upload service
      if (typeof window !== 'undefined') {
        const { getAuth } = await import('firebase/auth')
        const auth = getAuth()
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken()
          await chunkedUploadService.setAuthToken(token)
        }
      }

      // Start chunked upload with progress callback
      await chunkedUploadService.initializeUpload(upload.file, (progress: UploadProgress) => {
        upload.progress = (progress.completedChunks / progress.totalChunks) * 100
        upload.speed = progress.speed
        upload.eta = progress.eta
        upload.uploadedBytes = progress.uploadedBytes
        upload.completedChunks = progress.completedChunks
        upload.totalChunks = progress.totalChunks

        if (progress.status === 'completed') {
          upload.status = 'completed'
          upload.progress = 100
          upload.completedTime = Date.now()
          upload.uploadedBytes = upload.totalBytes
          this.currentUploads--

          console.log(`✅ [Queue] Upload completed: ${upload.file.name}`)

          if (this.callbacks.onUploadComplete) {
            this.callbacks.onUploadComplete(upload)
          }

          this.notifyQueueUpdate()
          setTimeout(() => this.processQueue(), 100)
        } else if (progress.status === 'error') {
          upload.status = 'error'
          upload.error = progress.error
          this.currentUploads--

          console.error(`❌ [Queue] Upload failed: ${upload.file.name}`, progress.error)

          if (this.callbacks.onUploadError) {
            this.callbacks.onUploadError(upload)
          }

          this.notifyQueueUpdate()
          setTimeout(() => this.processQueue(), 100)
        } else {
          upload.status = 'uploading'
          
          if (this.callbacks.onUploadProgress) {
            this.callbacks.onUploadProgress(upload)
          }

          this.notifyQueueUpdate()
        }
      })

    } catch (error) {
      upload.status = 'error'
      upload.error = error instanceof Error ? error.message : 'Unknown error'
      this.currentUploads--

      console.error(`❌ [Queue] Upload failed: ${upload.file.name}`, error)

      if (this.callbacks.onUploadError) {
        this.callbacks.onUploadError(upload)
      }

      this.notifyQueueUpdate()

      // Process next upload in queue
      setTimeout(() => this.processQueue(), 100)
    }
  }

  pauseUpload(uploadId: string) {
    const upload = this.uploads.get(uploadId)
    if (upload && upload.status === 'uploading') {
      upload.status = 'paused'
      chunkedUploadService.pauseUpload(uploadId)
      this.currentUploads--
      
      console.log(`⏸️ [Queue] Paused upload: ${upload.file.name}`)
      this.notifyQueueUpdate()
    }
  }

  resumeUpload(uploadId: string) {
    const upload = this.uploads.get(uploadId)
    if (upload && upload.status === 'paused') {
      upload.status = 'queued'
      
      console.log(`▶️ [Queue] Resumed upload: ${upload.file.name}`)
      this.notifyQueueUpdate()
      this.processQueue()
    }
  }

  cancelUpload(uploadId: string) {
    const upload = this.uploads.get(uploadId)
    if (upload) {
      if (upload.status === 'uploading') {
        chunkedUploadService.cancelUpload(uploadId)
        this.currentUploads--
      }
      
      this.uploads.delete(uploadId)
      
      console.log(`❌ [Queue] Cancelled upload: ${upload.file.name}`)
      this.notifyQueueUpdate()
      
      // Process next upload in queue
      setTimeout(() => this.processQueue(), 100)
    }
  }

  retryUpload(uploadId: string) {
    const upload = this.uploads.get(uploadId)
    if (upload && upload.status === 'error') {
      upload.status = 'queued'
      upload.progress = 0
      upload.speed = 0
      upload.eta = 0
      upload.error = undefined
      upload.uploadedBytes = 0
      upload.completedChunks = 0
      
      console.log(`🔄 [Queue] Retrying upload: ${upload.file.name}`)
      this.notifyQueueUpdate()
      this.processQueue()
    }
  }

  clearCompleted() {
    const completedIds: string[] = []
    
    this.uploads.forEach((upload, id) => {
      if (upload.status === 'completed') {
        completedIds.push(id)
      }
    })

    completedIds.forEach(id => {
      const upload = this.uploads.get(id)
      if (upload) {
        console.log(`🗑️ [Queue] Cleared completed upload: ${upload.file.name}`)
        this.uploads.delete(id)
      }
    })

    if (completedIds.length > 0) {
      this.notifyQueueUpdate()
    }
  }

  clearAll() {
    // Cancel all active uploads
    this.uploads.forEach((upload, id) => {
      if (upload.status === 'uploading') {
        chunkedUploadService.cancelUpload(id)
        this.currentUploads--
      }
    })

    this.uploads.clear()
    this.currentUploads = 0
    console.log(`🗑️ [Queue] Cleared all uploads`)
    this.notifyQueueUpdate()
  }

  getUploads(): QueuedUpload[] {
    return Array.from(this.uploads.values())
  }

  getUpload(uploadId: string): QueuedUpload | undefined {
    return this.uploads.get(uploadId)
  }

  getQueueStats() {
    const uploads = Array.from(this.uploads.values())
    
    return {
      total: uploads.length,
      queued: uploads.filter(u => u.status === 'queued').length,
      uploading: uploads.filter(u => u.status === 'uploading').length,
      completed: uploads.filter(u => u.status === 'completed').length,
      error: uploads.filter(u => u.status === 'error').length,
      paused: uploads.filter(u => u.status === 'paused').length,
      totalBytes: uploads.reduce((sum, u) => sum + u.totalBytes, 0),
      uploadedBytes: uploads.reduce((sum, u) => sum + u.uploadedBytes, 0),
      averageSpeed: this.calculateAverageSpeed(uploads.filter(u => u.status === 'uploading'))
    }
  }

  setMaxConcurrentUploads(max: number) {
    this.maxConcurrentUploads = Math.max(1, Math.min(max, 5)) // Limit between 1-5
    console.log(`⚙️ [Queue] Max concurrent uploads set to: ${this.maxConcurrentUploads}`)
    
    // Process queue in case we can start more uploads now
    this.processQueue()
  }

  subscribe(callback: (uploads: QueuedUpload[]) => void): () => void {
    const id = Math.random().toString(36)
    this.callbacks.onQueueUpdate = callback
    
    // Send initial state
    callback(this.getUploads())
    
    // Return unsubscribe function
    return () => {
      this.callbacks.onQueueUpdate = undefined
    }
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private notifyQueueUpdate() {
    if (this.callbacks.onQueueUpdate) {
      this.callbacks.onQueueUpdate(this.getUploads())
    }
  }

  private calculateAverageSpeed(activeUploads: QueuedUpload[]): number {
    if (activeUploads.length === 0) return 0
    
    const totalSpeed = activeUploads.reduce((sum, upload) => sum + upload.speed, 0)
    return totalSpeed / activeUploads.length
  }

  // Utility methods for formatting
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  static formatSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + '/s'
  }

  static formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '--:--'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }
}

// Singleton instance for global use
export const uploadQueueManager = new UploadQueueManager()
