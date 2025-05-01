import passport from 'passport';
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions,
  VerifiedCallback,
} from 'passport-jwt';
// Предполагаем, что модель User экспортируется как именованный экспорт
import { User } from '@models/user.js'; // <-- Добавлено .js
import { UserJwtPayload } from '@routes/auth.js'; 

// Загрузка переменных окружения (убедитесь, что dotenv загружен в index.ts или здесь)
// import 'dotenv/config'; // Можно добавить, если этот файл может быть точкой входа, но лучше в index.ts

const jwtSecret = process.env.JWT_SECRET;

// Проверка наличия секрета JWT
if (!jwtSecret) {
  process.exit(1);
}

// Опции для JWT стратегии с явной типизацией
const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtSecret,
  // Можно добавить issuer и audience для дополнительной валидации, если они используются при создании токена
  // issuer: 'your-issuer.com',
  // audience: 'your-audience.com',
};

passport.use(
  // Создаем экземпляр JWT стратегии
  new JwtStrategy(
    opts,
    // Async верификационная функция
    async (jwtPayload: unknown, done: VerifiedCallback) => {
      // Типизируем done, jwtPayload пока any
      // TODO: Определить интерфейс для jwtPayload для лучшей типизации
      // interface JwtPayload {
      //   id: number; // или string, в зависимости от типа ID пользователя
      //   // другие поля из вашего токена...
      //   iat?: number;
      //   exp?: number;
      // }
     // Начало вызова passport.use
passport.use(
  // Создание нового экземпляра стратегии
  new JwtStrategy(
    // Первый аргумент: опции
    opts,
    // Второй аргумент: асинхронная функция верификации
    async (jwtPayload: UserJwtPayload, done: VerifiedCallback) => {
      try {
        const user = await User.findByPk(jwtPayload.id);
        if (user) {
          return done(null, user); // Пользователь найден
        } else {
          return done(null, false); // Пользователь не найден
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Auth] Ошибка при поиске пользователя по JWT:', error);
        return done(error, false); // Ошибка сервера
      }
    } // Конец функции верификации
  ) // Конец конструктора new JwtStrategy
); // Конец вызова passport.use
    }))
// Экспортируем сконфигурированный экземпляр passport
// Примечание: Обычно этот файл импортируют только для его side effects (выполнения passport.use),
// а сам объект passport импортируют напрямую из 'passport' в других файлах, где он нужен.
// Если вы ДЕЙСТВИТЕЛЬНО хотите экспортировать именно этот экземпляр, используйте:
// export default passport;

// Чаще всего экспорт не нужен, достаточно импортировать файл в index.ts для выполнения кода:
// import './config/passport.js';
// Поэтому строчку export default passport можно закомментировать или удалить, если она не используется.
