const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const router = express.Router();
const Event = require("../models/event");
const User = require("../models/user");
const { Op } = require("sequelize");

const checkApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) return res.status(401).json({ message: "API-ключ не предоставлен" });
  if (apiKey !== process.env.API_KEY) return res.status(403).json({ message: "Неверный API-ключ" });
  next();
};

router.use(checkApiKey);

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - date
 *         - createdBy
 *         - category
 *       properties:
 *         id:
 *           type: integer
 *           readOnly: true
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         description:
 *           type: string
 *           maxLength: 500
 *         date:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: integer
 *         category:
 *           type: string
 *           enum: [конференция, семинар, вебинар, выставка]
 *         createdAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 * tags:
 *   - name: Events
 *     description: Управление мероприятиями
 */

/**
 * @swagger
 * /events:
 *   get:
 *     tags: [Events]
 *     summary: Список мероприятий с фильтрацией
 *     description: Возвращает отфильтрованный список мероприятий
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [конференция, семинар, вебинар, выставка]
 *         description: Фильтр по категории
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - ApiKeyAuth: []
 */
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? { category: { [Op.eq]: category } } : {};
    const events = await Event.findAll({ where });
    res.status(200).json(events);
  } catch (error) {
    console.error("Ошибка при получении мероприятий:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Получить мероприятие по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         content:
 *           application/json:
 *             example:
 *               message: "Мероприятие не найдено"
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - ApiKeyAuth: []
 */
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    event ? res.status(200).json(event) : res.status(404).json({ message: "Мероприятие не найдено" });
  } catch (error) {
    console.error("Ошибка при получении мероприятия:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

/**
 * @swagger
 * /events:
 *   post:
 *     tags: [Events]
 *     summary: Создать новое мероприятие
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Новая конференция"
 *               description:
 *                 type: string
 *                 example: "Описание конференции"
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-03-20T14:00:00Z"
 *               createdBy:
 *                 type: integer
 *                 example: 1
 *               category:
 *                 type: string
 *                 example: "конференция"
 *             required:
 *               - title
 *               - date
 *               - createdBy
 *               - category
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         content:
 *           application/json:
 *             example:
 *               message: "Пользователь с указанным ID не существует"
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - ApiKeyAuth: []
 */
router.post("/", async (req, res) => {
  try {
    const { createdBy } = req.body;
    const user = await User.findByPk(createdBy);
    if (!user) return res.status(404).json({ message: "Пользователь с указанным ID не существует" });
    
    const newEvent = await Event.create(req.body);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error("Ошибка при создании мероприятия:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     tags: [Events]
 *     summary: Обновить мероприятие
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         content:
 *           application/json:
 *             example:
 *               message: "Мероприятие не найдено"
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - ApiKeyAuth: []
 */
router.put("/:id", async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Мероприятие не найдено" });
    
    await event.update(req.body);
    res.status(200).json(event);
  } catch (error) {
    console.error("Ошибка при обновлении мероприятия:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Удалить мероприятие
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       204:
 *         description: Мероприятие удалено
 *       404:
 *         content:
 *           application/json:
 *             example:
 *               message: "Мероприятие не найдено"
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - ApiKeyAuth: []
 */
router.delete("/:id", async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Мероприятие не найдено" });
    
    await event.destroy();
    res.status(204).end();
  } catch (error) {
    console.error("Ошибка при удалении мероприятия:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

module.exports = router;