// Настройки автотестов (запуск: npm test). Тесты лежат в папке tests/.
export default {
  esbuild: { jsx: "automatic" },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.{js,jsx}"],
    setupFiles: ["tests/setup.js"],
  },
};
