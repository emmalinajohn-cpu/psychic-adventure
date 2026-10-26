"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pending }: { children: React.ReactNode; pending: React.ReactNode }) {
  const status = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary disabled:opacity-60" disabled={status.pending} aria-busy={status.pending}>
      {status.pending ? pending : children}
    </button>
  );
}
