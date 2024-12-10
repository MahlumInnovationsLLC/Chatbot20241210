export default {
    testEnvironment: 'node',
    transform: {},
    // Tell Jest to allow processing of openai module as ESM
    transformIgnorePatterns: [
        "node_modules/(?!openai/)"
    ]
};