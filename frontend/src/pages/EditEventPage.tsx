import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { updateEvent } from "../features/events/eventsSlice";
import EventForm, { type EventFormData } from "../components/EventForm";
import { CircularProgress, Box } from "@mui/material";

const EditEventPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(true);

  const event = useAppSelector((state) =>
    state.events.items.find((e: any) => e.id === Number(eventId))
  );

  // Приводим event к EventFormData
  const initialData = event
    ? {
        id: event.id ?? null,
        title: event.title ?? "",
        description: event.description ?? null,
        startDate: event.date ? new Date(event.date) : new Date(),
        endDate: event.date ? new Date(event.date) : new Date(),
        location: String(event.category ?? ""),
        status: "upcoming" as const,
      }
    : undefined;

  useEffect(() => {
    if (!event && !isLoading) {
      navigate("/events");
    }
    setIsLoading(false);
  }, [event, isLoading, navigate]);

  const handleSubmit = async (data: EventFormData) => {
    await dispatch(updateEvent(data)).unwrap();
    navigate("/events");
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <EventForm
      initialData={initialData}
      onSubmit={handleSubmit}
      submitButtonText="Сохранить изменения"
    />
  );
};

export default EditEventPage;
