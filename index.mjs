import JestHasteMap from 'jest-haste-map'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { cpus } from 'os'
import yargs from 'yargs'
import Resolver from 'jest-resolve'
import fs from 'fs'

// root of the product code
const root = join(dirname(fileURLToPath(import.meta.url)), 'product')

const hasteMap = new JestHasteMap.default({
  extensions: ['js'],
  name: 'jest-bundler',
  platforms: [],
  rootDir: root,
  roots: [root],
  maxWorkers: cpus().length,
})

const { hasteFS, moduleMap } = await hasteMap.build()
const options = yargs(process.argv).argv
const entryPoint = options.entryPoint
if (!hasteFS.exists(entryPoint)) {
  throw new Error(
    `--entry-point does not exist. Please provide a path to a valid file.`
  )
}

hasteFS.getDependencies(entryPoint)

const resolver = new Resolver.default(moduleMap, {
  extensions: ['.js'],
  hasCoreModules: false,
  rootDir: root,
})

const seen = new Set()
const modules = new Map()
const queue = [entryPoint]
while (queue.length) {
  const module = queue.shift()

  if (seen.has(module)) {
    continue
  }

  seen.add(module)

  // entry-point: Map<string, string>
  // ['./apple', '/path/to/apple.js']
  const dependencyMap = new Map(
    hasteFS
      .getDependencies(module)
      .map((dependencyName) => [
        dependencyName,
        resolver.resolveModule(module, dependencyName),
      ])
  )

  const code = fs.readFileSync(module, 'utf8')
  const moduleBody = code.match(/module\.exports\s+=\s+(.*?);/i)?.[1] || ''

  const metadata = {
    code: moduleBody || code,
    dependencyMap,
  }
  modules.set(module, metadata)
  queue.push(...dependencyMap.values())
}

for (const [module, metadata] of Array.from(modules).reverse()) {
  let { code } = metadata

  metadata.code = code
}

console.log(module.get(entryPoint).code)
