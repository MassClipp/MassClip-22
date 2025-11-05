/**
 * Vex Intelligence Utilities
 *
 * Smart content categorization and matching using the keyword database.
 * Provides contextual understanding without hardcoding specific examples.
 */

import { KEYWORD_DATABASE } from "./vex-keywords"

export interface NicheMatch {
  niche: string
  score: number
  matchedKeywords: string[]
  confidence: "high" | "medium" | "low"
}

export interface ContentAnalysis {
  primaryNiche: string | null
  allMatches: NicheMatch[]
  suggestedFolder: string | null
  keywords: string[]
  confidence: number
}

/**
 * Normalize text for matching (lowercase, remove special chars, etc.)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
}

/**
 * Extract potential keywords from a title/filename
 */
export function extractKeywords(title: string): string[] {
  const normalized = normalizeText(title)
  const words = normalized.split(/\s+/)

  // Also check for multi-word phrases
  const phrases: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`)
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`)
    }
  }

  return [...words, ...phrases]
}

/**
 * Check if a keyword matches any term in a synonym group
 */
function matchesSynonymGroup(keyword: string, synonymGroup: string[]): boolean {
  const normalized = normalizeText(keyword)
  return synonymGroup.some((term) => {
    const normalizedTerm = normalizeText(term)
    return normalized.includes(normalizedTerm) || normalizedTerm.includes(normalized)
  })
}

/**
 * Calculate match score for a niche based on keyword matches
 */
function calculateNicheScore(
  extractedKeywords: string[],
  niche: string,
  nicheData: (typeof KEYWORD_DATABASE)[string],
): { score: number; matchedKeywords: string[] } {
  let score = 0
  const matchedKeywords: string[] = []

  // Check primary keywords (1 point each)
  for (const keyword of extractedKeywords) {
    for (const primaryKeyword of nicheData.primary) {
      if (
        normalizeText(keyword).includes(normalizeText(primaryKeyword)) ||
        normalizeText(primaryKeyword).includes(normalizeText(keyword))
      ) {
        score += 1
        matchedKeywords.push(primaryKeyword)
      }
    }
  }

  // Check subtopic keywords (2 points each - more specific)
  for (const subtopic of nicheData.subtopics) {
    for (const keyword of extractedKeywords) {
      for (const subtopicKeyword of subtopic.keywords) {
        if (
          normalizeText(keyword).includes(normalizeText(subtopicKeyword)) ||
          normalizeText(subtopicKeyword).includes(normalizeText(keyword))
        ) {
          score += 2
          matchedKeywords.push(`${subtopic.name}: ${subtopicKeyword}`)
        }
      }
    }
  }

  // Check synonym groups (1.5 points each)
  for (const synonymGroup of nicheData.synonyms) {
    for (const keyword of extractedKeywords) {
      if (matchesSynonymGroup(keyword, synonymGroup.terms)) {
        score += 1.5
        matchedKeywords.push(`${synonymGroup.group} (synonym)`)
      }
    }
  }

  return { score, matchedKeywords: [...new Set(matchedKeywords)] }
}

/**
 * Detect which niche(s) a piece of content belongs to
 */
