import { describe, expect, it } from "vitest";
import { parseFeed, parseGuardian, stripHtml } from "../collector/feeds";

describe("parseFeed", () => {
  it("reads RSS 2.0 items and strips HTML", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>T</title>
      <item><title>Headline &amp; more</title><link>https://example.org/a</link>
      <description><![CDATA[<p>Body <b>text</b></p>]]></description><pubDate>Mon, 26 Oct 2026 10:26:10 +1300</pubDate><dc:creator>Reporter</dc:creator></item>
      <item><title></title><link>https://example.org/empty</link></item>
    </channel></rss>`;
    const entries = parseFeed(xml);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ url: "https://example.org/a", title: "Headline & more", description: "Body text", author: "Reporter" });
    expect(entries[0].publishedAt?.toISOString()).toBe("2026-10-25T21:26:10.000Z");
  });

  it("reads Atom entries with alternate links", () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>A</title>
      <entry><title>Atom item</title><link rel="alternate" href="https://example.org/b"/><updated>2026-10-20T00:00:00Z</updated><summary>S</summary></entry>
    </feed>`;
    expect(parseFeed(xml)).toEqual([
      { url: "https://example.org/b", title: "Atom item", description: "S", author: null, publishedAt: new Date("2026-10-20T00:00:00Z") },
    ]);
  });

  it("tolerates a byte-order mark and rejects non-feeds", () => {
    expect(parseFeed("﻿<rss><channel></channel></rss>")).toEqual([]);
    expect(() => parseFeed("<html></html>")).toThrow();
  });

  it("reads Guardian API results", () => {
    const out = parseGuardian({ response: { results: [{ webUrl: "https://g.co/x", webTitle: "G", webPublicationDate: "2026-10-01T00:00:00Z", fields: { trailText: "<p>t</p>" } }] } });
    expect(out[0]).toMatchObject({ url: "https://g.co/x", title: "G", description: "t" });
  });

  it("stripHtml decodes common entities", () => {
    expect(stripHtml("a&nbsp;&quot;b&quot; &#39;c&#039;")).toBe(`a "b" 'c'`);
  });
});
