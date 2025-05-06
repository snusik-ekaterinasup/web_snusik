// --- START OF FILE routes/events.ts ---

import express, { Router, Request, Response } from 'express';
import passport from 'passport';
// import { Op } from 'sequelize'; // Не используется

// Импортируем модель и middleware (убедитесь, что путь верный)
import { EventModel, apiKeyAuth } from '@models/event';

// --- Интерфейсы ---

// Интерфейс для данных при создании события (из req.body)
interface CreateEventRequestBody {
  title: string;
  description?: string | null;
  date: string; // Ожидаем строку ISO 8601
  category: 'concert' | 'lecture' | 'exhibition';
}

// Интерфейс для данных при обновлении события (из req.body)
interface UpdateEventRequestBody {
  title?: string;
  description?: string | null;
  date?: string | null; // Строка ISO 8601 или null
  category?: 'concert' | 'lecture' | 'exhibition';
}

// Интерфейс для payload пользователя из JWT (копия того, что в types/express/index.d.ts)
interface UserJwtPayload {
  id: number; // Или string
  role?: string;
}

// Интерфейс для ошибки валидации Sequelize (упрощенный, для избежания any)
interface SimpleSequelizeValidationError extends Error {
  name: 'SequelizeValidationError';
  errors?: Array<{ message?: string }>; // Массив объектов с сообщением
}

// --- Инициализация роутера ---
const router: Router = express.Router();

// --- Применение Middleware ---
// Применяем проверку API Key ко всем роутам в этом файле
router.use(apiKeyAuth);

// --- Маршруты ---

// --- GET /api/events ---
/**
 * @openapi
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: Список мероприятий с фильтрацией по категории
 *     description: Получает список мероприятий. Требует API ключ. Фильтрация по 'category'.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [concert, lecture, exhibition] }
 *         required: false
 *         description: Фильтр по категории
 *       - $ref: '#/components/parameters/ApiKeyQueryParam'
 *     responses:
 *       '200':
 *         description: Список мероприятий
 *         content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/EventModel' }}}}
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string | undefined;
    const whereClause: { category?: string } = {};

    if (category) {
      if (!['concert', 'lecture', 'exhibition'].includes(category)) {
        res.status(400).json({
          message: `Недопустимое значение для категории: ${category}`,
        });
        return;
      }
      whereClause.category = category;
    }

    const events = await EventModel.findAll({ where: whereClause });
    res.status(200).json(events);
  } catch /* istanbul ignore next */ {
    // Убрано имя переменной 'error', т.к. не используется
    // console.error('Ошибка GET /api/events:', error); // Закомментировано для no-console
    res
      .status(500)
      .json({ message: 'Ошибка сервера при получении мероприятий' });
  }
});

// --- GET /api/events/:id ---
/**
 * @openapi
 * /api/events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Получить мероприятие по ID
 *     description: Получает детали одного мероприятия. Требует API ключ.
 *     security:
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, format: int64 }
 *         description: ID мероприятия
 *         example: 1
 *       - $ref: '#/components/parameters/ApiKeyQueryParam'
 *     responses:
 *       '200':
 *         description: Мероприятие найдено
 *         content: { application/json: { schema: { $ref: '#/components/schemas/EventModel' }}}
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = parseInt(req.params.id, 10);
    if (isNaN(eventId)) {
      res.status(400).json({ message: 'ID мероприятия должен быть числом' });
      return;
    }

    const event = await EventModel.findByPk(eventId);
    if (!event) {
      res.status(404).json({ message: 'Мероприятие не найдено' });
      return;
    }
    res.status(200).json(event);
  } catch /* istanbul ignore next */ {
    // Убрано имя переменной 'error', т.к. не используется
    // console.error(`Ошибка GET /api/events/${req.params.id}:`, error); // Закомментировано для no-console
    res
      .status(500)
      .json({ message: 'Ошибка сервера при получении мероприятия' });
  }
});

