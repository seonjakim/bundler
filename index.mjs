import JestHasteMap from 'jest-haste-map'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { cpus } from 'os'
import yargs from 'yargs'
import Resolver from 'jest-resolve'
import { DependencyResolver } from 'jest-resolve-dependencies'
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

const dependencyResolver = new DependencyResolver(resolver, hasteFS)

const allFiles = new Set()
const queue = [entryPoint]
while (queue.length) {
  const module = queue.shift()

  if (allFiles.has(module)) {
    continue
  }

  allFiles.add(module)
  queue.push(...dependencyResolver.resolve(module))
}

console.log(...allFiles)

const allCode = []
// serializing bundle
await Promise.all(
  Array.from(allFiles).map(async (file) => {
    const code = await fs.promises.readFile(file, 'utf8')
    allCode.push(code)
  })
)
