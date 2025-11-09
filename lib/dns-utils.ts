import dns from "dns"
import { promisify } from "util"

const resolveTxt = promisify(dns.resolveTxt)
const resolveCname = promisify(dns.resolveCname)
const resolve4 = promisify(dns.resolve4)

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

// Vercel's IPs for apex domains (these are examples, check Vercel docs for current IPs)
const VERCEL_A_RECORDS = ["76.76.21.21"]
const VERCEL_CNAME_TARGET = "cname.vercel-dns.com"

export async function verifyDNSRecords(
  domain: string,
  verificationToken: string,
  isApex: boolean,
): Promise<DNSVerificationResult> {
  const result: DNSVerificationResult = {
    txtRecordFound: false,
    verified: false,
  }

  try {
    // Check TXT record for verification
    const txtRecordName = isApex ? `_vercel-challenge.${domain}` : `_vercel-challenge.${domain}`

    try {
      const txtRecords = await resolveTxt(txtRecordName)
      const flatRecords = txtRecords.flat()

      result.txtRecordFound = flatRecords.some((record) => record.includes(verificationToken))
      result.txtRecordValue = flatRecords.find((record) => record.includes(verificationToken))
    } catch (error: any) {
      if (error.code !== "ENOTFOUND" && error.code !== "ENODATA") {
        result.error = `TXT record error: ${error.message}`
      }
    }

    // Check CNAME or A record depending on domain type
    if (isApex) {
      // Apex domain - check A records
      try {
        const aRecords = await resolve4(domain)
        result.aRecordFound = aRecords.some((ip) => VERCEL_A_RECORDS.includes(ip))
        result.aRecordValues = aRecords
      } catch (error: any) {
        if (error.code !== "ENOTFOUND") {
          result.error = `A record error: ${error.message}`
        }
      }

      result.verified = result.txtRecordFound && result.aRecordFound
    } else {
      // Subdomain - check CNAME
      try {
        const cnameRecords = await resolveCname(domain)
        result.cnameRecordFound = cnameRecords.some((record) => record.toLowerCase().includes("vercel"))
        result.cnameRecordValue = cnameRecords[0]
      } catch (error: any) {
        if (error.code !== "ENOTFOUND") {
          result.error = `CNAME record error: ${error.message}`
        }
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
  const baseDomain = isApex ? domain : domain.split(".").slice(1).join(".")
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
          value: VERCEL_A_RECORDS[0],
          ttl: 300,
        }
      : {
          type: "CNAME",
          name: domain.split(".")[0],
          value: VERCEL_CNAME_TARGET,
          ttl: 300,
        },
  }
}
