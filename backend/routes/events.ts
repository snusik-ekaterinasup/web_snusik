// src/routes/events.ts

import express, { Router, Request, Response } from 'express';
import passport from 'passport';
import { Sequelize } from 'sequelize'; // Для функций агрегации

// Импортируем модели, middleware и типы
import { EventModel, apiKeyAuth, EventCreationAttributes } from '@models/event'; // Добавляем EventCreationAttributes
import { User } from '@models/user';
import { EventParticipant } from '@models/eventParticipant';
import type { UserJwtPayload } from './auth'; // Предполагаем, что тип экспортируется из auth.ts или общего файла типов
import type { ValidationError } from 'sequelize'; // Для обработки ошибок валидации
import type { EventAttributes } from '@models/event';
// --- Интерфейсы (Дублирование для ясности, лучше вынести в общие типы) ---

// Для тела запроса при создании события
interface CreateEventRequestBody extends Omit<EventCreationAttributes, 'createdBy'> {}

// Для тела запроса при обновлении события (все поля опциональны)
interface UpdateEventRequestBody {
  title?: string;
  description?: string | null;
  date?: string | null; // Строка ISO 8601 или null для сброса
  category?: 'concert' | 'lecture' | 'exhibition';
}

// Для ошибки валидации Sequelize
interface SimpleSequelizeValidationError extends Error {
  name: 'SequelizeValidationError';
  errors?: Array<{ message?: string; path?: string }>;
}

// --- Инициализация роутера ---
const router: Router = express.Router();

// --- Swagger Tag Definition ---
/**
 * @openapi
 * tags:
 *   - name: Events
 *     description: Управление мероприятиями (создание, получение, обновление, удаление)
 *   - name: Events Participation
 *     description: Регистрация и отмена регистрации пользователей на мероприятия
 */

// --- Маршруты ---

