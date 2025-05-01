// src/@types/express/index.d.ts
import { UserJwtPayload } from '../../backend'; // <-- УКАЖИТЕ ПРАВИЛЬНЫЙ ПУТЬ к вашему интерфейсу

declare global {
  namespace Express {
    // Расширяем интерфейс Request
    export interface Request {
      // Добавляем наше свойство user с нужным типом
      // Делаем его опциональным (?), так как не все запросы будут иметь req.user
      user?: UserJwtPayload;
    }
  }
}

// Добавьте эту строку, чтобы файл считался модулем (важно!)
export {};