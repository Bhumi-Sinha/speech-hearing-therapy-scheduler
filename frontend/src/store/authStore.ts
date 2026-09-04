import { create } from "zustand";
import { authApi } from "@/api/auth";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, getApiErrorMessage } from "@/api/client";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  error: string | null;

  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticating: false,
  error: null,

  bootstrap: async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, isLoading: false });
    } catch {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      set({ user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isAuthenticating: true, error: null });
    try {
      const tokens = await authApi.login(email, password);
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
      const user = await authApi.me();
      set({ user, isAuthenticating: false });
    } catch (err) {
      set({ isAuthenticating: false, error: getApiErrorMessage(err) });
      throw err;
    }
  },

  register: async (fullName, email, password) => {
    set({ isAuthenticating: true, error: null });
    try {
      await authApi.register(fullName, email, password);
      const tokens = await authApi.login(email, password);
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
      const user = await authApi.me();
      set({ user, isAuthenticating: false });
    } catch (err) {
      set({ isAuthenticating: false, error: getApiErrorMessage(err) });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
