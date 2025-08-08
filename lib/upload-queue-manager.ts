import { chunkedUploadService, type UploadProgress } from './chunked-upload-service'

export interface QueuedUpload {
  id: string
  file: File
  status: 'queued' | 'uploading' | 'completed' | 'error' | 'paused'
  progress?: UploadProgress
  error?: string
  priority: number
}

export class UploadQueueManager {
  private queue: QueuedUpload[] = []
  private activeUploads = new Set<string>()
  private maxConcurrentUploads = 2
  private progressCallbacks = new Map<string, (upload: QueuedUpload) => void>()
  private globalProgressCallback?: (queue: QueuedUpload[]) => void

  setMaxConcurrentUploads(max: number) {
    this.maxConcurrentUploads = max
  }

  setGlobalProgressCallback(callback: (queue: QueuedUpload[]) => void) {
    this.globalProgressCallback = callback
  }

  addToQueue(file: File, priority = 0): string {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const queuedUpload: QueuedUpload = {
      id,
      file,
      status: 'queued',
      priority
    }

    // Insert based on priority (higher priority first) and file size (smaller files first for same priority)
    const insertIndex = this.queue.findIndex(item => 
      item.priority < priority || 
      (item.priority === priority && item.file.size > file.size)
    )

    if (insertIndex === -1) {
      this.queue.push(queuedUpload)
    } else {
      this.queue.splice(insertIndex, 0, queuedUpload)
    }

    this.notifyGlobalProgress()
    this.processQueue()

    return id
  }

  removeFromQueue(id: string) {
    const index = this.queue.findIndex(item => item.id === id)
    if (index !== -1) {
      const upload = this.queue[index]
      
      // Cancel active upload if it's currently uploading
      if (upload.status === 'uploading' && upload.progress) {
        chunkedUploadService.cancelUpload(upload.progress.uploadId)
        this.activeUploads.delete(id)
      }

      this.queue.splice(index, 1)
      this.progressCallbacks.delete(id)
      this.notifyGlobalProgress()
      this.processQueue()
    }
  }

  pauseUpload(id: string) {
    const upload = this.queue.find(item => item.id === id)
    if (upload && upload.status === 'uploading' && upload.progress) {
      chunkedUploadService.pauseUpload(upload.progress.uploadId)
      upload.status = 'paused'
      this.activeUploads.delete(id)
      this.notifyProgress(upload)
      this.processQueue()
    }
  }

  resumeUpload(id: string) {
    const upload = this.queue.find(item => item.id === id)
    if (upload && upload.status === 'paused') {
      upload.status = 'queued'
      this.notifyProgress(upload)
      this.processQueue()
    }
  }

  retryUpload(id: string) {
    const upload = this.queue.find(item => item.id === id)
    if (upload && upload.status === 'error') {
      upload.status = 'queued'
      upload.error = undefined
      upload.progress = undefined
      this.notifyProgress(upload)
      this.processQueue()
    }
  }

  setProgressCallback(id: string, callback: (upload: QueuedUpload) => void) {
    this.progressCallbacks.set(id, callback)
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      queued: this.queue.filter(item => item.status === 'queued').length,
      uploading: this.queue.filter(item => item.status === 'uploading').length,
      completed: this.queue.filter(item => item.status === 'completed').length,
      error: this.queue.filter(item => item.status === 'error').length,
      paused: this.queue.filter(item => item.status === 'paused').length
    }
  }

  private async processQueue() {
    // Start new uploads up to the concurrent limit
    while (
      this.activeUploads.size < this.maxConcurrentUploads &&
      this.queue.some(item => item.status === 'queued')
    ) {
      const nextUpload = this.queue.find(item => item.status === 'queued')
      if (!nextUpload) break

      this.startUpload(nextUpload)
    }
  }

  private async startUpload(queuedUpload: QueuedUpload) {
    queuedUpload.status = 'uploading'
    this.activeUploads.add(queuedUpload.id)
    this.notifyProgress(queuedUpload)

    try {
      const uploadId = await chunkedUploadService.initializeUpload(
        queuedUpload.file,
        (progress) => {
          queuedUpload.progress = progress
          
          if (progress.status === 'completed') {
            queuedUpload.status = 'completed'
            this.activeUploads.delete(queuedUpload.id)
            this.processQueue()
          } else if (progress.status === 'error') {
            queuedUpload.status = 'error'
            queuedUpload.error = progress.error
            this.activeUploads.delete(queuedUpload.id)
            this.processQueue()
          }

          this.notifyProgress(queuedUpload)
        }
      )

    } catch (error) {
      queuedUpload.status = 'error'
      queuedUpload.error = error instanceof Error ? error.message : 'Upload failed'
      this.activeUploads.delete(queuedUpload.id)
      this.notifyProgress(queuedUpload)
      this.processQueue()
    }
  }

  private notifyProgress(upload: QueuedUpload) {
    const callback = this.progressCallbacks.get(upload.id)
    if (callback) {
      callback(upload)
    }
    this.notifyGlobalProgress()
  }

  private notifyGlobalProgress() {
    if (this.globalProgressCallback) {
      this.globalProgressCallback([...this.queue])
    }
  }

  clearCompleted() {
    this.queue = this.queue.filter(item => item.status !== 'completed')
    this.notifyGlobalProgress()
  }

  clearAll() {
    // Cancel all active uploads
    this.queue.forEach(upload => {
      if (upload.status === 'uploading' && upload.progress) {
        chunkedUploadService.cancelUpload(upload.progress.uploadId)
      }
    })

    this.queue = []
    this.activeUploads.clear()
    this.progressCallbacks.clear()
    this.notifyGlobalProgress()
  }
}

// Singleton instance
export const uploadQueueManager = new UploadQueueManager()
