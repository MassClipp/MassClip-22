/**
 * Vex Metadata Intelligence Layer
 *
 * Makes Vex THINK about content using file metadata and natural language understanding.
 * Analyzes:
 * - File extension (.mp4, .mp3, .wav, .pdf, etc.)
 * - Duration (short SFX vs long motivation videos)
 * - Description/transcript content
 * - Folder origin (where it was uploaded)
 * - Filename structure
 */

import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface FileMetadata {
  filename: string
  title: string
  description?: string
  mimeType: string
  contentType: "video" | "audio" | "image" | "document"
  duration?: number | null // in seconds
  fileSize?: number // in bytes
  folderId?: string | null
  folderName?: string | null
  tags?: string[]
  transcript?: string
  transcriptDuration?: number
  transcriptLanguage?: string
}

export interface MetadataReasoning {
  evidence: string[]
  confidence: "very_high" | "high" | "medium" | "low"
  reasoning: string
  detectedNiche: string | null
  suggestedFolder: string | null
  culturalMarkers?: string[]
  conversationalTone?: string
}

/**
 * Analyze file extension to determine likely content type
 */
function analyzeFileExtension(
  filename: string,
  mimeType: string,
): {
  likelyNiche: string | null
  evidence: string
  confidence: number
} {
  const ext = filename.toLowerCase().split(".").pop() || ""

  // Audio-only formats are likely SFX or Voiceover
  if (["wav", "mp3", "aiff", "flac", "ogg", "m4a"].includes(ext)) {
    return {
      likelyNiche: "audio", // Generic audio, will be refined by AI
      evidence: `File extension .${ext} indicates audio-only content`,
      confidence: 0.6,
    }
  }

  // Video formats could be anything
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) {
    return {
      likelyNiche: null,
      evidence: `File extension .${ext} indicates video content`,
      confidence: 0.3,
    }
  }

  // Image formats could be memes
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    return {
      likelyNiche: "image",
      evidence: `File extension .${ext} indicates image content`,
      confidence: 0.5,
    }
  }

  return {
    likelyNiche: null,
    evidence: `File extension .${ext}`,
    confidence: 0.1,
  }
}

/**
 * Analyze duration to provide context
 */
function analyzeDuration(
  duration: number | null | undefined,
  contentType: string,
): {
  evidence: string
  durationCategory: string
} {
  if (!duration || duration === 0) {
    return {
      evidence: "No duration data available",
      durationCategory: "unknown",
    }
  }

  if (duration < 10) {
    return {
      evidence: `Duration of ${duration}s (very short)`,
      durationCategory: "very_short",
    }
  }

  if (duration >= 10 && duration < 60) {
    return {
      evidence: `Duration of ${duration}s (short)`,
      durationCategory: "short",
    }
  }

  if (duration >= 60 && duration <= 300) {
    return {
      evidence: `Duration of ${Math.floor(duration / 60)}m ${duration % 60}s (medium)`,
      durationCategory: "medium",
    }
  }

  return {
    evidence: `Duration of ${Math.floor(duration / 60)}m ${duration % 60}s (long)`,
    durationCategory: "long",
  }
}

/**
 * Analyze filename structure for patterns
 */
function analyzeFilenameStructure(filename: string): {
  hasNumbers: boolean
  hasUnderscores: boolean
  hasDashes: boolean
  hasDescriptiveWords: boolean
  evidence: string
} {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")
  const hasNumbers = /\d{3,}/.test(nameWithoutExt)
  const hasUnderscores = nameWithoutExt.includes("_")
  const hasDashes = nameWithoutExt.includes("-")

  const words = nameWithoutExt.split(/[_\-\s]+/).filter((w) => w.length > 2)
  const descriptiveWords = words.filter((w) => !/^\d+$/.test(w))
  const hasDescriptiveWords = descriptiveWords.length > 0

  let evidence = ""

  if (hasNumbers && !hasDescriptiveWords) {
    evidence = `Filename "${nameWithoutExt}" is mostly numbers`
  } else if (hasDescriptiveWords) {
    evidence = `Filename "${nameWithoutExt}" contains: ${descriptiveWords.slice(0, 5).join(", ")}`
  } else {
    evidence = `Filename "${nameWithoutExt}"`
  }

  return {
    hasNumbers,
    hasUnderscores,
    hasDashes,
    hasDescriptiveWords,
    evidence,
  }
}

/**
 * Analyze folder origin to understand user's organization
 */
function analyzeFolderOrigin(folderName: string | null | undefined): {
  evidence: string
} {
  if (!folderName) {
    return {
      evidence: "No folder assignment (uploaded to Main folder)",
    }
  }

  return {
    evidence: `Uploaded to folder "${folderName}"`,
  }
}

/**
 * Use AI to analyze content naturally without keyword constraints
 */