// --- GET /api/events ---
/**
 * @openapi
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: Список мероприятий с фильтрацией и информацией об участии
 *     description: >
 *       Получает список мероприятий. Требует API ключ.
 *       Фильтрация по 'category'.
 *       Для аутентифицированных пользователей добавляет поле 'isCurrentUserParticipating'.
 *       Всегда добавляет поле 'participantsCount'.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [concert, lecture, exhibition] }
 *         required: false
 *         description: Фильтр по категории
 *       - $ref: '#/components/parameters/ApiKeyQueryParam'
 *     security:
 *       - BearerAuth: [] # Опционально - если токен есть, получим isCurrentUserParticipating
 *     responses:
 *       '200':
 *         description: Список мероприятий
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf: # Комбинируем схему EventModel с доп. полями
 *                   - $ref: '#/components/schemas/EventModel'
 *                   - type: object
 *                     properties:
 *                       participantsCount: { type: integer, readOnly: true }
 *                       isCurrentUserParticipating: { type: boolean, readOnly: true }
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { description: "Может вернуться, если Bearer токен предоставлен, но невалиден", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}} } # JWT необязателен, но если есть - валидируется
 *       '403': { $ref: '#/components/responses/ForbiddenError' } # Ошибка API Key
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.get(
  '/',
  passport.authenticate(['jwt', 'anonymous'], { session: false }), // Позволяет анонимный доступ, но проверяет JWT если он есть
  apiKeyAuth, // Проверка API ключа
  async (req: Request, res: Response): Promise<void> => {
    const currentUserPayload = req.user as UserJwtPayload | undefined;
    const currentUserId = currentUserPayload?.id;

    try {
      const category = req.query.category as string | undefined;
      const whereClause: { category?: string } = {};

      if (category) {
        if (!['concert', 'lecture', 'exhibition'].includes(category)) {
          res.status(400).json({ message: `Недопустимое значение для категории: ${category}` });
          return;
        }
        whereClause.category = category;
      }

      const events = await EventModel.findAll({
        where: whereClause,
        attributes: {
          include: [[
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM "event_participants" AS ep
              WHERE ep."eventId" = "EventModel"."id"
            )`),
            'participantsCount'
          ]],
        },
        include: [ // Включаем создателя для информации на карточке
           { model: User, as: 'creator', attributes: ['id', 'name'] }
        ],
        order: [['date', 'DESC'], ['createdAt', 'DESC']], // Сортировка по дате, затем по времени создания
      });

      // Определение участий текущего пользователя
      let userParticipations: Set<number> = new Set(); // Используем Set для быстрого поиска
      if (currentUserId) {
        const participations = await EventParticipant.findAll({
          where: { userId: currentUserId },
          attributes: ['eventId'],
        });
        userParticipations = new Set(participations.map(p => p.eventId));
      }

      // Добавляем поля к каждому событию
      const eventsWithParticipation = events.map(event => {
        const eventJson = event.toJSON() as any;
        eventJson.isCurrentUserParticipating = userParticipations.has(event.id);
        // participantsCount уже есть, но может быть строкой, приводим к числу
        eventJson.participantsCount = parseInt(eventJson.participantsCount || '0', 10);
        return eventJson;
      });

      res.status(200).json(eventsWithParticipation);
    } catch (error) {
      console.error('[API_ERROR] GET /api/events:', error);
      res.status(500).json({ message: 'Ошибка сервера при получении мероприятий' });
    }
  }
);


// --- GET /api/events/:id ---
/**
 * @openapi
 * /api/events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Получить мероприятие по ID
 *     description: >
 *       Получает детали одного мероприятия. Требует API ключ.
 *       Включает количество участников и флаг участия текущего пользователя (если аутентифицирован).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, format: int64 }
 *         description: ID мероприятия
 *         example: 1
 *       - $ref: '#/components/parameters/ApiKeyQueryParam'
 *     security:
 *       - BearerAuth: [] # Опционально
 *     responses:
 *       '200':
 *         description: Мероприятие найдено
 *         content:
 *           application/json:
 *             schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/EventModel'
 *                  - type: object
 *                    properties:
 *                       participantsCount: { type: integer, readOnly: true }
 *                       isCurrentUserParticipating: { type: boolean, readOnly: true }
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { description: "Может вернуться, если Bearer токен предоставлен, но невалиден", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}} }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.get(
    '/:id',
    passport.authenticate(['jwt', 'anonymous'], { session: false }),
    apiKeyAuth,
    async (req: Request, res: Response): Promise<void> => {
    const currentUserPayload = req.user as UserJwtPayload | undefined;
    const currentUserId = currentUserPayload?.id;

    try {
      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ message: 'ID мероприятия должен быть числом' });
        return;
      }

      const event = await EventModel.findByPk(eventId, {
        attributes: {
          include: [[
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM "event_participants" AS ep
              WHERE ep."eventId" = "EventModel"."id"
            )`),
            'participantsCount'
          ]],
        },
         include: [
           { model: User, as: 'creator', attributes: ['id', 'name'] }
         ]
      });

      if (!event) {
        res.status(404).json({ message: 'Мероприятие не найдено' });
        return;
      }

      // Проверяем участие текущего пользователя
      let isCurrentUserParticipating = false;
      if (currentUserId) {
        const participation = await EventParticipant.findOne({
          where: { userId: currentUserId, eventId: event.id }
        });
        isCurrentUserParticipating = !!participation;
      }

      const eventJson = event.toJSON() as any;
      eventJson.isCurrentUserParticipating = isCurrentUserParticipating;
      eventJson.participantsCount = parseInt(eventJson.participantsCount || '0', 10);


      res.status(200).json(eventJson);
    } catch (error) {
      console.error(`[API_ERROR] GET /api/events/${req.params.id}:`, error);
      res.status(500).json({ message: 'Ошибка сервера при получении мероприятия' });
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
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventInput' # Должен быть определен в event.ts или swagger.ts
 *     responses:
 *       '201':
 *         description: Мероприятие создано
 *         content: { application/json: { schema: { $ref: '#/components/schemas/EventModel' }}} # Возвращаем созданный объект
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  apiKeyAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userPayload = req.user as UserJwtPayload | undefined;
    const createdBy = userPayload?.id;
    if (!createdBy) {
      res.status(401).json({ message: 'Ошибка аутентификации JWT (нет ID пользователя)' });
      return;
    }

    try {
      const requestBody = req.body as CreateEventRequestBody;

      // Базовая проверка наличия обязательных полей (дополнительная к валидации модели)
      if (!requestBody.title || !requestBody.category) {
        res.status(400).json({ message: 'Поля title и category обязательны' });
        return;
      }

      // Обработка и валидация даты, если она передана
      let dateObject: Date | null = null;
      if (requestBody.date) {
         dateObject = new Date(requestBody.date);
         if (isNaN(dateObject.getTime())) {
            res.status(400).json({ message: 'Неверный формат даты. Ожидается строка в формате ISO 8601.' });
            return;
         }
      }

      const newEventData: EventCreationAttributes = {
        title: requestBody.title,
        description: requestBody.description ?? null, // Убедимся, что null если нет
        date: dateObject, // Передаем Date или null
        category: requestBody.category,
        createdBy: createdBy,
      };

      const newEvent = await EventModel.create(newEventData);
      res.status(201).json(newEvent); // Возвращаем созданный объект
    } catch (error) {
       if (error instanceof Error && error.name === 'SequelizeValidationError') {
        const validationError = error as unknown as SimpleSequelizeValidationError; // Приведение типа
        const validationErrors = Array.isArray(validationError.errors)
          ? validationError.errors.map(e => e?.message ?? 'Unknown validation error')
          : ['Validation error'];
        res.status(400).json({ message: 'Ошибка валидации данных', details: validationErrors });
      } else {
        console.error('[API_ERROR] POST /api/events:', error);
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка сервера';
        res.status(500).json({ message: 'Ошибка сервера при создании мероприятия', details: message });
      }
    }
  }
);

// --- PUT /api/events/:id ---
/**
 * @openapi
 * /api/events/{id}:
 *   put:
 *     tags: [Events]
 *     summary: Обновить существующее мероприятие
 *     description: Обновляет мероприятие по ID. Требует API ключ и JWT токен. Редактировать может только создатель.
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
 *             $ref: '#/components/schemas/UpdateEventInput' # Должен быть определен
 *     responses:
 *       '200':
 *         description: Мероприятие обновлено
 *         content: { application/json: { schema: { $ref: '#/components/schemas/EventModel' }}}
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { description: 'Нет прав на редактирование (не создатель) или неверный API ключ' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.put(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  apiKeyAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userPayload = req.user as UserJwtPayload | undefined;
    const currentUserId = userPayload?.id;
     if (!currentUserId) {
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

      // Проверка прав: редактировать может только создатель
      if (event.createdBy !== currentUserId) {
        res.status(403).json({ message: 'У вас нет прав на редактирование этого мероприятия' });
        return;
      }

      const requestBody = req.body as UpdateEventRequestBody;
      const updatePayload: Partial<EventAttributes> = {}; // Используем Partial для удобства

      // Валидируем и добавляем поля, если они есть в запросе
      if (requestBody.title !== undefined) updatePayload.title = requestBody.title;
      if (requestBody.description !== undefined) updatePayload.description = requestBody.description; // Может быть null
      if (requestBody.category !== undefined) {
         if (!['concert', 'lecture', 'exhibition'].includes(requestBody.category)) {
            res.status(400).json({ message: `Недопустимое значение для категории: ${requestBody.category}` });
            return;
         }
         updatePayload.category = requestBody.category;
      }
       if (requestBody.date !== undefined) {
         if (requestBody.date === null) {
             updatePayload.date = null;
         } else {
             const dateObject = new Date(requestBody.date);
             if (isNaN(dateObject.getTime())) {
                 res.status(400).json({ message: 'Неверный формат даты для обновления. Ожидается строка ISO 8601 или null.' });
                 return;
             }
             updatePayload.date = dateObject;
         }
       }


      if (Object.keys(updatePayload).length === 0) {
        res.status(400).json({ message: 'Нет данных для обновления' });
        return;
      }

      await event.update(updatePayload);
      res.status(200).json(event); // Возвращаем обновленный event

    } catch (error) {
       if (error instanceof Error && error.name === 'SequelizeValidationError') {
         const validationError = error as unknown as SimpleSequelizeValidationError;
         const validationErrors = Array.isArray(validationError.errors)
           ? validationError.errors.map(e => e?.message ?? 'Unknown validation error')
           : ['Validation error'];
         res.status(400).json({ message: 'Ошибка валидации данных при обновлении', details: validationErrors });
      } else {
        console.error(`[API_ERROR] PUT /api/events/${req.params.id}:`, error);
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка сервера';
        res.status(500).json({ message: 'Ошибка сервера при обновлении мероприятия', details: message });
      }
    }
  }
);

// --- DELETE /api/events/:id ---
/**
 * @openapi
 * /api/events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Удалить мероприятие
 *     description: Удаляет мероприятие по ID. Требует API ключ и JWT токен. Удалить может только создатель.
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
 *       '204': { description: 'Мероприятие успешно удалено' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { description: 'Нет прав на удаление (не создатель) или неверный API ключ' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  apiKeyAuth,
  async (req: Request, res: Response): Promise<void> => {
     const userPayload = req.user as UserJwtPayload | undefined;
     const currentUserId = userPayload?.id;
     if (!currentUserId) {
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

      // Проверка прав: удалить может только создатель
      if (event.createdBy !== currentUserId) {
          res.status(403).json({ message: 'У вас нет прав на удаление этого мероприятия' });
          return;
      }

      await event.destroy(); // Записи в event_participants удалятся каскадно (onDelete: 'CASCADE')
      res.status(204).end(); // Успешное удаление

    } catch (error) {
      console.error(`[API_ERROR] DELETE /api/events/${req.params.id}:`, error);
      res.status(500).json({ message: 'Ошибка сервера при удалении мероприятия' });
    }
  }
);


// --- POST /api/events/:eventId/participate ---
/**
 * @openapi
 * /api/events/{eventId}/participate:
 *   post:
 *     tags: [Events Participation]
 *     summary: Зарегистрироваться на мероприятие
 *     description: Регистрирует аутентифицированного пользователя как участника мероприятия. Нельзя участвовать в своих мероприятиях. Требует JWT токен и API ключ.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: integer, format: int64 }
 *         description: ID мероприятия
 *       - $ref: '#/components/parameters/ApiKeyQueryParam'
 *     responses:
 *       '201':
 *          description: Успешная регистрация на мероприятие
 *          content: { application/json: { schema: { type: object, properties: { message: { type: string } } } } }
 *       '400': { description: 'Неверный ID или уже участвует' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { description: 'Нельзя участвовать в собственном мероприятии или неверный API ключ' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.post(
  '/:eventId/participate',
  passport.authenticate('jwt', { session: false }),
  apiKeyAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userPayload = req.user as UserJwtPayload | undefined;
    const userId = userPayload?.id;
    if (!userId) {
      res.status(401).json({ message: 'Ошибка аутентификации JWT' });
      return;
    }

    try {
      const eventId = parseInt(req.params.eventId, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ message: 'ID мероприятия должен быть числом' });
        return;
      }

      const event = await EventModel.findByPk(eventId, { attributes: ['id', 'createdBy']}); // Запрашиваем только нужные поля
      if (!event) {
        res.status(404).json({ message: 'Мероприятие не найдено' });
        return;
      }

      if (event.createdBy === userId) {
        res.status(403).json({ message: 'Вы не можете участвовать в собственном мероприятии' });
        return;
      }

      const [_, created] = await EventParticipant.findOrCreate({
        where: { userId, eventId },
        defaults: { userId, eventId } // На случай если нужно передать доп. поля при создании
      });

      if (!created) {
        res.status(400).json({ message: 'Вы уже зарегистрированы на это мероприятие' });
        return;
      }

      res.status(201).json({ message: 'Вы успешно зарегистрировались на мероприятие' });

    } catch (error) {
      console.error(`[API_ERROR] POST /events/${req.params.eventId}/participate:`, error);
      res.status(500).json({ message: 'Ошибка сервера при регистрации на мероприятие' });
    }
  }
);

// --- DELETE /api/events/:eventId/participate ---
/**
 * @openapi
 * /api/events/{eventId}/participate:
 *   delete:
 *     tags: [Events Participation]
 *     summary: Отменить участие в мероприятии
 *     description: Удаляет запись об участии аутентифицированного пользователя в мероприятии. Требует JWT токен и API ключ.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: integer, format: int64 }
 *         description: ID мероприятия
 *       - $ref: '#/components/parameters/ApiKeyQueryParam'
 *     responses:
 *       '204': { description: 'Участие успешно отменено или пользователь и так не участвовал' }
 *       '400': { description: 'Неверный ID мероприятия' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { description: 'Мероприятие не найдено' } # Добавлено для проверки существования события
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.delete(
  '/:eventId/participate',
  passport.authenticate('jwt', { session: false }),
  apiKeyAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userPayload = req.user as UserJwtPayload | undefined;
    const userId = userPayload?.id;
     if (!userId) {
      res.status(401).json({ message: 'Ошибка аутентификации JWT' });
      return;
    }

    try {
       const eventId = parseInt(req.params.eventId, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ message: 'ID мероприятия должен быть числом' });
        return;
      }

      // Проверка существования мероприятия
       const eventExists = await EventModel.findByPk(eventId, { attributes: ['id'] });
       if (!eventExists) {
          res.status(404).json({ message: 'Мероприятие не найдено' });
          return;
       }

      // Удаляем запись, если она есть
      await EventParticipant.destroy({
        where: { userId, eventId },
      });

      res.status(204).end(); // Успех, даже если записи не было

    } catch (error) {
      console.error(`[API_ERROR] DELETE /events/${req.params.eventId}/participate:`, error);
      res.status(500).json({ message: 'Ошибка сервера при отмене участия' });
    }
  }
);

// --- GET /api/events/:eventId/participants --- (Опционально, для модального окна)
/**
 * @openapi
 * /api/events/{eventId}/participants:
 *   get:
 *     tags: [Events Participation]
 *     summary: Получить список участников мероприятия
 *     description: Возвращает список пользователей, зарегистрированных на мероприятие. Требует API ключ. (Возможно, стоит защитить JWT).
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: integer, format: int64 }
 *         description: ID мероприятия
 *       - $ref: '#/components/parameters/ApiKeyQueryParam'
 *     security:
 *       - BearerAuth: [] # Рекомендуется защитить этот эндпоинт
 *     responses:
 *       '200':
 *          description: Список участников
 *          content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/User' } } } } # Возвращаем User без пароля
 *       '401': { $ref: '#/components/responses/UnauthorizedError' } # Если JWT обязателен
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.get(
  '/:eventId/participants',
  passport.authenticate('jwt', { session: false }), // Рекомендуется защитить
  apiKeyAuth,
  async (req: Request, res: Response): Promise<void> => {
     try {
       const eventId = parseInt(req.params.eventId, 10);
       if (isNaN(eventId)) {
         res.status(400).json({ message: 'ID мероприятия должен быть числом' });
         return;
       }

       const event = await EventModel.findByPk(eventId, {
         // Включаем связь 'participants', которую мы определили в модели EventModel
         include: [{
           model: User,
           as: 'participants', // Используем псевдоним
           attributes: ['id', 'name', 'email'], // Явно указываем, какие поля пользователя вернуть (БЕЗ ПАРОЛЯ)
           through: { attributes: [] } // Не включаем поля из промежуточной таблицы EventParticipant
         }]
       });

       if (!event) {
         res.status(404).json({ message: 'Мероприятие не найдено' });
         return;
       }

       // event.participants будет содержать массив объектов User
       // @ts-ignore // Sequelize типизация для include может быть сложной, игнорируем возможную ошибку
       const participants = event.participants || [];

       res.status(200).json(participants);

     } catch (error) {
       console.error(`[API_ERROR] GET /events/${req.params.eventId}/participants:`, error);
       res.status(500).json({ message: 'Ошибка сервера при получении списка участников' });
     }
});


// --- Swagger Компоненты (Ссылки) ---
// Убедитесь, что эти компоненты определены в swagger.ts или здесь, или в моделях
/**
 * @openapi
 * components:
 *   parameters:
 *     # ApiKeyQueryParam: (определен в swagger.ts или event.ts)
 *   securitySchemes:
 *      # BearerAuth: (определен в swagger.ts или auth.ts)
 *   schemas:
 *      # CreateEventInput: (определен в event.ts или swagger.ts)
 *      # UpdateEventInput: (определен в event.ts или swagger.ts)
 *      # EventModel: (определен в event.ts)
 *      # User: (определен в user.ts)
 *      # ErrorResponse: (определен в swagger.ts)
 *   responses:
 *      # UnauthorizedError, ForbiddenError, BadRequestError, NotFoundError, ServerError: (определены в swagger.ts)
 */

// --- Экспорт роутера ---
export default router;