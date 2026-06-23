import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')

const sourcePath = resolve(repoRoot, process.argv[2] ?? '.tmp/exercise-import/free-exercise-db.exercises.json')
const exerciseOutputPath = resolve(repoRoot, 'src/exercise-library/exercises.ts')
const provenanceOutputPath = resolve(repoRoot, 'docs/exercise-library-provenance.json')
const documentationOutputPath = resolve(repoRoot, 'docs/exercise-library.md')

const measurementOrder = ['reps', 'weight', 'time', 'distance', 'calories', 'rounds']
const knownGenericNames = new Set([
  'press',
  'curl',
  'raise',
  'row',
  'extension',
  'flexion',
  'rotation',
  'walk',
  'run',
  'jump',
  'clean',
  'snatch',
  'squat',
  'lunge',
  'dip',
  'crunch',
  'stretch',
])

const categoryMap = new Map([
  ['strength', 'strength'],
  ['powerlifting', 'strength'],
  ['olympic weightlifting', 'strength'],
  ['strongman', 'strength'],
  ['plyometrics', 'strength'],
  ['cardio', 'cardio'],
  ['stretching', 'stretch'],
])

const equipmentMap = new Map([
  ['body only', ['bodyweight']],
  ['barbell', ['barbell']],
  ['dumbbell', ['dumbbell']],
  ['kettlebells', ['kettlebell']],
  ['machine', ['machine']],
  ['cable', ['cable']],
  ['bands', ['resistance-band']],
  ['e-z curl bar', ['barbell']],
  ['exercise ball', ['stability-ball']],
  ['foam roll', ['foam-roller']],
  ['medicine ball', ['medicine-ball']],
  ['other', ['other']],
  ['', ['other']],
])

const muscleMap = new Map([
  ['abdominals', 'abs'],
  ['abductors', 'hips'],
  ['adductors', 'hips'],
  ['biceps', 'biceps'],
  ['calves', 'calves'],
  ['chest', 'chest'],
  ['forearms', 'forearms'],
  ['glutes', 'glutes'],
  ['hamstrings', 'hamstrings'],
  ['lats', 'back'],
  ['lower back', 'back'],
  ['middle back', 'back'],
  ['neck', 'shoulders'],
  ['quadriceps', 'quadriceps'],
  ['shoulders', 'shoulders'],
  ['traps', 'back'],
  ['triceps', 'triceps'],
])

const aliasBySlug = new Map([
  ['chin-up', ['Underhand Pull-up']],
  ['hyperextensions-back-extensions', ['Roman Chair Back Extension']],
  ['rickshaw-carry', ['Trap Bar Carry']],
])

