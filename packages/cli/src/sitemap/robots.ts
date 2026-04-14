import { writeFileSync } from 'fs';
import path from 'path';

export function renderRobots(siteUrl?: string): string {
  const lines = ['User-agent: *', 'Allow: /'];
  if (siteUrl) {
    const base = siteUrl.replace(/\/+$/, '');
    lines.push('', `Sitemap: ${base}/sitemap.xml`);
  }
  return lines.join('\n') + '\n';
}

export function buildRobots(outDir: string, siteUrl?: string): void {
  const content = renderRobots(siteUrl);
  const dest = path.join(outDir, 'robots.txt');
  writeFileSync(dest, content, 'utf8');
  console.log('  ✓ robots.txt written');
}
