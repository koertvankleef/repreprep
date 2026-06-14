import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const filesToCheck = [
  'src/app/rrr-app.ts',
  'src/design-system/components/rrr-dialog-host.ts',
  'src/app/components/rrr-exercise-catalogue.ts',
  'src/app/components/rrr-exercise-entry.ts',
  'src/app/components/rrr-exercise-history.ts',
  'src/app/components/rrr-import-export.ts',
  'src/app/components/rrr-routine-editor.ts',
  'src/app/components/rrr-routine-list.ts',
  'src/app/components/rrr-set-entry.ts',
  'src/app/components/rrr-workout-editor.ts',
  'src/app/components/rrr-workout-list.ts',
]

const violations = []

function pushViolation(file, reason, sample) {
  violations.push(`${file}: ${reason} -> ${sample}`)
}

for (const relativePath of filesToCheck) {
  const filePath = resolve(process.cwd(), relativePath)
  const content = readFileSync(filePath, 'utf8')

  const textNodeRegex = />\s*([A-Za-z][^<\n{}$]*[A-Za-z0-9])\s*</g
  for (const match of content.matchAll(textNodeRegex)) {
    const text = match[1]?.trim() ?? ''
    if (!text || text.startsWith('${') || text.includes('t(')) {
      continue
    }

    pushViolation(relativePath, 'hardcoded text node', text)
  }

  const attrRegex = /(placeholder|aria-label|title)\s*=\s*"([^"$][^"]*[A-Za-z][^"]*)"/g
  for (const match of content.matchAll(attrRegex)) {
    const attr = match[1] ?? 'attribute'
    const value = match[2] ?? ''

    if (!value || value.includes('${')) {
      continue
    }

    pushViolation(relativePath, `hardcoded ${attr}`, value)
  }
}

if (violations.length > 0) {
  console.error('i18n check failed. Found hardcoded user-facing strings:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log('i18n check passed')
