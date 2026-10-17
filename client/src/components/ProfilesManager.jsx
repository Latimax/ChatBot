import React, { useRef, useState } from 'react';
import {
  Bookmark,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Check,
  Play,
  FileCode,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

const PRESET_PROFILES = [
  {
    id: 'preset_saas',
    name: 'Acme Cloud Support (Starter Default)',
    description: 'Cloud hosting assistant with pricing, SLAs, and escalation policies.',
    data: {
      model: 'openai/gpt-oss-20b',
      systemInstructions: 'You are Acme Cloud Solutions friendly, accurate support assistant. Use provided organization facts when applicable, do not invent company details, acknowledge uncertainty, and keep answers helpful and clear.',
      temperature: 0.7,
      maxCompletionTokens: 1024,
      isStreaming: true
    }
  },
  {
    id: 'preset_strict',
    name: 'Strict Compliance & Security Assistant',
    description: 'Enforces strict organizational safety, zero hallucinations, and mandatory human escalation for security events.',
    data: {
      model: 'openai/gpt-oss-120b',
      systemInstructions: 'You are a strict compliance and security assistant. Strictly adhere to verified organization facts. If any piece of information is not explicitly documented in the organization context, reply with "I do not have verified documentation for this" and refer to the human security desk. Never guess or hallucinate.',
      temperature: 0.2,
      maxCompletionTokens: 1024,
      isStreaming: true
    }
  },
  {
    id: 'preset_concise',
    name: 'Concise Bullet-Point Bot',
    description: 'Ultra-concise response style tailored for quick mobile reference.',
    data: {
      model: 'qwen/qwen3.8-27b',
      systemInstructions: 'Answer every user question in 3 bullet points maximum. Be direct, authoritative, and cite facts directly from the company background reference without conversational filler.',
      temperature: 0.4,
      maxCompletionTokens: 512,
      isStreaming: true
    }
  }
];

export function ProfilesManager({
  savedProfiles,
  loadProfile,
  deleteProfile,
  exportProfiles,
  importProfiles,
  resetToDefaults,
  clearAllData,
  activeProfileName
}) {
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      const success = importProfiles(text);
      setImportStatus(success ? 'Imported successfully!' : 'Failed to parse JSON profile');
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Prompt Profiles & Playground Presets</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Save, restore, export, and share testing configurations (model selection, company background, custom few-shot messages, and temperature).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportProfiles}
            disabled={savedProfiles.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export JSON</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import JSON</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Safety Notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300">Zero Key Exposure Guarantee:</strong> Profile exports and browser local storage never contain API keys. Keys reside exclusively on the server.
        </div>
      </div>

      {/* 1. User Saved Profiles */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Your Saved Custom Profiles ({savedProfiles.length})
        </h3>

        {savedProfiles.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
            No saved profiles yet. Customize instructions and context in the Prompt Studio and click "Save Profile".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedProfiles.map((p) => {
              const isActive = activeProfileName === p.name;
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {p.name}
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500 text-white font-medium">
                            Active
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-indigo-300 font-mono">
                      Model: {p.data?.model || '—'}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-2">
                      {p.data?.systemInstructions || 'No instructions'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => loadProfile(p)}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 transition"
                    >
                      <Play className="w-3 h-3 fill-current" /> Load Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProfile(p.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Built-in Preset Starters */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Built-in Archetype Presets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_PROFILES.map((preset) => (
            <div
              key={preset.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-700 transition"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">{preset.name}</h4>
                <p className="text-[11px] text-slate-400">{preset.description}</p>
                <div className="text-[10px] font-mono text-indigo-400 pt-1">
                  Model: {preset.data.model}
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadProfile(preset)}
                className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1 transition"
              >
                <Play className="w-3 h-3 fill-current" /> Apply Preset
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Reset and Danger Zone */}
      <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={resetToDefaults}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
          <span>Reset Prompt Studio to Defaults</span>
        </button>

        <div>
          {confirmClearOpen ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400 font-medium">Are you sure?</span>
              <button
                type="button"
                onClick={() => {
                  clearAllData();
                  setConfirmClearOpen(false);
                }}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition"
              >
                Yes, Clear All
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear All Local Storage Data</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
