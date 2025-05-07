import { type NextRequest, NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: NextRequest) {
  try {
    // Get the GitHub token from environment variables
    const githubToken = process.env.GH_AI_DEPLOY_TOKEN

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 })
    }

    // Parse the request body
    const body = await request.json()
    const { file_path, file_content, commit_message, pr_title, pr_description } = body

    // Validate required fields
    if (!file_path || !file_content || !commit_message) {
      return NextResponse.json(
        { error: "Missing required fields: file_path, file_content, commit_message" },
        { status: 400 },
      )
    }

    // Initialize Octokit with the token
    const octokit = new Octokit({ auth: githubToken })

    // Repository details
    const owner = "MassClipp"
    const repo = "MassClip-22"
    const baseBranch = "main"
    const previewBranch = "preview"

    console.log(`Creating/updating file ${file_path} in ${previewBranch} branch`)

    // Get the current file (if it exists) to get its SHA
    let fileSha
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: file_path,
        ref: previewBranch,
      })

      if ("sha" in fileData) {
        fileSha = fileData.sha
      }
    } catch (error) {
      console.log(`File ${file_path} doesn't exist yet in branch ${previewBranch}`)
    }

    // Create or update the file in the preview branch
    const commitResponse = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: file_path,
      message: commit_message,
      content: Buffer.from(file_content).toString("base64"),
      branch: previewBranch,
      sha: fileSha, // Include SHA if updating an existing file
    })

    console.log(`File committed to ${previewBranch} branch`)

    // Check if a PR already exists from preview to main
    const { data: existingPRs } = await octokit.pulls.list({
      owner,
      repo,
      head: `${owner}:${previewBranch}`,
      base: baseBranch,
      state: "open",
    })

    let prResponse
    const defaultPrTitle = pr_title || `Update ${file_path} from v0.dev`
    const defaultPrDescription =
      pr_description || `This PR contains changes made via v0.dev.\n\nChanges:\n- ${commit_message}`

    if (existingPRs.length > 0) {
      // Update the existing PR description to include the new changes
      const existingPR = existingPRs[0]
      console.log(`Updating existing PR #${existingPR.number}`)

      prResponse = await octokit.pulls.update({
        owner,
        repo,
        pull_number: existingPR.number,
        body: `${existingPR.body || defaultPrDescription}\n- ${commit_message}`,
      })
    } else {
      // Create a new PR
      console.log(`Creating new PR from ${previewBranch} to ${baseBranch}`)

      prResponse = await octokit.pulls.create({
        owner,
        repo,
        title: defaultPrTitle,
        body: defaultPrDescription,
        head: previewBranch,
        base: baseBranch,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Changes committed to ${previewBranch} branch and PR created/updated`,
      commit: commitResponse.data.commit,
      pullRequest: prResponse.data,
    })
  } catch (error) {
    console.error("Error in create-pr:", error)
    if (error.response) {
      console.error("Status:", error.response.status)
      console.error("Data:", error.response.data)
      return NextResponse.json(
        {
          error: `GitHub API error: ${error.response.status}`,
          details: error.response.data,
        },
        { status: error.response.status },
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
