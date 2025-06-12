interface ClassificationResult {
  niche: string
  tone: string
  speaker: string
  content_type: string
}

interface ClassificationResponse {
  success: boolean
  classification: ClassificationResult
  fallback?: boolean
  error?: string
  usage?: any
}

export async function classifyContent(title: string, transcript: string): Promise<ClassificationResult | null> {
  try {
    console.log("🔍 [Classification Helper] Starting classification...")

    const response = await fetch("/api/classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        transcript,
      }),
    })

    if (!response.ok) {
      console.error("❌ [Classification Helper] API response not ok:", response.status)
      return null
    }

    const data: ClassificationResponse = await response.json()

    if (!data.success) {
      console.error("❌ [Classification Helper] Classification failed:", data.error)
      return null
    }

    if (data.fallback) {
      console.log("🔄 [Classification Helper] Using fallback classification")
    }

    console.log("✅ [Classification Helper] Classification successful:", data.classification)
    return data.classification
  } catch (error) {
    console.error("❌ [Classification Helper] Error:", error)
    return null
  }
}

// Test function for manual testing
export async function testClassification() {
  const testTitle = "David Goggins on Mental Toughness"
  const testTranscript =
    "You have to be willing to suffer. Most people quit when it gets hard. But that's when you find out who you really are. Mental toughness isn't something you're born with, it's something you develop through suffering and pushing through when you want to quit."

  console.log("🧪 [Test Classification] Starting test...")
  const result = await classifyContent(testTitle, testTranscript)
  console.log("🧪 [Test Classification] Result:", result)
  return result
}
