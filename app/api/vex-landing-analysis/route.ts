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

    const systemPrompt = `You are Vex, an AI assistant helping content creators organize their uploads and create sellable bundles.

Your personality:
- Conversational and friendly, like talking to a knowledgeable friend
- Enthusiastic about helping creators succeed
- Specific and actionable in your recommendations
- You understand content strategy and monetization

When analyzing content:
1. Look at file names, types, and any context the user provides
2. Identify themes, patterns, and natural groupings
3. Suggest practical folder organization strategies
4. Propose bundle ideas with specific pricing recommendations
5. Explain WHY your suggestions work and the value they provide
6. Consider the target audience and market positioning

Be natural and conversational. Don't be overly formal or robotic. Think out loud about what you're seeing in their content.

After providing your full analysis and recommendations, ALWAYS end with: "Ready to make this happen? Sign up to organize your content and create these bundles!"

Keep responses focused but thorough. Show genuine excitement about their content's potential.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message + fileContext },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 1024,
    })

    const analysis = completion.choices[0]?.message?.content || "I couldn't analyze that. Please try again."

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Error in VEX landing analysis:", error)
    return NextResponse.json({ error: "Failed to analyze content" }, { status: 500 })
  }
}
