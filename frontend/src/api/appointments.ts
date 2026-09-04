import { apiClient } from "./client";
import { Appointment, AvailableSlot, AppointmentStatus } from "@/types";

export interface AppointmentInput {
  patient_id: string;
  therapist_id: string;
  room_id: string;
  start_time: string; // ISO
  end_time: string; // ISO
  notes?: string | null;
}

export interface AppointmentFilters {
  date_from?: string;
  date_to?: string;
  therapist_id?: string;
  room_id?: string;
  patient_id?: string;
  status?: AppointmentStatus;
}

export const appointmentsApi = {
  list: (filters: AppointmentFilters = {}) =>
    apiClient.get<Appointment[]>("/api/appointments", { params: filters }).then((r) => r.data),

  get: (id: string) => apiClient.get<Appointment>(`/api/appointments/${id}`).then((r) => r.data),

  create: (data: AppointmentInput) =>
    apiClient.post<Appointment>("/api/appointments", data).then((r) => r.data),

  update: (id: string, data: Partial<AppointmentInput> & { status?: AppointmentStatus }) =>
    apiClient.patch<Appointment>(`/api/appointments/${id}`, data).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.patch<Appointment>(`/api/appointments/${id}`, { status: "cancelled" }).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/api/appointments/${id}`),

  findAvailableSlots: (params: {
    date: string;
    duration_minutes: number;
    therapist_id?: string;
    room_id?: string;
  }) => apiClient.get<AvailableSlot[]>("/api/appointments/available-slots", { params }).then((r) => r.data),
};
