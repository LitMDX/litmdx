// WebMCP integration for LitMDX.
//
// Implements the W3C WebMCP spec (https://webmachinelearning.github.io/webmcp/)
// when the user has set `webmcp: true` in litmdx.config.ts.
//
// The API is a native browser capability — no external scripts required:
//   navigator.modelContext.registerTool({ name, description, inputSchema, execute })
//
// Registered tools:
//  - list_pages        → returns all routes with paths and titles
//  - navigate_to       → navigates the SPA to a given path
//  - get_current_page  → returns the current page path, title and description
//
// Tools are unregistered via AbortController when the component unmounts.
//
// Feature-detected: if navigator.modelContext is absent (browser not yet
// supporting the spec), registration is silently skipped.

import { useEffect, useRef } from 'react';
import type { NavigateFn, Route, PageMetaMap } from '../lib/types';

// ─── W3C WebMCP type declarations ─────────────────────────────────────────────
// https://webmachinelearning.github.io/webmcp/#idl-index

interface ModelContextClient {
  requestUserInteraction(callback: () => Promise<unknown>): Promise<unknown>;
}

interface ModelContextTool {
  name: string;
  description: string;
  inputSchema?: object;
  execute: (input: Record<string, unknown>, client: ModelContextClient) => Promise<unknown>;
  annotations?: { readOnlyHint?: boolean };
}

interface ModelContextRegisterToolOptions {
  signal?: AbortSignal;
}

interface ModelContext {
  registerTool(tool: ModelContextTool, options?: ModelContextRegisterToolOptions): void;
}

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
}

// ──────────────────────────────────────────────────────────────────────────────

interface WebMCPIntegrationProps {
  routes: Route[];
  meta: PageMetaMap;
  currentPath: string;
  onNavigate: NavigateFn;
  rawPages: Record<string, () => Promise<string>>;
}

export function WebMCPIntegration({
  routes,
  meta,
  currentPath,
  onNavigate,
  rawPages,
}: WebMCPIntegrationProps) {
  // Refs so tool handlers always read latest values without re-registering.
  const routesRef = useRef(routes);
  const metaRef = useRef(meta);
  const currentPathRef = useRef(currentPath);
  const onNavigateRef = useRef(onNavigate);
  const rawPagesRef = useRef(rawPages);

  routesRef.current = routes;
  metaRef.current = meta;
  currentPathRef.current = currentPath;
  onNavigateRef.current = onNavigate;
  rawPagesRef.current = rawPages;

  useEffect(() => {
    if (!('modelContext' in navigator) || !navigator.modelContext) return;

    const controller = new AbortController();
    const { signal } = controller;
    const ctx = navigator.modelContext;

    ctx.registerTool(
      {
        name: 'list_pages',
        description: 'List all available documentation pages with their paths and titles.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => {
          return routesRef.current.map((route) => {
            const frontmatter = metaRef.current[route.importKey];
            const pathSegments = route.path.split('/').filter(Boolean);
            return {
              path: route.path,
              title: frontmatter?.title ?? pathSegments.pop() ?? route.path,
            };
          });
        },
      },
      { signal },
    );

    ctx.registerTool(
      {
        name: 'navigate_to',
        description: 'Navigate to a documentation page by its path.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path of the page to navigate to, e.g. "/getting-started"',
            },
          },
          required: ['path'],
        },
        execute: async (input) => {
          const target = String(input.path);
          const match = routesRef.current.find((r) => r.path === target);
          if (!match) throw new Error(`Page not found: ${target}`);
          onNavigateRef.current(target);
          return { navigated: target };
        },
      },
      { signal },
    );

    ctx.registerTool(
      {
        name: 'get_current_page',
        description: 'Get information about the currently visible documentation page.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => {
          const currentRoute = routesRef.current.find((r) => r.path === currentPathRef.current);
          const frontmatter = currentRoute ? metaRef.current[currentRoute.importKey] : undefined;
          return {
            path: currentPathRef.current,
            title: frontmatter?.title ?? currentPathRef.current,
            description: frontmatter?.description ?? '',
          };
        },
      },
      { signal },
    );

    ctx.registerTool(
      {
        name: 'search_pages',
        description:
          'Search documentation pages by keyword. Matches against page title, description and path.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Keyword or phrase to search for' },
          },
          required: ['query'],
        },
        annotations: { readOnlyHint: true },
        execute: async (input) => {
          const q = String(input.query).toLowerCase();
          return routesRef.current
            .map((route) => {
              const fm = metaRef.current[route.importKey];
              return {
                path: route.path,
                title: fm?.title ?? route.path,
                description: fm?.description ?? '',
              };
            })
            .filter(
              (p) =>
                p.title.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.path.toLowerCase().includes(q),
            );
        },
      },
      { signal },
    );

    ctx.registerTool(
      {
        name: 'get_page_content',
        description: 'Get the full MDX source content of a documentation page by its path.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path of the page to read, e.g. "/getting-started"',
            },
          },
          required: ['path'],
        },
        annotations: { readOnlyHint: true },
        execute: async (input) => {
          const target = String(input.path);
          const route = routesRef.current.find((r) => r.path === target);
          if (!route) throw new Error(`Page not found: ${target}`);
          const load = rawPagesRef.current[route.importKey];
          if (!load) throw new Error(`Content not available for: ${target}`);
          const content = await load();
          return { path: target, content };
        },
      },
      { signal },
    );

    return () => controller.abort();
  }, []); // register once — handlers read from refs

  return null;
}
