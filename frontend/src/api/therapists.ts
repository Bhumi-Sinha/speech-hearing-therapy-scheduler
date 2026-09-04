import { apiClient } from "./client";
import { Therapist, AvailabilitySlot } from "@/types";

export interface TherapistInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  specialization: string;
  availability_slots: AvailabilitySlot[];
}

export const therapistsApi = {
  list: (activeOnly = false) =>
    apiClient
      .get<Therapist[]>("/api/therapists", { params: { active_only: activeOnly } })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<Therapist>(`/api/therapists/${id}`).then((r) => r.data),

  create: (data: TherapistInput) => apiClient.post<Therapist>("/api/therapists", data).then((r) => r.data),

  update: (id: string, data: Partial<TherapistInput> & { is_active?: boolean }) =>
    apiClient.patch<Therapist>(`/api/therapists/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/api/therapists/${id}`),
};
