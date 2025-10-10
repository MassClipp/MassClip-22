import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, files } = await request.json()

    const fileContext =
      files && files.length > 0
        ? `\n\nThe user has uploaded ${files.length} file(s): ${files.map((f: any) => f.name).join(", ")}`
        : ""

    const systemPrompt = `You are VEX, an AI assistant that helps content creators organize their videos and create profitable bundles. 

Your role is to:
1. Analyze the user's content based on file names and their description
2. Suggest organization strategies (folders, categories, themes)
3. Propose bundle ideas with pricing recommendations
4. Explain the potential value and monetization opportunities

After providing your analysis, ALWAYS end with: "To organize your content and create these bundles, sign up to get started!"

Be enthusiastic, specific, and actionable. Focus on demonstrating value. Keep responses concise but informative.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message + fileContext },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
    })

    const analysis = completion.choices[0]?.message?.content || "I couldn't analyze that. Please try again."

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Error in VEX landing analysis:", error)
    return NextResponse.json({ error: "Failed to analyze content" }, { status: 500 })
  }
}
