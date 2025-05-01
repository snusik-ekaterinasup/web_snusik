import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
// import pluginReact from "eslint-plugin-react";
import { defineConfig } from 'eslint/config'; // <-- Убедитесь, что этот импорт есть

export default defineConfig([
  // <-- Оборачиваем массив в defineConfig
  // --- ДОБАВЛЯЕМ СЕКЦИЮ ИГНОРИРОВАНИЯ ---
  {
    ignores: [
      'dist/**', // Игнорировать все файлы и папки внутри dist
      'node_modules/**', // Стандартно игнорируется, но добавим для ясности
    ],
  },
  // --------------------------------------

  // Базовые правила ESLint (применяются к НЕ игнорируемым файлам)
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    ...js.configs.recommended,
  },

  // Настройки языка
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest', // Можно указать явно
      sourceType: 'module', // Для .mjs и .ts файлов
      globals: {
        ...globals.node, // Глобальные переменные Node.js
      },
      parser: tseslint.parser, // Указываем парсер для TS
      parserOptions: {
        project: './tsconfig.json', // Указываем путь к tsconfig для правил, требующих типы
      },
    },
  },

  // Рекомендованные конфигурации TypeScript ESLint
  // Применяем правила TS только к TS файлам
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Используем extends для наборов правил
      ...tseslint.configs.recommended,
      // Если нужны правила с проверкой типов:
      // ...tseslint.configs.recommendedTypeChecked,
      // ...tseslint.configs.stylisticTypeChecked,
    ],
    // Если нужно переопределить что-то из extends или добавить плагины/правила только для TS:
    // plugins: { /* ... */ },
    // rules: { /* ... */ }
  },

  // Если используете React
  // pluginReact.configs.flat.recommended, // (нужно будет настроить files)

  // ВАШИ кастомные правила И ПРАВИЛА ПЛАГИНОВ (например, Prettier)
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'], // Применяем ко всем файлам, где нужен Prettier
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      // Включаем правило Prettier как ошибку ESLint
      'prettier/prettier': 'error',

      // Ваши другие кастомные правила для ВСЕХ файлов (если нужно):
      'no-console': 'warn', // Это правило будет работать и для JS, и для TS
      semi: ['error', 'always'],
      quotes: ['error', 'single'], // <-- ИЗМЕНЕНО на single в соответствии с prettierrc

      // Правила TypeScript лучше оставить в секции для TS файлов выше
      // '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Конфигурация Prettier (eslint-config-prettier)
  // ОТКЛЮЧАЕТ конфликтующие правила ESLint. Должна идти ПОСЛЕ.
  eslintConfigPrettier,
]);
// --- END OF FILE eslint.config.mjs ---
