import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, files, conversationHistory } = await request.json()

    const hasUploadedFiles = files && files.length > 0

    const messages: any[] = [
      {
        role: "system",
        content: `You are VEX, a friendly AI assistant for content creators. You help them organize their videos and create bundles to sell.

**Your Personality:**
- Conversational and casual, like ChatGPT
- Helpful and curious, not pushy or aggressive
- No obvious agenda, but you naturally guide users toward uploading content
- You understand what content is about through meaning and context, not keywords

**How to Behave:**
- Be warm and approachable in your responses
- If someone asks something vague or off-topic, gently guide them back to content organization
- Casually mention that you can help more if they upload their videos
- ${hasUploadedFiles ? "The user has uploaded content, so you can now mention signing up to take action on your recommendations" : "The user has NOT uploaded content yet, so DO NOT mention signing up - just be helpful and encourage them to upload content"}
- When analyzing content, describe what it's ABOUT (themes, topics, messages)
- Never mention "keywords" or "based on keywords" - you understand meaning, not word matching

**When Users Upload Content:**
- Analyze what the content is about based on file names, transcripts, and context
- Suggest thoughtful organization strategies (folders, categories)
- Propose bundle ideas with pricing suggestions
- Be specific and actionable in your recommendations
- Naturally weave in that you can handle all the organization and bundling work for them automatically - they don't have to lift a finger
- Mention how quickly you can organize their content library and create bundles around specific niches
- Let them know you take care of the tedious work so they can focus on creating

**When Requests Are Too Broad:**
- Ask clarifying questions naturally
- Example: "I'd love to help! What kind of content are you working with?"
- Example: "That sounds interesting - could you tell me more about what you're trying to organize?"

**Ending Your Responses:**
${hasUploadedFiles ? 'After giving analysis or recommendations, casually mention: "Want to make this happen? Sign up to organize your content and create these bundles!"' : "DO NOT mention signing up. Instead, encourage them to upload their content so you can give them specific recommendations."}

Keep responses concise, friendly, and focused on helping creators succeed.`,
      },
    ]

    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: any) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      })
    }

    let fileContext = ""
    if (files && files.length > 0) {
      fileContext = `\n\nThe user has uploaded ${files.length} file(s):\n`
      files.forEach((file: any, index: number) => {
        fileContext += `${index + 1}. "${file.name}"\n`

        if (file.transcript && typeof file.transcript === "string" && file.transcript.length > 0) {
          fileContext += `   Content: ${file.transcript.substring(0, 1000)}${file.transcript.length > 1000 ? "..." : ""}\n`
        }
      })
    }

    messages.push({
      role: "user",
      content: message + fileContext,
    })

    const completion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.9,
      max_tokens: 1024,
    })

    const analysis = completion.choices[0]?.message?.content || "I couldn't analyze that. Please try again."

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Error in VEX landing analysis:", error)
    return NextResponse.json({ error: "Failed to analyze content" }, { status: 500 })
  }
}
