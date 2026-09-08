import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Search, CalendarCheck, Stethoscope, DoorOpen, Clock } from "lucide-react";
import { patientsApi } from "@/api/patients";
import { therapistsApi } from "@/api/therapists";
import { roomsApi } from "@/api/rooms";
import { appointmentsApi } from "@/api/appointments";
import { SelectField, TextField, TextAreaField } from "@/components/FormFields";
import { Button } from "@/components/Button";
import { Card, LoadingState, ErrorBanner, EmptyState } from "@/components/ui";
import { getApiErrorMessage } from "@/api/client";
import { AvailableSlot } from "@/types";

export function NewAppointmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [patientId, setPatientId] = useState("");
  const [therapistFilter, setTherapistFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientsApi.list(),
  });
  const { data: therapists } = useQuery({ queryKey: ["therapists"], queryFn: () => therapistsApi.list(true) });
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: () => roomsApi.list(true) });

  const {
    data: slots,
    isFetching: slotsLoading,
    refetch,
  } = useQuery({
    queryKey: ["available-slots", date, duration, therapistFilter, roomFilter],
    queryFn: () =>
      appointmentsApi.findAvailableSlots({
        date: date,
        duration_minutes: duration,
        therapist_id: therapistFilter || undefined,
        room_id: roomFilter || undefined,
      }),
    enabled: false,
  });

  const handleSearch = async () => {
    setSelectedSlot(null);
    setHasSearched(true);
    const result = await refetch();

    console.log("SEARCH DATE:", date);
    console.log("SEARCH DURATION:", duration);
    console.log("AVAILABLE SLOTS RESULT:", result.data);
    console.log("AVAILABLE SLOTS COUNT:", result.data?.length ?? 0);
  };

  const bookMutation = useMutation({
    mutationFn: () =>
      appointmentsApi.create({
        patient_id: patientId,
        therapist_id: selectedSlot!.therapist_id,
        room_id: selectedSlot!.room_id,
        start_time: selectedSlot!.start_time,
        end_time: selectedSlot!.end_time,
        notes: notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      navigate("/calendar");
    },
    onError: (err) => setBookingError(getApiErrorMessage(err)),
  });

  const handleBook = () => {
    setBookingError(null);
    if (!patientId) {
      setBookingError("Please select a patient.");
      return;
    }
    if (!selectedSlot) {
      setBookingError("Please select an available time slot.");
      return;
    }
    bookMutation.mutate();
  };

  // Group slots by time so the UI reads as a timeline, not a flat therapist x room grid
  const slotsByTime = React.useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    (slots ?? []).forEach((s) => {
      const key = s.start_time;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [slots]);

  if (patientsLoading) return <LoadingState />;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">New appointment</h1>
      <p className="mb-6 text-sm text-slate-500">
        Search for an open slot, then confirm the booking. The system checks therapist availability, room
        conflicts, and clinic hours automatically.
      </p>

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Patient"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="Select a patient"
            options={(patients ?? []).map((p) => ({ label: p.full_name, value: p.id }))}
          />
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <SelectField
            label="Duration"
            value={String(duration)}
            onChange={(e) => setDuration(Number(e.target.value))}
            options={[
              { label: "15 minutes", value: "15" },
              { label: "30 minutes", value: "30" },
              { label: "45 minutes", value: "45" },
              { label: "60 minutes", value: "60" },
              { label: "90 minutes", value: "90" },
            ]}
          />
          <SelectField
            label="Therapist (optional filter)"
            value={therapistFilter}
            onChange={(e) => setTherapistFilter(e.target.value)}
            placeholder="Any therapist"
            options={(therapists ?? []).map((t) => ({ label: t.full_name, value: t.id }))}
          />
          <SelectField
            label="Room (optional filter)"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            placeholder="Any room"
            options={(rooms ?? []).map((r) => ({ label: r.name, value: r.id }))}
          />
        </div>
        <Button onClick={handleSearch} loading={slotsLoading} className="mt-1">
          <Search className="h-4 w-4" /> Find available slots
        </Button>
      </Card>

      {hasSearched ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Available slots on {format(new Date(date), "MMM d, yyyy")}</h2>
          {slotsLoading ? (
            <LoadingState message="Searching for open slots..." />
          ) : slotsByTime.length === 0 ? (
            <EmptyState
              title="No open slots found"
              subtitle="Try a different date, a shorter duration, or remove the therapist/room filter."
            />
          ) : (
            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
              {slotsByTime.map(([time, options]) => (
                <div key={time}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <Clock className="h-3.5 w-3.5" /> {format(new Date(time), "h:mm a")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt, i) => {
                      const isSelected =
                        selectedSlot?.start_time === opt.start_time &&
                        selectedSlot?.therapist_id === opt.therapist_id &&
                        selectedSlot?.room_id === opt.room_id;
                      return (
                        <button
                          key={i}
                          data-testid="available-slot"
                          onClick={() => setSelectedSlot(opt)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? "border-harbor-500 bg-harbor-50 text-harbor-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-harbor-300"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5" /> {opt.therapist_name}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="flex items-center gap-1">
                            <DoorOpen className="h-3.5 w-3.5" /> {opt.room_name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {selectedSlot ? (
        <Card className="mb-6 border-harbor-300 bg-harbor-50/40">
          <div className="mb-3 flex items-center gap-2 text-harbor-700">
            <CalendarCheck className="h-5 w-5" />
            <p className="text-sm font-semibold">Selected slot</p>
          </div>
          <p className="mb-4 text-sm text-slate-600">
            {format(new Date(selectedSlot.start_time), "EEEE, MMM d")} ·{" "}
            {format(new Date(selectedSlot.start_time), "h:mm a")}–{format(new Date(selectedSlot.end_time), "h:mm a")}{" "}
            with <span className="font-semibold text-ink">{selectedSlot.therapist_name}</span> in{" "}
            <span className="font-semibold text-ink">{selectedSlot.room_name}</span>
          </p>
          <TextAreaField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {bookingError ? <ErrorBanner message={bookingError} /> : null}
          <Button 
          data-testid="confirm-booking"
          onClick={handleBook}
          loading={bookMutation.isPending}
          className="w-full"
          >
            Confirm booking
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
