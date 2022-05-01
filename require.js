const modules = new Map()
const define = (name, moduleFactory) => {
  modules.set(name, moduleFactory)
}

const moduleCache = new Map()

const requireModule = (name) => {
  if (moduleCache.has(name)) {
    return moduleCache.get(name).exports
  }
  const module = {
    exports: {},
  }

  const moduleFactory = modules.get(name)

  moduleCache.set(name, module)
  // could have circular dependencies problem
  moduleFactory(module, module.exports, requireModule)
  return module.exports
}

define(2, function (module, exports, require) {
  module.exports = 'tomato'
})
define(1, function (module, exports, require) {
  module.exports = 'melon'
})
define(0, function (module, exports, require) {
  module.exports = 'kiwi' + require(1) + require(2)
})

requireModule(0)
