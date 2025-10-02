/**
 * Vex Metadata Intelligence Layer
 *
 * Makes Vex THINK about content using file metadata, not just keywords.
 * Analyzes:
 * - File extension (.mp4, .mp3, .wav, .pdf, etc.)
 * - Duration (short SFX vs long motivation videos)
 * - Description/transcript content
 * - Folder origin (where it was uploaded)
 * - Filename structure (patterns like "grind_speech_final.mp4")
 */

import { analyzeContent } from "./vex-intelligence"
import { analyzeCulturalPatterns } from "./vex-conversational-examples"

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
      likelyNiche: "sfx", // Default to SFX, will be refined by duration
      evidence: `File extension .${ext} indicates audio-only content`,
      confidence: 0.6,
    }
  }

  // Video formats could be anything
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) {
    return {
      likelyNiche: null,
      evidence: `File extension .${ext} indicates video content (needs further analysis)`,
      confidence: 0.3,
    }
  }

  // Document formats are likely ebooks
  if (["pdf", "epub", "mobi", "doc", "docx"].includes(ext)) {
    return {
      likelyNiche: "ebook",
      evidence: `File extension .${ext} indicates document/ebook content`,
      confidence: 0.9,
    }
  }

  // Image formats could be memes
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    return {
      likelyNiche: "memes",
      evidence: `File extension .${ext} indicates image content (likely meme)`,
      confidence: 0.5,
    }
  }

  return {
    likelyNiche: null,
    evidence: `File extension .${ext} is uncommon`,
    confidence: 0.1,
  }
}

/**
 * Analyze duration to determine content type
 * - SFX: typically 0.5-10 seconds
 * - Voiceover: typically 10-60 seconds
 * - Motivation: typically 30 seconds - 5 minutes
 * - Memes: typically 5-30 seconds
 */
function analyzeDuration(
  duration: number | null | undefined,
  contentType: string,
): {
  likelyNiche: string | null
  evidence: string
  confidence: number
} {
  if (!duration || duration === 0) {
    return {
      likelyNiche: null,
      evidence: "No duration data available",
      confidence: 0,
    }
  }

  // SFX are typically very short
  if (duration < 10) {
    return {
      likelyNiche: "sfx",
      evidence: `Duration of ${duration}s is typical for sound effects (usually under 10s)`,
      confidence: 0.8,
    }
  }

  // Voiceovers are typically 10-60 seconds
  if (duration >= 10 && duration < 60 && contentType === "audio") {
    return {
      likelyNiche: "voiceover",
      evidence: `Duration of ${duration}s with audio-only format suggests voiceover content`,
      confidence: 0.7,
    }
  }

  // Short videos (5-30s) could be memes
  if (duration >= 5 && duration < 30 && contentType === "video") {
    return {
      likelyNiche: "memes",
      evidence: `Duration of ${duration}s is typical for short-form meme videos`,
      confidence: 0.6,
    }
  }

  // Medium videos (30s-5min) could be motivation
  if (duration >= 30 && duration <= 300 && contentType === "video") {
    return {
      likelyNiche: "motivation",
      evidence: `Duration of ${Math.floor(duration / 60)}m ${duration % 60}s is typical for motivational content`,
      confidence: 0.6,
    }
  }

  // Longer content
  if (duration > 300) {
    return {
      likelyNiche: null,
      evidence: `Duration of ${Math.floor(duration / 60)}m ${duration % 60}s suggests long-form content`,
      confidence: 0.3,
    }
  }

  return {
    likelyNiche: null,
    evidence: `Duration of ${duration}s doesn't strongly indicate a specific niche`,
    confidence: 0.2,
  }
}

/**
 * Analyze filename structure for patterns
 * Examples:
 * - "grind_speech_final.mp4" → motivation (keywords: grind, speech)
 * - "2819_rebellion.mp4" → unclear (numbers don't indicate content)
 * - "funny_cat_meme.mp4" → memes (keywords: funny, meme)
 * - "whoosh_transition_01.wav" → sfx (keywords: whoosh, transition)
 */
