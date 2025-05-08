// src/api/eventService.ts
import apiInstance from './axios';

// --- Типы ---

/**
 * Основной тип для данных мероприятия, получаемых от API.
 * Включает поля, возвращаемые бэкендом, в том числе для участия.
 */
export interface IEvent {
  id: number;
  title: string;
  description?: string | null;
  date?: string | null; // API обычно возвращает дату как строку ISO 8601
  category: 'concert' | 'lecture' | 'exhibition';
  createdBy: number; // ID создателя
  createdAt?: string;
  updatedAt?: string;
  participantsCount: number; // Добавлено на бэкенде
  isCurrentUserParticipating: boolean; // Добавлено на бэкенде
  // Опционально: данные создателя, если бэкенд их присоединяет
  creator?: {
      id: number;
      name: string;
  };
  // Опционально: Поля, используемые только на фронтенде (нужно будет добавлять вручную)
  imageUrl?: string;
  time?: string;
}

/**
 * Тип данных, передаваемых на бэкенд при СОЗДАНИИ мероприятия.
 */
export interface EventCreationAttributes {
  title: string;
  description?: string | null | undefined;
  date?: Date | string | null | undefined; // Может быть Date или строка перед отправкой
  category: 'concert' | 'lecture' | 'exhibition';
  // createdBy не передается, определяется на бэкенде по JWT
}

/**
 * Тип данных, передаваемых на бэкенд при ОБНОВЛЕНИИ мероприятия.
 */
type EventUpdateAttributes = Partial<Omit<EventCreationAttributes, 'category'>> & { category?: 'concert' | 'lecture' | 'exhibition' };

/**
 * Тип ответа API при успешной регистрации/отмене участия.
 */
interface ParticipationResponse {
    message: string;
}

/**
 * Тип для участника мероприятия (возвращается эндпоинтом /participants).
 */
interface Participant {
    id: number;
    name: string;
    email: string;
}

// --- Получение API Key ---
const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
    console.error("CRITICAL ERROR: VITE_API_KEY is not defined in your .env file! Event requests might fail or require authentication.");
}

/**
 * Сервис для взаимодействия с API мероприятий.
 */
export const eventService = {

  /**
   * Получить список мероприятий.
   * @param category - Опциональная категория для фильтрации.
   * @returns Промис с массивом мероприятий.
   */
  getEvents: async (category?: 'concert' | 'lecture' | 'exhibition'): Promise<IEvent[]> => {
    try {
      const params: { apiKey: string; category?: string } = { apiKey: API_KEY };
      if (category) {
        params.category = category;
      }
      const response = await apiInstance.get<IEvent[]>('/events', { params });
      // Приводим participantsCount к числу
      return response.data.map(event => ({
          ...event,
          participantsCount: Number(event.participantsCount) || 0,
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  /**
   * Получить одно мероприятие по ID.
   * @param id - ID мероприятия.
   * @returns Промис с объектом мероприятия.
   */
  getEventById: async (id: number): Promise<IEvent> => {
    try {
      const response = await apiInstance.get<IEvent>(`/events/${id}`, {
        params: { apiKey: API_KEY },
      });
       // Приводим participantsCount к числу
       return {
           ...response.data,
           participantsCount: Number(response.data.participantsCount) || 0,
       };
    } catch (error) {
      console.error(`Error fetching event with id ${id}:`, error);
      throw error;
    }
  },

  /**
   * Создает новое мероприятие.
   * Требует JWT токен (добавляется автоматически).
   * @param eventData - Данные для создания события.
   * @returns Промис с созданным мероприятием.
   */
  createEvent: async (eventData: EventCreationAttributes): Promise<IEvent> => {
    try {
      const response = await apiInstance.post<IEvent>('/events', eventData, {
        params: { apiKey: API_KEY }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  /**
   * Обновляет существующее мероприятие.
   * Требует JWT токен (добавляется автоматически).
   * @param eventId - ID мероприятия для обновления.
   * @param eventData - Частичные данные для обновления.
   * @returns Промис с обновленным мероприятием.
   */
  updateEvent: async (eventId: number, eventData: EventUpdateAttributes): Promise<IEvent> => {
    try {
      const response = await apiInstance.put<IEvent>(`/events/${eventId}`, eventData, {
        params: { apiKey: API_KEY }
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating event ${eventId}:`, error);
      throw error;
    }
  },

  /**
   * Удаляет мероприятие по ID.
   * Требует JWT токен (добавляется автоматически).
   * @param eventId - ID мероприятия для удаления.
   * @returns Промис void при успехе (статус 204).
   */
  deleteEvent: async (eventId: number): Promise<void> => {
    try {
      await apiInstance.delete(`/events/${eventId}`, {
        params: { apiKey: API_KEY } // Передаем API Key
      });
      // Успешный DELETE обычно возвращает 204 No Content
    } catch (error) {
      console.error(`Error deleting event ${eventId}:`, error);
      throw error;
    }
  },

  /**
   * Зарегистрироваться на мероприятие.
   * Требует JWT токен (добавляется автоматически).
   * @param eventId - ID мероприятия.
   * @returns Промис с сообщением об успехе.
   */
  participateInEvent: async (eventId: number): Promise<ParticipationResponse> => {
    try {
      const response = await apiInstance.post<ParticipationResponse>(
        `/events/${eventId}/participate`,
        {},
        { params: { apiKey: API_KEY } }
      );
      return response.data;
    } catch (error) {
       console.error(`Error participating in event ${eventId}:`, error);
       throw error;
    }
  },

  /**
   * Отменить участие в мероприятии.
   * Требует JWT токен (добавляется автоматически).
   * @param eventId - ID мероприятия.
   * @returns Промис void при успехе.
   */
  cancelParticipation: async (eventId: number): Promise<void> => {
    try {
      await apiInstance.delete(
        `/events/${eventId}/participate`,
        { params: { apiKey: API_KEY } }
      );
    } catch (error) {
       console.error(`Error cancelling participation in event ${eventId}:`, error);
       throw error;
    }
  },

  /**
   * Получить список участников мероприятия.
   * Требует JWT токен (добавляется автоматически).
   * @param eventId - ID мероприятия.
   * @returns Промис с массивом участников.
   */
  getEventParticipants: async (eventId: number): Promise<Participant[]> => {
     try {
        const response = await apiInstance.get<Participant[]>(
            `/events/${eventId}/participants`,
            { params: { apiKey: API_KEY } }
        );
        return response.data;
     } catch (error) {
        console.error(`Error fetching participants for event ${eventId}:`, error);
        throw error;
     }
  },

};