import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, ROLE_LABELS } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account" };

const STATUS_TEXT: Record<string, string> = {
  unverified: "Please verify your email address using the link we sent you.",
  pending: "Your request is pending. An administrator will review it and email you the outcome.",
  approved: "Your access is approved.",
  rejected: "Your request was not approved.",
  suspended: "Your access is suspended. Contact an administrator.",
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-2 text-3xl font-bold">{user.full_name}</h1>
      <div className="panel mt-6 space-y-2 p-6 text-sm">
        <p><span className="text-muted">Organisation:</span> {user.organisation}</p>
        <p><span className="text-muted">Position:</span> {user.position}</p>
        <p><span className="text-muted">Email:</span> {user.email}</p>
        <p><span className="text-muted">Role:</span> {ROLE_LABELS[user.role]}</p>
        <p className="pt-2">{STATUS_TEXT[user.status]}</p>
        {user.status === "approved" && user.role !== "registered" ? <Link href="/dashboard" className="btn btn-primary mt-2">Open dashboard</Link> : null}
      </div>
    </div>
  );
}