function assertRecord(value, context) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${context} must be an object`)
  }

  return value
}

function normalizeName(value) {
  return String(value)
    .replace(/\s+/g, ' ')
    .replace(/\s+-\s+/g, '-')
    .trim()
}

function slugify(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function normalizeCategory(sourceCategory, sourceId) {
  const category = categoryMap.get(String(sourceCategory ?? '').toLowerCase())

  if (!category) {
    throw new Error(`Unknown category "${sourceCategory}" on source exercise ${sourceId}`)
  }

  return category
}

function normalizeEquipment(sourceEquipment, name, instructions) {
  const sourceValue = String(sourceEquipment ?? '').toLowerCase()
  const equipment = equipmentMap.get(sourceValue)

  if (!equipment) {
    throw new Error(`Unknown equipment "${sourceEquipment}" on exercise "${name}"`)
  }

  const inferred = [...equipment]
  const haystack = `${name} ${instructions.join(' ')}`.toLowerCase()

  if (/\bbench\b/.test(haystack)) {
    inferred.push('bench')
  }

  if (/\b(pull[- ]?up|chin[- ]?up)\b/.test(haystack)) {
    inferred.push('pull-up-bar')
  }

  if (/\bdip(s)?\b/.test(haystack)) {
    inferred.push('dip-bars')
  }

  if (/\b(jump rope|skipping rope)\b/.test(haystack)) {
    inferred.push('jump-rope')
  }

  if (/\btreadmill\b/.test(haystack)) {
    inferred.push('treadmill')
  }

  if (/\b(rower|rowing machine)\b/.test(haystack)) {
    inferred.push('rowing-machine')
  }

  if (/\b(elliptical)\b/.test(haystack)) {
    inferred.push('elliptical')
  }

  if (/\b(stair climber|stair machine)\b/.test(haystack)) {
    inferred.push('stair-machine')
  }

  if (/\b(stationary bike|exercise bike)\b/.test(haystack)) {
    inferred.push('exercise-bike')
  }

  return uniqueSorted(inferred)
}

function normalizeMuscles(sourceMuscles, sourceId, fieldName) {
  if (!Array.isArray(sourceMuscles)) {
    throw new Error(`${fieldName} must be an array on source exercise ${sourceId}`)
  }

  return uniqueSorted(
    sourceMuscles.map((sourceMuscle) => {
      const muscle = muscleMap.get(String(sourceMuscle).toLowerCase())

      if (!muscle) {
        throw new Error(`Unknown muscle "${sourceMuscle}" on source exercise ${sourceId}`)
      }

      return muscle
    }),
  )
}

function normalizeMeasurementProfile(profile) {
  const seen = new Set()
  const deduped = []

  profile.forEach((type) => {
    if (!measurementOrder.includes(type)) {
      throw new Error(`Unknown measurement type "${type}"`)
    }

    if (!seen.has(type)) {
      seen.add(type)
      deduped.push(type)
    }
  })

  return deduped.sort((left, right) => measurementOrder.indexOf(left) - measurementOrder.indexOf(right))
}

function profileKey(profile) {
  return normalizeMeasurementProfile(profile).join('+')
}

function isTimedStrengthName(name) {
  return /\b(plank|hold|wall sit|static|isometric|bridge hold)\b/i.test(name)
}

function isWeightedName(name) {
  return /\b(weighted|barbell|dumbbell|kettlebell|cable|machine|plate|sled|yoke|log|sandbag|rickshaw|tire|tyre)\b/i.test(name)
}

function isCarryOrWalk(name) {
  return /\b(carry|walk|farmer|farmers|yoke|sled|ruck)\b/i.test(name)
}

function inferMeasurementProfiles(source, equipment, category) {
  const name = source.name
  const equipmentSet = new Set(equipment)

  if (isCarryOrWalk(name) && (category === 'cardio' || source.category === 'strongman')) {
    return [['distance', 'time', 'weight']]
  }

  if (category === 'cardio') {
    return [['distance', 'time']]
  }

  if (category === 'stretch' || isTimedStrengthName(name)) {
    return [['time']]
  }

  if (
    isWeightedName(name)
    || equipmentSet.has('barbell')
    || equipmentSet.has('dumbbell')
    || equipmentSet.has('kettlebell')
    || equipmentSet.has('cable')
    || equipmentSet.has('machine')
    || equipmentSet.has('medicine-ball')
  ) {
    return [['reps', 'weight']]
  }

  return [['reps']]
}

function normalizeDescription(instructions, category, primaryMuscles) {
  const firstInstruction = instructions.find((instruction) => typeof instruction === 'string' && instruction.trim())

  if (firstInstruction) {
    return firstInstruction.replace(/\s+/g, ' ').trim()
  }

  const target = primaryMuscles.length > 0 ? primaryMuscles.join(', ') : 'the body'

  return `A ${category} exercise targeting ${target}.`
}

function sourceRecordToExercise(source) {
  const record = assertRecord(source, 'Exercise')

  if (typeof record.id !== 'string' || !record.id.trim()) {
    throw new Error('Imported exercise is missing a source id')
  }

  if (typeof record.name !== 'string' || !record.name.trim()) {
    throw new Error(`Source exercise ${record.id} is missing a name`)
  }

  const name = normalizeName(record.name)
  const id = slugify(name)
  const instructions = Array.isArray(record.instructions) ? record.instructions.map(String) : []
  const categories = [normalizeCategory(record.category, record.id)]
  const equipment = normalizeEquipment(record.equipment, name, instructions)
  const primaryMuscles = normalizeMuscles(record.primaryMuscles, record.id, 'primaryMuscles')
  const secondaryMuscles = normalizeMuscles(record.secondaryMuscles ?? [], record.id, 'secondaryMuscles')
  const measurementProfiles = inferMeasurementProfiles(record, equipment, categories[0]).map(normalizeMeasurementProfile)
  const profileKeys = new Set(measurementProfiles.map(profileKey))

  if (measurementProfiles.length === 0 || measurementProfiles.some((profile) => profile.length === 0)) {
    throw new Error(`Exercise "${name}" has an empty measurement profile`)
  }

  if (profileKeys.size !== measurementProfiles.length) {
    throw new Error(`Exercise "${name}" has duplicate measurement profiles`)
  }

  return {
    exercise: {
      id,
      name,
      aliases: aliasBySlug.get(id) ?? [],
      description: normalizeDescription(instructions, categories[0], primaryMuscles),
      categories,
      equipment,
      primaryMuscles,
      secondaryMuscles,
      measurementProfiles,
    },
    source: {
      sourceId: record.id,
      sourceName: name,
    },
  }
}

function validateExercise(exercise) {
  if (!exercise.id) {
    throw new Error(`Exercise "${exercise.name}" is missing an id`)
  }

  if (!exercise.name) {
    throw new Error(`Exercise "${exercise.id}" is missing a name`)
  }

  if (!Array.isArray(exercise.measurementProfiles) || exercise.measurementProfiles.length === 0) {
    throw new Error(`Exercise "${exercise.name}" must have at least one measurement profile`)
  }

  const profileKeys = new Set()
  exercise.measurementProfiles.forEach((profile) => {
    if (!Array.isArray(profile) || profile.length === 0) {
      throw new Error(`Exercise "${exercise.name}" has an empty measurement profile`)
    }

    const key = profileKey(profile)
    if (profileKeys.has(key)) {
      throw new Error(`Exercise "${exercise.name}" has duplicate measurement profile ${key}`)
    }

    profileKeys.add(key)
  })

  if (exercise.primaryMuscles.length === 0 && exercise.categories.every((category) => category === 'strength')) {
    throw new Error(`Strength exercise "${exercise.name}" must have at least one primary muscle`)
  }
}

function renderExerciseFile(exercises) {
  return `// Generated by scripts/import-free-exercise-db.mjs. Do not edit by hand.
