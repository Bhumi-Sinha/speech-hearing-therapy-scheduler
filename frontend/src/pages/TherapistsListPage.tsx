import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Mail, Phone } from "lucide-react";
import { therapistsApi } from "@/api/therapists";
import { Card, LoadingState, EmptyState, Badge } from "@/components/ui";
import { Button } from "@/components/Button";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SPECIALIZATION_LABEL: Record<string, string> = {
  speech_therapy: "Speech Therapy",
  audiology: "Audiology",
  both: "Speech & Audiology",
};

export function TherapistsListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["therapists"], queryFn: () => therapistsApi.list() });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Therapists</h1>
          <p className="mt-1 text-sm text-slate-500">Manage therapists and their weekly availability</p>
        </div>
        <Button onClick={() => navigate("/therapists/new")}>
          <Plus className="h-4 w-4" /> Add therapist
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No therapists yet"
          subtitle="Add a therapist and set their weekly working hours to start scheduling."
          action={<Button onClick={() => navigate("/therapists/new")}>Add therapist</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((t) => (
            <Card key={t.id} className="transition-shadow hover:shadow-popover">
              <button className="w-full text-left" onClick={() => navigate(`/therapists/${t.id}`)}>
                <div className="mb-2 flex items-start justify-between">
                  <p className="font-semibold text-ink">{t.full_name}</p>
                  <Badge label={t.is_active ? "active" : "inactive"} kind={t.is_active ? "active" : "inactive"} />
                </div>
                <p className="mb-2 text-sm text-slate-500">{SPECIALIZATION_LABEL[t.specialization]}</p>
                {t.email ? (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Mail className="h-3.5 w-3.5" /> {t.email}
                  </span>
                ) : null}
                {t.phone ? (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Phone className="h-3.5 w-3.5" /> {t.phone}
                  </span>
                ) : null}
                {t.availability_slots.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.availability_slots
                      .sort((a, b) => a.weekday - b.weekday)
                      .map((s, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                        >
                          {WEEKDAYS[s.weekday]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">No weekly availability set (clinic hours apply)</p>
                )}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
