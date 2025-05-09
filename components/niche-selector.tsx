"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { NICHE_CATEGORIES } from "@/lib/category-constants"
import { cn } from "@/lib/utils"

interface NicheSelectorProps {
  selectedNiches: string[]
  onChange: (niches: string[]) => void
  className?: string
}

export function NicheSelector({ selectedNiches, onChange, className }: NicheSelectorProps) {
  const [open, setOpen] = useState(false)

  const toggleNiche = (nicheId: string) => {
    if (selectedNiches.includes(nicheId)) {
      onChange(selectedNiches.filter((id) => id !== nicheId))
    } else {
      onChange([...selectedNiches, nicheId])
    }
  }

  const removeNiche = (nicheId: string) => {
    onChange(selectedNiches.filter((id) => id !== nicheId))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-zinc-900/50 border-zinc-800 text-white hover:bg-zinc-800"
          >
            Select categories
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-zinc-900 border-zinc-800 text-white">
          <Command className="bg-transparent">
            <CommandInput placeholder="Search categories..." className="text-white" />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                {NICHE_CATEGORIES.map((niche) => (
                  <CommandItem
                    key={niche.id}
                    value={niche.id}
                    onSelect={() => {
                      toggleNiche(niche.id)
                      setOpen(true) // Keep the dropdown open after selection
                    }}
                    className="text-white hover:bg-zinc-800"
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", selectedNiches.includes(niche.id) ? "opacity-100" : "opacity-0")}
                    />
                    {niche.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected niches as badges */}
      {selectedNiches.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedNiches.map((nicheId) => {
            const niche = NICHE_CATEGORIES.find((n) => n.id === nicheId)
            return (
              <Badge key={nicheId} className="bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-1 py-1.5">
                {niche?.label || nicheId}
                <button onClick={() => removeNiche(nicheId)} className="ml-1 rounded-full hover:bg-zinc-600 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
