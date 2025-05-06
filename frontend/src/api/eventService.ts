// src/api/eventService.ts
import apiInstance from './axios';

// Тип для мероприятия (должен соответствовать IEvent из вашего EventsPage.tsx или EventModel бэкенда)
export interface IEvent {
  id: number; // На бэкенде ID - number
  title: string;
  description?: string | null;
  date?: string | null; // Бэкенд возвращает строку ISO, но может быть Date | null
  time?: string; // Этого поля нет на бэкенде, нужно будет адаптировать
  category: 'concert' | 'lecture' | 'exhibition';
  createdBy: number;
  createdAt?: string; // или Date
  updatedAt?: string; // или Date
  imageUrl?: string; // Этого поля нет на бэкенде, нужно будет адаптировать
}

const API_KEY = import.meta.env.VITE_API_KEY;

export const eventService = {
  getEvents: async (category?: 'concert' | 'lecture' | 'exhibition'): Promise<IEvent[]> => {
    try {
      const params: { apiKey: string; category?: string } = { apiKey: API_KEY };
      if (category) {
        params.category = category;
      }
      const response = await apiInstance.get<IEvent[]>('/events', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  getEventById: async (id: number): Promise<IEvent> => {
    try {
      const response = await apiInstance.get<IEvent>(`/events/${id}`, {
        params: { apiKey: API_KEY },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching event with id ${id}:`, error);
      throw error;
    }
  },

 
};