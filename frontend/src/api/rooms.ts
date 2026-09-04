import { apiClient } from "./client";
import { Room } from "@/types";

export interface RoomInput {
  name: string;
  equipment?: string | null;
}

export const roomsApi = {
  list: (activeOnly = false) =>
    apiClient.get<Room[]>("/api/rooms", { params: { active_only: activeOnly } }).then((r) => r.data),

  get: (id: string) => apiClient.get<Room>(`/api/rooms/${id}`).then((r) => r.data),

  create: (data: RoomInput) => apiClient.post<Room>("/api/rooms", data).then((r) => r.data),

  update: (id: string, data: Partial<RoomInput> & { is_active?: boolean }) =>
    apiClient.patch<Room>(`/api/rooms/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/api/rooms/${id}`),
};
