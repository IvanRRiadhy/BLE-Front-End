// src/store/apps/tracking/NTFY.ts

import { getConfig } from 'src/config';

type Callback = (data: any) => void;
const CONTROLLERS: Record<string, EventSource> = {};
const CALLBACKS: Record<string, Callback[]> = {};

// ❌ old: const DEFAULT_BASE = import.meta.env.VITE_NTFY_URL;
// ✔ dynamic:
export let DEFAULT_BASE = '';

export function initializeNTFYConfig() {
  DEFAULT_BASE = getConfig().NTFY_URL; // comes from /config.json
}

export interface NtfyOptions {
  baseUrl?: string;
  since?: string;
}

function resolveSseUrl(baseUrl: string, topic: string, since?: string) {
  let base = (baseUrl || DEFAULT_BASE).replace(/\/+$/, '');
  let top = topic.trim();

  if (/^https?:\/\//i.test(top)) {
    const u = new URL(top);
    base = `${u.protocol}//${u.host}`;
    top = u.pathname.replace(/^\/+/, '');
  } else if (/^[\w.-]+:\d+\/.+/.test(top)) {
    const u = new URL(`http://${top}`);
    base = `${u.protocol}//${u.host}`;
    top = u.pathname.replace(/^\/+/, '');
  }

  const url = new URL(`${base}/${encodeURIComponent(top)}/sse`);
  if (since) url.searchParams.set('since', since);
  return url.toString();
}

export function startNTFYclient(onMessage: Callback, topic: string, opts: NtfyOptions = {}) {
  const sseUrl = resolveSseUrl(opts.baseUrl || DEFAULT_BASE, topic, opts.since);

  if (!CALLBACKS[topic]) CALLBACKS[topic] = [];
  if (!CALLBACKS[topic].includes(onMessage)) CALLBACKS[topic].push(onMessage);

  if (!CONTROLLERS[topic]) {
    const es = new EventSource(sseUrl);

    es.addEventListener('open', () => {
      console.log(`[NTFY] Successfully connected to topic "${topic}"`);
    });

    es.addEventListener('message', (e: MessageEvent) => {
      try {
        (CALLBACKS[topic] || []).forEach(cb => cb(JSON.parse(e.data)));
      } catch {
        (CALLBACKS[topic] || []).forEach(cb => cb(e.data));
      }
    });

    es.addEventListener('error', () => {
      try {
        es.close();
      } finally {
        delete CONTROLLERS[topic];
      }
    });

    CONTROLLERS[topic] = es;
  }

  return () => {
    CALLBACKS[topic] = (CALLBACKS[topic] || []).filter(cb => cb !== onMessage);
    if (!CALLBACKS[topic]?.length) {
      console.log(`[NTFY] Unsubscribing from topic "${topic}"`);
      try {
        CONTROLLERS[topic]?.close();
      } finally {
        delete CONTROLLERS[topic];
        delete CALLBACKS[topic];
      }
    }
  };
}
