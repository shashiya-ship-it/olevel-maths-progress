
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "register" | "forgot";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    if (mode === "forgot" && !email.trim()) {
      setMessage("Please enter your email address.");
      return;
    }

    setBusy(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      setBusy(false);

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "If an account exists for this email, a password reset link will be sent. Please check your inbox."
        );
      }

      return;
    }

    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      setBusy(false);

      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        router.push("/dashboard");
      } else {
        setMessage(
          "Account created! Please check your email to confirm your account before logging in."
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setBusy(false);

      if (error) {
        setMessage(error.message);
      } else {
        router.push("/dashboard");
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-8">
      <form onSubmit={submit} className="panel w-full p-7">
        <Link href="/" className="text-sm text-cyan-300">
          ← Home
        </Link>

        <h1 className="mt-5 text-3xl font-bold">
          {mode === "register"
            ? "Create Account"
            : mode === "forgot"
              ? "Forgot Password?"
              : "Welcome back"}
        </h1>

        <p className="muted mt-2">
          {mode === "register"
            ? "Join O/L Maths Progress as a student"
            : mode === "forgot"
              ? "Enter your email to receive a password reset link"
              : "Sign in to O/L Maths Progress"}
        </p>

        {mode === "register" && (
          <>
            <label className="mt-6 block text-sm">
              Full Name
            </label>

            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              placeholder="Your full name"
            />
          </>
        )}

        <label className="mt-6 block text-sm">
          Email
        </label>

        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
          placeholder="your@email.com"
        />

        {mode !== "forgot" && (
          <>
            <label className="mt-4 block text-sm">
              Password
            </label>

            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              placeholder="At least 6 characters"
            />
          </>
        )}

        {mode === "login" && (
          <div className="mt-3 text-right">
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setMessage("");
              }}
              className="text-sm text-cyan-300 hover:text-cyan-200"
            >
              Forgot Password?
            </button>
          </div>
        )}

        <button
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-60"
        >
          {busy
            ? "Please wait..."
            : mode === "register"
              ? "Create Student Account"
              : mode === "forgot"
                ? "Send Reset Link"
                : "Login"}
        </button>

        {message && (
          <p className="mt-4 break-words text-sm text-amber-300">
            {message}
          </p>
        )}

        <div className="mt-6 border-t border-slate-700 pt-5 text-center">
          {mode === "forgot" ? (
            <>
              <p className="muted text-sm">
                Remember your password?
              </p>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
                className="mt-2 font-bold text-cyan-300 hover:text-cyan-200"
              >
                Back to Login
              </button>
            </>
          ) : (
            <>
              <p className="muted text-sm">
                {mode === "register"
                  ? "Already have an account?"
                  : "Don't have an account yet?"}
              </p>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === "register" ? "login" : "register");
                  setMessage("");
                }}
                className="mt-2 font-bold text-cyan-300 hover:text-cyan-200"
              >
                {mode === "register"
                  ? "Login here"
                  : "Create New Account"}
              </button>
            </>
          )}
        </div>
      </form>
    </main>
  );
}
