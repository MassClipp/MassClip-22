"use client"

import { useMediaQuery } from "@mui/material"

export function useMobile() {
  return useMediaQuery("(max-width: 768px)")
}