// --- POST /api/events ---
/**
 * @openapi
 * /api/events:
 *   post:
 *     tags: [Events]
 *     summary: Создать новое мероприятие
 *     description: Создает мероприятие. Требует API ключ и JWT токен.
 *     parameters:
 *       - $ref: '#/components/parameters/ApiKeyQueryParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventInput'
 *     responses:
 *       '201':
 *         description: Мероприятие создано
 *         content: { application/json: { schema: { $ref: '#/components/schemas/EventModel' }}}
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response): Promise<void> => {
    // Утверждаем тип req.user (предполагается, что расширение модуля настроено)
    const userPayload = req.user as UserJwtPayload | undefined;
    if (!userPayload?.id) {
      res.status(401).json({ message: 'Ошибка аутентификации JWT' });
      return;
    }

    try {
      const createdBy = userPayload.id;
      // Используем интерфейс для тела запроса
      const requestBody = req.body as CreateEventRequestBody;

      // Простая проверка обязательных полей
      if (!requestBody.title || !requestBody.category || !requestBody.date) {
        res
          .status(400)
          .json({ message: 'Поля title, category, date обязательны' });
        return;
      }

      // Конвертируем строку даты в объект Date и проверяем
      const dateObject = new Date(requestBody.date);
      if (isNaN(dateObject.getTime())) {
        res.status(400).json({
          message: 'Неверный формат даты. Ожидается строка в формате ISO 8601.',
        });
        return;
      }

      // Собираем данные для Sequelize
      const newEventData = {
        title: requestBody.title,
        description: requestBody.description,
        date: dateObject, // Передаем объект Date
        category: requestBody.category,
        createdBy,
      };

      const newEvent = await EventModel.create(newEventData);
      res.status(201).json(newEvent);
    } catch (error) {
      // Оставляем 'error', так как он используется ниже
      // console.error('Ошибка POST /api/events:', error); // Закомментировано для no-console
      // Обработка ошибок валидации Sequelize
      if (error instanceof Error && error.name === 'SequelizeValidationError') {
        const validationError = error as SimpleSequelizeValidationError; // Используем интерфейс
        const validationErrors = Array.isArray(validationError.errors)
          ? validationError.errors.map(
              (e) => e?.message ?? 'Unknown validation error',
            )
          : ['Validation error'];
        res.status(400).json({
          message: 'Ошибка валидации данных',
          details: validationErrors,
        });
        return;
      }
      res
        .status(500)
        .json({ message: 'Ошибка сервера при создании мероприятия' });
    }
  },
);

// --- PUT /api/events/:id ---
/**
 * @openapi
 * /api/events/{id}:
 *   put:
 *     tags: [Events]
 *     summary: Обновить существующее мероприятие
 *     description: Обновляет мероприятие по ID. Требует API ключ и JWT токен.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, format: int64 }
 *         description: ID мероприятия для обновления
 *       - $ref: '#/components/parameters/ApiKeyQueryParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEventInput'
 *     responses:
 *       '200':
 *         description: Мероприятие обновлено
 *         content: { application/json: { schema: { $ref: '#/components/schemas/EventModel' }}}
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.put(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response): Promise<void> => {
    const userPayload = req.user as UserJwtPayload | undefined;
    if (!userPayload?.id) {
      res.status(401).json({ message: 'Ошибка аутентификации JWT' });
      return;
    }

    try {
      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ message: 'ID мероприятия должен быть числом' });
        return;
      }

      const event = await EventModel.findByPk(eventId);
      if (!event) {
        res.status(404).json({ message: 'Мероприятие не найдено' });
        return;
      }

      // --- Optional Authorization Check ---
      // if (event.createdBy !== userPayload.id) {
      //   res.status(403).json({ message: "У вас нет прав на редактирование" }); return;
      // }

      // Используем интерфейс для тела запроса
      const requestBody = req.body as UpdateEventRequestBody;

      // Создаем объект ТОЛЬКО с теми полями, которые пришли в запросе и разрешены для обновления
      // Тип Partial<EventAttributes> здесь может быть слишком строгим, используем объект
      const updatePayload: { [key: string]: string | Date | null | undefined } =
        {};

      // Явно проверяем и добавляем каждое поле
      if (requestBody.title !== undefined)
        updatePayload.title = requestBody.title;
      if (requestBody.description !== undefined)
        updatePayload.description = requestBody.description;
      if (requestBody.category !== undefined) {
        if (
          !['concert', 'lecture', 'exhibition'].includes(requestBody.category)
        ) {
          res.status(400).json({
            message: `Недопустимое значение для категории: ${requestBody.category}`,
          });
          return;
        }
        updatePayload.category = requestBody.category;
      }
      // Обрабатываем дату отдельно
      if (requestBody.date !== undefined) {
        if (requestBody.date === null) {
          updatePayload.date = null; // Разрешаем сброс даты
        } else {
          const dateObject = new Date(requestBody.date);
          if (isNaN(dateObject.getTime())) {
            res.status(400).json({
              message:
                'Неверный формат даты для обновления. Ожидается строка ISO 8601 или null.',
            });
            return;
          }
          updatePayload.date = dateObject; // Добавляем объект Date
        }
      }

      // Проверяем, есть ли вообще что обновлять
      if (Object.keys(updatePayload).length === 0) {
        res.status(400).json({ message: 'Нет данных для обновления' });
        return;
      }

      // Передаем подготовленный объект в update
      await event.update(updatePayload);
      res.status(200).json(event); // Возвращаем обновленный event
    } catch (error) {
      // Оставляем 'error', так как он используется ниже
      // console.error(`Ошибка PUT /api/events/${req.params.id}:`, error); // Закомментировано для no-console
      // Обработка ошибок валидации Sequelize
      if (error instanceof Error && error.name === 'SequelizeValidationError') {
        const validationError = error as SimpleSequelizeValidationError;
        const validationErrors = Array.isArray(validationError.errors)
          ? validationError.errors.map(
              (e) => e?.message ?? 'Unknown validation error',
            )
          : ['Validation error'];
        res.status(400).json({
          message: 'Ошибка валидации данных при обновлении',
          details: validationErrors,
        });
        return;
      }
      res
        .status(500)
        .json({ message: 'Ошибка сервера при обновлении мероприятия' });
    }
  },
);

// --- DELETE /api/events/:id ---
/**
 * @openapi
 * /api/events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Удалить мероприятие
 *     description: Удаляет мероприятие по ID. Требует API ключ и JWT токен.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, format: int64 }
 *         description: ID мероприятия для удаления
 *         example: 1
 *       - $ref: '#/components/parameters/ApiKeyQueryParam'
 *     responses:
 *       '204':
 *         description: Мероприятие успешно удалено
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response): Promise<void> => {
    const userPayload = req.user as UserJwtPayload | undefined;
    if (!userPayload?.id) {
      res.status(401).json({ message: 'Ошибка аутентификации JWT' });
      return;
    }

    try {
      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ message: 'ID мероприятия должен быть числом' });
        return;
      }

      const event = await EventModel.findByPk(eventId);
      if (!event) {
        res.status(404).json({ message: 'Мероприятие не найдено' });
        return;
      }

      // --- Optional Authorization Check ---
      // if (event.createdBy !== userPayload.id) { ... }

      await event.destroy();
      res.status(204).end(); // Успешное удаление
    } catch /* istanbul ignore next */ {
      // Убрано имя переменной 'error', т.к. не используется
      // console.error(`Ошибка DELETE /api/events/${req.params.id}:`, error); // Закомментировано для no-console
      res
        .status(500)
        .json({ message: 'Ошибка сервера при удалении мероприятия' });
    }
  },
);

