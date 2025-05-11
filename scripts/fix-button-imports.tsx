// This script helps identify and fix incorrect Button imports
// Run this manually if needed to find problematic imports

import fs from "fs"
import path from "path"

function findIncorrectImports(dir: string, extensions: string[] = [".ts", ".tsx"]) {
  const results: string[] = []

  function searchDirectory(currentDir: string) {
    const files = fs.readdirSync(currentDir)

    for (const file of files) {
      const filePath = path.join(currentDir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        searchDirectory(filePath)
      } else if (extensions.includes(path.extname(file))) {
        const content = fs.readFileSync(filePath, "utf8")

        // Check for incorrect Button import from card
        if (content.includes("import { Button") && content.includes("from '@/components/ui/card'")) {
          results.push(filePath)
          console.log(`Found incorrect Button import in: ${filePath}`)
        }
      }
    }
  }

  searchDirectory(dir)
  return results
}

// This is just for reference - don't actually run this in the browser
// findIncorrectImports('./app');
// findIncorrectImports('./components');
