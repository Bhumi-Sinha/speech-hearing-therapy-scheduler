import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, DoorOpen } from "lucide-react";
import { roomsApi } from "@/api/rooms";
import { Card, LoadingState, EmptyState, Badge } from "@/components/ui";
import { Button } from "@/components/Button";

export function RoomsListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["rooms"], queryFn: () => roomsApi.list() });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Rooms</h1>
          <p className="mt-1 text-sm text-slate-500">Manage therapy rooms and equipment</p>
        </div>
        <Button onClick={() => navigate("/rooms/new")}>
          <Plus className="h-4 w-4" /> Add room
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No rooms yet"
          subtitle="Add a therapy room so appointments can be scheduled into it."
          action={<Button onClick={() => navigate("/rooms/new")}>Add room</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.map((r) => (
            <Card key={r.id} className="transition-shadow hover:shadow-popover">
              <button className="w-full text-left" onClick={() => navigate(`/rooms/${r.id}`)}>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-harbor-50 text-harbor-600">
                    <DoorOpen className="h-4.5 w-4.5" />
                  </div>
                  <p className="font-semibold text-ink">{r.name}</p>
                </div>
                <p className="mb-2 text-sm text-slate-500">{r.equipment || "No equipment listed"}</p>
                <Badge label={r.is_active ? "active" : "inactive"} kind={r.is_active ? "active" : "inactive"} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
