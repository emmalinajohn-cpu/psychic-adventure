import { ItemCard } from "@/components/ItemCard";
import { publicBriefs } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Public Briefs" };

export default async function BriefsPage() {
  const briefs = await publicBriefs(50);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="eyebrow">Public intelligence briefs</p>
      <h1 className="mt-2 text-3xl font-bold">Latest verified developments</h1>
      <p className="mt-2 text-muted">Items an analyst has reviewed and released to the public, newest first.</p>
      <div className="mt-8 space-y-4">
        {briefs.length ? briefs.map((b) => <ItemCard key={b.id} item={b} />) : (
          <p className="panel px-5 py-8 text-center text-sm text-muted">No public briefs have been released yet.</p>
        )}
      </div>
    </div>
  );
}
