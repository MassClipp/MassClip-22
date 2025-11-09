const VERCEL_API_BASE = "https://api.vercel.com"
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

if (!VERCEL_TOKEN) {
  console.warn("[Vercel API] VERCEL_API_TOKEN not configured")
}

if (!VERCEL_PROJECT_ID) {
  console.warn("[Vercel API] VERCEL_PROJECT_ID not configured")
}

export interface VercelDomainResponse {
  name: string
  apexName: string
  projectId: string
  verified: boolean
  verification?: Array<{
    type: string
    domain: string
    value: string
    reason: string
  }>
  gitBranch?: string | null
}

export async function addDomainToVercel(domain: string): Promise<VercelDomainResponse> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error("Vercel API credentials not configured")
  }

  const response = await fetch(`${VERCEL_API_BASE}/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Vercel API error: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

export async function checkDomainStatus(domain: string): Promise<VercelDomainResponse> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error("Vercel API credentials not configured")
  }

  const response = await fetch(`${VERCEL_API_BASE}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`, {
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Vercel API error: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

export async function removeDomainFromVercel(domain: string): Promise<void> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error("Vercel API credentials not configured")
  }

  const response = await fetch(`${VERCEL_API_BASE}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Vercel API error: ${error.error?.message || response.statusText}`)
  }
}

export const addVercelDomain = async (domain: string) => {
  try {
    await addDomainToVercel(domain)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add domain",
    }
  }
}

export const removeVercelDomain = removeDomainFromVercel

export const getDomainStatus = checkDomainStatus
