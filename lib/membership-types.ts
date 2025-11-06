export type MembershipStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing"

export interface MembershipFeatures {
  unlimitedDownloads: boolean
  premiumContent: boolean
  noWatermark: boolean
  prioritySupport: boolean
  platformFeePercentage: number
  maxVideosPerBundle: number | null
  maxBundles: number | null
  maxFolders: number | null
  canCreateSubfolders: boolean
  canAnalyzeTranscripts: boolean
  canCreateBundles: boolean
}

export interface MembershipDoc {
  uid: string
  email: string | null
  plan: "starter" | "pro" | "creator_pro"
  status: MembershipStatus
  isActive: boolean
  stripeCustomerId: string
  stripeSubscriptionId: string
  currentPeriodEnd: Date | null
  priceId: string | null
  connectedAccountId?: string | null
  downloadsUsed: number
  bundlesCreated: number
  features: MembershipFeatures
  createdAt: any
  updatedAt: any
}
