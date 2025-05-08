// src/features/events/eventsSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { eventService } from '../../api/eventService';
import type { IEvent as ApiEvent, EventCreationAttributes } from '../../api/eventService';
import type { RootState } from '../../app/store';

// --- Типы ---
export type CategoryType = 'concert' | 'lecture' | 'exhibition';

interface Participant {
    id: number;
    name: string;
    email: string;
}

export interface EventFormData {
  title: string;
  description?: string | null;
  date?: string | null;
  category: CategoryType;
}

// --- Состояние среза ---
export interface EventsState {
  items: ApiEvent[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  currentEvent: ApiEvent | null;
  isLoadingSingle: boolean;
  fetchSingleError: string | null;
  isSubmitting: boolean; // Используется для create/update/delete
  submitError: string | null;  // Используется для create/update/delete
  participantsModal: {
      isOpen: boolean;
      eventId: number | null;
      participants: Participant[];
      isLoading: boolean;
      error: string | null;
  };
  participationLoading: Record<number, boolean>;
}

// --- Начальное состояние ---
const initialState: EventsState = {
  items: [],
  isLoading: false,
  isError: false,
  errorMessage: null,
  currentEvent: null,
  isLoadingSingle: false,
  fetchSingleError: null,
  isSubmitting: false,
  submitError: null,
  participantsModal: {
      isOpen: false,
      eventId: null,
      participants: [],
      isLoading: false,
      error: null,
  },
  participationLoading: {},
};

// --- Асинхронные Thunks ---

export const fetchEvents = createAsyncThunk<ApiEvent[], CategoryType | undefined, { rejectValue: string }>(
  'events/fetchEvents',
  async (category, { rejectWithValue }) => {
    try {
      const data = await eventService.getEvents(category);
      return data.map(event => ({
        ...event,
        participantsCount: Number(event.participantsCount) || 0,
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Ошибка загрузки мероприятий';
      return rejectWithValue(message);
    }
  }
);

export const fetchEventById = createAsyncThunk<ApiEvent, number, { rejectValue: string }>(
  'events/fetchEventById',
  async (eventId, { rejectWithValue }) => {
    try {
      const data = await eventService.getEventById(eventId);
      return {
        ...data,
        participantsCount: Number(data.participantsCount) || 0,
      };
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Ошибка загрузки деталей мероприятия';
      return rejectWithValue(message);
    }
  }
);

export const createEvent = createAsyncThunk<ApiEvent, EventFormData, { rejectValue: string }>(
  'events/createEvent',
  async (eventData, { rejectWithValue }) => {
    try {
      const dataToSend: EventCreationAttributes = {
        title: eventData.title,
        description: eventData.description || undefined,
        date: eventData.date ? new Date(eventData.date) : undefined,
        category: eventData.category,
      };
      const newEvent = await eventService.createEvent(dataToSend);
      return newEvent;
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Ошибка создания мероприятия';
      return rejectWithValue(message);
    }
  }
);

export const updateEvent = createAsyncThunk<ApiEvent, { id: number; data: Partial<EventFormData> }, { rejectValue: string }>(
  'events/updateEvent',
  async ({ id, data }, { rejectWithValue }) => {
    try {
       const dataToSend: Partial<EventCreationAttributes> = {
         title: data.title,
         description: data.description,
         date: data.date ? new Date(data.date) : (data.date === null ? null : undefined),
         category: data.category,
       };
       const updatedEvent = await eventService.updateEvent(id, dataToSend);
       return updatedEvent;
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Ошибка обновления мероприятия';
      return rejectWithValue(message);
    }
  }
);

// --- ВОТ ОН: Thunk для удаления ---
export const deleteEvent = createAsyncThunk<
  { eventId: number }, // Возвращаем ID при успехе
  number,           // Принимаем ID для удаления
  { rejectValue: string }
>(
  'events/deleteEvent',
  async (eventId, { rejectWithValue }) => {
    try {
      await eventService.deleteEvent(eventId); // Вызываем сервис
      return { eventId }; // Возвращаем ID для редьюсера
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Ошибка удаления мероприятия';
      return rejectWithValue(message);
    }
  }
);

// Thunks для участия (остаются без изменений)
export const participateInEvent = createAsyncThunk<{ eventId: number }, number, { rejectValue: string }>( 'events/participateInEvent', async (eventId, { rejectWithValue }) => { /* ... */ try { await eventService.participateInEvent(eventId); return { eventId }; } catch (error: any) { const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Ошибка регистрации на мероприятие'; return rejectWithValue(message); } } );
export const cancelParticipation = createAsyncThunk<{ eventId: number }, number, { rejectValue: string }>( 'events/cancelParticipation', async (eventId, { rejectWithValue }) => { /* ... */ try { await eventService.cancelParticipation(eventId); return { eventId }; } catch (error: any) { const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Ошибка отмены участия'; return rejectWithValue(message); } } );
export const fetchParticipants = createAsyncThunk<{ eventId: number; participants: Participant[] }, number, { rejectValue: string }>( 'events/fetchParticipants', async (eventId, { rejectWithValue }) => { /* ... */ try { const participants = await eventService.getEventParticipants(eventId); return { eventId, participants }; } catch (error: any) { const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Ошибка загрузки участников'; return rejectWithValue(message); } } );


// --- Создание среза ---
const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearEventsError: (state) => { state.isError = false; state.errorMessage = null; },
    clearEventsSubmitError: (state) => { state.isSubmitting = false; state.submitError = null; },
    clearCurrentEvent: (state) => { state.currentEvent = null; state.isLoadingSingle = false; state.fetchSingleError = null; },
    openParticipantsModal: (state, action: PayloadAction<number>) => { state.participantsModal.isOpen = true; state.participantsModal.eventId = action.payload; state.participantsModal.participants = []; state.participantsModal.isLoading = true; state.participantsModal.error = null; },
    closeParticipantsModal: (state) => { state.participantsModal.isOpen = false; state.participantsModal.eventId = null; state.participantsModal.participants = []; state.participantsModal.isLoading = false; state.participantsModal.error = null; },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Events
      .addCase(fetchEvents.pending, (state) => { state.isLoading = true; state.isError = false; state.errorMessage = null; })
      .addCase(fetchEvents.fulfilled, (state, action: PayloadAction<ApiEvent[]>) => { state.isLoading = false; state.items = action.payload; })
      .addCase(fetchEvents.rejected, (state, action) => { state.isLoading = false; state.isError = true; state.errorMessage = action.payload ?? 'Неизвестная ошибка'; state.items = []; })
      // Fetch Event By ID
      .addCase(fetchEventById.pending, (state) => { state.isLoadingSingle = true; state.currentEvent = null; state.fetchSingleError = null; })
      .addCase(fetchEventById.fulfilled, (state, action: PayloadAction<ApiEvent>) => { state.isLoadingSingle = false; state.currentEvent = action.payload; const i = state.items.findIndex(e => e.id === action.payload.id); if (i !== -1) state.items[i] = action.payload; })
      .addCase(fetchEventById.rejected, (state, action) => { state.isLoadingSingle = false; state.fetchSingleError = action.payload ?? 'Неизвестная ошибка'; })
      // Create Event
      .addCase(createEvent.pending, (state) => { state.isSubmitting = true; state.submitError = null; })
      .addCase(createEvent.fulfilled, (state, action: PayloadAction<ApiEvent>) => { state.isSubmitting = false; state.items.push(action.payload); })
      .addCase(createEvent.rejected, (state, action) => { state.isSubmitting = false; state.submitError = action.payload as string; })
      // Update Event
      .addCase(updateEvent.pending, (state) => { state.isSubmitting = true; state.submitError = null; })
      .addCase(updateEvent.fulfilled, (state, action: PayloadAction<ApiEvent>) => { state.isSubmitting = false; state.currentEvent = action.payload; const index = state.items.findIndex(event => event.id === action.payload.id); if (index !== -1) { state.items[index] = action.payload; } })
      .addCase(updateEvent.rejected, (state, action) => { state.isSubmitting = false; state.submitError = action.payload as string; })

      // --- ВОТ ОНИ: Обработчики для deleteEvent ---
      .addCase(deleteEvent.pending, (state, action) => {
        state.isSubmitting = true; // Используем тот же флаг, что и для C/U
        state.submitError = null;
        // Можно добавить ID удаляемого элемента в состояние, если нужно показать лоадер на конкретной кнопке
        // state.deletingEventId = action.meta.arg;
      })
      .addCase(deleteEvent.fulfilled, (state, action: PayloadAction<{ eventId: number }>) => {
        state.isSubmitting = false;
        // Удаляем событие из списка items
        state.items = state.items.filter(event => event.id !== action.payload.eventId);
        // Если удаляли текущее открытое событие, очищаем его
        if (state.currentEvent?.id === action.payload.eventId) {
            state.currentEvent = null;
        }
        // state.deletingEventId = null; // Сбрасываем ID
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload as string; // Используем ту же ошибку
        // state.deletingEventId = null; // Сбрасываем ID
      })

      // Participate In Event
      .addCase(participateInEvent.pending, (state, action) => { state.participationLoading[action.meta.arg] = true; state.isError = false; state.errorMessage = null; })
      .addCase(participateInEvent.fulfilled, (state, action: PayloadAction<{ eventId: number }>) => { state.participationLoading[action.payload.eventId] = false; const i = state.items.findIndex(e => e.id === action.payload.eventId); if (i !== -1) { state.items[i].isCurrentUserParticipating = true; state.items[i].participantsCount += 1; } })
      .addCase(participateInEvent.rejected, (state, action) => { state.participationLoading[action.meta.arg] = false; state.isError = true; state.errorMessage = action.payload ?? 'Неизвестная ошибка'; })
      // Cancel Participation
      .addCase(cancelParticipation.pending, (state, action) => { state.participationLoading[action.meta.arg] = true; state.isError = false; state.errorMessage = null; })
      .addCase(cancelParticipation.fulfilled, (state, action: PayloadAction<{ eventId: number }>) => { state.participationLoading[action.payload.eventId] = false; const i = state.items.findIndex(e => e.id === action.payload.eventId); if (i !== -1) { state.items[i].isCurrentUserParticipating = false; state.items[i].participantsCount = Math.max(0, state.items[i].participantsCount - 1); } })
      .addCase(cancelParticipation.rejected, (state, action) => { state.participationLoading[action.meta.arg] = false; state.isError = true; state.errorMessage = action.payload ?? 'Неизвестная ошибка'; })
      // Fetch Participants
      .addCase(fetchParticipants.pending, (state) => { if (state.participantsModal.isOpen) { state.participantsModal.isLoading = true; state.participantsModal.error = null; } })
      .addCase(fetchParticipants.fulfilled, (state, action: PayloadAction<{ eventId: number; participants: Participant[] }>) => { if (state.participantsModal.isOpen && state.participantsModal.eventId === action.payload.eventId) { state.participantsModal.isLoading = false; state.participantsModal.participants = action.payload.participants; } })
      .addCase(fetchParticipants.rejected, (state, action) => { if (state.participantsModal.isOpen && state.participantsModal.eventId === action.meta.arg) { state.participantsModal.isLoading = false; state.participantsModal.error = action.payload ?? 'Неизвестная ошибка'; } });
  },
});

// --- Экспорт ---

export const {
  clearEventsError,
  openParticipantsModal,
  closeParticipantsModal,
  clearEventsSubmitError,
  clearCurrentEvent,
} = eventsSlice.actions;

// Селекторы
export const selectAllEvents = (state: RootState) => state.events.items;
export const selectEventsIsLoading = (state: RootState) => state.events.isLoading;
export const selectEventsError = (state: RootState) => state.events.errorMessage;
export const selectParticipationLoading = (state: RootState) => state.events.participationLoading;
export const selectParticipantsModalState = (state: RootState) => state.events.participantsModal;
export const selectCurrentEventDetails = (state: RootState) => state.events.currentEvent;
export const selectEventsSingleLoading = (state: RootState) => state.events.isLoadingSingle;
export const selectEventsFetchSingleError = (state: RootState) => state.events.fetchSingleError;
export const selectEventsSubmitting = (state: RootState) => state.events.isSubmitting;
export const selectEventsSubmitError = (state: RootState) => state.events.submitError;

// Редьюсер
export default eventsSlice.reducer;