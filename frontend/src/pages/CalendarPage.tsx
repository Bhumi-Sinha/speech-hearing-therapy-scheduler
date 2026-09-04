import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  format,
  addDays,
  addWeeks,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock, User2, Stethoscope, DoorOpen, X } from "lucide-react";
import { appointmentsApi } from "@/api/appointments";
import { Appointment } from "@/types";
import { Card, LoadingState, EmptyState, Badge } from "@/components/ui";
import { Button } from "@/components/Button";

type CalendarView = "day" | "week";

export function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("day");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Range covered by the current view: a single day, or the Mon-Sun week
  // containing selectedDate.
  const rangeStart = view === "day" ? startOfDay(selectedDate) : startOfWeek(selectedDate, { weekStartsOn: 1 });
  const rangeEnd = view === "day" ? endOfDay(selectedDate) : endOfWeek(selectedDate, { weekStartsOn: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", view, rangeStart.toISOString()],
    queryFn: () =>
      appointmentsApi.list({
        date_from: rangeStart.toISOString(),
        date_to: rangeEnd.toISOString(),
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const sorted = useMemo(
    () => (data ?? []).slice().sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [data]
  );

  // Only used in week view: bucket appointments by day.
  const daysInWeek = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd]
  );

  const apptsForDay = (day: Date): Appointment[] =>
    sorted.filter((appt) => isSameDay(new Date(appt.start_time), day));

  const goPrev = () => setSelectedDate((d) => (view === "day" ? addDays(d, -1) : addWeeks(d, -1)));
  const goNext = () => setSelectedDate((d) => (view === "day" ? addDays(d, 1) : addWeeks(d, 1)));

  const renderAppointmentCard = (appt: Appointment) => (
    <Card key={appt.id} className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex w-20 flex-col items-center rounded-xl bg-harbor-50 py-2 text-harbor-700">
          <Clock className="mb-1 h-4 w-4" />
          <span className="text-xs font-semibold">{format(new Date(appt.start_time), "h:mm a")}</span>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <p className="font-semibold text-ink">{appt.patient.full_name}</p>
            <Badge label={appt.status} kind={appt.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Stethoscope className="h-3.5 w-3.5" /> {appt.therapist.full_name}
            </span>
            <span className="flex items-center gap-1">
              <DoorOpen className="h-3.5 w-3.5" /> {appt.room.name}
            </span>
            <span className="flex items-center gap-1">
              <User2 className="h-3.5 w-3.5" />
              {format(new Date(appt.start_time), "h:mm a")}–{format(new Date(appt.end_time), "h:mm a")}
            </span>
          </div>
        </div>
      </div>
      {appt.status === "scheduled" ? (
        <button
          onClick={() => {
            if (confirm("Cancel this appointment?")) cancelMutation.mutate(appt.id);
          }}
          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          title="Cancel appointment"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </Card>
  );

  // Compact version used inside week-view day columns (less horizontal room).
  const renderCompactAppointment = (appt: Appointment) => (
    <div
      key={appt.id}
      className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-sm"
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="font-semibold text-ink">{format(new Date(appt.start_time), "h:mm a")}</span>
        <div className="flex items-center gap-1">
          <Badge label={appt.status} kind={appt.status} />
          {appt.status === "scheduled" ? (
            <button
              onClick={() => {
                if (confirm("Cancel this appointment?")) cancelMutation.mutate(appt.id);
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
              title="Cancel appointment"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
      <p className="truncate font-medium text-ink">{appt.patient.full_name}</p>
      <p className="truncate text-slate-500">{appt.therapist.full_name}</p>
      <p className="truncate text-slate-400">{appt.room.name}</p>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">
            {view === "day" ? "Daily schedule across all therapists and rooms" : "Weekly schedule across all therapists and rooms"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView("day")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                view === "day" ? "bg-harbor-600 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView("week")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                view === "week" ? "bg-harbor-600 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Week
            </button>
          </div>
          <Button onClick={() => navigate("/appointments/new")}>
            <Plus className="h-4 w-4" /> New appointment
          </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
        <button onClick={goPrev} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-ink">
            {view === "day"
              ? format(selectedDate, "EEEE, MMMM d, yyyy")
              : `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`}
            {view === "day" && isToday(selectedDate) ? <span className="ml-2 text-harbor-600">Today</span> : null}
          </span>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="mt-0.5 text-xs font-medium text-harbor-600 hover:text-harbor-700"
          >
            Jump to today
          </button>
        </div>
        <button onClick={goNext} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : view === "day" ? (
        sorted.length === 0 ? (
          <EmptyState
            title="No appointments scheduled"
            subtitle="This day is wide open. Book a new appointment to fill a slot."
            action={<Button onClick={() => navigate("/appointments/new")}>New appointment</Button>}
          />
        ) : (
          <div className="flex flex-col gap-3">{sorted.map(renderAppointmentCard)}</div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {daysInWeek.map((day) => {
            const dayAppts = apptsForDay(day);
            return (
              <div key={day.toISOString()} className="flex flex-col gap-2">
                <div
                  className={`rounded-xl border p-2 text-center ${
                    isToday(day) ? "border-harbor-300 bg-harbor-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-xs font-medium text-slate-500">{format(day, "EEE")}</p>
                  <p className={`text-sm font-semibold ${isToday(day) ? "text-harbor-700" : "text-ink"}`}>
                    {format(day, "MMM d")}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {dayAppts.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 p-2 text-center text-xs text-slate-400">
                      No appointments
                    </p>
                  ) : (
                    dayAppts.map(renderCompactAppointment)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}