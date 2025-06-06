"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Brain, FileText, Loader2, CheckCircle, AlertCircle, Clock, TestTube } from "lucide-react"
import { cn } from "@/lib/utils"

interface TranscriptionResult {
  text: string
  duration: number
  language?: string
  segments?: any[]
}

interface ClassificationResult {
  niche: string
  tone: string
  speaker: string
  content_type: string
}

interface PipelineStep {
  name: string
  status: "pending" | "processing" | "completed" | "error"
  result?: any
  error?: string
  details?: string
  startTime?: number
  duration?: number
}

export default function TestAIPipelinePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [title, setTitle] = useState("")

  // Pipeline state
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<PipelineStep[]>([
    { name: "Upload Video", status: "pending" },
    { name: "Extract Audio", status: "pending" },
    { name: "Transcribe Audio", status: "pending" },
    { name: "Classify Content", status: "pending" },
    { name: "Save Results", status: "pending" },
  ])

  // Results state
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null)
  const [classification, setClassification] = useState<ClassificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Diagnostic state
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false)
  const [openAITestResult, setOpenAITestResult] = useState<any>(null)

  // Timer for current step
  const [stepTimer, setStepTimer] = useState<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const updateStep = (index: number, updates: Partial<PipelineStep>) => {
    setSteps((prev) =>
      prev.map((step, i) => {
        if (i === index) {
          const updatedStep = { ...step, ...updates }
          if (updates.status === "processing") {
            updatedStep.startTime = Date.now()
          } else if (updates.status === "completed" || updates.status === "error") {
            if (step.startTime) {
              updatedStep.duration = Date.now() - step.startTime
            }
          }
          return updatedStep
        }
        return step
      }),
    )
  }

  // Timer effect for current processing step
  useEffect(() => {
    if (isProcessing) {
      timerRef.current = setInterval(() => {
        setStepTimer((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setStepTimer(0)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isProcessing])

  const testOpenAI = async () => {
    setIsTestingOpenAI(true)
    setOpenAITestResult(null)

    try {
      console.log("🧪 Testing OpenAI API connection...")

      const response = await fetch("/api/test-openai", {
        method: "GET",
      })

      const data = await response.json()
      console.log("🧪 OpenAI test result:", data)

      setOpenAITestResult(data)
    } catch (error) {
      console.error("❌ OpenAI test error:", error)
      setOpenAITestResult({
        success: false,
        error: "Failed to test OpenAI connection",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsTestingOpenAI(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
      setError("Please select a video or audio file")
      return
    }

    // Check file size (25MB limit for Whisper)
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 25MB limit`)
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview for video files
    if (file.type.startsWith("video/")) {
      const fileURL = URL.createObjectURL(file)
      setFilePreview(fileURL)
    } else {
      setFilePreview(null)
    }

    // Auto-generate title from filename
    const filename = file.name.replace(/\.[^/.]+$/, "")
    setTitle(filename.replace(/[-_]/g, " "))
  }

  const processVideo = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setError(null)
    setDebugInfo(null)
    setCurrentStep(0)
    setStepTimer(0)

    try {
      // Step 1: Upload Video
      updateStep(0, { status: "processing" })
      await new Promise((resolve) => setTimeout(resolve, 500))
      updateStep(0, {
        status: "completed",
        result: {
          size: `${(selectedFile.size / 1024 / 1024).toFixed(1)}MB`,
          name: selectedFile.name,
          type: selectedFile.type,
        },
      })
      setCurrentStep(1)

      // Step 2: Extract Audio (simulated)
      updateStep(1, { status: "processing" })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      updateStep(1, {
        status: "completed",
        result: {
          format: "audio/mpeg",
          duration: "unknown",
          status: "ready for transcription",
        },
      })
      setCurrentStep(2)

      // Step 3: Transcribe Audio
      updateStep(2, { status: "processing" })

      console.log("🎤 Starting transcription for:", selectedFile.name)

      // Create FormData for file upload
      const formData = new FormData()
      formData.append("video", selectedFile)
      formData.append("title", title)

      let transcribeResponse: Response
      let transcribeData: any

      try {
        // Create a timeout for the fetch request (3 minutes)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort()
        }, 180000) // 3 minutes

        transcribeResponse = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        console.log("📡 Transcription response status:", transcribeResponse.status)
        console.log("📡 Transcription response headers:", Object.fromEntries(transcribeResponse.headers.entries()))

        // Handle non-JSON responses
        const contentType = transcribeResponse.headers.get("content-type")
        if (!contentType?.includes("application/json")) {
          const textResponse = await transcribeResponse.text()
          console.error("❌ Non-JSON response:", textResponse.substring(0, 1000))

          let errorMessage = "Server returned non-JSON response"
          if (transcribeResponse.status === 413) {
            errorMessage = "File too large for server (413 error)"
          } else if (transcribeResponse.status === 404) {
            errorMessage = "Transcription endpoint not found (404 error)"
          } else if (transcribeResponse.status === 500) {
            errorMessage = "Internal server error during transcription"
          } else if (transcribeResponse.status >= 500) {
            errorMessage = "Server error during transcription"
          }

          throw new Error(errorMessage)
        }

        transcribeData = await transcribeResponse.json()
        console.log("📝 Transcription response data:", transcribeData)
      } catch (fetchError) {
        console.error("❌ Fetch error:", fetchError)

        let errorMsg = "Network error during transcription"
        if (fetchError instanceof Error) {
          if (fetchError.name === "AbortError") {
            errorMsg = "Transcription timed out (3 minute limit)"
          } else if (fetchError.message.includes("413")) {
            errorMsg = "File too large for server (25MB limit)"
          } else if (fetchError.message.includes("404")) {
            errorMsg = "Transcription service not available"
          } else if (fetchError.message.includes("500")) {
            errorMsg = "Server error during transcription"
          } else if (fetchError.message.includes("Failed to fetch")) {
            errorMsg = "Network connection failed"
          } else {
            errorMsg = fetchError.message
          }
        }

        updateStep(2, {
          status: "error",
          error: errorMsg,
          details: fetchError instanceof Error ? fetchError.message : "Unknown fetch error",
        })

        setError(`Transcription failed: ${errorMsg}`)
        setDebugInfo({
          step: "transcription",
          error: errorMsg,
          fetchError: fetchError instanceof Error ? fetchError.message : "Unknown error",
          fileSize: selectedFile.size,
          fileName: selectedFile.name,
          timeout: fetchError instanceof Error && fetchError.name === "AbortError",
        })
        return
      }

      if (!transcribeResponse.ok || !transcribeData.success) {
        const errorMsg = transcribeData.error || `HTTP ${transcribeResponse.status}: ${transcribeResponse.statusText}`
        const errorDetails = transcribeData.details || "No additional details"

        console.error("❌ Transcription failed:", errorMsg)

        updateStep(2, {
          status: "error",
          error: errorMsg,
          details: errorDetails,
        })

        setError(`Transcription failed: ${errorMsg}`)
        setDebugInfo({
          step: "transcription",
          error: errorMsg,
          details: errorDetails,
          response: transcribeData,
          status: transcribeResponse.status,
          processingTime: transcribeData.metadata?.processingTime,
          openaiStatus: transcribeData.openaiStatus,
        })
        return
      }

      setTranscription(transcribeData.transcription)
      updateStep(2, {
        status: "completed",
        result: {
          textLength: `${transcribeData.transcription.text.length} characters`,
          duration: `${transcribeData.transcription.duration}s`,
          language: transcribeData.transcription.language,
          segments: transcribeData.transcription.segments?.length || 0,
          processingTime: `${transcribeData.metadata?.processingTime || 0}ms`,
        },
      })
      setCurrentStep(3)

      // Step 4: Classify Content
      updateStep(3, { status: "processing" })

      console.log("🧠 Starting classification...")

      const classifyResponse = await fetch("/api/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title,
          transcript: transcribeData.transcription.text,
        }),
      })

      const classifyData = await classifyResponse.json()
      console.log("🏷️ Classification response:", classifyData)

      if (!classifyResponse.ok || !classifyData.success) {
        const errorMsg = classifyData.error || `HTTP ${classifyResponse.status}: ${classifyResponse.statusText}`
        console.error("❌ Classification failed:", errorMsg)

        updateStep(3, {
          status: "error",
          error: errorMsg,
          details: classifyData.details || "No additional details",
        })

        setError(`Classification failed: ${errorMsg}`)
        return
      }

      setClassification(classifyData.classification)
      updateStep(3, { status: "completed", result: classifyData.classification })
      setCurrentStep(4)

      // Step 5: Save Results (simulated)
      updateStep(4, { status: "processing" })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      updateStep(4, {
        status: "completed",
        result: {
          saved: true,
          videoId: "demo_" + Date.now(),
          timestamp: new Date().toISOString(),
        },
      })

      console.log("✅ AI Pipeline completed successfully!")
    } catch (err) {
      console.error("❌ Pipeline error:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      updateStep(currentStep, { status: "error", error: errorMessage })
      setDebugInfo({
        step: "pipeline",
        error: errorMessage,
        currentStep,
        stack: err instanceof Error ? err.stack : undefined,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetPipeline = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setTitle("")
    setTranscription(null)
    setClassification(null)
    setError(null)
    setDebugInfo(null)
    setIsProcessing(false)
    setCurrentStep(0)
    setStepTimer(0)
    setOpenAITestResult(null)
    setSteps([
      { name: "Upload Video", status: "pending" },
      { name: "Extract Audio", status: "pending" },
      { name: "Transcribe Audio", status: "pending" },
      { name: "Classify Content", status: "pending" },
      { name: "Save Results", status: "pending" },
    ])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getStepIcon = (step: PipelineStep, index: number) => {
    switch (step.status) {
      case "processing":
        return (
          <div className="flex items-center gap-1">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            {index === currentStep && <span className="text-xs text-blue-400 ml-1">{stepTimer}s</span>}
          </div>
        )
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-zinc-600" />
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-500" />
            AI Video Pipeline Test
          </CardTitle>
          <p className="text-zinc-400">
            Upload a video to test the complete AI pipeline: transcription → classification → storage
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Diagnostic Section */}
          <Card className="border-purple-500/20 bg-purple-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-purple-400">
                    <TestTube className="h-5 w-5" />
                    <span className="font-medium">OpenAI API Diagnostic</span>
                  </div>
                  <p className="text-purple-300 mt-1">Test OpenAI connection before running the pipeline</p>
                </div>
                <Button
                  onClick={testOpenAI}
                  disabled={isTestingOpenAI}
                  variant="outline"
                  className="bg-purple-800 border-purple-700 text-purple-200 hover:bg-purple-700"
                >
                  {isTestingOpenAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test OpenAI
                    </>
                  )}
                </Button>
              </div>

              {openAITestResult && (
                <div className="mt-4 p-3 rounded bg-zinc-800/50 border border-zinc-700">
                  <div
                    className={cn(
                      "flex items-center gap-2 mb-2",
                      openAITestResult.success ? "text-green-400" : "text-red-400",
                    )}
                  >
                    {openAITestResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {openAITestResult.success ? "OpenAI API Working" : "OpenAI API Failed"}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-300">
                    {openAITestResult.success ? (
                      <div>
                        <p>✅ {openAITestResult.message}</p>
                        <p>Model: {openAITestResult.model}</p>
                        <p>Response: "{openAITestResult.response}"</p>
                      </div>
                    ) : (
                      <div>
                        <p>❌ {openAITestResult.error}</p>
                        <p>Details: {openAITestResult.details}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processing Time Warning */}
          <Card className="border-yellow-500/20 bg-yellow-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-yellow-400">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Processing Time</span>
              </div>
              <p className="text-yellow-300 mt-2">
                Transcription can take 30 seconds to 2 minutes depending on file size and OpenAI API load. The process
                will timeout after 3 minutes.
              </p>
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white mb-2 block">
                Video Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title..."
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Video/Audio File (Max 25MB)</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
                  "hover:bg-zinc-800/30 hover:border-zinc-600",
                  selectedFile ? "border-blue-500/50 bg-blue-500/5" : "border-zinc-700 bg-zinc-800/30",
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {filePreview ? (
                  <div className="space-y-3">
                    <div className="aspect-video max-w-md mx-auto rounded overflow-hidden bg-black">
                      <video src={filePreview} className="w-full h-full object-contain" controls />
                    </div>
                    <p className="text-sm text-zinc-400">{selectedFile?.name}</p>
                    <p className="text-xs text-zinc-500">
                      {selectedFile && `${(selectedFile.size / 1024 / 1024).toFixed(1)}MB • ${selectedFile.type}`}
                    </p>
                  </div>
                ) : selectedFile ? (
                  <div className="space-y-3">
                    <FileText className="h-16 w-16 text-blue-500 mx-auto" />
                    <p className="text-sm text-zinc-400">{selectedFile.name}</p>
                    <p className="text-xs text-zinc-500">
                      {`${(selectedFile.size / 1024 / 1024).toFixed(1)}MB • ${selectedFile.type}`}
                    </p>
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center">
                    <Upload className="h-12 w-12 text-zinc-500 mb-3" />
                    <p className="text-lg font-medium text-white">Click to upload video or audio</p>
                    <p className="text-sm text-zinc-500 mt-1">MP4, MOV, WebM, MP3, WAV (Max 25MB)</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={processVideo}
                disabled={!selectedFile || isProcessing}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing... ({stepTimer}s)
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Start AI Pipeline
                  </>
                )}
              </Button>

              <Button
                onClick={resetPipeline}
                variant="outline"
                className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                disabled={isProcessing}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Pipeline Progress */}
          {(isProcessing || steps.some((s) => s.status !== "pending")) && (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-lg">Pipeline Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="mt-0.5">{getStepIcon(step, index)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "font-medium",
                              step.status === "completed"
                                ? "text-green-400"
                                : step.status === "processing"
                                  ? "text-blue-400"
                                  : step.status === "error"
                                    ? "text-red-400"
                                    : "text-zinc-400",
                            )}
                          >
                            {step.name}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span className="capitalize">{step.status}</span>
                            {step.duration && <span>({formatDuration(step.duration)})</span>}
                          </div>
                        </div>
                        {step.result && (
                          <div className="text-xs text-zinc-400 mt-1 space-y-1">
                            {typeof step.result === "object"
                              ? Object.entries(step.result).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="text-zinc-500">{key}:</span> {String(value)}
                                  </div>
                                ))
                              : String(step.result)}
                          </div>
                        )}
                        {step.error && (
                          <div className="text-xs text-red-400 mt-1">
                            <div className="font-medium">Error: {step.error}</div>
                            {step.details && <div className="text-red-300 mt-1">Details: {step.details}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-500/20 bg-red-500/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Pipeline Error</span>
                </div>
                <p className="text-red-300 mt-2">{error}</p>
                {debugInfo && (
                  <details className="mt-3">
                    <summary className="text-red-400 cursor-pointer text-sm">Debug Information</summary>
                    <pre className="text-xs text-red-300 mt-2 bg-red-900/20 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transcription Results */}
            {transcription && (
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
                    Transcription Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-zinc-400">Duration:</span>
                        <span className="ml-2 text-green-400">{transcription.duration}s</span>
                      </div>
                      {transcription.language && (
                        <div>
                          <span className="text-zinc-400">Language:</span>
                          <span className="ml-2 text-green-400">{transcription.language}</span>
                        </div>
                      )}
                      {transcription.segments && (
                        <div>
                          <span className="text-zinc-400">Segments:</span>
                          <span className="ml-2 text-green-400">{transcription.segments.length}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-400">Length:</span>
                        <span className="ml-2 text-green-400">{transcription.text.length} chars</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-sm">Transcript:</Label>
                      <Textarea
                        value={transcription.text}
                        readOnly
                        className="mt-2 bg-zinc-900 border-zinc-600 text-white h-32 resize-none"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Classification Results */}
            {classification && (
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-500" />
                    Classification Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <span className="text-zinc-400">Niche:</span>
                      <span className="ml-2 text-blue-400 font-medium">{classification.niche}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Tone:</span>
                      <span className="ml-2 text-blue-400 font-medium">{classification.tone}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Speaker:</span>
                      <span className="ml-2 text-blue-400 font-medium">{classification.speaker}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Content Type:</span>
                      <span className="ml-2 text-blue-400 font-medium">{classification.content_type}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
