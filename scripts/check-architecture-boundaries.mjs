import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

const srcRoot = resolve(process.cwd(), 'src')
const files = [
  ...globByLayer('app'),
  ...globByLayer('components'),
  ...globByLayer('design-system'),
  ...globByLayer('domain'),
  ...globByLayer('foundation'),
  ...globByLayer('storage'),
]

const boundaryRules = {
  foundation: new Set(['app', 'components', 'domain', 'storage']),
  'design-system': new Set(['app', 'components', 'domain', 'storage']),
  domain: new Set(['app', 'components']),
  storage: new Set(['app', 'components']),
}

const violations = []

for (const filePath of files) {
  const fromLayer = getLayer(filePath)
  if (!fromLayer || !(fromLayer in boundaryRules)) {
    continue
  }

  const source = readFileSync(filePath, 'utf8')
  const importMatches = source.matchAll(/from\s+['\"]([^'\"]+)['\"]/g)

  for (const match of importMatches) {
    const specifier = match[1]
    if (!specifier || !specifier.startsWith('.')) {
      continue
    }

    const resolved = resolve(dirname(filePath), specifier)
    const targetLayer = getLayer(resolved)

    if (!targetLayer) {
      continue
    }

    if (boundaryRules[fromLayer].has(targetLayer)) {
      const relFrom = normalize(relative(process.cwd(), filePath))
      violations.push(`${relFrom} imports ${specifier} (forbidden target layer: ${targetLayer})`)
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture boundary check failed:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log('Architecture boundary check passed')

function globByLayer(layer) {
  const pattern = resolve(srcRoot, layer)
  return walk(pattern).filter((path) => path.endsWith('.ts'))
}

function walk(dirPath) {
  try {
    const entries = readdirSync(dirPath)
    const files = []

    for (const entry of entries) {
      const fullPath = resolve(dirPath, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        files.push(...walk(fullPath))
      } else {
        files.push(fullPath)
      }
    }

    return files
  } catch {
    return []
  }
}

function getLayer(filePath) {
  const rel = normalize(relative(srcRoot, filePath))
  if (rel.startsWith('..')) {
    return null
  }

  return rel.split('/')[0] ?? null
}

function normalize(pathValue) {
  return pathValue.replace(/\\/g, '/')
}
