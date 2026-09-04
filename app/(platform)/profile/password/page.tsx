import Link from "next/link";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getAuthSession } from "@/src/lib/auth/session";

export default async function ChangePasswordPage() {
  const user = await getAuthSession();

  if (!user) {
    redirect("/login");
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="px-1">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">
          Account Settings
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground">
          Change Password
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Update your password for future sign-ins. You will need your current
          password to confirm the change.
        </p>
      </header>
      <ChangePasswordForm user={user} />
      <Link
        href="/profile"
        className="inline-flex rounded-2xl border border-border bg-surface min-h-control px-4 py-2 text-sm font-bold text-muted-foreground transition hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Back to Profile
      </Link>
    </section>
  );
}
