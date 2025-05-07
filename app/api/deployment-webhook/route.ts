import { type NextRequest, NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

// This webhook will be triggered by Vercel when a deployment completes
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Vercel (you should add proper verification)
    const payload = await request.json()

    // Check if this is a v0.dev deployment
    // You may need to adjust this logic based on how v0.dev deployments are identified
    const isV0Deployment =
      payload.deployment?.meta?.source === "v0.dev" ||
      (payload.deployment?.meta?.githubCommitMessage || "").includes("[v0.dev]")

    if (!isV0Deployment) {
      return NextResponse.json({ status: "ignored", message: "Not a v0.dev deployment" })
    }

    console.log("Detected v0.dev deployment, creating PR to preview branch")

    // Get GitHub token
    const token = process.env.GH_AI_DEPLOY_TOKEN
    if (!token) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 })
    }

    // Initialize Octokit
    const octokit = new Octokit({ auth: token })

    // Repository details
    const owner = "MassClipp"
    const repo = "MassClip-22"

    // Get the latest commit from main
    const { data: mainRef } = await octokit.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    })

    const mainSha = mainRef.object.sha

    // Create or update the preview branch to point to the same commit
    try {
      // Try to update existing branch
      await octokit.git.updateRef({
        owner,
        repo,
        ref: "heads/preview",
        sha: mainSha,
        force: true,
      })
    } catch (error) {
      // Branch doesn't exist, create it
      await octokit.git.createRef({
        owner,
        repo,
        ref: "refs/heads/preview",
        sha: mainSha,
      })
    }

    // Create a pull request if one doesn't already exist
    let prNumber
    try {
      const { data: prs } = await octokit.pulls.list({
        owner,
        repo,
        state: "open",
        head: `${owner}:preview`,
        base: "main",
      })

      if (prs.length > 0) {
        // Update existing PR
        prNumber = prs[0].number
        await octokit.pulls.update({
          owner,
          repo,
          pull_number: prNumber,
          title: "v0.dev changes ready for review",
          body: `This PR contains changes deployed from v0.dev on ${new Date().toISOString()}`,
        })
      } else {
        // Create new PR
        const { data: newPr } = await octokit.pulls.create({
          owner,
          repo,
          title: "v0.dev changes ready for review",
          head: "preview",
          base: "main",
          body: `This PR contains changes deployed from v0.dev on ${new Date().toISOString()}`,
        })
        prNumber = newPr.number
      }
    } catch (error) {
      console.error("Error creating/updating PR:", error)
      return NextResponse.json({ error: "Failed to create/update PR" }, { status: 500 })
    }

    return NextResponse.json({
      status: "success",
      message: "Created/updated PR for v0.dev changes",
      prNumber,
    })
  } catch (error) {
    console.error("Error in deployment webhook:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
