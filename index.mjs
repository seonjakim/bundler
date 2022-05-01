import JestHasteMap from 'jest-haste-map'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { cpus } from 'os'
import yargs from 'yargs'

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
