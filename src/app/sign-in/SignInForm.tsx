"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <form action={action} className="panel space-y-4 p-6">
      <label className="block">
        <span className="text-sm">Email address</span>
        <input className="input mt-1" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block">
        <span className="text-sm">Password</span>
        <input className="input mt-1" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error ? <p className="text-sm text-high">{state.error}</p> : null}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
