import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { roomsApi } from "@/api/rooms";
import { TextField, TextAreaField } from "@/components/FormFields";
import { Button } from "@/components/Button";
import { Card, LoadingState, ErrorBanner } from "@/components/ui";
import { getApiErrorMessage } from "@/api/client";

const schema = z.object({
  name: z.string().min(1, "Room name is required").max(100),
  equipment: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function RoomFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [apiError, setApiError] = React.useState<string | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["rooms", id],
    queryFn: () => roomsApi.get(id!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (existing) reset({ name: existing.name, equipment: existing.equipment ?? "" });
  }, [existing, reset]);

  const deleteMutation = useMutation({
    mutationFn: () => roomsApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      navigate("/rooms");
    },
  });

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    const payload = { name: values.name, equipment: values.equipment || null };
    try {
      if (isEdit) await roomsApi.update(id!, payload);
      else await roomsApi.create(payload);
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      navigate("/rooms");
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  };

  if (isEdit && isLoading) return <LoadingState />;

  return (
    <div className="max-w-xl">
      <button
        onClick={() => navigate("/rooms")}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to rooms
      </button>

      <h1 className="mb-6 font-display text-2xl font-semibold text-ink">{isEdit ? "Edit room" : "Add room"}</h1>

      <Card>
        {apiError ? <ErrorBanner message={apiError} /> : null}
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField label="Room name" {...register("name")} error={errors.name?.message} placeholder="Therapy Room 1" />
          <TextAreaField
            label="Equipment"
            {...register("equipment")}
            placeholder="e.g. Audiometer, sound booth, mirror"
          />

          <div className="mt-2 flex items-center justify-between">
            <div>
              {isEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-rose-500 hover:bg-rose-50"
                  onClick={() => {
                    if (confirm("Delete this room? This cannot be undone.")) deleteMutation.mutate();
                  }}
                  loading={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              ) : null}
            </div>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? "Save changes" : "Add room"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
