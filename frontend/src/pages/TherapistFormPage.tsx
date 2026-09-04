import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Plus, X } from "lucide-react";
import { therapistsApi } from "@/api/therapists";
import { TextField, SelectField } from "@/components/FormFields";
import { Button } from "@/components/Button";
import { Card, LoadingState, ErrorBanner } from "@/components/ui";
import { getApiErrorMessage } from "@/api/client";
import { AvailabilitySlot } from "@/types";

const WEEKDAYS = [
  { label: "Monday", value: 0 },
  { label: "Tuesday", value: 1 },
  { label: "Wednesday", value: 2 },
  { label: "Thursday", value: 3 },
  { label: "Friday", value: 4 },
  { label: "Saturday", value: 5 },
  { label: "Sunday", value: 6 },
];

export function TherapistFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("speech_therapy");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["therapists", id],
    queryFn: () => therapistsApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setFullName(existing.full_name);
      setEmail(existing.email ?? "");
      setPhone(existing.phone ?? "");
      setSpecialization(existing.specialization);
      setSlots(existing.availability_slots.map((s) => ({ ...s, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) })));
    }
  }, [existing]);

  const deleteMutation = useMutation({
    mutationFn: () => therapistsApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["therapists"] });
      navigate("/therapists");
    },
  });

  const addSlot = () => setSlots((s) => [...s, { weekday: 0, start_time: "09:00", end_time: "17:00" }]);
  const removeSlot = (idx: number) => setSlots((s) => s.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, patch: Partial<AvailabilitySlot>) =>
    setSlots((s) => s.map((slot, i) => (i === idx ? { ...slot, ...patch } : slot)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSubmitting(true);

    const invalidSlot = slots.find((s) => s.end_time <= s.start_time);
    if (invalidSlot) {
      setApiError("Each availability slot's end time must be after its start time.");
      setSubmitting(false);
      return;
    }

    const payload = {
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      specialization,
      availability_slots: slots.map((s) => ({
        weekday: s.weekday,
        start_time: `${s.start_time}:00`,
        end_time: `${s.end_time}:00`,
      })),
    };

    try {
      if (isEdit) {
        // availability_slots aren't updated via PATCH in this simple version -
        // full replace would need a dedicated endpoint; here we update the base fields.
        await therapistsApi.update(id!, {
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone,
          specialization: payload.specialization,
        });
      } else {
        await therapistsApi.create(payload as any);
      }
      queryClient.invalidateQueries({ queryKey: ["therapists"] });
      navigate("/therapists");
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && isLoading) return <LoadingState />;

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate("/therapists")}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to therapists
      </button>

      <h1 className="mb-6 font-display text-2xl font-semibold text-ink">
        {isEdit ? "Edit therapist" : "Add therapist"}
      </h1>

      <Card>
        {apiError ? <ErrorBanner message={apiError} /> : null}
        <form onSubmit={handleSubmit}>
          <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <SelectField
            label="Specialization"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            options={[
              { label: "Speech Therapy", value: "speech_therapy" },
              { label: "Audiology", value: "audiology" },
              { label: "Both", value: "both" },
            ]}
          />

          <div className="mb-4 mt-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Weekly availability</span>
              <button
                type="button"
                onClick={addSlot}
                className="flex items-center gap-1 text-sm font-semibold text-harbor-600 hover:text-harbor-700"
              >
                <Plus className="h-4 w-4" /> Add slot
              </button>
            </div>

            {slots.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                No availability set — clinic hours (9:00–18:00) will apply by default.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {slots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                    <select
                      value={slot.weekday}
                      onChange={(e) => updateSlot(idx, { weekday: Number(e.target.value) })}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    >
                      {WEEKDAYS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlot(idx, { start_time: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlot(idx, { end_time: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(idx)}
                      className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {isEdit ? (
              <p className="mt-2 text-xs text-slate-400">
                Note: availability changes for existing therapists should be made by recreating slots (this demo's
                PATCH endpoint updates contact/specialization only).
              </p>
            ) : null}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div>
              {isEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-rose-500 hover:bg-rose-50"
                  onClick={() => {
                    if (confirm("Delete this therapist? This cannot be undone.")) deleteMutation.mutate();
                  }}
                  loading={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              ) : null}
            </div>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Add therapist"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
