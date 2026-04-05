"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const authConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (!authConfigured) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Supabase not configured</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Add <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">web/.env.local</code>.
        </p>
        <Link href="/setup" className="mt-4 inline-block text-indigo-600 underline dark:text-indigo-400">
          Setup instructions
        </Link>
      </main>
    );
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your email for the login link.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sign-in failed");
    }
  }

  async function google() {
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Cloud backup and sync use Supabase Auth (email magic link or Google).
      </p>
      {sent ? (
        <p className="mt-6 text-zinc-700 dark:text-zinc-300">Check your email for the login link.</p>
      ) : (
        <form onSubmit={(e) => void magicLink(e)} className="mt-6 flex flex-col gap-4">
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="you@example.com"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Email me a link
          </button>
        </form>
      )}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--background)] px-2 text-zinc-500">Or</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void google()}
        className="rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        Continue with Google
      </button>
      <p className="mt-8 text-center text-sm text-zinc-500">
        <Link href="/" className="underline">
          Back home
        </Link>
      </p>
    </main>
  );
}
