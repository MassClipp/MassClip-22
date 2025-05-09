"use client"

import type React from "react"

import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NICHE_CATEGORIES } from "@/lib/category-constants"
import { cn } from "@/lib/utils"

interface CategorySelectorProps {
  selectedCategories: string[]
  onChange: (categories: string[]) => void
  disabled?: boolean
}

export function CategorySelector({ selectedCategories, onChange, disabled = false }: CategorySelectorProps) {
  const [open, setOpen] = useState(false)

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onChange(selectedCategories.filter((id) => id !== categoryId))
    } else {
      onChange([...selectedCategories, categoryId])
    }
  }

  const removeCategory = (e: React.MouseEvent, categoryId: string) => {
    e.stopPropagation()
    onChange(selectedCategories.filter((id) => id !== categoryId))
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-zinc-800/50 border-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
            disabled={disabled}
          >
            <span className="truncate">
              {selectedCategories.length > 0
                ? `${selectedCategories.length} ${selectedCategories.length === 1 ? "category" : "categories"} selected`
                : "Select categories..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-zinc-900 border-zinc-700">
          <Command className="bg-transparent">
            <CommandInput placeholder="Search categories..." className="text-white" />
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm text-zinc-400">No categories found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-auto">
                {NICHE_CATEGORIES.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.id}
                    onSelect={() => toggleCategory(category.id)}
                    className={cn(
                      "flex items-center justify-between py-3 px-4 cursor-pointer",
                      selectedCategories.includes(category.id) ? "bg-zinc-800" : "hover:bg-zinc-800",
                    )}
                  >
                    <span className="text-white">{category.label}</span>
                    {selectedCategories.includes(category.id) && <Check className="h-4 w-4 text-crimson" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected categories display */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedCategories.map((categoryId) => {
            const category = NICHE_CATEGORIES.find((c) => c.id === categoryId)
            return (
              <div
                key={categoryId}
                className="bg-zinc-800 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1"
              >
                {category?.label || categoryId}
                <button
                  onClick={(e) => removeCategory(e, categoryId)}
                  className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-zinc-700 transition-colors"
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                  <span className="sr-only">Remove {category?.label || categoryId}</span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
