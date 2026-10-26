import { XMLParser } from "fast-xml-parser";

export interface FeedEntry {
  url: string;
  title: string;
  description: string | null;
  author: string | null;
  publishedAt: Date | null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
});

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) return text((v as Record<string, unknown>)["#text"]);
  return "";
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function atomLink(link: unknown): string {
  for (const l of asArray(link as Record<string, string> | Record<string, string>[])) {
    if (typeof l === "string") return l;
    if (!l["@_rel"] || l["@_rel"] === "alternate") return l["@_href"] ?? "";
  }
  return "";
}

/** Parse an RSS 2.0 or Atom document into entries. Entries without a URL or title are dropped. */
export function parseFeed(xml: string): FeedEntry[] {
  const doc = parser.parse(xml.replace(/^﻿/, ""));
  const entries: FeedEntry[] = [];

  if (doc.rss !== undefined) {
    const channel = typeof doc.rss.channel === "object" ? doc.rss.channel : {};
    for (const item of asArray(channel.item)) {
      const url = text(item.link) || text(item.guid);
      const description = stripHtml(text(item.description) || text(item["content:encoded"]));
      entries.push({
        url: url.trim(),
        title: stripHtml(text(item.title)),
        description: description ? description.slice(0, 4000) : null,
        author: text(item["dc:creator"]) || text(item.author) || null,
        publishedAt: parseDate(text(item.pubDate) || text(item["dc:date"])),
      });
    }
  } else if (doc.feed) {
    for (const entry of asArray(doc.feed.entry)) {
      const description = stripHtml(text(entry.summary) || text(entry.content));
      entries.push({
        url: atomLink(entry.link).trim(),
        title: stripHtml(text(entry.title)),
        description: description ? description.slice(0, 4000) : null,
        author: text(entry.author?.name) || null,
        publishedAt: parseDate(text(entry.published) || text(entry.updated)),
      });
    }
  } else {
    throw new Error("Not an RSS or Atom document");
  }

  return entries.filter((e) => /^https?:\/\//.test(e.url) && e.title.length > 0);
}

interface GuardianResult {
  webUrl: string;
  webTitle: string;
  webPublicationDate: string;
  fields?: { trailText?: string; byline?: string };
}

export function parseGuardian(json: { response?: { results?: GuardianResult[] } }): FeedEntry[] {
  return (json.response?.results ?? []).map((r) => ({
    url: r.webUrl,
    title: r.webTitle,
    description: r.fields?.trailText ? stripHtml(r.fields.trailText) : null,
    author: r.fields?.byline ?? null,
    publishedAt: parseDate(r.webPublicationDate),
  }));
}