// --- Экспорт роутера ---
export default router;

// --- Swagger Компоненты (убедитесь, что они определены) ---
/**
 * @openapi
 * components:
 *   parameters:
 *     ApiKeyQueryParam:
 *       in: query
 *       name: apiKey
 *       schema: { type: string }
 *       required: false
 *       description: API-ключ (альтернатива заголовку x-api-key)
 *   securitySchemes:
 *      BearerAuth:
 *        type: http
 *        scheme: bearer
 *        bearerFormat: JWT
 *   schemas:
 *      CreateEventInput:
 *          type: object
 *          required: [title, category, date]
 *          properties:
 *              title: { type: string, minLength: 3, maxLength: 100 }
 *              description: { type: string, maxLength: 500, nullable: true }
 *              date: { type: string, format: date-time, description: "Дата и время в формате ISO 8601" }
 *              category: { type: string, enum: [concert, lecture, exhibition] }
 *      UpdateEventInput:
 *          type: object
 *          properties:
 *              title: { type: string, minLength: 3, maxLength: 100 }
 *              description: { type: string, maxLength: 500, nullable: true }
 *              date: { type: string, format: date-time, nullable: true, description: "Дата и время ISO 8601 или null" }
 *              category: { type: string, enum: [concert, lecture, exhibition] }
 *      # EventModel: { ... } - Должна быть в models/event.ts
 *      # User: { ... } - Должна быть в models/user.ts
 *      ErrorResponse:
 *          type: object
 *          properties:
 *              message: { type: string, example: "Ошибка сервера" }
 *              details: { type: any, nullable: true, example: "Дополнительная информация"}
 *   responses:
 *      UnauthorizedError:
 *          description: Ошибка авторизации
 *          content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}
 *      ForbiddenError:
 *          description: Ошибка доступа
 *          content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}
 *      BadRequestError:
 *          description: Неверный запрос
 *          content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}
 *      NotFoundError:
 *          description: Ресурс не найден
 *          content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}
 *      ServerError:
 *          description: Внутренняя ошибка сервера
 *          content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}
 */
// --- END OF FILE routes/events.ts ---
