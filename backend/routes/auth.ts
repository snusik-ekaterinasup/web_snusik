// backend/routes/auth.ts

import express, { Router, Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import passport from 'passport';
import { EventModel } from '@models/event';
// Импортируем модели и типы
// Адаптируйте пути, если @models/ не настроен как алиас на ./models/
import { User, UserAttributes } from '@models/user';
import { RefreshToken } from '@models/refreshToken';

// --- Интерфейсы ---
export interface UserJwtPayload extends JwtPayload {
  id: number;
}

interface LoginRequestBody {
  email?: string;
  password?: string;
}

interface SimpleSequelizeValidationError extends Error {
  name: 'SequelizeValidationError';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: Array<{ message?: string; path?: string; [key: string]: any }>;
}

// --- Инициализация роутера ---
const router: Router = express.Router();

// --- Middleware verifyRefreshToken ---
const verifyRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // ... (ваш существующий код для verifyRefreshToken)
  try {
    const { refreshToken }: { refreshToken?: string } = req.body;
    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token не предоставлен' });
      return;
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[VERIFY_REFRESH] CRITICAL ERROR: JWT_SECRET not set!');
      res.status(500).json({ message: 'Ошибка конфигурации сервера' });
      return;
    }

    let payload: UserJwtPayload;
    try {
      const decoded = jwt.verify(refreshToken, jwtSecret);
      if (typeof decoded === 'string' || typeof decoded?.id !== 'number') {
        throw new jwt.JsonWebTokenError('Неверный payload токена: отсутствует или неверный id');
      }
      payload = decoded as UserJwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        try { await RefreshToken.destroy({ where: { token: refreshToken } }); } catch { /* Игнор */ }
        res.status(401).json({ message: 'Refresh token истек' }); return;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ message: `Недействительный refresh token: ${error.message}` }); return;
      }
      res.status(500).json({ message: 'Ошибка проверки токена' }); return;
    }
    const tokenInDb = await RefreshToken.findOne({ where: { token: refreshToken, userId: payload.id } });
    if (!tokenInDb) {
      res.status(401).json({ message: 'Refresh token не найден или не принадлежит пользователю' }); return;
    }
    if (new Date() > tokenInDb.expiresAt) {
      try { await tokenInDb.destroy(); } catch { /* Игнор */ }
      res.status(401).json({ message: 'Refresh token истек (согласно БД)' }); return;
    }
    req.user = payload;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка сервера';
    if (!res.headersSent) {
      res.status(500).json({ message: 'Внутренняя ошибка сервера при проверке токена', details: message });
    }
  }
};

// --- Swagger Definitions ---
/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Аутентификация и авторизация пользователей
 * components:
 *   schemas:
 *     RegisterInput:
 *       $ref: '#/components/schemas/UserInput' # Убедитесь, что UserInput определен в models/user.ts
 *     LoginInput:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, format: email, example: "ivan.ivanov@example.com" }
 *         password: { type: string, format: password, example: "securePassword123" }
 *     AuthResponse:
 *       type: object
 *       properties:
 *         accessToken: { type: string, description: 'JWT токен для доступа (включая "Bearer ")', example: 'Bearer eyJhbGciOi...' }
 *         refreshToken: { type: string, description: 'Токен для обновления access token', example: 'eyJhbGciOi...' }
 *         user: { $ref: '#/components/schemas/User' } # Убедитесь, что User определен в models/user.ts
 *     RefreshResponse:
 *       type: object
 *       properties:
 *         accessToken: { type: string, description: 'Новый JWT токен для доступа (включая "Bearer ")', example: 'Bearer eyJhbGciOi...' }
 *     UserProfileResponse: # Схема для /me
 *       type: object
 *       properties:
 *         id: { type: integer, format: int64, example: 1 }
 *         name: { type: string, example: "Иван Иванов" }
 *         email: { type: string, format: email, example: "ivan.ivanov@example.com" }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message: { type: string, example: 'Ошибка сервера' }
 *         details: { type: any, nullable: true, example: 'Дополнительная информация | Массив ошибок валидации' }
 *         error: { type: string, nullable: true, example: 'Сообщение об ошибке (если применимо)' }
 *         stack: { type: string, nullable: true, example: 'Стек вызова (только в режиме разработки)' }
 *   responses: # Эти ответы должны быть определены в config/swagger.ts или здесь
 *     UnauthorizedError: { description: 'Ошибка авторизации', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *     ForbiddenError: { description: 'Ошибка доступа', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *     BadRequestError: { description: 'Неверный запрос', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *     NotFoundError: { description: 'Ресурс не найден', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *     ServerError: { description: 'Внутренняя ошибка сервера', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *   securitySchemes:
 *     BearerAuth: { type: http, scheme: bearer, bearerFormat: JWT, description: "JWT токен доступа. Передается в заголовке Authorization: Bearer {token}" }
 */

// --- Registration Route ---
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Регистрация нового пользователя
 *     description: Создает нового пользователя. Пароль хешируется. Email должен быть уникальным.
 *     requestBody:
 *       required: true
 *       description: Данные нового пользователя
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       '201':
 *         description: Пользователь зарегистрирован
 *         content: { application/json: { schema: { type: object, properties: { message: { type: string, example: "Пользователь зарегистрирован" }, user: { $ref: '#/components/schemas/User' }}}}}
 *       '400': { description: 'Ошибка валидации или email уже используется', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  // ... (ваш существующий код для /register, убедитесь, что next(error) используется для ошибок)
  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string; };
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Поля name, email и password обязательны' });
    }
    if (typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Неверный формат email' });
    }
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email уже используется' });
    }
    const newUser = await User.create({ name, email, password });
    const newUserIdValue = newUser.get('id');
    if (typeof newUserIdValue !== 'number') { throw new Error('Не удалось получить ID пользователя после создания.'); }
    const userResponse: Omit<UserAttributes, 'password'> = {
      id: newUserIdValue, name: newUser.get('name'), email: newUser.get('email'),
      createdAt: newUser.get('createdAt'), updatedAt: newUser.get('updatedAt'),
    };
    res.status(201).json({ message: 'Пользователь зарегистрирован', user: userResponse });
  } catch (error) { next(error); } // Передаем ошибку глобальному обработчику
});

