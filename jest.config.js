module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/test/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js']
};
