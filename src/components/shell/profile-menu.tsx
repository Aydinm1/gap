"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProgramUser } from "@/lib/program/types";

export function ProfileMenu({
  user,
  links,
  cohortLabel,
}: {
  user: ProgramUser;
  links: readonly { label: string; href: string }[];
  cohortLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex min-h-11 items-center gap-3 rounded-lg px-1.5 text-left hover:bg-surface-subtle sm:px-2.5"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="grid size-9 place-items-center rounded-full bg-ink text-xs font-bold text-white">
          {user.initials}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-bold text-ink">{user.fullName}</span>
          <span className="block text-xs capitalize text-ink-soft">
            {user.role === "member" ? "Analyst" : "Admin"}
          </span>
        </span>
        <span aria-hidden="true" className="hidden text-ink-faint sm:inline">⌄</span>
      </button>

      {open ? (
        <div
          className="absolute right-0 z-20 mt-2 w-64 rounded-card border border-border bg-surface p-2 shadow-lg"
          role="menu"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-bold text-ink">{user.fullName}</p>
            <p className="mt-0.5 truncate text-xs text-ink-soft">{user.email}</p>
            {cohortLabel ? (
              <p className="mt-2 text-xs font-bold text-action">
                {cohortLabel}
              </p>
            ) : null}
          </div>
          {links.length ? (
            <div className="pt-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  className="flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-ink-soft hover:bg-surface-subtle hover:text-ink"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
