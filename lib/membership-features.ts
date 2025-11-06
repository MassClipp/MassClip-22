import type { MembershipFeatures } from "./membership-types"

export const STARTER_FEATURES: MembershipFeatures = {
  unlimitedDownloads: false,
  premiumContent: false,
  noWatermark: false,
  prioritySupport: false,
  platformFeePercentage: 20, // Faceless Pro: 20% platform fee
  maxVideosPerBundle: 15, // Faceless Pro: 15 videos per bundle
  maxBundles: 5, // Faceless Pro: 5 bundles max
  maxFolders: 3, // Faceless Pro: 3 folders
  canCreateSubfolders: true,
  canAnalyzeTranscripts: false, // Basic Vex AI only
  canCreateBundles: false,
}

export const PRO_FEATURES: MembershipFeatures = {
  unlimitedDownloads: true,
  premiumContent: true,
  noWatermark: true,
  prioritySupport: true,
  platformFeePercentage: 10, // 10% for Creator Pro
  maxVideosPerBundle: null, // Unlimited for Creator Pro
  maxBundles: null, // Unlimited for Creator Pro
  maxFolders: null, // Unlimited for Creator Pro
  canCreateSubfolders: true,
  canAnalyzeTranscripts: true, // Full Vex AI with transcript analysis
  canCreateBundles: true,
}
