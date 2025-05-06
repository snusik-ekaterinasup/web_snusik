// --- START OF FILE routes/users.ts ---

// 1. Убран импорт NextFunction
import express, { Router, Request, Response } from 'express';
import passport from 'passport';
import { ValidationError } from 'sequelize'; // Импортируем тип ошибки валидации Sequelize

// Import models using ES module syntax and .js extension
import { User } from '@models/user';

// Определяем интерфейс для ожидаемого тела запроса при создании пользователя
interface UserCreationBody {
  name: string;
  email: string;
  password: string;
}

// 2. Убран неиспользуемый интерфейс AuthenticatedRequest
// interface AuthenticatedRequest extends Request { ... }

// Initialize the router
const router: Router = express.Router();

// --- Swagger Definitions ---
/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: Управление пользователями (требуется JWT для всех операций)
 * components:
 *   schemas:
 *     # User schema (из models/user.ts) - $ref: '#/components/schemas/User'
 *     # UserInput schema (из models/user.ts) - $ref: '#/components/schemas/UserInput'
 *     UserInputRequired: # Schema for user creation input
 *       type: object
 *       required: [name, email, password]
 *       properties:
 *         name: { type: string, description: "Имя пользователя", example: "Анна Петрова" }
 *         email: { type: string, format: email, description: "Email пользователя (уникальный)", example: "anna.petrova@example.com" }
 *         password: { type: string, format: password, description: "Пароль для нового пользователя", example: "AnotherSecurePwd456" }
 *   responses:
 *      UserListResponse:
 *          description: Успешный ответ со списком пользователей
 *          content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/User' }}}}
 *      UserResponse:
 *          description: Успешный ответ с данными одного пользователя
 *          content: { application/json: { schema: { $ref: '#/components/schemas/User' }}}
 *      UserCreatedResponse:
 *          description: Пользователь успешно создан
 *          content: { application/json: { schema: { $ref: '#/components/schemas/User' }}}
 *      # Ссылки на общие ответы об ошибках (определены в другом месте, например swagger.ts)
 *      BadRequestError: { $ref: '#/components/responses/BadRequestError' }
 *      UnauthorizedError: { $ref: '#/components/responses/UnauthorizedError' }
 *      ServerError: { $ref: '#/components/responses/ServerError' }
 */

// --- POST /users (Create a new user) ---
/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Создание нового пользователя
 *     description: Создает нового пользователя в системе. **Требует JWT аутентификацию**.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInputRequired'
 *     responses:
 *       '201': { $ref: '#/components/responses/UserCreatedResponse' }
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password } = req.body as UserCreationBody;

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
      res.status(201).json(newUser);
    } catch (error) {
      // <-- 3. Здесь error может быть 'unknown', но проверки ниже уточняют тип
      // 4 & 5. Явная проверка типа ошибки Sequelize вместо 'any'
      if (error instanceof ValidationError) {
        // После проверки TypeScript знает, что error.errors существует и имеет тип ValidationErrorItem[]
        const validationErrors = error.errors.map((e) => ({
          // Тип 'e' выводится автоматически
          field: e.path,
          message: e.message,
        }));
        res.status(400).json({
          message: 'Ошибка валидации при создании пользователя',
          details: validationErrors,
        });
        return;
      }
      // Уточняем тип для получения message
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка сервера';
      res.status(500).json({
        message: 'Ошибка сервера при создании пользователя',
        details: message,
      });
    }
  },
);

// --- GET /users (Get all users) ---
/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Получение списка всех пользователей
 *     description: Возвращает список всех пользователей. **Требует JWT аутентификацию**.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200': { $ref: '#/components/responses/UserListResponse' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '500': { $ref: '#/components/responses/ServerError' }
 */
router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await User.findAll();
      res.status(200).json(users);
    } catch (error) {
      // <-- Здесь error может быть 'unknown'
      // Уточняем тип для получения message
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка сервера';
      res.status(500).json({
        message: 'Ошибка сервера при получении пользователей',
        details: message,
      });
    }
  },
);

export default router;
// --- END OF FILE routes/users.ts ---
