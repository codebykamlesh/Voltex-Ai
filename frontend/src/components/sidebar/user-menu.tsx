"use client";

import { LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

export function UserMenu() {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  return (
    <div className="mt-1 flex items-center gap-3 px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden bg-[var(--outline-variant)]">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-4 w-4 text-[var(--on-surface-variant)]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-[var(--primary)]">
          {user.display_name || user.email || "User"}
        </p>
        <p className="truncate font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
          {user.provider}
        </p>
      </div>
      <button
        onClick={logout}
        className="shrink-0 p-1 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--error)]"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
