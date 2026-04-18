import { useState, useRef, useEffect, useCallback, useId } from 'react';

// ─── Minimal Markdown renderer (no external dependencies) ─────────────────────
//
// Handles the subset that documentation agents typically produce:
//   • Fenced code blocks  ``` lang \n code \n ```  (partial fences during streaming)
//   • Headings            ## Heading
//   • Unordered lists     - item  /  * item
//   • Ordered lists       1. item
//   • Inline code         `code`
//   • Bold                **text** / __text__
//   • Italic              *text* / _text_
//   • Links               [label](url)
//   • Paragraphs with single-newline → <br>

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re =
    /`([^`\n]+)`|\*\*(.+?)\*\*|__(.+?)__|\*([^*\n]+)\*|_([^_\n]+)_|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const [, code, b1, b2, em1, em2, lbl, url] = m;
    if (code !== undefined)
      parts.push(
        <code key={key++} className="agent-chat-inline-code">
          {code}
        </code>,
      );
    else if (b1 !== undefined || b2 !== undefined)
      parts.push(<strong key={key++}>{b1 ?? b2}</strong>);
    else if (em1 !== undefined || em2 !== undefined) parts.push(<em key={key++}>{em1 ?? em2}</em>);
    else if (lbl !== undefined && url !== undefined) {
      const ext = /^https?:\/\//.test(url);
      parts.push(
        <a
          key={key++}
          href={url}
          className="agent-chat-link"
          target={ext ? '_blank' : undefined}
          rel={ext ? 'noopener noreferrer' : undefined}
        >
          {lbl}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

type MdBlock =
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'callout'; calloutType: string; content: string }
  | { kind: 'p'; lines: string[] };

function parseTextIntoBlocks(src: string, out: MdBlock[]): void {
  for (const para of src.split(/\n{2,}/)) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const hm = trimmed.match(/^(#{1,4})\s+(.*)/);
    if (hm) {
      out.push({ kind: 'h', level: hm[1].length, text: hm[2] });
      continue;
    }

    // Table: at least two lines starting and ending with |
    // and a separator row (|---|---| pattern)
    const lines = trimmed.split('\n');
    const isTableLine = (l: string) => l.trim().startsWith('|') && l.trim().endsWith('|');
    const isSepLine = (l: string) => /^\|[-|:\s]+\|$/.test(l.trim());
    if (lines.length >= 2 && isTableLine(lines[0]) && lines.some(isSepLine)) {
      const parseRow = (l: string) =>
        l
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
      const head = parseRow(lines[0]);
      const rows: string[][] = [];
      let pastSep = false;
      for (let i = 1; i < lines.length; i++) {
        if (isSepLine(lines[i])) {
          pastSep = true;
          continue;
        }
        if (pastSep && isTableLine(lines[i])) rows.push(parseRow(lines[i]));
      }
      out.push({ kind: 'table', head, rows });
      continue;
    }

    // Callout: paragraph produced by rawToMarkdown — **Type:** content
    const calloutMatch = trimmed.match(/^\*\*([A-Za-z]+):\*\*\s*([\s\S]*)$/);
    if (calloutMatch) {
      out.push({
        kind: 'callout',
        calloutType: calloutMatch[1].toLowerCase(),
        content: calloutMatch[2].trim(),
      });
      continue;
    }

    const acc: string[] = [];
    let listKind: 'ul' | 'ol' | null = null;
    const flush = () => {
      if (!acc.length) return;
      out.push(
        listKind === 'ul'
          ? { kind: 'ul', items: [...acc] }
          : listKind === 'ol'
            ? { kind: 'ol', items: [...acc] }
            : { kind: 'p', lines: [...acc] },
      );
      acc.length = 0;
      listKind = null;
    };
    for (const line of lines) {
      const ulM = line.match(/^[-*] (.*)/);
      const olM = line.match(/^\d+\. (.*)/);
      if (ulM) {
        if (listKind !== 'ul') flush();
        listKind = 'ul';
        acc.push(ulM[1]);
      } else if (olM) {
        if (listKind !== 'ol') flush();
        listKind = 'ol';
        acc.push(olM[1]);
      } else {
        if (listKind !== null) flush();
        acc.push(line);
      }
    }
    flush();
  }
}

function parseMd(src: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const codeRe = /```(\w*)[ \t]*\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  codeRe.lastIndex = 0;
  while ((m = codeRe.exec(src)) !== null) {
    if (m.index > last) parseTextIntoBlocks(src.slice(last, m.index), blocks);
    blocks.push({ kind: 'code', lang: m[1] ?? '', code: m[2].replace(/\n$/, '') });
    last = m.index + m[0].length;
  }
  const tail = src.slice(last);
  if (tail) {
    // Partial (unclosed) fence — common at end of streaming chunks
    const fenceIdx = tail.indexOf('```');
    if (fenceIdx >= 0) {
      if (fenceIdx > 0) parseTextIntoBlocks(tail.slice(0, fenceIdx), blocks);
      const fm = tail.slice(fenceIdx).match(/```(\w*)[ \t]*\n?([\s\S]*)/);
      blocks.push({ kind: 'code', lang: fm?.[1] ?? '', code: fm?.[2] ?? '' });
    } else {
      parseTextIntoBlocks(tail, blocks);
    }
  }
  return blocks;
}

function renderMd(src: string): React.ReactNode {
  if (!src) return null;
  return (
    <>
      {parseMd(src).map((b, i) => {
        if (b.kind === 'code') {
          return (
            <div key={i} className="agent-chat-code-block">
              {b.lang && <span className="agent-chat-code-lang">{b.lang}</span>}
              <pre>
                <code>{b.code}</code>
              </pre>
            </div>
          );
        }
        if (b.kind === 'h') {
          return (
            <p key={i} className={`agent-chat-h agent-chat-h${b.level}`}>
              {renderInline(b.text)}
            </p>
          );
        }
        if (b.kind === 'table') {
          return (
            <div key={i} className="agent-chat-table-wrap">
              <table className="agent-chat-table">
                <thead>
                  <tr>
                    {b.head.map((cell, j) => (
                      <th key={j}>{renderInline(cell)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, j) => (
                    <tr key={j}>
                      {row.map((cell, k) => (
                        <td key={k}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.kind === 'ul') {
          return (
            <ul key={i} className="agent-chat-list">
              {b.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === 'ol') {
          return (
            <ol key={i} className="agent-chat-list agent-chat-list--ol">
              {b.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        if (b.kind === 'callout') {
          return (
            <div key={i} className={`agent-chat-callout agent-chat-callout--${b.calloutType}`}>
              <span className="agent-chat-callout-type">{b.calloutType}</span>
              <span className="agent-chat-callout-body">{renderInline(b.content)}</span>
            </div>
          );
        }
        // paragraph — single newlines become <br>
        return (
          <p key={i} className="agent-chat-p">
            {b.lines.flatMap((line, j) => [
              ...renderInline(line),
              ...(j < b.lines.length - 1 ? [<br key={`br${j}`} />] : []),
            ])}
          </p>
        );
      })}
    </>
  );
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface AgentChatProps {
  projectTitle: string;
  agentName?: string;
  /**
   * Base URL of the agent HTTP server.
   * - Omit (or pass undefined) when the agent runs on the same host (default: `/api/agent`).
   * - Set to the external server URL when the agent is hosted separately,
   *   e.g. `'https://my-agent.railway.app'`.
   */
  agentEndpointUrl?: string;
}

export function AgentChat({
  projectTitle,
  agentName = 'AI Assistant',
  agentEndpointUrl,
}: AgentChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [panelSize, setPanelSize] = useState<{ width: number; height: number } | null>(null);
  const sessionId = useRef(
    (() => {
      const key = `litmdx-agent-session-${projectTitle}`;
      try {
        const stored = localStorage.getItem(key);
        if (stored) return stored;
      } catch {
        /* localStorage unavailable (SSR / private mode) */
      }
      const id =
        typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      try {
        localStorage.setItem(key, id);
      } catch {
        /* ignore */
      }
      return id;
    })(),
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const labelId = useId();

  // Register resize mouse/touch listeners once
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!resizingRef.current) return;
      if (e.cancelable) e.preventDefault();
      const { startX, startY, startW, startH } = resizingRef.current;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      // Panel anchors at bottom-right, so dragging top-left handle left/up increases size
      const newW = Math.max(260, startW - (clientX - startX));
      const newH = Math.max(280, startH - (clientY - startY));
      setPanelSize({ width: newW, height: newH });
    };
    const onUp = () => {
      resizingRef.current = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    resizingRef.current = {
      startX: clientX,
      startY: clientY,
      startW: rect.width,
      startH: rect.height,
    };
  }, []);

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      // Small delay so the CSS transition finishes first
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close with Escape
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        abortRef.current?.abort();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const clearMemory = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    setBusy(false);

    // Delete the server-side session
    try {
      const agentBase = agentEndpointUrl ? agentEndpointUrl.replace(/\/$/, '') : '/api/agent';
      await fetch(`${agentBase}/session?session_id=${encodeURIComponent(sessionId.current)}`, {
        method: 'DELETE',
      });
    } catch {
      /* best-effort */
    }

    // Generate a fresh session ID and persist it
    const key = `litmdx-agent-session-${projectTitle}`;
    const newId =
      typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    try {
      localStorage.setItem(key, newId);
    } catch {
      /* ignore */
    }
    sessionId.current = newId;

    // Clear the UI
    setMessages([]);
  }, [agentEndpointUrl, projectTitle]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setBusy(true);

    // Append a streaming placeholder for the assistant reply
    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const agentBase = agentEndpointUrl ? agentEndpointUrl.replace(/\/$/, '') : '/api/agent';
      const res = await fetch(`${agentBase}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId.current }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const chunk = line.slice(6);
          if (chunk === '[DONE]') continue;
          if (chunk.startsWith('[STRUCTURED_OUTPUT]')) continue;
          if (chunk.startsWith('[ERROR]')) {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') {
                next[next.length - 1] = {
                  ...last,
                  content: chunk.replace('[ERROR] ', ''),
                  streaming: false,
                };
              }
              return next;
            });
            return;
          }
          // Unescape newlines encoded by the server
          const text = chunk.replace(/\\n/g, '\n');
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                content: last.content + text,
                streaming: true,
              };
            }
            return next;
          });
        }
      }

      // Mark streaming done
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') {
          next[next.length - 1] = { ...last, streaming: false };
        }
        return next;
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') {
          next[next.length - 1] = {
            ...last,
            content: 'Error connecting to the agent. Make sure the agent server is running.',
            streaming: false,
          };
        }
        return next;
      });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }, [input, busy]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        className="agent-chat-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={open}
        aria-controls="agent-chat-panel"
        title={open ? 'Close assistant' : 'Ask this documentation'}
      >
        {open ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="12" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="10" r="1" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div
        id="agent-chat-panel"
        ref={panelRef}
        className={`agent-chat-panel${open ? ' is-open' : ''}`}
        style={panelSize ? { width: panelSize.width, height: panelSize.height } : undefined}
        role="dialog"
        aria-modal="false"
        aria-labelledby={labelId}
      >
        {/* Drag handle — top-left corner to resize the panel */}
        <div
          className="agent-chat-resize-handle"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          aria-hidden
        />
        <div className="agent-chat-header">
          <span id={labelId} className="agent-chat-title">
            {agentName}
          </span>
          <span className="agent-chat-subtitle">{projectTitle}</span>
          <button
            className="agent-chat-clear"
            onClick={clearMemory}
            disabled={busy || messages.length === 0}
            title="Clear conversation and memory"
            aria-label="Clear conversation and memory"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>

        <div className="agent-chat-messages" aria-live="polite" aria-atomic="false">
          {messages.length === 0 ? (
            <p className="agent-chat-empty">Ask me anything about this documentation.</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`agent-chat-message agent-chat-message--${msg.role}`}>
                <span className="agent-chat-message-label">
                  {msg.role === 'user' ? 'You' : agentName}
                </span>
                <div className="agent-chat-message-content">
                  {msg.role === 'assistant' ? (
                    <>
                      <div className="agent-chat-md">{renderMd(msg.content)}</div>
                      {msg.streaming && (
                        <span className="agent-chat-cursor" aria-hidden>
                          ▋
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {msg.content || (msg.streaming ? null : '—')}
                      {msg.streaming && (
                        <span className="agent-chat-cursor" aria-hidden>
                          ▋
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="agent-chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <input
            ref={inputRef}
            className="agent-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question…"
            disabled={busy}
            autoComplete="off"
            aria-label="Message"
          />
          <button
            className="agent-chat-send"
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
          >
            {busy ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="agent-chat-spinner"
                aria-hidden
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
