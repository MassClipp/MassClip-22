import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CaretSortIcon } from "@radix-ui/react-icons"

export function NavDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-sm data-[state=open]:bg-muted">
          Content Management
          <CaretSortIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuItem>
          <a href="/free-content" className="w-full">
            Free Content
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <a href="/upload-content" className="w-full">
            Upload Content
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <a href="/bundles" className="w-full">
            Bundles
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <a href="/categories" className="w-full">
            Categories
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <a href="/tags" className="w-full">
            Tags
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <a href="/settings" className="w-full">
            Settings
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NavDropdown
