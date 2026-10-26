import Link from "next/link";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="eyebrow">Authorised users</p>
      <h1 className="mt-2 text-3xl font-bold">Sign in</h1>
      <div className="mt-8"><SignInForm /></div>
      <p className="mt-4 text-sm text-muted">No account? <Link href="/request-access" className="text-accent">Request access</Link>.</p>
    </div>
  );
}
