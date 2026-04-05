import Link from "next/link";

export default function HomePage() {
  const hasEnv =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Daily Life
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">
          A personal hub for planning, habits, goals, journaling, and gentle AI nudges — built
          with Next.js, Supabase, and FastAPI.
        </p>
      </div>
      <ul className="list-inside list-disc space-y-2 text-zinc-600 dark:text-zinc-400">
        <li>Smart tasks with recurrence, reminders, and recovery prompts</li>
        <li>Calendar, full-day timeline, streaks, and analytics</li>
        <li>Voice-friendly task capture (with the Python AI service)</li>
      </ul>
      <div className="flex flex-wrap gap-3">
        {hasEnv ? (
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-500"
          >
            Sign in
          </Link>
        ) : (
          <Link
            href="/setup"
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-amber-500"
          >
            Configure Supabase
          </Link>
        )}
        <Link
          href="/app"
          className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Open app
        </Link>
      </div>
    </main>
  );
}
