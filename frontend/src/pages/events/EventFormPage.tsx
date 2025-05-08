// import { useParams, useNavigate } from 'react-router-dom';
// import { useAppSelector, useAppDispatch } from '../../app/hooks';
// import { useEffect } from 'react';
// import EventForm, { type EventFormData } from '../../components/EventForm';
// import { fetchEventById, createEvent, updateEvent } from '../../features/events/eventsSlice';

// const EventFormPage = () => {
//   const { id } = useParams<{ id?: string }>();
//   const dispatch = useAppDispatch();
//   const navigate = useNavigate();
//   const eventToEdit = useAppSelector((state) => state.events.currentEvent);

//   useEffect(() => {
//     if (id) {
//       const eventId = Number(id);
//       if (!isNaN(eventId)) {
//         dispatch(fetchEventById(eventId));
//       }
//     }
//   }, [id, dispatch]);

//   // Преобразуем eventToEdit к initialData для формы (или undefined для создания)
//   const initialData: EventFormData | undefined = eventToEdit
//     ? {
//         id: eventToEdit.id,
//         title: eventToEdit.title,
//         description: eventToEdit.description ?? null,
//         startDate: eventToEdit.date ? new Date(eventToEdit.date) : new Date(),
//         endDate: eventToEdit.date ? new Date(eventToEdit.date) : new Date(),
//         location: String(eventToEdit.category ?? ''),
//         category: 'concert', // или подберите нужное поле
//       }
//     : undefined;

//   const handleSubmit = async (data: EventFormData) => {
//     if (id) {
//       await dispatch(updateEvent(data)).unwrap();
//     } else {
//       await dispatch(createEvent(data)).unwrap();
//     }
//     navigate('/events');
//   };

//   return (
//     <div>
//       <h1>{id ? 'Редактирование мероприятия' : 'Создание мероприятия'}</h1>
//       <EventForm
//         initialData={initialData}
//         onSubmit={handleSubmit}
//         submitButtonText={id ? 'Сохранить изменения' : 'Создать мероприятие'}
//       />
//     </div>
//   );
// };

// export default EventFormPage;
