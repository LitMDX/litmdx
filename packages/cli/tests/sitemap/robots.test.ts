import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { renderRobots, buildRobots } from '../../src/sitemap/robots.js';

const tmpRoot = join(tmpdir(), `litmdx-robots-test-${Date.now()}`);
const outDir = join(tmpRoot, 'dist');

beforeAll(() => mkdirSync(outDir, { recursive: true }));
afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }));

// ─── renderRobots ─────────────────────────────────────────────────────────────

describe('renderRobots', () => {
  it('always includes User-agent: * and Allow: /', () => {
    const robots = renderRobots();
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
  });

  it('omits Sitemap line when siteUrl is not provided', () => {
    expect(renderRobots()).not.toContain('Sitemap:');
  });

  it('includes Sitemap line when siteUrl is provided', () => {
    expect(renderRobots('https://example.com')).toContain(
      'Sitemap: https://example.com/sitemap.xml',
    );
  });

  it('strips trailing slash from siteUrl in Sitemap directive', () => {
    const robots = renderRobots('https://example.com/');
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml');
    expect(robots).not.toContain('//sitemap.xml');
  });

  it('ends with a newline', () => {
    expect(renderRobots()).toMatch(/\n$/);
    expect(renderRobots('https://example.com')).toMatch(/\n$/);
  });
});

// ─── buildRobots ──────────────────────────────────────────────────────────────

describe('buildRobots', () => {
  it('writes robots.txt to outDir', () => {
    buildRobots(outDir);
    const content = readFileSync(join(outDir, 'robots.txt'), 'utf8');
    expect(content).toContain('User-agent: *');
  });

  it('includes correct Sitemap URL when siteUrl is given', () => {
    buildRobots(outDir, 'https://litmdx.dev');
    const content = readFileSync(join(outDir, 'robots.txt'), 'utf8');
    expect(content).toContain('Sitemap: https://litmdx.dev/sitemap.xml');
  });

  it('does not include Sitemap line when siteUrl is omitted', () => {
    buildRobots(outDir);
    const content = readFileSync(join(outDir, 'robots.txt'), 'utf8');
    expect(content).not.toContain('Sitemap:');
  });
});
