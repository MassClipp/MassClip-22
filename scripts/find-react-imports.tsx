// This is a utility script to help find problematic React imports
// You can run this with "node -r esbuild-register scripts/find-react-imports.tsx"

import * as fs from "fs"
import * as path from "path"

// Function to recursively find all TypeScript and JavaScript files
function findFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)

    if (fs.statSync(filePath).isDirectory()) {
      fileList = findFiles(filePath, fileList)
    } else {
      if (
        filePath.endsWith(".ts") ||
        filePath.endsWith(".tsx") ||
        filePath.endsWith(".js") ||
        filePath.endsWith(".jsx")
      ) {
        fileList.push(filePath)
      }
    }
  })

  return fileList
}

// Function to check for React imports in a file
function checkReactImports(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf8")

  // Check for import statements that include React and useEffectEvent
  const importRegex = /import\s+(?:{[^}]*useEffectEvent[^}]*}|\*\s+as\s+React)\s+from\s+['"]react['"]/g
  const matches = content.match(importRegex)

  if (matches) {
    console.log(`Found potential problematic import in ${filePath}:`)
    matches.forEach((match) => console.log(`  ${match}`))
  }
}

// Main function
function main() {
  const rootDir = process.cwd()
  const files = findFiles(rootDir)

  files.forEach((file) => {
    checkReactImports(file)
  })
}

main()
