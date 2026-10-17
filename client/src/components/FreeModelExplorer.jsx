import React, { useState } from 'react';
import {
  Compass,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Zap,
  RotateCw,
  Layers,
  ArrowRight
} from 'lucide-react';

export function FreeModelExplorer({
  models,
  freeTierSnapshot,
  selectedModel,
  setSelectedModel,
  onSelectAndChat,
  loadModelsList,
  loadingModels,
  liveDiscovery
}) {
  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);

  const filteredModels = models.filter((m) => {
    if (freeOnly && !m.documentedFreeTier) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.id.toLowerCase().includes(q) ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.owned_by && m.owned_by.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Explanation */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Free-Tier Model Explorer & Rate Limits</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                Snapshot: {freeTierSnapshot?.lastVerified || '2026-10-17'}
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Explore chat-capable models and their documented Groq Free Plan allowances. Groq enforces multi-dimensional rate limits where the first exhausted quota (RPD, TPM, or RPM) restricts further requests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadModelsList(true)}
              disabled={loadingModels}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-40"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh Discovery</span>
            </button>

            <a
              href="https://console.groq.com/docs/rate-limits"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <span>Groq Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Live vs Documented Snapshot distinction notice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 mt-1 shrink-0" />
            <span>
              <strong>Documented Free Plan Limits:</strong> Reference snapshot from official docs; does not imply unlimited access.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <span>
              <strong>Live Discovery ({liveDiscovery ? 'Active' : 'Offline'}):</strong> Models currently returned by Groq's <code className="text-slate-300">/models</code> endpoint.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
            <span>
              <strong>Observed Response Headers:</strong> Live RPD and TPM allowances captured in the Inspector after calls.
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by model ID or developer..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
              className="accent-indigo-500 rounded cursor-pointer"
            />
            <span>Documented Free Models Only</span>
          </label>
        </div>
      </div>

      {/* Models Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((m) => {
          const isSelected = m.id === selectedModel;
          const isDocFree = m.documentedFreeTier;
          const details = m.freeTierDetails;

          return (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {m.name || m.id}
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500 text-white font-semibold">
                          Active
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 truncate max-w-[220px]">
                      {m.id}
                    </p>
                  </div>

                  {isDocFree ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Sparkles className="w-3 h-3" />
                      Free Plan
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      Standard
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-2">
                  {details?.description || m.owned_by || 'Chat completion model'}
                </p>

                {/* Documented Limits Table */}
                {isDocFree && details ? (
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500">RPM / RPD</div>
                      <div className="font-mono text-slate-200 font-semibold">
                        {details.requestsPerMinute} / {details.requestsPerDay.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">TPM / TPD</div>
                      <div className="font-mono text-indigo-300 font-semibold">
                        {details.tokensPerMinute.toLocaleString()} / {details.tokensPerDay.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-500 italic">
                    Free-tier status unverified in snapshot. Account-specific limits apply.
                  </div>
                )}

                {/* Context Window & Developer */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Context: <strong className="text-slate-300">{m.context_window ? `${(m.context_window / 1024).toFixed(0)}k` : '—'}</strong></span>
                  <span>Dev: <strong className="text-slate-300">{m.owned_by}</strong></span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedModel(m.id);
                  if (onSelectAndChat) onSelectAndChat();
                }}
                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <span>{isSelected ? 'Currently Selected' : 'Select for Chat'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