function analyzeFilenameStructure(filename: string): {
  hasNumbers: boolean
  hasUnderscores: boolean
  hasDashes: boolean
  hasDescriptiveWords: boolean
  evidence: string
  confidence: number
} {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")
  const hasNumbers = /\d{3,}/.test(nameWithoutExt) // 3+ consecutive numbers
  const hasUnderscores = nameWithoutExt.includes("_")
  const hasDashes = nameWithoutExt.includes("-")

  // Check if filename has descriptive words (not just numbers)
  const words = nameWithoutExt.split(/[_\-\s]+/).filter((w) => w.length > 2)
  const descriptiveWords = words.filter((w) => !/^\d+$/.test(w))
  const hasDescriptiveWords = descriptiveWords.length > 0

  let evidence = ""
  let confidence = 0.5

  if (hasNumbers && !hasDescriptiveWords) {
    evidence = `Filename "${nameWithoutExt}" is mostly numbers with no descriptive words (unclear content type)`
    confidence = 0.1
  } else if (hasDescriptiveWords) {
    evidence = `Filename "${nameWithoutExt}" contains descriptive words: ${descriptiveWords.join(", ")}`
    confidence = 0.7
  } else {
    evidence = `Filename "${nameWithoutExt}" structure is unclear`
    confidence = 0.3
  }

  return {
    hasNumbers,
    hasUnderscores,
    hasDashes,
    hasDescriptiveWords,
    evidence,
    confidence,
  }
}

/**
 * Analyze folder origin to understand user's organization
 */
function analyzeFolderOrigin(folderName: string | null | undefined): {
  evidence: string
  suggestedNiche: string | null
  confidence: number
} {
  if (!folderName) {
    return {
      evidence: "No folder assignment (uploaded to Main folder)",
      suggestedNiche: null,
      confidence: 0,
    }
  }

  const normalized = folderName.toLowerCase()

  // Check for niche-related folder names
  const nicheKeywords: Record<string, string[]> = {
    motivation: ["motivation", "motivational", "inspire", "success", "hustle", "grind"],
    memes: ["meme", "memes", "funny", "comedy", "humor", "viral"],
    sfx: ["sfx", "sound", "effects", "audio", "sounds"],
    voiceover: ["voiceover", "voice", "vo", "narration", "speech"],
    ebook: ["ebook", "ebooks", "book", "books", "guide", "guides", "pdf"],
    mindset: ["mindset", "mental", "psychology", "thinking", "philosophy"],
    broll: ["broll", "b-roll", "footage", "cinematic", "stock"],
    "background-videos": ["background", "backdrop", "loop", "animated background"],
  }

  for (const [niche, keywords] of Object.entries(nicheKeywords)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return {
          evidence: `Uploaded to folder "${folderName}" which suggests ${niche} content`,
          suggestedNiche: niche,
          confidence: 0.8,
        }
      }
    }
  }

  return {
    evidence: `Uploaded to folder "${folderName}" (no clear niche indication)`,
    suggestedNiche: null,
    confidence: 0.2,
  }
}

/**
 * Main metadata analysis function - makes Vex THINK
 */
