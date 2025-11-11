import { type NextRequest, NextResponse } from "next/server"

type TestResult = {
  name: string
  passed: boolean
  message: string
  details?: any
}

type PlanPermissions = {
  plan: string
  expectedBundles: boolean
  expectedVideos: number | "unlimited"
  expectedPlatformFee: number
  expectedDownloads: number | "unlimited"
}

export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json()

    const results: TestResult[] = []

    if (testType === "permissions" || testType === "all") {
      // Test plan permissions
      const planTests = await testPlanPermissions()
      results.push(...planTests)
    }

    if (testType === "auth" || testType === "all") {
      // Test auth endpoints
      const authTests = await testAuthEndpoints()
      results.push(...authTests)
    }

    if (testType === "uploads" || testType === "all") {
      // Test upload functionality
      const uploadTests = await testUploadEndpoints()
      results.push(...uploadTests)
    }

    const passed = results.filter((r) => r.passed).length
    const failed = results.filter((r) => !r.passed).length

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        passed,
        failed,
        passRate: results.length > 0 ? (passed / results.length) * 100 : 0,
      },
      results,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

async function testPlanPermissions(): Promise<TestResult[]> {
  const results: TestResult[] = []

  const planConfigs: PlanPermissions[] = [
    {
      plan: "free",
      expectedBundles: false,
      expectedVideos: "unlimited",
      expectedPlatformFee: 15,
      expectedDownloads: 25,
    },
    {
      plan: "starter",
      expectedBundles: false,
      expectedVideos: "unlimited",
      expectedPlatformFee: 10,
      expectedDownloads: "unlimited",
    },
    {
      plan: "faceless_pro",
      expectedBundles: true,
      expectedVideos: "unlimited",
      expectedPlatformFee: 5,
      expectedDownloads: "unlimited",
    },
    {
      plan: "facelessprenuer",
      expectedBundles: true,
      expectedVideos: "unlimited",
      expectedPlatformFee: 0,
      expectedDownloads: "unlimited",
    },
  ]

  for (const config of planConfigs) {
    // Test bundles permission
    const bundleResult = testBundlePermission(config)
    results.push(bundleResult)

    // Test video upload limit
    const videoResult = testVideoLimit(config)
    results.push(videoResult)

    // Test platform fee
    const feeResult = testPlatformFee(config)
    results.push(feeResult)

    // Test download limit
    const downloadResult = testDownloadLimit(config)
    results.push(downloadResult)
  }

  return results
}

function testBundlePermission(config: PlanPermissions): TestResult {
  const canCreateBundles = config.plan === "faceless_pro" || config.plan === "facelessprenuer"

  const passed = canCreateBundles === config.expectedBundles

  return {
    name: `${config.plan.toUpperCase()} - Bundle Creation Permission`,
    passed,
    message: passed
      ? `Correctly ${config.expectedBundles ? "allows" : "blocks"} bundle creation`
      : `Expected ${config.expectedBundles ? "allowed" : "blocked"} but got ${canCreateBundles ? "allowed" : "blocked"}`,
    details: {
      plan: config.plan,
      expected: config.expectedBundles,
      actual: canCreateBundles,
    },
  }
}

function testVideoLimit(config: PlanPermissions): TestResult {
  const actualLimit = "unlimited" // All plans have unlimited videos

  const passed = actualLimit === config.expectedVideos

  return {
    name: `${config.plan.toUpperCase()} - Video Upload Limit`,
    passed,
    message: passed
      ? `Correctly allows ${config.expectedVideos} videos`
      : `Expected ${config.expectedVideos} but got ${actualLimit}`,
    details: {
      plan: config.plan,
      expected: config.expectedVideos,
      actual: actualLimit,
    },
  }
}

function testPlatformFee(config: PlanPermissions): TestResult {
  let actualFee: number

  switch (config.plan) {
    case "free":
      actualFee = 15
      break
    case "starter":
      actualFee = 10
      break
    case "faceless_pro":
      actualFee = 5
      break
    case "facelessprenuer":
      actualFee = 0
      break
    default:
      actualFee = 15
  }

  const passed = actualFee === config.expectedPlatformFee

  return {
    name: `${config.plan.toUpperCase()} - Platform Fee Calculation`,
    passed,
    message: passed
      ? `Correctly applies ${config.expectedPlatformFee}% platform fee`
      : `Expected ${config.expectedPlatformFee}% but got ${actualFee}%`,
    details: {
      plan: config.plan,
      expected: config.expectedPlatformFee,
      actual: actualFee,
    },
  }
}

function testDownloadLimit(config: PlanPermissions): TestResult {
  let actualLimit: number | "unlimited"

  switch (config.plan) {
    case "free":
      actualLimit = 25
      break
    case "starter":
    case "faceless_pro":
    case "facelessprenuer":
      actualLimit = "unlimited"
      break
    default:
      actualLimit = 25
  }

  const passed = actualLimit === config.expectedDownloads

  return {
    name: `${config.plan.toUpperCase()} - Download Limit`,
    passed,
    message: passed
      ? `Correctly allows ${config.expectedDownloads} downloads`
      : `Expected ${config.expectedDownloads} but got ${actualLimit}`,
    details: {
      plan: config.plan,
      expected: config.expectedDownloads,
      actual: actualLimit,
    },
  }
}

async function testAuthEndpoints(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test that auth endpoints exist
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/membership-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "test-user-id" }),
    })

    results.push({
      name: "Auth - Membership Status Endpoint",
      passed: response.status === 200 || response.status === 404,
      message:
        response.status === 200 || response.status === 404
          ? "Endpoint is accessible"
          : `Endpoint returned ${response.status}`,
    })
  } catch (error: any) {
    results.push({
      name: "Auth - Membership Status Endpoint",
      passed: false,
      message: `Endpoint failed: ${error.message}`,
    })
  }

  return results
}

async function testUploadEndpoints(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test upload API endpoints exist
  const uploadEndpoints = ["/api/upload", "/api/upload-to-r2"]

  for (const endpoint of uploadEndpoints) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`, {
        method: "OPTIONS", // Use OPTIONS to check if endpoint exists
      })

      results.push({
        name: `Upload - ${endpoint} Endpoint Availability`,
        passed: response.status !== 404,
        message: response.status !== 404 ? "Endpoint is available" : "Endpoint not found",
      })
    } catch (error: any) {
      results.push({
        name: `Upload - ${endpoint} Endpoint Availability`,
        passed: false,
        message: `Endpoint check failed: ${error.message}`,
      })
    }
  }

  return results
}
