// Test user credentials - Update these with your test accounts
export const TEST_USERS = {
  freeUser: {
    email: "test-free@massclip.pro",
    password: "TestPassword123!",
    expectedPlan: "free",
  },
  starterUser: {
    email: "test-starter@massclip.pro",
    password: "TestPassword123!",
    expectedPlan: "starter",
  },
  facelessProUser: {
    email: "test-pro@massclip.pro",
    password: "TestPassword123!",
    expectedPlan: "faceless_pro",
  },
  facelessprenuserUser: {
    email: "test-prenuer@massclip.pro",
    password: "TestPassword123!",
    expectedPlan: "facelessprenuer",
  },
}

export const PLAN_PERMISSIONS = {
  free: {
    bundlesLimit: 2,
    videosPerBundle: 3,
    platformFeePercentage: 20,
    downloadsLimit: 25,
    canCreateBundles: true,
  },
  starter: {
    bundlesLimit: 5,
    videosPerBundle: 10,
    platformFeePercentage: 15,
    downloadsLimit: Number.POSITIVE_INFINITY,
    canCreateBundles: true,
  },
  faceless_pro: {
    bundlesLimit: Number.POSITIVE_INFINITY,
    videosPerBundle: Number.POSITIVE_INFINITY,
    platformFeePercentage: 10,
    downloadsLimit: Number.POSITIVE_INFINITY,
    canCreateBundles: true,
  },
  facelessprenuer: {
    bundlesLimit: Number.POSITIVE_INFINITY,
    videosPerBundle: Number.POSITIVE_INFINITY,
    platformFeePercentage: 10,
    downloadsLimit: Number.POSITIVE_INFINITY,
    canCreateBundles: true,
  },
}
