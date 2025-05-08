import React from "react";
import { useAppDispatch } from "../app/hooks";
import { createEvent } from "../features/events/eventsSlice";
import EventForm, { type EventFormData } from "../components/EventForm";
import { useNavigate } from "react-router-dom";

const CreateEventPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (data: EventFormData) => {
    await dispatch(createEvent(data)).unwrap();
    navigate("/events");
  };

  return (
    <EventForm onSubmit={handleSubmit} submitButtonText="Создать мероприятие" />
  );
};

export default CreateEventPage;
