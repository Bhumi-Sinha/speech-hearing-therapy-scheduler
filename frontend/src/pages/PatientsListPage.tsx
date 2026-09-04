import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Phone, Mail } from "lucide-react";
import { patientsApi } from "@/api/patients";
import { Card, LoadingState, EmptyState, Badge } from "@/components/ui";
import { Button } from "@/components/Button";

export function PatientsListPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["patients", search],
    queryFn: () => patientsApi.list(search || undefined),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">Manage patient records</p>
        </div>
        <Button onClick={() => navigate("/patients/new")}>
          <Plus className="h-4 w-4" /> Add patient
        </Button>
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-card">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients by name..."
          className="w-full text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No patients yet"
          subtitle="Add your first patient to start scheduling therapy sessions."
          action={<Button onClick={() => navigate("/patients/new")}>Add patient</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer transition-shadow hover:shadow-popover"
            >
              <button className="w-full text-left" onClick={() => navigate(`/patients/${p.id}`)}>
                <div className="mb-2 flex items-start justify-between">
                  <p className="font-semibold text-ink">{p.full_name}</p>
                  <Badge label={p.condition_type} kind={p.condition_type} />
                </div>
                <div className="flex flex-col gap-1 text-sm text-slate-500">
                  {p.age != null ? <span>Age {p.age}</span> : null}
                  {p.phone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {p.phone}
                    </span>
                  ) : null}
                  {p.email ? (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {p.email}
                    </span>
                  ) : null}
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
