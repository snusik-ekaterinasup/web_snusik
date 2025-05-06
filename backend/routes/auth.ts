// --- START OF FILE routes/auth.ts (Финальная версия v3) ---

import express, { Router, Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

// Импортируем модели и типы с алиасами
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
  try {
    const { refreshToken }: { refreshToken?: string } = req.body;
    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token не предоставлен' });
      return;
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      // Оставляем эту критическую ошибку
      console.error('[VERIFY_REFRESH] CRITICAL ERROR: JWT_SECRET not set!');
      res.status(500).json({ message: 'Ошибка конфигурации сервера' });
      return;
    }

    let payload: UserJwtPayload;
    try {
      const decoded = jwt.verify(refreshToken, jwtSecret);
      if (typeof decoded === 'string' || typeof decoded?.id !== 'number') {
        throw new jwt.JsonWebTokenError(
          'Неверный payload токена: отсутствует или неверный id',
        );
      }
      payload = decoded as UserJwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        try {
          // Просто пытаемся удалить, игнорируем ошибку удаления
          await RefreshToken.destroy({ where: { token: refreshToken } });
        } catch {
          // Ошибку удаления токена можно игнорировать
        }
        res.status(401).json({ message: 'Refresh token истек' });
        return;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          message: `Недействительный refresh token: ${error.message}`,
        });
        return;
      }
      res.status(500).json({ message: 'Ошибка проверки токена' });
      return;
    }

    const tokenInDb = await RefreshToken.findOne({
      where: { token: refreshToken, userId: payload.id },
    });

    if (!tokenInDb) {
      res.status(401).json({
        message: 'Refresh token не найден или не принадлежит пользователю',
      });
      return;
    }

    if (new Date() > tokenInDb.expiresAt) {
      try {
        // Просто пытаемся удалить, игнорируем ошибку удаления
        await tokenInDb.destroy();
      } catch {
        // Ошибку удаления токена можно игнорировать
      }
      res.status(401).json({ message: 'Refresh token истек (согласно БД)' });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Неизвестная ошибка сервера';
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Внутренняя ошибка сервера при проверке токена',
        details: message,
      });
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
 *       $ref: '#/components/schemas/UserInput'
 *     LoginInput:
 *         type: object
 *         required: [email, password]
 *         properties:
 *             email: { type: string, format: email, example: "ivan.ivanov@example.com" }
 *             password: { type: string, format: password, example: "securePassword123" }
 *     AuthResponse:
 *       type: object
 *       properties:
 *         accessToken: { type: string, description: 'JWT токен для доступа (включая "Bearer ")', example: 'Bearer eyJhbGciOi...' }
 *         refreshToken: { type: string, description: 'Токен для обновления access token', example: 'eyJhbGciOi...' }
 *         user: { $ref: '#/components/schemas/User' }
 *     RefreshResponse:
 *       type: object
 *       properties:
 *         accessToken: { type: string, description: 'Новый JWT токен для доступа (включая "Bearer ")', example: 'Bearer eyJhbGciOi...' }
 *     ErrorResponse:
 *         type: object
 *         properties:
 *             message: { type: string, example: 'Ошибка сервера' }
 *             details: { type: any, nullable: true, example: 'Дополнительная информация | Массив ошибок валидации' }
 *             error: { type: string, nullable: true, example: 'Сообщение об ошибке (если применимо)' }
 *             stack: { type: string, nullable: true, example: 'Стек вызова (только в режиме разработки)' }
 *   responses:
 *      UnauthorizedError: { description: 'Ошибка авторизации', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *      ForbiddenError: { description: 'Ошибка доступа', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *      BadRequestError: { description: 'Неверный запрос', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *      NotFoundError: { description: 'Ресурс не найден', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *      ServerError: { description: 'Внутренняя ошибка сервера', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }}}}
 *   securitySchemes:
 *      BearerAuth: { type: http, scheme: bearer, bearerFormat: JWT, description: "JWT токен доступа, полученный после успешного логина. Передается в заголовке Authorization: Bearer {token}" }
 */

// --- Registration Route ---
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Регистрация нового пользователя
 *     description: Создает нового пользователя. Пароль хешируется хуком в модели. Email должен быть уникальным.
 *     requestBody:
 *       required: true
 *       description: Данные нового пользователя
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       '201':
 *         description: Пользователь зарегистрирован
 *         content: { application/json: { schema: { type: object, properties: { message: { type: string, example: "Пользователь зарегистрирован" }, user: { $ref: '#/components/schemas/User' }}}}}
 *       '400': { description: 'Ошибка валидации или email уже используется', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }, examples: { validationError: { value: { message: "Ошибка валидации...", details: ["Сообщение ошибки 1", "Сообщение ошибки 2"] } }, emailExists: { value: { message: "Email уже используется" } } } } } }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      res
        .status(400)
        .json({ message: 'Поля name, email и password обязательны' });
      return;
    }
    if (typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) {
      res.status(400).json({ message: 'Неверный формат email' });
      return;
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email уже используется' });
      return;
    }

    const newUser = await User.create({ name, email, password });

    const newUserIdValue = newUser.get('id');

    if (typeof newUserIdValue !== 'number') {
      // console.error('[REGISTER] Failed: User created but ID is not a number...', newUser.toJSON());
      throw new Error('Не удалось получить ID пользователя после создания.');
    }
    const newUserId: number = newUserIdValue;

    const userResponse: Omit<UserAttributes, 'password'> = {
      id: newUserId,
      name: newUser.get('name'),
      email: newUser.get('email'),
      createdAt: newUser.get('createdAt'),
      updatedAt: newUser.get('updatedAt'),
    };

    res
      .status(201)
      .json({ message: 'Пользователь зарегистрирован', user: userResponse });
  } catch (error) {
    if (error instanceof Error && error.name === 'SequelizeValidationError') {
      const validationError = error as SimpleSequelizeValidationError;
      const errorMessages = Array.isArray(validationError.errors)
        ? validationError.errors.map(
            (e) => e?.message ?? 'Неизвестная ошибка валидации',
          )
        : ['Некорректный формат ошибок валидации'];

      if (!res.headersSent) {
        res.status(400).json({
          message: 'Ошибка валидации при регистрации',
          details: errorMessages,
        });
      }
      return;
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Неизвестная ошибка сервера';
    const errorStack =
      error instanceof Error && process.env.NODE_ENV === 'development'
        ? error.stack
        : undefined;

    if (!res.headersSent) {
      res.status(500).json({
        message: 'Ошибка сервера при регистрации',
        error: errorMessage,
        stack: errorStack,
      });
    }
  }
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
 *       '400': { description: 'Не предоставлены email или пароль', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { message: "Требуется email и пароль" } } } }
 *       '401': { description: 'Неверные учетные данные', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' }, examples: { userNotFound: { value: { message: "Неверные учетные данные (пользователь не найден)" }}, passwordMismatch: { value: { message: "Неверные учетные данные (пароль)" }} }} } }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequestBody;

    if (!email || !password) {
      res.status(400).json({ message: 'Требуется email и пароль' });
      return;
    }

    const userQueryResult: User | null = await User.scope(
      'withPassword',
    ).findOne({ where: { email } });

    if (!userQueryResult) {
      res
        .status(401)
        .json({ message: 'Неверные учетные данные (пользователь не найден)' });
      return;
    }
    const confirmedUser: User = userQueryResult;

    const isMatch = await confirmedUser.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Неверные учетные данные (пароль)' });
      return;
    }

    const userIdValue = confirmedUser.get('id');

    if (typeof userIdValue !== 'number') {
      // console.error(`[LOGIN] CRITICAL ERROR: User ID is NOT a number after get()...`); // Убрано
      throw new Error(
        `Внутренняя ошибка сервера: не удалось обработать ID пользователя.`,
      );
    }
    const userId: number = userIdValue;

    // Генерация токенов
    const jwtSecret = process.env.JWT_SECRET;
    const accessExpiresInString =
      process.env.JWT_ACCESS_EXPIRES_SECONDS || '900';
    const refreshExpiresInString =
      process.env.JWT_REFRESH_EXPIRES_SECONDS || '604800';

    if (!jwtSecret) {
      console.error('[LOGIN] CRITICAL ERROR: JWT_SECRET not set!'); // Оставляем
      throw new Error('Ошибка конфигурации сервера JWT.');
    }

    const accessExpiresInSeconds = parseInt(accessExpiresInString, 10);
    const refreshExpiresInSeconds = parseInt(refreshExpiresInString, 10);
    if (isNaN(accessExpiresInSeconds) || isNaN(refreshExpiresInSeconds)) {
      console.error(
        '[LOGIN] CRITICAL ERROR: Invalid JWT expiration time configuration.',
      ); // Оставляем
      throw new Error('Ошибка конфигурации времени жизни токена.');
    }

    const payload: UserJwtPayload = { id: userId };
    const accessTokenOptions: SignOptions = {
      expiresIn: accessExpiresInSeconds,
    };
    const refreshTokenOptions: SignOptions = {
      expiresIn: refreshExpiresInSeconds,
    };

    const accessToken = jwt.sign(payload, jwtSecret, accessTokenOptions);
    const refreshToken = jwt.sign(
      { id: userId },
      jwtSecret,
      refreshTokenOptions,
    );
    const expiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);

    try {
      await RefreshToken.destroy({ where: { userId: userId } });
      await RefreshToken.create({
        token: refreshToken,
        userId: userId,
        expiresAt,
      });
    } catch {
      // <-- Убираем переменную _dbError
      throw new Error('Ошибка при обновлении сессии пользователя.');
    }

    const userResponse: Omit<UserAttributes, 'password'> = {
      id: userId,
      name: confirmedUser.get('name'),
      email: confirmedUser.get('email'),
      createdAt: confirmedUser.get('createdAt'),
      updatedAt: confirmedUser.get('updatedAt'),
    };

    res.json({
      accessToken: `Bearer ${accessToken}`,
      refreshToken,
      user: userResponse,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Неизвестная ошибка сервера';
    const errorStack =
      error instanceof Error && process.env.NODE_ENV === 'development'
        ? error.stack
        : undefined;

    if (!res.headersSent) {
      res.status(500).json({
        message: 'Ошибка сервера при входе в систему',
        error: errorMessage,
        stack: errorStack,
      });
    }
  }
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
 *       content: { application/json: { schema: { type: object, required: [refreshToken], properties: { refreshToken: { type: string, description: 'Валидный refresh token', example: 'eyJhbGciOi...' }}}}}
 *     responses:
 *       '200': { description: 'Access token успешно обновлен', content: { application/json: { schema: { $ref: '#/components/schemas/RefreshResponse' }}}}
 *       '401': { description: 'Refresh token не предоставлен, недействителен или истек', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.post(
  '/refresh',
  verifyRefreshToken,
  async (req: Request, res: Response): Promise<void> => {
    const userPayload = req.user as UserJwtPayload | undefined;

    if (!userPayload?.id || typeof userPayload.id !== 'number') {
      res.status(401).json({
        message:
          'Ошибка аутентификации refresh token (неверные данные пользователя)',
      });
      return;
    }

    const userIdFromToken: number = userPayload.id;

    try {
      const jwtSecret = process.env.JWT_SECRET;
      const accessExpiresInString =
        process.env.JWT_ACCESS_EXPIRES_SECONDS || '900';

      if (!jwtSecret) {
        console.error('[REFRESH] CRITICAL ERROR: JWT_SECRET not set!');
        throw new Error('Ошибка конфигурации сервера JWT.');
      }

      const accessExpiresInSeconds = parseInt(accessExpiresInString, 10);
      if (isNaN(accessExpiresInSeconds)) {
        console.error(
          '[REFRESH] CRITICAL ERROR: Invalid JWT access token expiration time.',
        ); // Оставляем
        throw new Error('Ошибка конфигурации времени жизни токена.');
      }

      const newPayload: UserJwtPayload = { id: userIdFromToken };
      const newAccessTokenOptions: SignOptions = {
        expiresIn: accessExpiresInSeconds,
      };
      const newAccessToken = jwt.sign(
        newPayload,
        jwtSecret,
        newAccessTokenOptions,
      );

      res.json({ accessToken: `Bearer ${newAccessToken}` });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка сервера';
      const errorStack =
        error instanceof Error && process.env.NODE_ENV === 'development'
          ? error.stack
          : undefined;

      if (!res.headersSent) {
        res.status(500).json({
          message: 'Ошибка сервера при обновлении токена',
          error: errorMessage,
          stack: errorStack,
        });
      }
    }
  },
);

// --- Экспорт роутера ---
export default router;

// --- END OF FILE routes/auth.ts ---
