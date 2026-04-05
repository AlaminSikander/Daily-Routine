"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  GanttChartSquare,
  Home,
  LogOut,
  Settings,
  Target,
  Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/app", label: "Dashboard", icon: Home },
  { href: "/app/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/timeline", label: "Timeline", icon: GanttChartSquare },
  { href: "/app/habits", label: "Habits", icon: Flame },
  { href: "/app/goals", label: "Goals", icon: Target },
  { href: "/app/journal", label: "Journal", icon: BookOpen },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <Link href="/app" className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Daily Life
        </Link>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Plan · Track · Improve</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {links.map(({ href, label, icon: Icon }) => {
          const reallyActive =
            href === "/app"
              ? pathname === "/app" || pathname === "/app/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                reallyActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-200/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
