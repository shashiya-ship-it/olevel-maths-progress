
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Profile = {
  full_name: string | null;
  role: string;
};

export default function Home() {
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("/student-avatar.png");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");

  const activeClass =
    "rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950";

  const inactiveClass =
    "rounded-xl border border-slate-600 px-4 py-2 text-white hover:border-cyan-400 hover:text-cyan-300";

  useEffect(() => {
    if (!supabase) {
      setError("Connect Supabase to continue.");
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadUser(userId: string | null) {
      if (!supabase || !mounted) return;

      if (!userId) {
        setUser(null);
        setProfile(null);
        setAvatarUrl("/student-avatar.png");
        setLoading(false);
        return;
      }

      setAvatarUrl("/student-avatar.png");

      const { data: authData } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(authData.user);

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", userId)
        .single();

      if (!mounted) return;

      if (profileError) {
        setError("Could not load student profile.");
        setProfile(null);
      } else {
        setProfile(data as Profile);

        // Check whether the student has uploaded a profile photo.
        const { data: files, error: listError } = await supabase.storage
          .from("avatars")
          .list(userId);

        if (!mounted) return;

        const hasPhoto = !listError && files?.some(
          (file) => file.name === "profile"
        );

        if (hasPhoto) {
          const photoPath = `${userId}/profile`;

          const { data: photoData } = supabase.storage
            .from("avatars")
            .getPublicUrl(photoPath);

          setAvatarUrl(`${photoData.publicUrl}?t=${Date.now()}`);
        } else {
          setAvatarUrl("/student-avatar.png");
        }
      }

      setLoading(false);
    }

    async function initialize() {
      const { data } = await supabase!.auth.getSession();

      if (!mounted) return;

      await loadUser(data.session?.user?.id ?? null);
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      setError("");
      setPhotoMessage("");

      Promise.resolve().then(() =>
        loadUser(session?.user?.id ?? null)
      );
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handlePhotoUpload(file?: File) {
    if (!supabase || !user || !file) return;

    setError("");
    setPhotoMessage("");

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo size must be less than 5 MB.");
      return;
    }

    setPhotoLoading(true);

    const photoPath = `${user.id}/profile`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(photoPath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      setError(uploadError.message);
      setPhotoLoading(false);
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(photoPath);

    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    setPhotoMessage("Profile photo updated successfully!");
    setPhotoLoading(false);
  }

  async function handleLogout() {
    if (!supabase) return;

    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 md:px-8">

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-sm font-semibold tracking-[.2em] text-cyan-300">
            O/L MATHEMATICS
          </p>

          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            O/L Maths Progress
          </h1>

          <p className="muted mt-2">
            Track marks. Understand progress. Aim higher.
          </p>
        </div>

        <nav className="flex flex-wrap gap-3">
          <Link
            className={
              pathname === "/" ? activeClass : inactiveClass
            }
            href="/"
          >
            Home
          </Link>

          <Link
            className={
              pathname === "/leaderboard"
                ? activeClass
                : inactiveClass
            }
            href="/leaderboard"
          >
            Leaderboard
          </Link>

          {user ? (
            <>
              <Link
                className={
                  pathname === "/dashboard"
                    ? activeClass
                    : inactiveClass
                }
                href="/dashboard"
              >
                My Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className={inactiveClass}
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              className={
                pathname === "/login" ? activeClass : inactiveClass
              }
              href="/login"
            >
              Login
            </Link>
          )}
        </nav>
      </header>

      {/* Error message */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-200">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="panel mt-8 p-8 text-center">
          Loading profile...
        </div>
      ) : user && profile ? (

        /* Student Profile */
        <section className="mx-auto mt-10 max-w-3xl">
          <div className="panel overflow-hidden">

            {/* Cover */}
            <div className="h-32 bg-gradient-to-r from-cyan-700 via-blue-800 to-indigo-900" />

            <div className="px-6 pb-7">

              {/* Profile Photo */}
              <div className="-mt-16 flex flex-col items-center">

                <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-slate-900 bg-slate-700 shadow-xl">
                  <img
                    src={avatarUrl || "/student-avatar.png"}
                    alt="Profile photo"
                    className="h-full w-full object-cover"
                    onError={() => {
                      if (avatarUrl !== "/student-avatar.png") {
                        setAvatarUrl("/student-avatar.png");
                      }
                    }}
                  />
                </div>

                <h2 className="mt-4 text-center text-2xl font-bold">
                  {profile.full_name || "Student"}
                </h2>

                <p className="muted mt-1">
                  O/L Mathematics{" "}
                  {profile.role === "admin" ? "Admin" : "Student"}
                </p>

                <span className="mt-3 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-1 text-sm font-semibold text-cyan-300">
                  {profile.role === "admin"
                    ? "Administrator"
                    : "Student Account"}
                </span>

                {/* Upload Photo */}
                <label
                  className={`mt-5 cursor-pointer rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 ${
                    photoLoading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {photoLoading
                    ? "Uploading..."
                    : "Upload / Change Photo"}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={photoLoading}
                    onChange={(e) => {
                      handlePhotoUpload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>

                <p className="muted mt-2 text-xs">
                  JPG, PNG or other image · Maximum 5 MB
                </p>

                {photoMessage && (
                  <p className="mt-3 text-sm text-green-400">
                    {photoMessage}
                  </p>
                )}
              </div>

              {/* Profile Details */}
              <div className="mt-8 border-t border-slate-700 pt-6">

                <h3 className="mb-5 text-lg font-bold">
                  Profile Details
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="muted text-xs">
                      Full Name
                    </p>

                    <p className="mt-2 break-words font-semibold">
                      {profile.full_name || "Not provided"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="muted text-xs">
                      Email Address
                    </p>

                    <p className="mt-2 break-all font-semibold">
                      {user.email || "Not available"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="muted text-xs">
                      Account Type
                    </p>

                    <p className="mt-2 font-semibold">
                      {profile.role === "admin" ? "Admin" : "Student"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="muted text-xs">
                      Class
                    </p>

                    <p className="mt-2 font-semibold">
                      O/L
                    </p>
                  </div>

                </div>
              </div>

              {/* Dashboard Button */}
              <div className="mt-7 text-center">
                <Link
                  href="/dashboard"
                  className="inline-block rounded-xl bg-cyan-400 px-7 py-3 font-bold text-slate-950 hover:bg-cyan-300"
                >
                  Go to My Dashboard
                </Link>
              </div>

            </div>
          </div>
        </section>

      ) : (

        /* Logged Out Home Page */
        <section className="mx-auto mt-12 max-w-3xl">
          <div className="panel p-8 text-center sm:p-12">

            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-700">
              <span className="text-4xl">📘</span>
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              Welcome to O/L Maths Progress
            </h2>

            <p className="muted mx-auto mt-3 max-w-lg">
              Create your student account to track your Maths
              results, view your progress and improve your marks.
            </p>

            <Link
              href="/login"
              className="mt-7 inline-block rounded-xl bg-cyan-400 px-7 py-3 font-bold text-slate-950"
            >
              Login / Register
            </Link>

          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="muted mt-10 border-t border-slate-800 pt-5 text-xs">
        O/L Maths Progress · Starter project
      </footer>

    </main>
  );
}
