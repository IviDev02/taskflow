import { z } from "zod";
import { LABELS, PRIORITIES, STATUSES } from "./models.js";

// Campos editables de una tarea, compartidos por la creación y la edición
export const taskFields = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(140),
  description: z.string().trim().max(2000),
  assignee: z.string().nullable(),
  priority: z.enum(PRIORITIES, "Prioridad no válida"),
  labels: z
    .array(z.enum(LABELS, "Etiqueta no válida"))
    .max(LABELS.length)
    .transform((ls) => [...new Set(ls)]),
  dueDate: z.iso.date("Fecha no válida (AAAA-MM-DD)").nullable(),
});

export const createTaskSchema = taskFields
  .partial()
  .required({ title: true })
  .extend({ status: z.enum(STATUSES).optional() });

export const updateTaskSchema = taskFields.partial();
