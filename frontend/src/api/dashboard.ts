import { apiClient } from "./client";
import { DashboardSummary } from "@/types";

export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummary>("/api/dashboard/summary").then((r) => r.data),
};
