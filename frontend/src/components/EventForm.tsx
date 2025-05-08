// src/components/EventForm.tsx

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import type { ChangeEvent } from "react";

import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import type { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import FormHelperText from "@mui/material/FormHelperText";

export type EventCategory = "concert" | "lecture" | "exhibition";

// 1. Интерфейс данных формы - оставляем id опциональным для простоты initialData
export interface EventFormData {
  id?: number; // Опциональный ID
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  location: string;
  category: EventCategory;
}

// 2. Схема валидации yup
const eventFormValidationSchema = yup
  .object({
    // id не обязательно валидировать здесь, если он не приходит из формы напрямую
    // id: yup.number().optional(),
    title: yup.string().required("Название обязательно").min(3).max(100),
    description: yup.string().max(500).nullable().default(null),
    startDate: yup
      .date()
      .required("Дата начала обязательна")
      .typeError("Некорректная дата начала")
      .min(
        new Date(new Date().setHours(0, 0, 0, 0)),
        "Дата начала не может быть в прошлом"
      ),
    endDate: yup
      .date()
      .required("Дата окончания обязательна")
      .typeError("Некорректная дата окончания")
      .min(
        yup.ref("startDate"),
        "Дата окончания не может быть раньше даты начала"
      ),
    location: yup.string().required("Местоположение обязательно"),
    category: yup
      .string()
      .oneOf<EventCategory>(["concert", "lecture", "exhibition"])
      .required("Категория обязательна"),
  })
  .defined();

// Выводим тип из схемы для SubmitHandler (но для useForm используем наш интерфейс)
type InferredEventFormData = yup.InferType<typeof eventFormValidationSchema>;

interface EventFormProps {
  initialData?: Partial<EventFormData>; // initialData может быть частичным
  onSubmit: SubmitHandler<EventFormData>; // Используем наш интерфейс EventFormData
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false,
  submitButtonText = "Сохранить мероприятие",
}) => {
  const {
    control,
    handleSubmit,
    reset,
    setValue, // <--- Импортируем setValue
    formState: { errors, isDirty, isValid },
  } = useForm<EventFormData>({
    // <--- Используем наш EventFormData
    resolver: yupResolver(eventFormValidationSchema),
    defaultValues: {
      // defaultValues должны соответствовать EventFormData
      id: undefined,
      title: "",
      description: null,
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      location: "",
      category: "concert",
    },
    mode: "onChange",
  });

  // Эффект для УСТАНОВКИ ЗНАЧЕНИЙ полей при изменении initialData
  useEffect(() => {
    if (initialData) {
      // Устанавливаем значения для каждого поля отдельно с помощью setValue
      // Это может быть более устойчиво к несоответствиям типов, чем reset
      setValue("id", initialData.id);
      setValue("title", initialData.title || "");
      setValue(
        "description",
        initialData.description === undefined ? null : initialData.description
      );
      setValue(
        "startDate",
        initialData.startDate ? new Date(initialData.startDate) : new Date()
      );
      setValue(
        "endDate",
        initialData.endDate
          ? new Date(initialData.endDate)
          : new Date(new Date().setDate(new Date().getDate() + 1))
      );
      setValue("location", initialData.location || "");
      setValue(
        "category",
        initialData.category &&
          ["concert", "lecture", "exhibition"].includes(initialData.category)
          ? initialData.category
          : "concert" // Значение по умолчанию, если пришло некорректное
      );
      // Важно: возможно, понадобится вызвать reset({}) перед setValue,
      // если нужно полностью очистить предыдущее состояние перед установкой новых значений,
      // особенно если initialData меняется с "есть" на "нет".
      // reset(eventFormValidationSchema.getDefault()); // Можно раскомментировать, если нужно
    } else {
      // Если initialData нет (создание), сбрасываем к defaultValues
      reset({
        id: undefined,
        title: "",
        description: null,
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        location: "",
        category: "concert",
      });
    }
  }, [initialData, reset, setValue]); // Добавляем setValue в зависимости

  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return "";
    const adjustedDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );
    try {
      return adjustedDate.toISOString().substring(0, 16);
    } catch (e) {
      console.error("Ошибка форматирования даты:", date, e);
      return "";
    }
  };

  return (
    // handleSubmit теперь должен правильно принимать onSubmit типа SubmitHandler<EventFormData>
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Controller
        name="title"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Название мероприятия"
            error={!!errors.title}
            helperText={errors.title?.message}
            fullWidth
            margin="normal"
            required
            disabled={isSubmitting}
          />
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value ?? ""}
            label="Описание"
            multiline
            rows={4}
            error={!!errors.description}
            helperText={errors.description?.message}
            fullWidth
            margin="normal"
            disabled={isSubmitting}
          />
        )}
      />
      <Controller
        name="startDate"
        control={control}
        render={({ field: { onChange, value, ...restField } }) => (
          <TextField
            {...restField}
            label="Дата начала"
            type="datetime-local"
            value={formatDateForInput(value)}
            onChange={(e) => {
              onChange(e.target.value ? new Date(e.target.value) : null);
            }}
            error={!!errors.startDate}
            helperText={errors.startDate?.message}
            InputLabelProps={{ shrink: true }}
            fullWidth
            margin="normal"
            required
            disabled={isSubmitting}
          />
        )}
      />
      <Controller
        name="endDate"
        control={control}
        render={({ field: { onChange, value, ...restField } }) => (
          <TextField
            {...restField}
            label="Дата окончания"
            type="datetime-local"
            value={formatDateForInput(value)}
            onChange={(e) => {
              onChange(e.target.value ? new Date(e.target.value) : null);
            }}
            error={!!errors.endDate}
            helperText={errors.endDate?.message}
            InputLabelProps={{ shrink: true }}
            fullWidth
            margin="normal"
            required
            disabled={isSubmitting}
          />
        )}
      />
      <Controller
        name="location"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Местоположение"
            error={!!errors.location}
            helperText={errors.location?.message}
            fullWidth
            margin="normal"
            required
            disabled={isSubmitting}
          />
        )}
      />
      <Controller
        name="category"
        control={control}
        render={({ field }) => (
          <FormControl
            fullWidth
            margin="normal"
            error={!!errors.category}
            required
          >
            <InputLabel id="category-select-label">Категория</InputLabel>
            <Select
              {...field}
              labelId="category-select-label"
              label="Категория"
              disabled={isSubmitting}
            >
              <MenuItem value="concert">Концерт</MenuItem>
              <MenuItem value="lecture">Лекция</MenuItem>
              <MenuItem value="exhibition">Выставка</MenuItem>
            </Select>
            {errors.category && (
              <FormHelperText>{errors.category?.message}</FormHelperText>
            )}
          </FormControl>
        )}
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isSubmitting || !isDirty || !isValid}
        style={{ marginTop: "1rem" }}
      >
        {isSubmitting ? "Сохранение..." : submitButtonText}
      </Button>
    </form>
  );
};

export default EventForm;
