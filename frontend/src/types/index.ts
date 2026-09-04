export type ConditionType = "speech" | "hearing" | "both";
export type Specialization = "speech_therapy" | "audiology" | "both";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface Patient {
  id: string;
  full_name: string;
  age: number | null;
  phone: string | null;
  email: string | null;
  condition_type: ConditionType;
  notes: string | null;
  is_active: string;
  created_at: string;
}

export interface AvailabilitySlot {
  id?: string;
  weekday: number; // 0=Monday ... 6=Sunday
  start_time: string; // "HH:MM:SS" or "HH:MM"
  end_time: string;
}

export interface Therapist {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  specialization: Specialization;
  is_active: boolean;
  created_at: string;
  availability_slots: AvailabilitySlot[];
}

export interface Room {
  id: string;
  name: string;
  equipment: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  therapist_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  patient: { id: string; full_name: string };
  therapist: { id: string; full_name: string };
  room: { id: string; name: string };
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  therapist_id: string;
  therapist_name: string;
  room_id: string;
  room_name: string;
}

export interface DashboardSummary {
  total_patients: number;
  active_patients: number;
  total_therapists: number;
  active_therapists: number;
  total_rooms: number;
  active_rooms: number;
  appointments_today: number;
  appointments_this_week: number;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "receptionist";
  is_active: boolean;
  created_at: string;
}