async function analyzeContentWithAI(metadata: FileMetadata): Promise<{
  detectedNiche: string | null
  confidence: "very_high" | "high" | "medium" | "low"
  reasoning: string
  suggestedFolder: string | null
}> {
  try {
    // Build context for AI
    let context = `Analyze this content file:\n\n`
    context += `Filename: ${metadata.filename}\n`
    context += `Title: ${metadata.title}\n`

    if (metadata.description) {
      context += `Description: ${metadata.description}\n`
    }

    if (metadata.duration) {
      const minutes = Math.floor(metadata.duration / 60)
      const seconds = metadata.duration % 60
      context += `Duration: ${minutes > 0 ? `${minutes}m ` : ""}${seconds}s\n`
    }

    context += `Content Type: ${metadata.contentType}\n`
    context += `File Type: ${metadata.mimeType}\n`

    if (metadata.folderName) {
      context += `Current Folder: ${metadata.folderName}\n`
    }

    if (metadata.tags && metadata.tags.length > 0) {
      context += `Tags: ${metadata.tags.join(", ")}\n`
    }

    if (metadata.transcript) {
      const transcriptPreview = metadata.transcript.substring(0, 1500)
      context += `\nTranscript: ${transcriptPreview}${metadata.transcript.length > 1500 ? "..." : ""}\n`
    }

    context += `\nBased on all this information, what is this content about? What niche or category does it belong to?`
    context += `\nProvide your response in this exact JSON format:`
    context += `\n{"niche": "the main category/niche", "confidence": "very_high|high|medium|low", "reasoning": "brief explanation", "suggestedFolder": "folder name suggestion"}`

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are VEX, an AI that understands content deeply. Analyze content based on meaning and context, not just keywords. Be specific about what the content is actually about. Common niches include: motivation, faith/spirituality, business, money/finance, sports, lifestyle, education, entertainment, memes, music, sfx (sound effects), voiceover, b-roll, background videos, mindset, and more. Don't limit yourself to these - identify the true nature of the content.`,
        },
        {
          role: "user",
          content: context,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("No response from AI")
    }

    const parsed = JSON.parse(response)

    return {
      detectedNiche: parsed.niche || null,
      confidence: parsed.confidence || "low",
      reasoning: parsed.reasoning || "Unable to determine content type",
      suggestedFolder: parsed.suggestedFolder || null,
    }
  } catch (error) {
    console.error("[VEX AI Analysis] Error:", error)
    // Fallback to basic analysis
    return {
      detectedNiche: null,
      confidence: "low",
      reasoning: `Unable to analyze "${metadata.filename}" - AI analysis unavailable`,
      suggestedFolder: null,
    }
  }
}

/**
 * Main metadata analysis function - makes Vex THINK naturally
 */
export async function analyzeMetadata(
  metadata: FileMetadata,
  existingFolders: string[] = [],
): Promise<MetadataReasoning> {
  const evidence: string[] = []

  // 1. Analyze file extension
  const extAnalysis = analyzeFileExtension(metadata.filename, metadata.mimeType)
  evidence.push(`📄 ${extAnalysis.evidence}`)

  // 2. Analyze duration
  const durationAnalysis = analyzeDuration(metadata.duration, metadata.contentType)
  evidence.push(`⏱️ ${durationAnalysis.evidence}`)

  // 3. Analyze filename structure
  const filenameAnalysis = analyzeFilenameStructure(metadata.filename)
  evidence.push(`📝 ${filenameAnalysis.evidence}`)

  // 4. Analyze folder origin
  const folderAnalysis = analyzeFolderOrigin(metadata.folderName)
  evidence.push(`📁 ${folderAnalysis.evidence}`)

  // 5. Use AI to understand the content naturally
  const aiAnalysis = await analyzeContentWithAI(metadata)

  if (aiAnalysis.detectedNiche) {
    evidence.push(`🤖 AI detected: ${aiAnalysis.detectedNiche} (${aiAnalysis.confidence} confidence)`)
  }

  return {
    evidence,
    confidence: aiAnalysis.confidence,
    reasoning: aiAnalysis.reasoning,
    detectedNiche: aiAnalysis.detectedNiche,
    suggestedFolder: aiAnalysis.suggestedFolder,
  }
}

/**
 * Batch analyze multiple files
 */
export async function batchAnalyzeMetadata(
  files: FileMetadata[],
  existingFolders: string[] = [],
): Promise<Map<string, MetadataReasoning>> {
  const results = new Map<string, MetadataReasoning>()

  // Analyze files in parallel for speed
  const analyses = await Promise.all(files.map((file) => analyzeMetadata(file, existingFolders)))

  files.forEach((file, index) => {
    results.set(file.filename, analyses[index])
  })

  return results
}

/**
 * Generate a human-readable summary of metadata analysis
 */
export function generateAnalysisSummary(analysis: MetadataReasoning): string {
  let summary = `**Confidence: ${analysis.confidence.toUpperCase()}**\n\n`
  summary += `${analysis.reasoning}\n\n`
  summary += `**Evidence:**\n`
  analysis.evidence.forEach((e) => {
    summary += `- ${e}\n`
  })

  if (analysis.suggestedFolder) {
    summary += `\n**Suggested Folder:** ${analysis.suggestedFolder}`
  }

  return summary
}
