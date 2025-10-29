// Minimal shim for 'generator-function' to satisfy web bundler resolution
// Some transitive deps import 'generator-function', which may not be present.
// We export a noop constructor so equality checks don't throw during bundling.
function GeneratorFunction() {}

module.exports = GeneratorFunction;


