"use client";

import { useActionState } from "react";
import { requestAccess, type RequestState } from "./actions";

function Field({ label, name, type = "text", hint }: { label: string; name: string; type?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      <input className="input mt-1" name={name} type={type} required autoComplete={type === "password" ? "new-password" : undefined} />
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export function RequestForm() {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestAccess, {});
  return (
    <form action={action} className="panel space-y-4 p-6">
      <Field label="Full name" name="full_name" />
      <Field label="Organisation" name="organisation" />
      <Field label="Position / role" name="position" />
      <Field label="Email address" name="email" type="email" hint="Use your work address. We'll send a verification link." />
      <label className="block">
        <span className="text-sm">Intended use</span>
        <textarea className="input mt-1 min-h-28" name="intended_use" required />
      </label>
      <Field label="Password" name="password" type="password" hint="At least 12 characters." />
      {state.error ? <p className="text-sm text-high">{state.error}</p> : null}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Submitting…" : "Submit request"}</button>
    </form>
  );
}
