import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Ear } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { TextField } from "@/components/FormFields";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ui";

export function LoginPage() {
  const [email, setEmail] = useState("admin@clinic.com");
  const [password, setPassword] = useState("");
  const { login, isAuthenticating, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      /* error captured in store */
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-harbor-600 text-white">
            <Ear className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">Harbor Clinic</h1>
          <p className="mt-1 text-sm text-slate-500">Speech & Hearing Therapy Scheduler</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          {error ? <ErrorBanner message={error} /> : null}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" loading={isAuthenticating} className="mt-2 w-full">
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link to="/register" className="font-semibold text-harbor-600 hover:text-harbor-700">
            Register
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-slate-400">
          Demo login: admin@clinic.com / Admin@123 (after running the seed script)
        </p>
      </div>
    </div>
  );
}
