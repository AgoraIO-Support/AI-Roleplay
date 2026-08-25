"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchRolePlayConfig } from "@/src/lib/roleplays/storage";
import type { RolePlayConfig } from "@/src/lib/roleplays/types";

export default function RolePlayPreviewPage() {
  const router = useRouter();
  const params = useParams<{ rolePlayId: string }>();
  const rolePlayId = params.rolePlayId;
  const [config, setConfig] = useState<RolePlayConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!rolePlayId) return;
    setIsLoading(true);
    void fetchRolePlayConfig(rolePlayId)
      .then(setConfig)
      .finally(() => setIsLoading(false));
  }, [rolePlayId]);

  function startRolePlay() {
    router.push(`/admin/roleplays/preview/${rolePlayId}/session`);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
        <div className="mx-auto max-w-5xl text-sm text-slate-300">Loading role play...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-3xl border border-amber-300/25 bg-amber-300/10 p-8 text-amber-50">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-200">Course unavailable</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">This roleplay could not be loaded.</h1>
          <p className="mt-3 text-sm leading-7 text-amber-100">
            Create or publish the course from the database-backed course builder, then open the
            preview again.
          </p>
          <Link
            href="/course-builder"
            className="mt-5 inline-flex rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Return to Course Builder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Powered by AI</p>
            <h1 className="mt-2 text-3xl font-semibold">{config.settings.meetingTitle}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {config.settings.durationMinutes} minute role play with {config.character.name}
            </p>
          </div>
          <button
            type="button"
            onClick={startRolePlay}
            className="rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Start Role Play
          </button>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-5">
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Scenario Summary</p>
              <p className="mt-3 text-sm leading-6 text-slate-200">{config.plan.scenario}</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI Character</p>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-lg font-semibold text-slate-950">
                  {config.character.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{config.character.name}</h2>
                  <p className="text-sm text-cyan-200">{config.character.role}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {config.character.personalityBackground}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Learner Role</p>
              <p className="mt-3 text-sm text-slate-200">{config.plan.learnerRole}</p>
            </div>
          </section>

          <aside className="rounded-lg border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Meeting Goals</p>
              <Link href="/admin/roleplays/new" className="text-xs font-semibold text-cyan-300">
                Edit
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {config.settings.learnerGoals.map((goal) => (
                <div key={goal.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-white">{goal.label}</p>
                    <span className="text-xs text-slate-500">
                      {goal.required ? "Required" : "Optional"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
