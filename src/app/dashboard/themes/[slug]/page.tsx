import { notFound } from "next/navigation";
import { FeedFilters } from "@/components/FeedFilters";
import { ItemCard } from "@/components/ItemCard";
import { feedFilter } from "@/lib/params";
import { approvedFeed } from "@/lib/queries";
import { THEME_BY_SLUG } from "@/lib/reference";

export default async function ThemePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const theme = THEME_BY_SLUG.get(slug);
  if (!theme) notFound();
  const f = feedFilter(await searchParams);
  const items = await approvedFeed({ ...f, theme: slug, limit: 80 });
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Security dashboard</p>
        <h1 className="mt-1 text-2xl font-bold">{theme.name}</h1>
      </div>
      <FeedFilters action={`/dashboard/themes/${slug}`} values={{ ...f }} hide={["theme"]} />
      <div className="space-y-3">
        {items.length ? items.map((i) => <ItemCard key={i.id} item={i} showAnalyst />) : <p className="panel px-5 py-8 text-center text-sm text-muted">No approved {theme.name.toLowerCase()} reporting yet.</p>}
      </div>
    </div>
  );
}
