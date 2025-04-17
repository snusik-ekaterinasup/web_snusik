const express = require("express");
const router = express.Router();
const User = require("../models/user");
const RefreshToken = require("../models/refreshToken");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Middleware для проверки refresh token
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token не предоставлен' });
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const tokenInDb = await RefreshToken.findOne({
      where: {
        token: refreshToken,
        userId: payload.id
      }
    });

    if (!tokenInDb) {
      return res.status(401).json({ message: 'Refresh token не найден' });
    }

    if (new Date() > tokenInDb.expiresAt) {
      await tokenInDb.destroy();
      return res.status(401).json({ message: 'Refresh token истек' });
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Недействительный refresh token' });
    }
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Аутентификация и авторизация
 * 
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT токен для доступа
 *         refreshToken:
 *           type: string
 *           description: Токен для обновления access token
 *         user:
 *           $ref: '#/components/schemas/User'
 *     RefreshResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           description: Новый JWT токен для доступа
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Регистрация пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Иван Иванов"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "securePassword123"
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
 *       400:
 *         description: Ошибка валидации (не все поля или email уже используется)
 *       500:
 *         description: Ошибка сервера
 */
router.post('/register', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Все поля обязательны' });
      }
  
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email уже используется' });
      }
  
      // Пароль автоматически хешируется благодаря setter в модели
      const user = await User.create({ 
        name, 
        email, 
        password // передаем plain text пароль, модель сама его захеширует
      });
  
      res.status(201).json({ 
        message: 'Пользователь зарегистрирован',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      res.status(500).json({ 
        message: 'Ошибка сервера',
        error: error.message 
      });
    }
  });

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вход в систему
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "securePassword123"
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Неверные учетные данные
 *       500:
 *         description: Ошибка сервера
 */
router.post('/login', async (req, res) => {
  try {
    console.log('Получен запрос на вход:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Отсутствует email или пароль');
      return res.status(400).json({ 
        message: 'Требуется email и пароль',
        receivedData: req.body 
      });
    }

    console.log('Поиск пользователя с email:', email);
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('Пользователь не найден');
      return res.status(401).json({ 
        message: 'Неверные учетные данные',
        debug: `Пользователь с email ${email} не найден`
      });
    }

    console.log('Проверка пароля для пользователя:', user.id);
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('Пароль не совпадает');
      return res.status(401).json({ 
        message: 'Неверные учетные данные',
        debug: 'Неверный пароль'
      });
    }

    console.log('Генерация токенов для пользователя:', user.id);
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );

    console.log('Сохранение refresh token в БД');
    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    console.log('Успешный вход, возвращаем токены');
    res.json({
      accessToken: `Bearer ${accessToken}`,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('ОШИБКА ВХОДА:', {
      message: error.message,
      stack: error.stack,
      fullError: JSON.stringify(error)
    });
    res.status(500).json({ 
      message: 'Ошибка сервера',
      debug: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// /**
//  * @swagger
//  * /auth/refresh:
//  *   post:
//  *     tags: [Auth]
//  *     summary: Обновление access token
//  *     description: Получение нового access token по refresh token
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - refreshToken
//  *             properties:
//  *               refreshToken:
//  *                 type: string
//  *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
//  *     responses:
//  *       200:
//  *         description: Новый access token
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/RefreshResponse'
//  *       401:
//  *         description: Недействительный или просроченный refresh token
//  *       500:
//  *         description: Ошибка сервера
//  */
// router.post('/refresh', verifyRefreshToken, async (req, res) => {
//   try {
//     const user = await User.findByPk(req.user.id);
//     if (!user) {
//       return res.status(401).json({ message: 'Пользователь не найден' });
//     }

//     const newAccessToken = jwt.sign(
//       { id: user.id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
//     );

//     res.json({ accessToken: `Bearer ${newAccessToken}` });
//   } catch (error) {
//     res.status(500).json({ message: 'Ошибка сервера' });
//   }
// });



module.exports = router;