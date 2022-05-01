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

  // could have circular dependencies problem
  moduleFactory(module, module.exports, requireModule)
  moduleCache.set(name, module)
  return module.exports
}

define('tomato', function (module, exports, require) {
  module.exports = 'tomato'
})
define('melon', function (module, exports, require) {
  module.exports = 'melon'
})
define('kiwi', function (module, exports, require) {
  module.exports = 'kiwi' + require('melon') + require('tomato')
})
