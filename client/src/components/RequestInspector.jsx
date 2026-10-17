import React, { useState } from 'react';
import {
  Code,
  Gauge,
  Activity,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Info,
  Clock,
  Zap,
  ShieldCheck,
  RotateCw
} from 'lucide-react';

export function RequestInspector({
  effectivePayload,
  previewLoading,
  lastUsage,
  lastRateLimits,
  lastLatencyMs,
  lastError,
  lastStatus,
  selectedModel
}) {
  const [activeTab, setActiveTab] = useState('payload');
  const [copied, setCopied] = useState(false);

  const handleCopyPayload = () => {
    if (!effectivePayload) return;
    navigator.clipboard.writeText(JSON.stringify(effectivePayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Approximate tokens per second (only when completion tokens & latency available)
  const tokensPerSec =
    lastUsage?.completion_tokens && lastLatencyMs && lastLatencyMs > 0
      ? ((lastUsage.completion_tokens / (lastLatencyMs / 1000))).toFixed(1)
      : null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Top Header & Tab Navigation */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Code className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Request Inspector</h2>
        </div>

        {/* Subtabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('payload')}
            className={`px-2 py-1 rounded font-medium transition ${
              activeTab === 'payload'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Payload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-2 py-1 rounded font-medium transition ${
              activeTab === 'metrics'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ratelimits')}
            className={`px-2 py-1 rounded font-medium transition ${
              activeTab === 'ratelimits'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rate Limits
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error Alert Banner if last request failed */}
        {lastError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {lastError.code || 'API_ERROR'} (Status {lastStatus || 500})
              </span>
            </div>
            <p>{lastError.message}</p>
            {lastRateLimits?.retryAfter && (
              <p className="font-mono text-[11px] text-amber-300">
                ⏳ Groq suggested retry-after: {lastRateLimits.retryAfter} seconds
              </p>
            )}
          </div>
        )}

        {/* 1. PAYLOAD TAB */}
        {activeTab === 'payload' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Effective Groq Request (`messages` array)</span>
              <button
                type="button"
                onClick={handleCopyPayload}
                disabled={!effectivePayload}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy JSON
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-indigo-200 overflow-x-auto max-h-[480px]">
              {previewLoading && !effectivePayload ? (
                <div className="text-slate-500 py-6 text-center">Loading effective payload preview...</div>
              ) : effectivePayload ? (
                <pre>{JSON.stringify(effectivePayload, null, 2)}</pre>
              ) : (
                <div className="text-slate-500 py-6 text-center">Type a prompt to preview effective payload</div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              This preview reflects the server-side <code className="text-indigo-400">buildMessages()</code> assembly exactly as sent to <code className="text-slate-400">api.groq.com/openai/v1/chat/completions</code>.
            </p>
          </div>
        )}

        {/* 2. METRICS TAB */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Latency */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Request Latency</span>
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {lastLatencyMs ? `${lastLatencyMs} ms` : '—'}
                </div>
                <div className="text-[10px] text-slate-500">Roundtrip network + inference</div>
              </div>

              {/* Speed approximation */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Generation Speed</span>
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {tokensPerSec ? `~${tokensPerSec} t/s` : '—'}
                </div>
                <div className="text-[10px] text-slate-500">Estimated output token speed</div>
              </div>
            </div>

            {/* Token Breakdown Cards */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Token Consumption
                </span>
                <span className="font-mono text-slate-400">
                  Total: {lastUsage?.total_tokens ?? '—'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-900 rounded-lg">
                  <div className="text-[10px] text-slate-500">Prompt</div>
                  <div className="text-sm font-bold font-mono text-slate-200">
                    {lastUsage?.prompt_tokens ?? '—'}
                  </div>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <div className="text-[10px] text-slate-500">Completion</div>
                  <div className="text-sm font-bold font-mono text-indigo-400">
                    {lastUsage?.completion_tokens ?? '—'}
                  </div>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <div className="text-[10px] text-slate-500">Total</div>
                  <div className="text-sm font-bold font-mono text-amber-400">
                    {lastUsage?.total_tokens ?? '—'}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                Metrics provided directly from Groq completions response object.
              </div>
            </div>
          </div>
        )}

        {/* 3. RATE LIMITS TAB */}
        {activeTab === 'ratelimits' && (
          <div className="space-y-4">
            <div className="p-3 bg-indigo-950/30 border border-indigo-800/30 rounded-xl text-xs text-indigo-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Observed Live Headers</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Captured directly from <code className="text-indigo-300">x-ratelimit-*</code> response headers of your last request for{' '}
                <strong className="text-slate-200">{selectedModel}</strong>.
              </p>
            </div>

            <div className="space-y-3">
              {/* Requests Per Day (RPD) */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Daily Requests (RPD)</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    x-ratelimit-remaining-requests
                  </span>
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-lg font-bold text-emerald-400">
                    {lastRateLimits?.requestsPerDayRemaining !== null && lastRateLimits?.requestsPerDayRemaining !== undefined
                      ? lastRateLimits.requestsPerDayRemaining.toLocaleString()
                      : 'Not available'}
                  </span>
                  <span className="text-xs text-slate-500">
                    / {lastRateLimits?.requestsPerDayLimit ? lastRateLimits.requestsPerDayLimit.toLocaleString() : '—'} limit
                  </span>
                </div>
                {lastRateLimits?.requestsReset && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Resets in: {lastRateLimits.requestsReset}
                  </div>
                )}
              </div>

              {/* Tokens Per Minute (TPM) */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Tokens Per Minute (TPM)</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    x-ratelimit-remaining-tokens
                  </span>
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-lg font-bold text-indigo-400">
                    {lastRateLimits?.tokensPerMinuteRemaining !== null && lastRateLimits?.tokensPerMinuteRemaining !== undefined
                      ? lastRateLimits.tokensPerMinuteRemaining.toLocaleString()
                      : 'Not available'}
                  </span>
                  <span className="text-xs text-slate-500">
                    / {lastRateLimits?.tokensPerMinuteLimit ? lastRateLimits.tokensPerMinuteLimit.toLocaleString() : '—'} limit
                  </span>
                </div>
                {lastRateLimits?.tokensReset && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Resets in: {lastRateLimits.tokensReset}
                  </div>
                )}
              </div>
            </div>

            {/* Documentation Note & Console link */}
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 space-y-2">
              <p>
                ⚠️ <strong>Important distinction:</strong> Groq's headers supply remaining <strong>RPD</strong> and <strong>TPM</strong>, not RPM or TPD. Do not extrapolate session sums to total account usage.
              </p>
              <a
                href="https://console.groq.com/settings/limits"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                <span>View complete account quotas in Groq Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
