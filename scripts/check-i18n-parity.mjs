// Compares fr and en translation files key by key and exits with 1 when a key is missing.
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const scriptDir = path.dirname(url.fileURLToPath(import.meta.url))
const localesDir = path.resolve(scriptDir, '..', 'src', 'locales')
const frDir = path.join(localesDir, 'fr')
const enDir = path.join(localesDir, 'en')

function extractKeys(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const keyPattern = /^\s*['"]([^'"\n]+)['"]\s*:/gm
  const keys = new Set()
  let match
  while ((match = keyPattern.exec(source)) !== null) keys.add(match[1])
  return keys
}

function missingFrom(source, target) {
  return [...source].filter((key) => !target.has(key)).sort()
}

const files = new Set(
  [...fs.readdirSync(frDir), ...fs.readdirSync(enDir)].filter(
    (file) => file.endsWith('.ts') && file !== 'index.ts'
  )
)

let missingInFr = 0
let missingInEn = 0
const report = []

for (const file of [...files].sort()) {
  const frPath = path.join(frDir, file)
  const enPath = path.join(enDir, file)
  if (!fs.existsSync(frPath) || !fs.existsSync(enPath)) {
    report.push(`[!] ${file}: missing entirely in ${fs.existsSync(frPath) ? 'EN' : 'FR'}`)
    missingInFr += fs.existsSync(frPath) ? 0 : 1
    missingInEn += fs.existsSync(enPath) ? 0 : 1
    continue
  }
  const frKeys = extractKeys(frPath)
  const enKeys = extractKeys(enPath)
  const frGaps = missingFrom(enKeys, frKeys)
  const enGaps = missingFrom(frKeys, enKeys)
  missingInFr += frGaps.length
  missingInEn += enGaps.length
  if (frGaps.length) report.push(`--- ${file}: missing in FR\n    - ${frGaps.join('\n    - ')}`)
  if (enGaps.length) report.push(`--- ${file}: missing in EN\n    - ${enGaps.join('\n    - ')}`)
}

if (report.length) console.log(report.join('\n'))
console.log(`SUMMARY: ${missingInFr} key(s) missing in FR, ${missingInEn} key(s) missing in EN`)
process.exit(missingInFr + missingInEn > 0 ? 1 : 0)
