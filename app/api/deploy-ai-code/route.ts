import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Get the GitHub token from environment variables
    const githubToken = process.env.GH_AI_DEPLOY_TOKEN

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 })
    }

    // Parse the request body
    const body = await request.json()
    const { branch, file_path, file_content, commit_message } = body

    // Validate required fields
    if (!branch || !file_path || !file_content || !commit_message) {
      return NextResponse.json(
        { error: "Missing required fields: branch, file_path, file_content, commit_message" },
        { status: 400 },
      )
    }

    // Send repository_dispatch event to GitHub
    const response = await fetch("https://api.github.com/repos/MassClipp/MassClip-22/dispatches", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "ai-code-update",
        client_payload: {
          branch,
          file_path,
          file_content,
          commit_message,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("GitHub API error:", errorData)
      return NextResponse.json(
        { error: `GitHub API error: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Deployment triggered for ${file_path} to ${branch} branch`,
    })
  } catch (error) {
    console.error("Error in deploy-ai-code:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
