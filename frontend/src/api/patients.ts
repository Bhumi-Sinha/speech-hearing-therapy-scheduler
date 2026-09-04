import { apiClient } from "./client";
import { Patient } from "@/types";

export interface PatientInput {
  full_name: string;
  age?: number | null;
  phone?: string | null;
  email?: string | null;
  condition_type: string;
  notes?: string | null;
}

export const patientsApi = {
  list: (search?: string) =>
    apiClient.get<Patient[]>("/api/patients", { params: { search } }).then((r) => r.data),

  get: (id: string) => apiClient.get<Patient>(`/api/patients/${id}`).then((r) => r.data),

  create: (data: PatientInput) => apiClient.post<Patient>("/api/patients", data).then((r) => r.data),

  update: (id: string, data: Partial<PatientInput> & { is_active?: string }) =>
    apiClient.patch<Patient>(`/api/patients/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/api/patients/${id}`),
};
