const express = require("express");
const router = express.Router();
const User = require("../models/user");
const passport = require('passport');

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Создание нового пользователя
 *     description: Создает нового пользователя в системе
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 description: Имя пользователя
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email пользователя
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Необходимо указать имя и email"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка сервера"
 */
router.post("/", passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { name, email } = req.body;

    // Проверка наличия обязательных полей
    if (!name || !email) {
      return res
        .status(400)
        .json({ message: "Необходимо указать имя и email" });
    }

    // Проверка уникальности email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email уже используется" });
    }

    // Создание пользователя
    const newUser = await User.create({
      name,
      email,
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Ошибка при создании пользователя:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Получение списка всех пользователей
 *     description: Возвращает список всех пользователей из базы данных
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка сервера"
 */
router.get("/", async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json(users);
  } catch (error) {
    console.error("Ошибка при получении списка пользователей:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

module.exports = router;
