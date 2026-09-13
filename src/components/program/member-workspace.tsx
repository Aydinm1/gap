"use client";

import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { SubmissionAttempt } from "@/lib/program/types";

export type SubmissionDraft = { method?: "file" | "link"; file?: File; url: string };
type Workspace = {
  attempts: SubmissionAttempt[];
  setAttempts: Dispatch<SetStateAction<SubmissionAttempt[]>>;
  drafts: Record<string, SubmissionDraft>;
  setDrafts: Dispatch<SetStateAction<Record<string, SubmissionDraft>>>;
};
const Context = createContext<Workspace | null>(null);

export function MemberWorkspace({ initialAttempts, children }: { initialAttempts: readonly SubmissionAttempt[]; children: ReactNode }) {
  const [attempts, setAttempts] = useState([...initialAttempts]);
  const [drafts, setDrafts] = useState<Record<string, SubmissionDraft>>({});
  const dirty = Object.values(drafts).some((draft) => draft.file || draft.url.trim());
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return <Context.Provider value={{ attempts, setAttempts, drafts, setDrafts }}>{children}</Context.Provider>;
}

export function useMemberWorkspace() { return useContext(Context); }

export function useMemberAttempts(initialAttempts: readonly SubmissionAttempt[]) {
  const workspace = useMemberWorkspace();
  const [local, setLocal] = useState([...initialAttempts]);
  return [workspace?.attempts ?? local, workspace?.setAttempts ?? setLocal] as const;
}
