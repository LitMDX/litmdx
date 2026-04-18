/**
 * AI assistant integration — connects to a running @litmdx/agent server.
 *
 * Start the agent separately:
 *   npx @litmdx/agent --docs ./docs --provider openai
 *
 * Then point litmdx at it:
 *   agent: { enabled: true, serverUrl: 'http://localhost:8000' }
 */
export interface AgentConfig {
  enabled?: boolean;
  /** Display name shown in the chat widget. Default: 'AI Assistant'. */
  name?: string;
  /**
   * URL of the running @litmdx/agent server.
   * - In dev: Vite proxies /api/agent/* → this URL (no CORS issues).
   * - In prod (external host): the browser calls this URL directly.
   * Default: 'http://localhost:8000'
   */
  serverUrl?: string;
}

/**
 * Browser-safe agent config serialized to virtual:litmdx-config.
 * Never includes secrets. Only exposes what the AgentChat widget needs.
 */
export interface ResolvedAgentConfig {
  enabled: true;
  name: string;
  /**
   * Full server URL of the running @litmdx/agent instance.
   * Used by the CLI Vite proxy as the proxy target.
   * Also serialized into virtual:litmdx-config — not a secret.
   * Default: 'http://localhost:8000'.
   */
  serverUrl: string;
  /**
   * Direct URL for browser → agent calls.
   * Undefined when serverUrl is localhost (browser uses /api/agent via proxy).
   * Set when serverUrl is an external host (e.g. https://my-agent.railway.app).
   */
  endpointUrl: string | undefined;
}

export function resolveAgentConfig(agent: AgentConfig): ResolvedAgentConfig {
  const serverUrl = agent.serverUrl ?? process.env['LITMDX_AGENT_URL'] ?? 'http://localhost:8000';
  const isLocalhost = serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1');
  return {
    enabled: true,
    name: agent.name ?? 'AI Assistant',
    serverUrl,
    endpointUrl: isLocalhost ? undefined : serverUrl,
  };
}
