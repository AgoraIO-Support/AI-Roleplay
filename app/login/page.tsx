import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh app-backdrop px-6 py-10 text-foreground">
          <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-6xl place-items-center">
            <div className="rounded-3xl border border-primary/20 bg-surface p-6 text-sm font-medium text-muted-foreground shadow-soft">
              Loading login...
            </div>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
