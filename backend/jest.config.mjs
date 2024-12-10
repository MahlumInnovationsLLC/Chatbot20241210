export default {
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]sx?$': 'babel-jest'
    },
    transformIgnorePatterns: [] // allow transforming everything
};