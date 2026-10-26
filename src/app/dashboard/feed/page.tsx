import { FeedFilters } from "@/components/FeedFilters";
import { ItemCard } from "@/components/ItemCard";
import { feedFilter } from "@/lib/params";
import { approvedFeed } from "@/lib/queries";

export const metadata = { title: "Intelligence Feed" };

export default async function FeedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = feedFilter(await searchParams);
  const items = await approvedFeed({ ...f, limit: 100 });
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Advanced search</p>
        <h1 className="mt-1 text-2xl font-bold">Intelligence feed</h1>
        <p className="mt-1 text-sm text-muted">Approved reporting, newest first. {items.length} result{items.length === 1 ? "" : "s"}.</p>
      </div>
      <FeedFilters action="/dashboard/feed" values={{ ...f }} />
      <div className="space-y-3">
        {items.length ? items.map((i) => <ItemCard key={i.id} item={i} showAnalyst />) : <p className="panel px-5 py-8 text-center text-sm text-muted">No approved items match.</p>}
      </div>
    </div>
  );
}
