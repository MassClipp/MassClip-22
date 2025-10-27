interface PipelineResult {
  transcription: {
    text: string
    duration: number
    language?: string
  }
  classification: {
    niche: string
    tone: string
    speaker: string
    content_type: string
  }
  metadata: {
    videoId: string
    processingTime: number
    tokenUsage?: any
  }
}

export async function processVideoWithAI(videoFile: File, title: string): Promise<PipelineResult> {
  console.log("🚀 [AI Pipeline] Starting full video processing...")

  try {
    // Step 1: Transcribe video
    console.log("🎤 [AI Pipeline] Step 1: Transcribing video...")
    const formData = new FormData()
    formData.append("video", videoFile)
    formData.append("title", title)

    const transcribeResponse = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    })

    if (!transcribeResponse.ok) {
      throw new Error(`Transcription failed: ${transcribeResponse.statusText}`)
    }

    const transcribeData = await transcribeResponse.json()
    if (!transcribeData.success) {
      throw new Error(transcribeData.error || "Transcription failed")
    }

    const transcription = transcribeData.transcription

    // Step 2: Classify content
    console.log("🧠 [AI Pipeline] Step 2: Classifying content...")
    const classifyResponse = await fetch("/api/classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title,
        transcript: transcription.text,
      }),
    })

    if (!classifyResponse.ok) {
      throw new Error(`Classification failed: ${classifyResponse.statusText}`)
    }

    const classifyData = await classifyResponse.json()
    if (!classifyData.success) {
      throw new Error(classifyData.error || "Classification failed")
    }

    const classification = classifyData.classification

    // Step 3: Prepare results
    const result: PipelineResult = {
      transcription,
      classification,
      metadata: {
        videoId: `ai_processed_${Date.now()}`,
        processingTime: Date.now(),
        tokenUsage: classifyData.usage,
      },
    }

    console.log("✅ [AI Pipeline] Processing completed successfully!")
    return result
  } catch (error) {
    console.error("❌ [AI Pipeline] Processing failed:", error)
    throw error
  }
}
