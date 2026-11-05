#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const OUT = path.join(ROOT, 'rss.xml');
const SITE = 'https://ulmaji.kr';
const escapeXml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const stripTags = (value) => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const decodeEntities = (value) => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const meta = (html, name) => html.match(new RegExp("<meta\\s+name=[\\\"']" + name + "[\\\"']\\s+content=[\\\"']([^\\\"']*)[\\\"']", 'i'))?.[1] ?? '';
const canonical = (html) => html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] ?? '';
const title = (html) => decodeEntities(stripTags(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')).replace(/\s*-\s*얼마지\?\s*$/, '').trim();
const sitemapText = await readFile(SITEMAP, 'utf8');
const dates = new Map([...sitemapText.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?(?:<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/url>/g)].map((match) => [match[1], match[2] || '']));
const sitemapOrder = [...dates.keys()];
const htmlPaths = [];
const visit = async (dir, rel = '') => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const next = rel ? path.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) await visit(path.join(dir, entry.name), next);
    else if (entry.name.endsWith('.html') && (next.startsWith('guide/') || next.startsWith('calculators/'))) htmlPaths.push(next);
  }
};
await visit(ROOT);
const byCanonical = new Map();
for (const rel of htmlPaths) {
  const html = await readFile(path.join(ROOT, rel), 'utf8');
  const url = canonical(html);
  if (url) byCanonical.set(url, { title: title(html), description: decodeEntities(meta(html, 'description')) });
}
const fallbackDate = new Date().toISOString().slice(0, 10);
const items = sitemapOrder.filter((url) => byCanonical.has(url)).map((url) => {
  const item = byCanonical.get(url);
  const date = dates.get(url) || fallbackDate;
  const pubDate = new Date(date + 'T00:00:00Z').toUTCString();
  return ['    <item>', '      <title>' + escapeXml(item.title) + '</title>', '      <link>' + escapeXml(url) + '</link>', '      <guid isPermaLink="true">' + escapeXml(url) + '</guid>', '      <description>' + escapeXml(item.description) + '</description>', '      <pubDate>' + pubDate + '</pubDate>', '    </item>'].join('\n');
});
const home = await readFile(path.join(ROOT, 'index.html'), 'utf8');
const channelDescription = decodeEntities(meta(home, 'description'));
const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<rss version="2.0">', '  <channel>', '    <title>얼마지?</title>', '    <link>' + SITE + '/</link>', '    <description>' + escapeXml(channelDescription) + '</description>', '    <language>ko</language>', ...items, '  </channel>', '</rss>', ''].join('\n');
await writeFile(OUT, xml);
console.log('Wrote ' + items.length + ' RSS items to ' + OUT);
