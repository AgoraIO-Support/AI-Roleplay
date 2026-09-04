import Link from "next/link";

import {
  AiRolePlayIcon,
  CogIcon,
  LogOutIcon,
  LogOutIcon as LogoutGlyph,
  MenuIcon,
  PanelLeftIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { AuthSessionUser } from "@/src/lib/auth/session";

export function Header({
  user,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileNav,
}: {
  user: AuthSessionUser;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
}) {
  const initial =
    user.name.trim().charAt(0).toUpperCase() ||
    user.email.charAt(0).toUpperCase();

  return (
    // Sticky so navigation stays reachable from deep in long pages.
    <header className="sticky top-0 z-sticky border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Open navigation menu"
          onClick={onOpenMobileNav}
          className="lg:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={
            isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          aria-pressed={isSidebarCollapsed}
          onClick={onToggleSidebar}
          className="hidden lg:inline-flex"
        >
          <PanelLeftIcon
            className={`h-5 w-5 transition-transform duration-slow ease-out ${
              isSidebarCollapsed ? "rotate-180" : ""
            }`}
          />
        </Button>

        {/* Brand shows only where the sidebar isn't visible, avoiding a duplicate. */}
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-xl lg:hidden"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AiRolePlayIcon className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-semibold text-foreground">
            AI RolePlay Academy
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <div className="hidden h-8 w-px bg-border sm:block" />

          <Link
            href="/profile/password"
            className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors duration-fast hover:bg-secondary"
            title="Account settings"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary-subtle-foreground"
            >
              {initial}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[12rem] truncate text-sm font-medium leading-4 text-foreground">
                {user.name}
              </span>
              <span className="block max-w-[12rem] truncate text-xs leading-4 text-muted-foreground">
                {user.email}
              </span>
            </span>
            <CogIcon
              aria-hidden
              className="hidden h-4 w-4 text-muted-foreground sm:block"
            />
            <span className="sr-only">Account settings for {user.name}</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="hidden text-muted-foreground hover:bg-danger-subtle hover:text-danger sm:inline-flex"
            leadingIcon={<LogOutIcon className="h-4 w-4" />}
          >
            Log out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Log out"
            onClick={onLogout}
            className="text-muted-foreground hover:bg-danger-subtle hover:text-danger sm:hidden"
          >
            <LogoutGlyph className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
