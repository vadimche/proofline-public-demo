import { createHash } from 'node:crypto'
import { lstat, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = process.cwd()
const siteRoot = path.resolve(repoRoot, process.argv[2] || 'site')
const manifestPath = path.resolve(repoRoot, process.argv[3] || 'PUBLIC_ARTIFACT.json')
const allowedExtensions = new Set(['', '.css', '.eot', '.html', '.js', '.json', '.svg', '.ttf', '.woff', '.woff2'])
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.svg'])
const forbidden = [
  ['HTTP API route', /['"`]\/api(?:\/|[?'"`])/i],
  ['fetch network primitive', /\bfetch\s*\(/i],
  ['XMLHttpRequest network primitive', /\bXMLHttpRequest\b/i],
  ['WebSocket network primitive', /\bWebSocket\b/i],
  ['EventSource network primitive', /\bEventSource\b/i],
  ['sendBeacon network primitive', /\bsendBeacon\s*\(/i],
  ['local service address', /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i],
  ['private profile path', /data[\\/]profile/i],
  ['private users path', /data[\\/]users/i],
  ['private secrets path', /secrets[\\/]/i],
  ['private facts store', /career_facts\.ya?ml/i],
  ['private claims store', /forbidden_claims\.ya?ml/i],
  ['private workspace path', /(?:\/mnt\/[a-z]\/(?:workspace|users)\/|[a-z]:[\\/](?:workspace|users)[\\/])/i],
  ['production entry', /private-main(?:\.js)?/i],
  ['production HTTP adapter', /(?:adapters[\\/])?httpApi(?:\.js)?/i],
  ['production storage key', /careerops_workspace_context/i],
  ['source map reference', /sourceMappingURL\s*=/i],
]

async function collect(directory, prefix) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    const relative = path.posix.join(prefix, entry.name)
    const details = await lstat(absolute)
    if (details.isSymbolicLink()) throw new Error(`${relative}: symbolic links are forbidden`)
    if (details.isDirectory()) files.push(...await collect(absolute, relative))
    else if (details.isFile()) files.push({ absolute, relative, bytes: details.size })
  }
  return files
}

function fail(violations) {
  console.error('Public artifact verification failed:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const fixturePath = path.resolve(repoRoot, manifest.fixture || '')
const fixturePrefix = path.posix.dirname(manifest.fixture || '')
const exported = [
  ...await collect(siteRoot, 'site'),
  ...await collect(path.dirname(fixturePath), fixturePrefix),
].sort((left, right) => left.relative.localeCompare(right.relative))
const violations = []

if (manifest.schema_version !== 1 || manifest.fictional !== true) violations.push('manifest must declare schema_version 1 and fictional true')
if (manifest.base_path !== '/proofline-public-demo/') violations.push(`unexpected base path: ${manifest.base_path}`)

const expected = new Map((manifest.files || []).map((file) => [file.path, file]))
const actualPaths = new Set(exported.map((file) => file.relative))
for (const file of exported) {
  const extension = path.extname(file.absolute).toLowerCase()
  if (!allowedExtensions.has(extension)) violations.push(`${file.relative}: unexpected artifact extension`)
  if (extension === '.map') violations.push(`${file.relative}: source maps are forbidden`)

  const content = await readFile(file.absolute)
  const digest = createHash('sha256').update(content).digest('hex')
  const record = expected.get(file.relative)
  if (!record) violations.push(`${file.relative}: missing from manifest`)
  else {
    if (record.sha256 !== digest) violations.push(`${file.relative}: SHA-256 mismatch`)
    if (record.bytes !== content.length) violations.push(`${file.relative}: byte count mismatch`)
  }

  if (textExtensions.has(extension)) {
    const text = content.toString('utf8')
    for (const [label, pattern] of forbidden) if (pattern.test(text)) violations.push(`${file.relative}: ${label}`)
  }
}
for (const filePath of expected.keys()) if (!actualPaths.has(filePath)) violations.push(`${filePath}: manifest entry has no file`)

const indexPath = path.join(siteRoot, 'index.html')
const index = await readFile(indexPath, 'utf8')
const assetReferences = [...index.matchAll(/(?:src|href)="(\/proofline-public-demo\/[^"?#]+)[^"\s]*"/g)].map((match) => match[1])
if (!assetReferences.length) violations.push('site/index.html has no repository-subpath assets')
for (const reference of assetReferences) {
  const relative = reference.replace('/proofline-public-demo/', '')
  if (!actualPaths.has(path.posix.join('site', relative))) violations.push(`site/index.html references missing asset: ${reference}`)
}

if (violations.length) fail(violations)
console.log(`Verified fictional static demo artifact (${exported.length} files).`)
