import { chunkedUploadService, type UploadProgress } from "./chunked-upload-service"

export interface QueuedUpload {
  id: string
  file: File
  status: "queued" | "uploading" | "completed" | "error" | "paused"
  priority: number
  progress?: UploadProgress
  error?: string
  uploadId?: string
  fileUrl?: string
  firestoreDocId?: string
  createdAt: number
  folderId?: string
  folderPath?: string
}

export interface QueueStats {
  total: number
  queued: number
  uploading: number
  completed: number
  error: number
  paused: number
}

const STORAGE_KEY = "massclip_upload_queue"

class UploadQueueManager {
  private queue: QueuedUpload[] = []
  private activeUploads = new Set<string>()
  private maxConcurrentUploads = 2
  private progressCallbacks = new Map<string, (upload: QueuedUpload) => void>()
  private globalProgressCallback?: (queue: QueuedUpload[]) => void

  constructor() {
    this.loadQueueFromStorage()
  }

  addToQueue(file: File, priority = 0, folderId?: string, folderPath?: string): string {
    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log(`📥 [v0] Queue Manager - Adding file to queue:`)
    console.log(`   File: ${file.name}`)
    console.log(`   Folder ID: ${folderId}`)
    console.log(`   Folder Path: ${folderPath}`)
    console.log(`   Queue ID: ${queueId}`)

    const queuedUpload: QueuedUpload = {
      id: queueId,
      file,
      status: "queued",
      priority,
      createdAt: Date.now(),
      folderId,
      folderPath,
    }

    this.queue.push(queuedUpload)
    this.sortQueue()
    this.processQueue()
    this.notifyGlobalProgress()
    this.saveQueueToStorage()

    return queueId
  }

  private sortQueue() {
    this.queue.sort((a, b) => {
      // Sort by priority (higher first), then by creation time (older first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return a.createdAt - b.createdAt
    })
  }

  private async processQueue() {
    // Find queued items that can be started
    const queuedItems = this.queue.filter((item) => item.status === "queued")
    const availableSlots = this.maxConcurrentUploads - this.activeUploads.size

    if (availableSlots <= 0 || queuedItems.length === 0) {
      return
    }

    // Start uploads for available slots
    const itemsToStart = queuedItems.slice(0, availableSlots)

    for (const item of itemsToStart) {
      this.startUpload(item)
    }
  }

  private async startUpload(queuedUpload: QueuedUpload) {
    try {
      queuedUpload.status = "uploading"
      this.activeUploads.add(queuedUpload.id)
      this.notifyProgress(queuedUpload)
      this.notifyGlobalProgress()

      console.log(`🚀 [v0] Queue Manager - Starting upload:`)
      console.log(`   Queue ID: ${queuedUpload.id}`)
      console.log(`   File: ${queuedUpload.file.name}`)
      console.log(`   Folder ID: ${queuedUpload.folderId}`)
      console.log(`   Folder Path: ${queuedUpload.folderPath}`)

      // Start chunked upload
      const uploadId = await chunkedUploadService.initializeUpload(
        queuedUpload.file,
        (progress) => {
          queuedUpload.progress = progress
          queuedUpload.uploadId = progress.uploadId
          if (progress.fileUrl) {
            queuedUpload.fileUrl = progress.fileUrl
          }
          if (progress.firestoreDocId) {
            queuedUpload.firestoreDocId = progress.firestoreDocId
          }

          if (progress.status === "completed") {
            this.completeUpload(queuedUpload)
          } else if (progress.status === "error") {
            this.failUpload(queuedUpload, progress.error || "Upload failed")
          } else {
            this.notifyProgress(queuedUpload)
            this.notifyGlobalProgress()
          }
        },
        queuedUpload.folderId,
        queuedUpload.folderPath,
      )

      queuedUpload.uploadId = uploadId
    } catch (error) {
      this.failUpload(queuedUpload, error instanceof Error ? error.message : "Failed to start upload")
    }
  }

  private completeUpload(queuedUpload: QueuedUpload) {
    queuedUpload.status = "completed"
    this.activeUploads.delete(queuedUpload.id)
    this.saveQueueToStorage()
    this.notifyProgress(queuedUpload)
    this.notifyGlobalProgress()

    // Process next items in queue
    setTimeout(() => this.processQueue(), 100)
  }

