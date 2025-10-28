export interface UserObjective {
  id: string
  title: string
  description: string
  completed: boolean
  completedAt?: Date
}

export interface UserObjectivesDoc {
  uid: string
  objectives: UserObjective[]
  completedCount: number
  totalCount: number
  percentageComplete: number
  createdAt: Date
  updatedAt: Date
  dismissed: boolean // User can dismiss the popup after completing all
}

export const DEFAULT_OBJECTIVES: Omit<UserObjective, "completed" | "completedAt">[] = [
  {
    id: "customize_storefront",
    title: "Customize Storefront",
    description: "Add your profile picture, bio, and branding",
  },
  {
    id: "upload_content",
    title: "Upload First Content",
    description: "Upload your first video or file",
  },
  {
    id: "add_free_content",
    title: "Add Free Content",
    description: "Create free content to attract your audience",
  },
  {
    id: "connect_stripe",
    title: "Connect Stripe",
    description: "Set up payouts to start earning",
  },
  {
    id: "create_bundle",
    title: "Create First Bundle",
    description: "Package your content into a bundle",
  },
  {
    id: "go_live",
    title: "Go Live",
    description: "Publish your storefront to the world",
  },
]