export function analyzeMetadata(metadata: FileMetadata, existingFolders: string[] = []): MetadataReasoning {
  const evidence: string[] = []
  const scores: Record<string, number> = {
    motivation: 0,
    memes: 0,
    sfx: 0,
    voiceover: 0,
    ebook: 0,
    mindset: 0,
    broll: 0,
    "background-videos": 0,
  }

  // 1. Analyze file extension
  const extAnalysis = analyzeFileExtension(metadata.filename, metadata.mimeType)
  evidence.push(`📄 ${extAnalysis.evidence}`)
  if (extAnalysis.likelyNiche) {
    scores[extAnalysis.likelyNiche] += extAnalysis.confidence * 10
  }

  // 2. Analyze duration (critical for audio/video)
  const durationAnalysis = analyzeDuration(metadata.duration, metadata.contentType)
  evidence.push(`⏱️ ${durationAnalysis.evidence}`)
  if (durationAnalysis.likelyNiche) {
    scores[durationAnalysis.likelyNiche] += durationAnalysis.confidence * 15 // Duration is very important
  }

  // 3. Analyze filename structure
  const filenameAnalysis = analyzeFilenameStructure(metadata.filename)
  evidence.push(`📝 ${filenameAnalysis.evidence}`)

  // 4. Analyze folder origin
  const folderAnalysis = analyzeFolderOrigin(metadata.folderName)
  evidence.push(`📁 ${folderAnalysis.evidence}`)
  if (folderAnalysis.suggestedNiche) {
    scores[folderAnalysis.suggestedNiche] += folderAnalysis.confidence * 12
  }

  // 5. Analyze title/description with keyword intelligence
  const keywordAnalysis = analyzeContent(metadata.title, existingFolders)
  if (keywordAnalysis.primaryNiche) {
    evidence.push(
      `🔍 Title analysis detected "${keywordAnalysis.primaryNiche}" with ${Math.round(keywordAnalysis.confidence * 100)}% confidence`,
    )
    scores[keywordAnalysis.primaryNiche] += keywordAnalysis.confidence * 20 // Keywords are important
  } else {
    evidence.push(`🔍 Title "${metadata.title}" doesn't match any known content patterns`)
  }

  // 6. Analyze description if available
  if (metadata.description && metadata.description.length > 10) {
    const descAnalysis = analyzeContent(metadata.description, existingFolders)
    if (descAnalysis.primaryNiche) {
      evidence.push(`📋 Description analysis supports "${descAnalysis.primaryNiche}" classification`)
      scores[descAnalysis.primaryNiche] += descAnalysis.confidence * 10
    }
  }

  // 7. Analyze tags if available
  if (metadata.tags && metadata.tags.length > 0) {
    const tagText = metadata.tags.join(" ")
    const tagAnalysis = analyzeContent(tagText, existingFolders)
    if (tagAnalysis.primaryNiche) {
      evidence.push(`🏷️ Tags suggest "${tagAnalysis.primaryNiche}" content`)
      scores[tagAnalysis.primaryNiche] += tagAnalysis.confidence * 8
    }
  }

  const culturalAnalysis = analyzeCulturalPatterns(metadata.title)
  if (culturalAnalysis.likelyNiche && culturalAnalysis.confidence > 30) {
    evidence.push(
      `💬 Conversational analysis detected "${culturalAnalysis.likelyNiche}" vibe (${Math.round(culturalAnalysis.confidence)}% confidence)`,
    )
    if (scores[culturalAnalysis.likelyNiche] !== undefined) {
      scores[culturalAnalysis.likelyNiche] += (culturalAnalysis.confidence / 100) * 15
    }
  }
  if (culturalAnalysis.detectedMarkers.length > 0) {
    evidence.push(`🗣️ Cultural markers: ${culturalAnalysis.detectedMarkers.slice(0, 3).join(", ")}`)
  }

  // Determine final niche based on scores
  const sortedNiches = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)

  const detectedNiche = sortedNiches.length > 0 ? sortedNiches[0][0] : null
  const topScore = sortedNiches.length > 0 ? sortedNiches[0][1] : 0
  const secondScore = sortedNiches.length > 1 ? sortedNiches[1][1] : 0

  // Determine confidence based on score and gap between top 2
  let confidence: "very_high" | "high" | "medium" | "low" = "low"
  const scoreGap = topScore - secondScore

  if (topScore >= 30 && scoreGap >= 15) {
    confidence = "very_high"
  } else if (topScore >= 20 && scoreGap >= 10) {
    confidence = "high"
  } else if (topScore >= 10) {
    confidence = "medium"
  }

  // Generate reasoning summary
  let reasoning = ""
  if (detectedNiche) {
    reasoning = `This file is called "${metadata.filename}"`

    if (metadata.duration) {
      reasoning += `, is ${metadata.duration < 60 ? `${metadata.duration} seconds` : `${Math.floor(metadata.duration / 60)}m ${metadata.duration % 60}s`} long`
    }

    if (keywordAnalysis.primaryNiche) {
      const matchedKeywords = keywordAnalysis.allMatches[0]?.matchedKeywords.slice(0, 3).join(", ") || ""
      if (matchedKeywords) {
        reasoning += `, and includes keywords like "${matchedKeywords}"`
      }
    }

    reasoning += `. Based on all evidence, it's likely ${detectedNiche} content.`
  } else {
    reasoning = `Unable to confidently categorize "${metadata.filename}". The file lacks clear indicators of content type.`
  }

  return {
    evidence,
    confidence,
    reasoning,
    detectedNiche,
    suggestedFolder: keywordAnalysis.suggestedFolder,
    culturalMarkers: culturalAnalysis.detectedMarkers,
    conversationalTone: culturalAnalysis.likelyNiche || undefined,
  }
}

/**
 * Batch analyze multiple files
 */
export function batchAnalyzeMetadata(
  files: FileMetadata[],
  existingFolders: string[] = [],
): Map<string, MetadataReasoning> {
  const results = new Map<string, MetadataReasoning>()

  for (const file of files) {
    const analysis = analyzeMetadata(file, existingFolders)
    results.set(file.filename, analysis)
  }

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

  if (analysis.culturalMarkers) {
    summary += `\n**Cultural Markers:** ${analysis.culturalMarkers.join(", ")}` || ""
  }

  if (analysis.conversationalTone) {
    summary += `\n**Conversational Tone:** ${analysis.conversationalTone}`
  }

  return summary
}
