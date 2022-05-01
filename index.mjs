import JestHasteMap from 'jest-haste-map'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { cpus } from 'os'
import yargs from 'yargs'
import Resolver from 'jest-resolve'
import fs from 'fs'
import { Worker } from 'jest-worker'

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

const worker = new Worker(
  join(dirname(fileURLToPath(import.meta.url)), './worker'),
  {
    enableWorkerThreads: true,
  }
)

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
let id = 0
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

  const metadata = {
    id: id++,
    code,
    dependencyMap,
  }
  modules.set(module, metadata)
  queue.push(...dependencyMap.values())
}

const wrapModule = (id, code) =>
  `define(${id}, function(module, exports, require){\n${code}})`

const results = await Promise.all(
  Array.from(modules)
    .reverse()
    .map(async ([module, { id, code, dependencyMap }]) => {
      ;({ code } = await worker.transformFile(code))

      for (const [dependencyName, dependencyPath] of dependencyMap) {
        code = code.replace(
          new RegExp(
            `require\\(('||")${dependencyName.replace(/[\.\/]/g, '\\$&')}\\1\\)`
          ),
          `require(${modules.get(dependencyPath).id})`
        )
      }
      return wrapModule(id, code)
    })
)

const output = [
  fs.readFileSync('./require.js', 'utf8'),
  ...results,
  `requireModule(0)`,
].join('\n')

console.log(output)

if (options.output) {
  fs.writeFileSync(options.output, output.join('\n'))
}

worker.end()
