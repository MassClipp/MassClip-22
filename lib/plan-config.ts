// Central source of truth for all plan configurations
// This eliminates inconsistencies across the codebase

export const PLAN_NAMES = {
  // Database values (what's stored in Firestore)
  STARTER: "starter",
  CREATOR_PRO: "creator_pro",
} as const

export const PLAN_DISPLAY_NAMES = {
  // UI display names (what users see)
  [PLAN_NAMES.STARTER]: "Faceless Pro",
  [PLAN_NAMES.CREATOR_PRO]: "Facelessprenuer",
} as const

export const PLAN_FEATURES = {
  [PLAN_NAMES.STARTER]: {
    // Faceless Pro - $29/month
    displayName: "Faceless Pro",
    price: 29,
    maxFolders: 3,
    maxBundles: 5,
    maxVideosPerBundle: 15,
    platformFeePercentage: 20,
    canCreateSubfolders: true,
    canAnalyzeTranscripts: false, // Basic Vex AI only
    unlimitedDownloads: false,
    premiumContent: false,
    noWatermark: false,
    prioritySupport: false,
  },
  [PLAN_NAMES.CREATOR_PRO]: {
    // Facelessprenuer - $39/month
    displayName: "Facelessprenuer",
    price: 39,
    maxFolders: null, // unlimited
    maxBundles: null, // unlimited
    maxVideosPerBundle: null, // unlimited
    platformFeePercentage: 10,
    canCreateSubfolders: true,
    canAnalyzeTranscripts: true, // Full Vex AI with transcript analysis
    unlimitedDownloads: true,
    premiumContent: true,
    noWatermark: true,
    prioritySupport: true,
  },
} as const

// Helper function to check if a plan has unlimited features
export function isUnlimitedPlan(plan: string): boolean {
  return plan === PLAN_NAMES.CREATOR_PRO
}

// Helper function to get plan features
export function getPlanFeatures(plan: string) {
  return PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES[PLAN_NAMES.STARTER]
}

// Helper function to get display name
export function getPlanDisplayName(plan: string): string {
  return PLAN_DISPLAY_NAMES[plan as keyof typeof PLAN_DISPLAY_NAMES] || "Free"
}