export function detectNiches(title: string): NicheMatch[] {
  const extractedKeywords = extractKeywords(title)
  const matches: NicheMatch[] = []

  for (const [niche, nicheData] of Object.entries(KEYWORD_DATABASE)) {
    const { score, matchedKeywords } = calculateNicheScore(extractedKeywords, niche, nicheData)

    if (score > 0) {
      let confidence: "high" | "medium" | "low" = "low"
      if (score >= 5) confidence = "high"
      else if (score >= 2) confidence = "medium"

      matches.push({
        niche,
        score,
        matchedKeywords,
        confidence,
      })
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score)
}

/**
 * Get the primary niche for content
 */
export function getPrimaryNiche(title: string): string | null {
  const matches = detectNiches(title)
  return matches.length > 0 ? matches[0].niche : null
}

/**
 * Suggest a folder name based on content analysis
 */
export function suggestFolderName(title: string, existingFolders: string[] = []): string | null {
  const matches = detectNiches(title)

  if (matches.length === 0) return null

  const primaryMatch = matches[0]
  const nicheData = KEYWORD_DATABASE[primaryMatch.niche]

  // Check if there's a highly specific subtopic match
  for (const subtopic of nicheData.subtopics) {
    for (const keyword of extractKeywords(title)) {
      for (const subtopicKeyword of subtopic.keywords) {
        if (
          normalizeText(keyword).includes(normalizeText(subtopicKeyword)) ||
          normalizeText(subtopicKeyword).includes(normalizeText(keyword))
        ) {
          // Check if this subtopic folder already exists
          const existingMatch = existingFolders.find(
            (f) =>
              normalizeText(f).includes(normalizeText(subtopic.name)) ||
              normalizeText(subtopic.name).includes(normalizeText(f)),
          )
          return existingMatch || subtopic.name
        }
      }
    }
  }

  // Otherwise suggest the niche name (capitalized)
  const nicheName = primaryMatch.niche.charAt(0).toUpperCase() + primaryMatch.niche.slice(1)

  // Check if a similar folder exists
  const existingMatch = existingFolders.find(
    (f) => normalizeText(f).includes(normalizeText(nicheName)) || normalizeText(nicheName).includes(normalizeText(f)),
  )

  return existingMatch || nicheName
}

/**
 * Perform full content analysis
 */
export function analyzeContent(title: string, existingFolders: string[] = []): ContentAnalysis {
  const keywords = extractKeywords(title)
  const allMatches = detectNiches(title)
  const primaryNiche = allMatches.length > 0 ? allMatches[0].niche : null
  const suggestedFolder = suggestFolderName(title, existingFolders)

  // Calculate overall confidence (0-1)
  const confidence = allMatches.length > 0 ? Math.min(allMatches[0].score / 10, 1) : 0

  return {
    primaryNiche,
    allMatches,
    suggestedFolder,
    keywords,
    confidence,
  }
}

/**
 * Find similar content based on niche matching
 */
export function findSimilarContent(
  targetTitle: string,
  contentList: Array<{ id: string; title: string }>,
): Array<{ id: string; title: string; similarity: number }> {
  const targetNiches = detectNiches(targetTitle)

  if (targetNiches.length === 0) return []

  const results = contentList.map((content) => {
    const contentNiches = detectNiches(content.title)

    // Calculate similarity based on shared niches
    let similarity = 0
    for (const targetNiche of targetNiches) {
      const matchingNiche = contentNiches.find((cn) => cn.niche === targetNiche.niche)
      if (matchingNiche) {
        similarity += (targetNiche.score + matchingNiche.score) / 2
      }
    }

    return {
      ...content,
      similarity,
    }
  })

  return results.filter((r) => r.similarity > 0).sort((a, b) => b.similarity - a.similarity)
}

/**
 * Get contextual information about a niche for AI prompts
 */
export function getNicheContext(niche: string): string {
  const nicheData = KEYWORD_DATABASE[niche]
  if (!nicheData) return ""

  const subtopicNames = nicheData.subtopics.map((s) => s.name).join(", ")
  const sampleKeywords = nicheData.primary.slice(0, 20).join(", ")

  return `${niche} content typically includes: ${subtopicNames}. Common keywords: ${sampleKeywords}`
}

/**
 * Generate a summary of all content by niche
 */
export function summarizeContentByNiche(
  contentList: Array<{ id: string; title: string; folderId?: string }>,
): Record<string, { count: number; items: string[] }> {
  const summary: Record<string, { count: number; items: string[] }> = {}

  for (const content of contentList) {
    const primaryNiche = getPrimaryNiche(content.title)
    if (primaryNiche) {
      if (!summary[primaryNiche]) {
        summary[primaryNiche] = { count: 0, items: [] }
      }
      summary[primaryNiche].count++
      summary[primaryNiche].items.push(content.title)
    }
  }

  return summary
}