import type { Exercise } from '../domain/types.ts'

export const exerciseCatalog = ${JSON.stringify(exercises, null, 2)} satisfies Exercise[]
`
}

function renderDocumentation(provenance) {
  return `# Exercise Library

The initial exercise catalogue is generated from Free Exercise DB and committed as static app data.

- Runtime data: \`src/exercise-library/exercises.ts\`
- Import script: \`scripts/import-free-exercise-db.mjs\`
- Provenance report: \`docs/exercise-library-provenance.json\`
- Source repository: ${provenance.source.repository}
- Source file: ${provenance.source.sourceFile}
- Source license: ${provenance.source.license}

The app does not query Free Exercise DB at runtime. Re-import by downloading the source JSON to a local path and running:

\`\`\`sh
node scripts/import-free-exercise-db.mjs .tmp/exercise-import/free-exercise-db.exercises.json
\`\`\`

The runtime exercise objects intentionally do not include source attribution fields. The generated provenance report keeps source IDs, source names, duplicate removals, and suspicious generic-name warnings separately.
`
}

const sourceData = JSON.parse(readFileSync(sourcePath, 'utf8'))

if (!Array.isArray(sourceData)) {
  throw new Error('Free Exercise DB source must be a JSON array')
}

const byId = new Map()
const byName = new Map()
const duplicatesRemoved = []
const records = []

sourceData.forEach((sourceRecord) => {
  const { exercise, source } = sourceRecordToExercise(sourceRecord)
  const normalizedNameKey = exercise.name.toLowerCase()

  if (byName.has(normalizedNameKey)) {
    duplicatesRemoved.push({
      name: exercise.name,
      keptSourceId: byName.get(normalizedNameKey).source.sourceId,
      removedSourceId: source.sourceId,
    })
    return
  }

  if (byId.has(exercise.id)) {
    duplicatesRemoved.push({
      name: exercise.name,
      keptSourceId: byId.get(exercise.id).source.sourceId,
      removedSourceId: source.sourceId,
    })
    return
  }

  validateExercise(exercise)
  byId.set(exercise.id, { exercise, source })
  byName.set(normalizedNameKey, { exercise, source })
})

const imported = [...byId.values()].sort((left, right) => left.exercise.name.localeCompare(right.exercise.name))
const exercises = imported.map((entry) => entry.exercise)
const suspiciousGenericNames = exercises
  .filter((exercise) => knownGenericNames.has(exercise.name.toLowerCase()))
  .map((exercise) => exercise.name)

imported.forEach((entry) => {
  records.push({
    id: entry.exercise.id,
    name: entry.exercise.name,
    sourceId: entry.source.sourceId,
    sourceName: entry.source.sourceName,
  })
})

const generatedAt = new Date().toISOString()
const provenance = {
  source: {
    name: 'Free Exercise DB',
    repository: 'https://github.com/yuhonas/free-exercise-db',
    sourceFile: 'dist/exercises.json',
    rawDataUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json',
    license: 'Unlicense',
  },
  generatedAt,
  sourceCount: sourceData.length,
  importedCount: exercises.length,
  duplicatesRemoved,
  suspiciousGenericNames,
  records,
}

mkdirSync(dirname(exerciseOutputPath), { recursive: true })
mkdirSync(dirname(provenanceOutputPath), { recursive: true })

writeFileSync(exerciseOutputPath, renderExerciseFile(exercises))
writeFileSync(provenanceOutputPath, `${JSON.stringify(provenance, null, 2)}\n`)
writeFileSync(documentationOutputPath, renderDocumentation(provenance))

console.log(`Imported ${exercises.length} exercises from ${sourceData.length} source records.`)
console.log(`Removed ${duplicatesRemoved.length} duplicate records.`)
console.log(`Flagged ${suspiciousGenericNames.length} suspicious generic names.`)

