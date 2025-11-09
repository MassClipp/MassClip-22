export interface DNSVerificationResult {
  txtRecordFound: boolean
  txtRecordValue?: string
  cnameRecordFound?: boolean
  cnameRecordValue?: string
  aRecordFound?: boolean
  aRecordValues?: string[]
  verified: boolean
  error?: string
}

// Vercel's expected DNS values
const VERCEL_CNAME_TARGET = "cname.vercel-dns.com"

// Use Google's DNS-over-HTTPS API for DNS lookups (works in edge runtime)
async function dnsLookup(name: string, type: string): Promise<any> {
  try {
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: {
        Accept: "application/dns-json",
      },
    })

    if (!response.ok) {
      throw new Error(`DNS lookup failed: ${response.statusText}`)
    }

    return response.json()
  } catch (error: any) {
    console.error(`[DNS] Lookup error for ${name} (${type}):`, error)
    throw error
  }
}

import { isTestMode, isTestDomain, getMockDNSVerification } from "./custom-domain-test-mode"

export async function verifyDNSRecords(
  domain: string,
  verificationToken: string,
  isApex: boolean,
  createdAt?: string,
): Promise<DNSVerificationResult> {
  const result: DNSVerificationResult = {
    txtRecordFound: false,
    verified: false,
  }

  if (isTestMode() && isTestDomain(domain)) {
    console.log(`[DNS] [TEST MODE] Mock verifying DNS for: ${domain}`)
    const mockResult = getMockDNSVerification(domain, createdAt || new Date().toISOString())
    return mockResult as DNSVerificationResult
  }

  try {
    // Check TXT record for verification
    const txtRecordName = `_vercel-challenge.${domain}`

    try {
      const txtResponse = await dnsLookup(txtRecordName, "TXT")

      if (txtResponse.Answer) {
        const txtRecords = txtResponse.Answer.map((a: any) => a.data.replace(/"/g, ""))
        result.txtRecordFound = txtRecords.some((record: string) => record.includes(verificationToken))
        result.txtRecordValue = txtRecords.find((record: string) => record.includes(verificationToken))
      }
    } catch (error: any) {
      result.error = `TXT record not found`
    }

    // Check CNAME or A record depending on domain type
    if (isApex) {
      // Apex domain - check A records
      // For apex domains, we'll rely on Vercel's verification system
      // since A records can vary by region
      try {
        const aResponse = await dnsLookup(domain, "A")
        if (aResponse.Answer) {
          result.aRecordFound = true
          result.aRecordValues = aResponse.Answer.map((a: any) => a.data)
        }
      } catch (error: any) {
        result.error = `A record not found`
      }

      result.verified = result.txtRecordFound && result.aRecordFound
    } else {
      // Subdomain - check CNAME
      try {
        const cnameResponse = await dnsLookup(domain, "CNAME")
        if (cnameResponse.Answer) {
          const cnameValue = cnameResponse.Answer[0]?.data
          result.cnameRecordFound = cnameValue?.toLowerCase().includes("vercel")
          result.cnameRecordValue = cnameValue
        }
      } catch (error: any) {
        result.error = `CNAME record not found`
      }

      result.verified = result.txtRecordFound && result.cnameRecordFound
    }

    return result
  } catch (error: any) {
    return {
      ...result,
      error: error.message,
    }
  }
}

export function isApexDomain(domain: string): boolean {
  // Apex domain has no subdomain (e.g., example.com vs shop.example.com)
  const parts = domain.split(".")
  return parts.length === 2
}

export function getDNSInstructions(domain: string, verificationToken: string, isApex: boolean) {
  const subdomain = isApex ? "_vercel-challenge" : `_vercel-challenge.${domain.split(".")[0]}`

  return {
    txtRecord: {
      type: "TXT",
      name: subdomain,
      value: verificationToken,
      ttl: 300,
    },
    pointingRecord: isApex
      ? {
          type: "A",
          name: "@",
          value: "76.76.21.21",
          ttl: 300,
          note: "Vercel will provide the correct A record value after adding the domain",
        }
      : {
          type: "CNAME",
          name: domain.split(".")[0],
          value: VERCEL_CNAME_TARGET,
          ttl: 300,
        },
  }
}