// --- Login Route ---
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вход пользователя в систему
 *     description: Аутентифицирует пользователя, возвращает access/refresh токены и информацию о пользователе.
 *     requestBody:
 *       required: true
 *       description: Учетные данные для входа
 *       content: { application/json: { schema: { $ref: '#/components/schemas/LoginInput' }}}
 *     responses:
 *       '200': { description: 'Успешный вход', content: { application/json: { schema: { $ref: '#/components/schemas/AuthResponse' }}}}
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { description: 'Неверные учетные данные', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  // ... (ваш существующий код для /login, убедитесь, что next(error) используется для ошибок)
  try {
    const { email, password } = req.body as LoginRequestBody;
    if (!email || !password) { return res.status(400).json({ message: 'Требуется email и пароль' });}
    const userQueryResult: User | null = await User.scope('withPassword').findOne({ where: { email } });
    if (!userQueryResult) { return res.status(401).json({ message: 'Неверные учетные данные (пользователь не найден)' });}
    const confirmedUser: User = userQueryResult;
    const isMatch = await confirmedUser.comparePassword(password);
    if (!isMatch) { return res.status(401).json({ message: 'Неверные учетные данные (пароль)' });}
    const userIdValue = confirmedUser.get('id');
    if (typeof userIdValue !== 'number') { throw new Error('Внутренняя ошибка сервера: не удалось обработать ID пользователя.');}
    const userId: number = userIdValue;
    const jwtSecret = process.env.JWT_SECRET;
    const accessExpiresInString = process.env.JWT_ACCESS_EXPIRES_SECONDS || '900';
    const refreshExpiresInString = process.env.JWT_REFRESH_EXPIRES_SECONDS || '604800';
    if (!jwtSecret) { console.error('[LOGIN] CRITICAL ERROR: JWT_SECRET not set!'); throw new Error('Ошибка конфигурации сервера JWT.');}
    const accessExpiresInSeconds = parseInt(accessExpiresInString, 10);
    const refreshExpiresInSeconds = parseInt(refreshExpiresInString, 10);
    if (isNaN(accessExpiresInSeconds) || isNaN(refreshExpiresInSeconds)) { console.error('[LOGIN] CRITICAL ERROR: Invalid JWT expiration time configuration.'); throw new Error('Ошибка конфигурации времени жизни токена.');}
    const payload: UserJwtPayload = { id: userId };
    const accessTokenOptions: SignOptions = { expiresIn: accessExpiresInSeconds };
    const refreshTokenOptions: SignOptions = { expiresIn: refreshExpiresInSeconds };
    const accessToken = jwt.sign(payload, jwtSecret, accessTokenOptions);
    const refreshToken = jwt.sign({ id: userId }, jwtSecret, refreshTokenOptions);
    const expiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);
    try {
      await RefreshToken.destroy({ where: { userId: userId } });
      await RefreshToken.create({ token: refreshToken, userId: userId, expiresAt });
    } catch { throw new Error('Ошибка при обновлении сессии пользователя.'); }
    const userResponse: Omit<UserAttributes, 'password'> = {
      id: userId, name: confirmedUser.get('name'), email: confirmedUser.get('email'),
      createdAt: confirmedUser.get('createdAt'), updatedAt: confirmedUser.get('updatedAt'),
    };
    res.json({ accessToken: `Bearer ${accessToken}`, refreshToken, user: userResponse });
  } catch (error) { next(error); } // Передаем ошибку глобальному обработчику
});

