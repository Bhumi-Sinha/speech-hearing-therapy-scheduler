import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarClock,
  Users,
  Stethoscope,
  DoorOpen,
  UserCircle2,
  PlusCircle,
  UserPlus,
} from "lucide-react";
import { dashboardApi } from "@/api/dashboard";
import { useAuthStore } from "@/store/authStore";
import { Card, LoadingState, ErrorBanner } from "@/components/ui";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardApi.summary,
  });

  if (isLoading) return <LoadingState message="Loading dashboard..." />;

  const stats = [
    { label: "Appointments today", value: data?.appointments_today, icon: CalendarDays },
    { label: "This week", value: data?.appointments_this_week, icon: CalendarClock },
    { label: "Active patients", value: data?.active_patients, icon: Users },
    { label: "Active therapists", value: data?.active_therapists, icon: Stethoscope },
    { label: "Rooms in use", value: data?.active_rooms, icon: DoorOpen },
    { label: "Total patients", value: data?.total_patients, icon: UserCircle2 },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Hello, {user?.full_name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-slate-500">Here's what's happening at the clinic today.</p>
      </div>

      {isError ? <ErrorBanner message="Could not load dashboard data." /> : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-harbor-50 text-harbor-600">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-ink">{value ?? "—"}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-lg font-semibold text-ink">Quick actions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickAction
          label="New appointment"
          description="Book a therapy session"
          icon={PlusCircle}
          onClick={() => navigate("/appointments/new")}
        />
        <QuickAction
          label="Add patient"
          description="Register a new patient"
          icon={UserPlus}
          onClick={() => navigate("/patients/new")}
        />
        <QuickAction
          label="View calendar"
          description="See the full schedule"
          icon={CalendarDays}
          onClick={() => navigate("/calendar")}
        />
      </div>
    </div>
  );
}

function QuickAction({
  label,
  description,
  icon: Icon,
  onClick,
}: {
  label: string;
  description: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition-colors hover:border-harbor-300 hover:bg-harbor-50/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-harbor-50 text-harbor-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </button>
  );
}
