"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { AuthSessionUser } from "@/src/lib/auth/session";
import type { AppRole } from "@/lib/types";

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: AppRole[];
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        if (response.ok) {
          const payload = (await response.json()) as { user?: AuthSessionUser };
          setUser(payload.user ?? null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Checking access...</div>
    );
  }

  if (user && allowedRoles.includes(user.role)) {
    return children;
  }

  return (
    <div className="rounded-3xl border border-warning/30 bg-warning-subtle p-8 shadow-soft">
      <p className="text-xs uppercase tracking-[0.2em] text-warning-subtle-foreground">
        Access restricted
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        This account cannot access this page
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-warning-subtle-foreground">
        Sign in with an account that has the required permissions to continue.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex rounded-2xl bg-primary min-h-control px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
