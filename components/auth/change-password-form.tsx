"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import type { AuthSessionUser } from "@/src/lib/auth/session";

export function ChangePasswordForm({ user }: { user: AuthSessionUser }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            `Unable to update password. HTTP ${response.status}.`,
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update password.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={submitPasswordChange}
      className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xl font-bold text-muted-foreground ring-2 ring-surface">
          {user.name.trim().charAt(0).toUpperCase() ||
            user.email.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{user.name}</p>
          <p className="text-sm font-medium text-muted-foreground">
            {user.email}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-muted-foreground">
            Current Password
          </span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            className="w-full rounded-2xl border border-border bg-surface-sunken px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-surface focus:ring-4 focus:ring-ring/30"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-muted-foreground">
            New Password
          </span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            className="w-full rounded-2xl border border-border bg-surface-sunken px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-surface focus:ring-4 focus:ring-ring/30"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-muted-foreground">
            Confirm New Password
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            className="w-full rounded-2xl border border-border bg-surface-sunken px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-surface focus:ring-4 focus:ring-ring/30"
            required
          />
        </label>
      </div>

      {(message || errorMessage) && (
        <div
          className={`mt-5 rounded-2xl border p-4 text-sm font-semibold ${
            errorMessage
              ? "border-danger/30 bg-danger-subtle text-danger-subtle-foreground"
              : "border-success/30 bg-success-subtle text-success-subtle-foreground"
          }`}
        >
          {errorMessage ?? message}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-2xl bg-primary min-h-control px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-raised transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {isSaving ? "Updating..." : "Update Password"}
        </button>
      </div>
    </form>
  );
}
