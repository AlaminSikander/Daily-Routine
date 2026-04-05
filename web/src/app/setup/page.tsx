export default function SetupPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Configure Supabase</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-300">
        Create a project at{" "}
        <a className="text-indigo-600 underline dark:text-indigo-400" href="https://supabase.com">
          supabase.com
        </a>
        , then copy your URL and anon key into{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">web/.env.local</code> (see{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">.env.local.example</code>
        ).
      </p>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-zinc-700 dark:text-zinc-300">
        <li>
          In the Supabase SQL editor, run the migration files{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
            supabase/migrations/001_initial_schema.sql
          </code>{" "}
          then{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
            002_task_started_at.sql
          </code>
          .
        </li>
        <li>Enable Email (and Google) providers under Authentication → Providers.</li>
        <li>Restart Next.js after saving environment variables.</li>
      </ol>
    </main>
  );
}