// --- Refresh Token Route ---
/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Обновление access token
 *     description: Генерирует новый access token при предоставлении валидного refresh token.
 *     requestBody:
 *       required: true
 *       description: Refresh token для обновления access token
 *       content: { application/json: { schema: { type: object, required: [refreshToken], properties: { refreshToken: { type: string }}}}}
 *     responses:
 *       '200': { description: 'Access token успешно обновлен', content: { application/json: { schema: { $ref: '#/components/schemas/RefreshResponse' }}}}
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.post('/refresh', verifyRefreshToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (ваш существующий код для /refresh, убедитесь, что next(error) используется для ошибок)
    const userPayload = req.user as UserJwtPayload | undefined;
    if (!userPayload?.id || typeof userPayload.id !== 'number') {
      return res.status(401).json({ message: 'Ошибка аутентификации refresh token (неверные данные пользователя)' });
    }
    const userIdFromToken: number = userPayload.id;
    try {
      const jwtSecret = process.env.JWT_SECRET;
      const accessExpiresInString = process.env.JWT_ACCESS_EXPIRES_SECONDS || '900';
      if (!jwtSecret) { console.error('[REFRESH] CRITICAL ERROR: JWT_SECRET not set!'); throw new Error('Ошибка конфигурации сервера JWT.');}
      const accessExpiresInSeconds = parseInt(accessExpiresInString, 10);
      if (isNaN(accessExpiresInSeconds)) { console.error('[REFRESH] CRITICAL ERROR: Invalid JWT access token expiration time.'); throw new Error('Ошибка конфигурации времени жизни токена.');}
      const newPayload: UserJwtPayload = { id: userIdFromToken };
      const newAccessTokenOptions: SignOptions = { expiresIn: accessExpiresInSeconds };
      const newAccessToken = jwt.sign(newPayload, jwtSecret, newAccessTokenOptions);
      res.json({ accessToken: `Bearer ${newAccessToken}` });
    } catch (error) { next(error); } // Передаем ошибку глобальному обработчику
  },
);

// --- НОВЫЙ МАРШРУТ: GET /api/auth/me ---
/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Получить данные текущего аутентифицированного пользователя
 *     description: Возвращает информацию о пользователе, чей JWT токен используется. Пароль не возвращается.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Успешный ответ с данными пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.get(
  '/me',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userPayload = req.user as UserJwtPayload | undefined;

      if (!userPayload || typeof userPayload.id !== 'number') {
        return res.status(401).json({ message: 'Ошибка аутентификации: неверные данные пользователя в токене' });
      }

      const userId = userPayload.id;
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      const userProfile: Omit<UserAttributes, 'password'> = {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.status(200).json(userProfile);
    } catch (error) {
      next(error);
    }
  }
);
/**
 * @openapi
 * /api/auth/me/events:
 *   get:
 *     tags: [Auth, Events] # Можно добавить тег Events
 *     summary: Получить список мероприятий, созданных текущим пользователем
 *     description: Возвращает список всех мероприятий, где поле 'createdBy' совпадает с ID аутентифицированного пользователя.
 *     security:
 *       - BearerAuth: [] # Требует JWT
 *     responses:
 *       '200':
 *         description: Успешный ответ со списком мероприятий пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EventModel' # Ссылка на схему мероприятия
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/me/events',
  passport.authenticate('jwt', { session: false }), // Защищаем маршрут
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userPayload = req.user as UserJwtPayload | undefined;

      if (!userPayload || typeof userPayload.id !== 'number') {
        // Эта проверка дублирует то, что делает passport, но для надежности
        return res.status(401).json({ message: 'Ошибка аутентификации: неверные данные пользователя в токене' });
      }

      const userId = userPayload.id;

      // Ищем все мероприятия, созданные этим пользователем
      // Предполагается, что EventModel импортирована из '@models/event' или '../models/event'
      // и имеет поле createdBy
      const userEvents = await EventModel.findAll({
        where: {
          createdBy: userId,
        },
        order: [['date', 'DESC']], // Опционально: сортируем по дате, сначала новые
      });

      res.status(200).json(userEvents);
    } catch (error) {
      next(error); // Передаем ошибку глобальному обработчику
    }
  }
);
// --- Экспорт роутера ---
export default router;