import { type NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { testFile, headed } = await request.json()

    // Validate test file if provided
    const validTests = [
      "tests/flows/01-authentication.spec.ts",
      "tests/flows/02-content-upload.spec.ts",
      "tests/flows/03-storefront.spec.ts",
      "tests/flows/04-purchases.spec.ts",
      "tests/permissions/01-plan-permissions.spec.ts",
      "tests/permissions/02-trial-permissions.spec.ts",
      "tests/permissions/03-subscription-permissions.spec.ts",
      "tests/mobile/01-mobile-flows.spec.ts",
    ]

    let command = "npx playwright test"

    if (testFile && validTests.includes(testFile)) {
      command += ` ${testFile}`
    }

    if (headed) {
      command += " --headed"
    }

    // Add JSON reporter for parsing results
    command += " --reporter=json"

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      env: { ...process.env },
    })

    // Parse Playwright JSON output
    let results
    try {
      results = JSON.parse(stdout)
    } catch {
      results = { raw: stdout, error: stderr }
    }

    return NextResponse.json({
      success: true,
      results,
      stdout,
      stderr,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
      },
      { status: 500 },
    )
  }
}
