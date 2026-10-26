import { RequestForm } from "./RequestForm";

export const metadata = { title: "Request Access" };

export default async function RequestAccessPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <p className="eyebrow">Request access</p>
      <h1 className="mt-2 text-3xl font-bold">Apply for restricted access</h1>
      <ol className="mt-4 space-y-1 text-sm text-muted">
        <li>1. Submit this form.</li>
        <li>2. Verify your email address.</li>
        <li>3. Your request stays pending until an administrator reviews it.</li>
        <li>4. You'll get an email when you're approved.</li>
      </ol>
      <div className="mt-8">
        {sent ? (
          <div className="panel p-6">
            <p className="font-medium">Check your email</p>
            <p className="mt-2 text-sm text-muted">If this address isn't already registered, we've sent a verification link. It expires in 48 hours.</p>
          </div>
        ) : (
          <RequestForm />
        )}
      </div>
    </div>
  );
}
