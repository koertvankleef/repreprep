import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const spritePath = path.resolve(repoRoot, 'src', 'design-system', 'icons', 'sprite.ts')
const srcDir = path.resolve(repoRoot, 'src')

// Matches: <rrr-icon name="some-icon"> or <rrr-icon name='some-icon'>
const iconUsagePattern = /<rrr-icon[^>]+name=["']([a-z0-9-]+)["']/g

async function walk(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.html'))) {
      files.push(fullPath)
    }
  }

  return files
}

async function collectUsedIcons() {
  const files = await walk(srcDir)
  const used = new Map() // iconName -> [file, ...]

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8')
    const relPath = path.relative(repoRoot, filePath).replaceAll('\\', '/')
    let match

    iconUsagePattern.lastIndex = 0
    while ((match = iconUsagePattern.exec(content)) !== null) {
      const name = match[1]
      if (!used.has(name)) {
        used.set(name, [])
      }
      used.get(name).push(relPath)
    }
  }

  return used
}

async function collectSpriteIcons() {
  const content = await fs.readFile(spritePath, 'utf8')
  const spriteIconPattern = /id="icon-([a-z0-9-]+)"/g
  const icons = new Set()
  let match

  while ((match = spriteIconPattern.exec(content)) !== null) {
    icons.add(match[1])
  }

  return icons
}

async function main() {
  const [usedIcons, spriteIcons] = await Promise.all([collectUsedIcons(), collectSpriteIcons()])

  const missingFromSprite = [...usedIcons.keys()].filter((name) => !spriteIcons.has(name))
  const unusedInSprite = [...spriteIcons].filter((name) => !usedIcons.has(name))

  let hasProblems = false

  if (missingFromSprite.length > 0) {
    hasProblems = true
    console.error(`\nUsed in source but NOT in sprite (${missingFromSprite.length}):`)
    for (const name of missingFromSprite.sort()) {
      const locations = usedIcons.get(name).join(', ')
      console.error(`  - ${name}  (${locations})`)
    }
  }

  if (unusedInSprite.length > 0) {
    console.warn(`\nIn sprite but NOT used in source (${unusedInSprite.length}):`)
    for (const name of unusedInSprite.sort()) {
      console.warn(`  - ${name}`)
    }
  }

  if (hasProblems) {
    process.exitCode = 1
    return
  }

  if (unusedInSprite.length > 0) {
    console.log(`\nIcon check: ${usedIcons.size} used, ${unusedInSprite.length} unused in sprite (see above).`)
  } else {
    console.log(`Icon check passed: ${usedIcons.size} icons used, all present in sprite.`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
