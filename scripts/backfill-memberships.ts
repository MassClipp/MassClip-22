import { runMembershipsBackfill } from "@/lib/memberships-backfill"

type AnyDoc = Record<string, any>

function asDate(input: any | undefined): Date | undefined {
  if (!input) return undefined
  if (input?.toDate && typeof input.toDate === "function") return input.toDate()
  if (typeof input === "number") return new Date(input)
  if (typeof input === "string") return new Date(input)
  if (input instanceof Date) return input
  return undefined
}

async function main() {
  try {
    console.log("Starting memberships backfill...")
    const stats = await runMembershipsBackfill()
    console.log("Backfill completed.")
    console.log(JSON.stringify(stats, null, 2))
  } catch (err) {
    console.error("Backfill failed:", err)
  }
}

main()
