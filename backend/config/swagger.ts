// --- START OF FILE config/swagger.ts ---

import swaggerJsdoc, { Options } from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// Define the options for swagger-jsdoc
const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description:
        'Документация API для веб-лабораторных работ с JWT аутентификацией и управлением событиями.',
    },
    servers: [
      {
        // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
        // Используем тот же порт по умолчанию (3000), что и в index.ts
        url: `http://localhost:${process.env.PORT || 3000}`,
        // ---------------------
        description: 'Development server',
      },
      // Можно добавить другие серверы, например, для продакшена:
      // {
      //   url: 'https://your-production-api.com',
      //   description: 'Production server'
      // }
    ],
    components: {
      // Определяем схемы безопасности, которые используются в API
      securitySchemes: {
        BearerAuth: {
          // Для JWT токенов
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Введите JWT токен в формате: Bearer <токен>',
        },
      },
      // Schemas лучше определять через JSDoc в файлах моделей (models/*.ts)
      // Но общие схемы, как ErrorResponse, можно оставить здесь для удобства
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Сообщение об ошибке',
              example: 'Ошибка сервера',
            },
            details: {
              type: 'any', // Позволяет передавать строки или массивы ошибок
              nullable: true,
              description:
                'Дополнительные детали ошибки или массив ошибок валидации',
              example: 'Неверный email или пароль',
            },
            error: {
              // Для совместимости с некоторыми обработчиками
              type: 'string',
              nullable: true,
              description: 'Сообщение из объекта Error (если применимо)',
            },
            stack: {
              // Полезно для отладки
              type: 'string',
              nullable: true,
              description: 'Стек вызова ошибки (обычно только в development)',
            },
          },
          required: ['message'],
        },
        // --- Ссылки на общие стандартные ответы ---
        // Добавлены здесь для удобства использования $ref в роутах
        UnauthorizedError: {
          description: 'Ошибка авторизации (неверный токен, нет токена)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        ForbiddenError: {
          description: 'Ошибка доступа (неверный API ключ, нет прав)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        BadRequestError: {
          description: 'Неверный запрос (ошибка валидации, отсутствуют поля)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        NotFoundError: {
          description: 'Ресурс не найден',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        ServerError: {
          description: 'Внутренняя ошибка сервера',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        // Остальные схемы (User, AuthResponse, EventModel и т.д.) должны быть определены
        // через JSDoc в соответствующих файлах моделей/маршрутов.
      },
      // Можно определить общие параметры здесь, если они часто повторяются
      parameters: {
        ApiKeyQueryParam: {
          // Пример параметра для API ключа в query
          in: 'query',
          name: 'apiKey',
          schema: { type: 'string' },
          required: false, // Может быть не обязательным, если разрешен и заголовок
          description: 'API-ключ (альтернатива заголовку x-api-key)',
        },
      },
    },
    // Глобальные требования безопасности убраны, их лучше указывать
    // для каждого роута отдельно с помощью `security:`
    // security: [
    //   { BearerAuth: [] } // Пример: требовать JWT для всех роутов по умолчанию (не рекомендуется)
    // ]
  },
  // Пути к файлам с JSDoc-аннотациями API (ваши .ts файлы)
  apis: ['./routes/*.ts', './models/*.ts'],
};

// Generate the Swagger specification based on the options
const swaggerSpec = swaggerJsdoc(options);

// Define a function to setup Swagger UI on the Express app
function setupSwagger(app: Express): void {
  // Serve Swagger UI at /api-docs
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      // Опции для swagger-ui-express
      explorer: true, // Включить строку поиска по тегам/операциям
      swaggerOptions: {
        // Опции, передаваемые в SwaggerUIBundle
        // Сортировка эндпоинтов по алфавиту (можно 'alpha', 'method')
        operationsSorter: 'alpha',
        // Сортировка тегов по алфавиту
        tagsSorter: 'alpha',
        // Сколько уровней раскрывать по умолчанию (-1 - ничего, 0 - теги, 1 - операции)
        docExpansion: 'list', // 'list' (операции), 'full' (все), 'none'
        // Сохранять состояние авторизации при перезагрузке страницы
        persistAuthorization: true,
      },
      // Можно добавить кастомный CSS
      // customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Документация API', // Заголовок вкладки браузера
    }),
  );
}

// Export the setup function as the default export
export default setupSwagger;

// --- END OF FILE config/swagger.ts ---
