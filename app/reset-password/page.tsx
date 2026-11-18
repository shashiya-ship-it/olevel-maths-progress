
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      setChecking(false);
      return;
    }

    async function checkSession() {
      const { data, error } = await supabase!.auth.getSession();

      if (error) {
        setMessage(error.message);
      }

      setHasSession(Boolean(data.session));
      setChecking(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSuccess(true);
    setMessage("Your password has been changed successfully!");
  }

  if (checking) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-5">
        <div className="panel w-full p-7">
          <p className="muted">Checking password reset link...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-8">
      <div className="panel w-full p-7">
        <Link href="/" className="text-sm text-cyan-300">
          ← Home
        </Link>

        <h1 className="mt-5 text-3xl font-bold">
          Reset Password
        </h1>

        <p className="muted mt-2">
          Create a new password for your account.
        </p>

        {success ? (
          <>
            <p className="mt-6 text-sm text-green-300">
              {message}
            </p>

            <button
              type="button"
              onClick={() => router.replace("/dashboard")}
              className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950"
            >
              Go to Dashboard
            </button>
          </>
        ) : !hasSession ? (
          <>
            <p className="mt-6 text-sm text-amber-300">
              {message ||
                "This reset link is invalid or has expired. Please request a new password reset link."}
            </p>

            <Link
              href="/login"
              className="mt-6 block rounded-xl bg-cyan-400 px-4 py-3 text-center font-bold text-slate-950"
            >
              Back to Login
            </Link>
          </>
        ) : (
          <form onSubmit={updatePassword}>
            <label className="mt-6 block text-sm">
              New Password
            </label>

            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />

            <label className="mt-4 block text-sm">
              Confirm New Password
            </label>

            <input
              required
              minLength={6}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter password again"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />

            {message && (
              <p className="mt-4 text-sm text-amber-300">
                {message}
              </p>
            )}

            <button
              disabled={busy}
              className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-60"
            >
              {busy ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
