module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
