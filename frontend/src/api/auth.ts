import { apiClient } from "./client";
import { User } from "@/types";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<TokenResponse>("/api/auth/login", { email, password }).then((r) => r.data),

  register: (full_name: string, email: string, password: string) =>
    apiClient.post<User>("/api/auth/register", { full_name, email, password }).then((r) => r.data),

  me: () => apiClient.get<User>("/api/auth/me").then((r) => r.data),
};