  private failUpload(queuedUpload: QueuedUpload, error: string) {
    queuedUpload.status = "error"
    queuedUpload.error = error
    this.activeUploads.delete(queuedUpload.id)
    this.saveQueueToStorage()
    this.notifyProgress(queuedUpload)
    this.notifyGlobalProgress()

    // Process next items in queue
    setTimeout(() => this.processQueue(), 100)
  }

  pauseUpload(queueId: string) {
    const item = this.queue.find((q) => q.id === queueId)
    if (item && item.status === "uploading") {
      item.status = "paused"
      this.activeUploads.delete(queueId)

      if (item.uploadId) {
        chunkedUploadService.pauseUpload(item.uploadId)
      }

      this.saveQueueToStorage()
      this.notifyProgress(item)
      this.notifyGlobalProgress()
      this.processQueue()
    }
  }

  resumeUpload(queueId: string) {
    const item = this.queue.find((q) => q.id === queueId)
    if (item && item.status === "paused") {
      item.status = "queued"
      this.notifyProgress(item)
      this.notifyGlobalProgress()
      this.processQueue()
    }
  }

  retryUpload(queueId: string) {
    const item = this.queue.find((q) => q.id === queueId)
    if (item && item.status === "error") {
      item.status = "queued"
      item.error = undefined
      item.progress = undefined
      item.uploadId = undefined
      item.fileUrl = undefined
      item.firestoreDocId = undefined
      this.notifyProgress(item)
      this.notifyGlobalProgress()
      this.processQueue()
    }
  }

  removeFromQueue(queueId: string) {
    const index = this.queue.findIndex((q) => q.id === queueId)
    if (index !== -1) {
      const item = this.queue[index]

      // Cancel active upload if needed
      if (item.status === "uploading" && item.uploadId) {
        chunkedUploadService.cancelUpload(item.uploadId)
        this.activeUploads.delete(queueId)
      }

      this.queue.splice(index, 1)
      this.progressCallbacks.delete(queueId)
      this.saveQueueToStorage()
      this.notifyGlobalProgress()
      this.processQueue()
    }
  }

  cancelUpload(queueId: string) {
    this.removeFromQueue(queueId)
  }

  clearCompleted() {
    this.queue = this.queue.filter((item) => item.status !== "completed")
    this.saveQueueToStorage()
    this.notifyGlobalProgress()
  }

  getQueueStatus(): QueueStats {
    const stats: QueueStats = {
      total: this.queue.length,
      queued: 0,
      uploading: 0,
      completed: 0,
      error: 0,
      paused: 0,
    }

    for (const item of this.queue) {
      stats[item.status]++
    }

    return stats
  }

  setProgressCallback(queueId: string, callback: (upload: QueuedUpload) => void) {
    this.progressCallbacks.set(queueId, callback)
  }

  setGlobalProgressCallback(callback: (queue: QueuedUpload[]) => void) {
    this.globalProgressCallback = callback
  }

  private notifyProgress(queuedUpload: QueuedUpload) {
    const callback = this.progressCallbacks.get(queuedUpload.id)
    if (callback) {
      callback(queuedUpload)
    }
  }

  private notifyGlobalProgress() {
    if (this.globalProgressCallback) {
      this.globalProgressCallback([...this.queue])
    }
  }

  getQueue(): QueuedUpload[] {
    return [...this.queue]
  }

  private saveQueueToStorage() {
    try {
      const serializableQueue = this.queue.map((item) => ({
        id: item.id,
        fileName: item.file.name,
        fileSize: item.file.size,
        fileType: item.file.type,
        status: item.status,
        priority: item.priority,
        error: item.error,
        createdAt: item.createdAt,
        folderId: item.folderId,
        folderPath: item.folderPath,
        progress: item.progress,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableQueue))
    } catch (error) {
      console.error("[v0] Failed to save queue to localStorage:", error)
    }
  }

  loadQueueFromStorage(): { fileName: string; status: string; progress?: any }[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        console.log("[v0] Loaded queue from storage:", parsed.length, "items")
        return parsed
      }
    } catch (error) {
      console.error("[v0] Failed to load queue from localStorage:", error)
    }
    return []
  }

  clearStoredQueue() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error("[v0] Failed to clear stored queue:", error)
    }
  }
}

export const uploadQueueManager = new UploadQueueManager()
