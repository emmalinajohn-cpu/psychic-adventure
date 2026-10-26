"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function ago(iso: string | null, now: number): string {
  if (!iso) return "no collection yet";
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "updated just now";
  if (mins < 60) return `updated ${mins} minute${mins === 1 ? "" : "s"} ago`;
  const h = Math.round(mins / 60);
  return `updated ${h} hour${h === 1 ? "" : "s"} ago`;
}

/** Shows when sources were last collected and refreshes the page's data when a new collection lands. */
export function Freshness({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [last, setLast] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const lastRef = useRef(initial);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) return;
        const { lastCollection } = (await res.json()) as { lastCollection: string | null };
        if (lastCollection && lastCollection !== lastRef.current) {
          lastRef.current = lastCollection;
          setLast(lastCollection);
          router.refresh();
        }
      } catch {
        // offline: keep showing the last known time
      }
    }, 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [router]);

  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-good" title={last ?? undefined}>
      <span className="size-1.5 animate-pulse rounded-full bg-good" />
      {last ? `Sources ${ago(last, now)}` : "Awaiting first collection"}
    </span>
  );
}
