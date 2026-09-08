import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { patientsApi } from "@/api/patients";
import { TextField, TextAreaField, SelectField } from "@/components/FormFields";
import { Button } from "@/components/Button";
import { Card, LoadingState, ErrorBanner } from "@/components/ui";
import { getApiErrorMessage } from "@/api/client";

const schema = z.object({
  full_name: z.string().min(1, "Name is required").max(150),
  age: z.union([z.coerce.number().min(0).max(120), z.literal("")]).optional(),
  phone: z.string().max(20).optional(),
  email: z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    {
      message: "Invalid email",
    }
  ),
  condition_type: z.enum(["speech", "hearing", "both"]),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function PatientFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [apiError, setApiError] = React.useState<string | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["patients", id],
    queryFn: () => patientsApi.get(id!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { condition_type: "speech" },
  });

  useEffect(() => {
    if (existing) {
      reset({
        full_name: existing.full_name,
        age: existing.age ?? undefined,
        phone: existing.phone ?? "",
        email: existing.email ?? "",
        condition_type: existing.condition_type,
        notes: existing.notes ?? "",
      });
    }
  }, [existing, reset]);

  const deleteMutation = useMutation({
    mutationFn: () => patientsApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      navigate("/patients");
    },
  });

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    const payload = {
      ...values,
      age: values.age === "" || values.age == null ? null : Number(values.age),
      phone: values.phone || null,
      email: values.email || null,
      notes: values.notes || null,
    };
    try {
      if (isEdit) {
        await patientsApi.update(id!, payload);
      } else {
        await patientsApi.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      navigate("/patients");
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  };

  if (isEdit && isLoading) return <LoadingState />;

  return (
    <div className="max-w-xl">
      <button
        onClick={() => navigate("/patients")}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to patients
      </button>

      <h1 className="mb-6 font-display text-2xl font-semibold text-ink">
        {isEdit ? "Edit patient" : "Add patient"}
      </h1>

      <Card>
        {apiError ? <ErrorBanner message={apiError} /> : null}
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <TextField label="Full name" {...register("full_name")} error={errors.full_name?.message} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Age" type="number" {...register("age")} error={errors.age?.message as string} />
            <Controller
              control={control}
              name="condition_type"
              render={({ field }) => (
                <SelectField
                  label="Condition"
                  {...field}
                  options={[
                    { label: "Speech", value: "speech" },
                    { label: "Hearing", value: "hearing" },
                    { label: "Both", value: "both" },
                  ]}
                />
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Phone" {...register("phone")} error={errors.phone?.message} />
            <TextField label="Email" type="email" {...register("email")} error={errors.email?.message} />
          </div>
          <TextAreaField label="Notes" {...register("notes")} placeholder="Clinical notes, history, etc." />

          <div className="mt-2 flex items-center justify-between">
            <div>
              {isEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-rose-500 hover:bg-rose-50"
                  onClick={() => {
                    if (confirm("Delete this patient? This cannot be undone.")) deleteMutation.mutate();
                  }}
                  loading={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              ) : null}
            </div>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? "Save changes" : "Add patient"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
