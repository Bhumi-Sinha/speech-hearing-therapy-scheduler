import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useAuthStore } from "@/store/authStore";
import { AppShell } from "@/components/AppShell";
import { LoadingState } from "@/components/ui";

import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { PatientsListPage } from "@/pages/PatientsListPage";
import { PatientFormPage } from "@/pages/PatientFormPage";
import { TherapistsListPage } from "@/pages/TherapistsListPage";
import { TherapistFormPage } from "@/pages/TherapistFormPage";
import { RoomsListPage } from "@/pages/RoomsListPage";
import { RoomFormPage } from "@/pages/RoomFormPage";
import { NewAppointmentPage } from "@/pages/NewAppointmentPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (isLoading) return <LoadingState message="Starting up..." />;

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/patients" element={<PatientsListPage />} />
            <Route path="/patients/new" element={<PatientFormPage />} />
            <Route path="/patients/:id" element={<PatientFormPage />} />
            <Route path="/therapists" element={<TherapistsListPage />} />
            <Route path="/therapists/new" element={<TherapistFormPage />} />
            <Route path="/therapists/:id" element={<TherapistFormPage />} />
            <Route path="/rooms" element={<RoomsListPage />} />
            <Route path="/rooms/new" element={<RoomFormPage />} />
            <Route path="/rooms/:id" element={<RoomFormPage />} />
            <Route path="/appointments/new" element={<NewAppointmentPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
