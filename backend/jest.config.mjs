export default {
    // Use the node test environment
    testEnvironment: 'node',

    // Don't transform code by default; you can leave transform empty for pure ESM
    transform: {},

    // Treat all .js files as ESM
    extensionsToTreatAsEsm: ['.js'],

    // Fix module resolution for ESM:
    // This helps Jest understand that imports ending in .js are ESM modules
    // and not CJS modules.
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1.js'
    }
};