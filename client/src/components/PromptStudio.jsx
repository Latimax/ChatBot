import React, { useRef, useState } from 'react';
import {
  Building2,
  FileText,
  Upload,
  RotateCcw,
  Sliders,
  AlertCircle,
  BookmarkPlus,
  Info,
  Check,
  Database,
  Search,
  Zap,
  CheckCircle2,
  RotateCw
} from 'lucide-react';
import { CustomMessageEditor } from './CustomMessageEditor.jsx';
import { STARTER_COMPANY_TEMPLATE, STARTER_SYSTEM_INSTRUCTIONS } from '../hooks/useChatPlayground.js';

export function PromptStudio({
  systemInstructions,
  setSystemInstructions,
  companyBackground,
  setCompanyBackground,
  customMessages,
  addCustomMessage,
  updateCustomMessage,
  moveCustomMessage,
  duplicateCustomMessage,
  removeCustomMessage,
  temperature,
  setTemperature,
  maxCompletionTokens,
  setMaxCompletionTokens,
  saveProfile,
  activeProfileName,
  selectedModel,
  models = [],
  useRag = false,
  setUseRag,
  ragTopK = 3,
  setRagTopK,
  ragStatus,
  indexingRag = false,
  handleIndexRagDocument,
  handleClearRagIndex
}) {
  const fileInputRef = useRef(null);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileSavedToast, setProfileSavedToast] = useState(false);
  const [indexSuccessToast, setIndexSuccessToast] = useState(false);

  // Active model metadata & rate limits
  const currentModelMeta = models.find(m => m.id === selectedModel);
  const tpmLimit = currentModelMeta?.freeTierDetails?.tokensPerMinute || 8000;

  // Character, word, and estimated token counts (~4 chars per token)
  const charCount = companyBackground.length;
  const wordCount = companyBackground.trim() ? companyBackground.trim().split(/\s+/).length : 0;
  const estTokens = Math.round(charCount / 4);
  const isOverTpmLimit = estTokens > tpmLimit;
  const isLargeContext = charCount > 3000;

  // Handle local text / md file import
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCompanyBackground(content);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleQuickSaveProfile = (e) => {
    e.preventDefault();
    if (!profileNameInput.trim()) return;
    saveProfile(profileNameInput.trim());
    setProfileNameInput('');
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2500);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Studio Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Prompt Studio & Context</h2>
        </div>
        {activeProfileName && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
            Active: {activeProfileName}
          </span>
        )}
      </div>

      {/* Scrollable Studio Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Subtle mid-conversation note */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/30 text-[11px] text-indigo-300">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            Context & instruction edits apply to your <strong>next message</strong>. Previous conversation answers are not retroactively changed.
          </span>
        </div>

        {/* 1. Base System Instructions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Base System Instructions
            </label>
            <button
              type="button"
              onClick={() => setSystemInstructions(STARTER_SYSTEM_INSTRUCTIONS)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              Reset default
            </button>
          </div>
          <textarea
            value={systemInstructions}
            onChange={(e) => setSystemInstructions(e.target.value)}
            placeholder="Define the assistant's persona, boundaries, tone, and answer guidelines..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans resize-y"
          />
        </div>

        {/* 2. Large Organization Background Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              Company Knowledge Background
            </label>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                isOverTpmLimit && !useRag
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                ~{estTokens.toLocaleString()} tokens · {charCount.toLocaleString()} chars
              </span>
            </div>
          </div>

          {/* RAG Mode Switcher */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Context Delivery Mode</span>
              </div>

              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setUseRag(false)}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    !useRag
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Direct Context
                </button>
                <button
                  type="button"
                  onClick={() => setUseRag(true)}
                  className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                    useRag
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>Smart RAG</span>
                </button>
              </div>
            </div>

            {/* Smart RAG Configuration Panel */}
            {useRag ? (
              <div className="pt-2 border-t border-slate-900 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {ragStatus?.isIndexed ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{ragStatus.totalChunks} Chunks Indexed (~{ragStatus.totalEstTokens?.toLocaleString()} tokens in Knowledge Base)</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        Knowledge Base not indexed yet. Click Index to chunk your document.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Retrieve:</span>
                    <select
                      value={ragTopK}
                      onChange={(e) => setRagTopK(parseInt(e.target.value, 10))}
                      className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-indigo-300 font-mono focus:outline-none"
                    >
                      <option value={2}>Top 2 Chunks (~400 tokens)</option>
                      <option value={3}>Top 3 Chunks (~600 tokens)</option>
                      <option value={4}>Top 4 Chunks (~800 tokens)</option>
                      <option value={5}>Top 5 Chunks (~1,000 tokens)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={indexingRag || !companyBackground.trim()}
                    onClick={async () => {
                      try {
                        await handleIndexRagDocument();
                        setIndexSuccessToast(true);
                        setTimeout(() => setIndexSuccessToast(false), 2500);
                      } catch (e) {
                        alert('Indexing failed: ' + e.message);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${indexingRag ? 'animate-spin' : ''}`} />
                    <span>{indexingRag ? 'Indexing Chunks...' : indexSuccessToast ? 'Indexed Successfully!' : 'Index Company Info for RAG'}</span>
                  </button>

                  {ragStatus?.isIndexed && (
                    <button
                      type="button"
                      onClick={handleClearRagIndex}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs transition"
                    >
                      Clear Index
                    </button>
                  )}
                </div>

                {ragStatus?.isIndexed && !companyBackground.trim() && (
                  <p className="text-[11px] text-indigo-300/80 bg-indigo-950/30 p-2 rounded-lg border border-indigo-900/40">
                    ℹ️ <strong>CCCRN Knowledge Base Loaded:</strong> 190 chunks (~35,300 tokens) are live in your database store. You can ask any question right now!
                  </p>
                )}

                <p className="text-[11px] text-emerald-400/90 leading-relaxed bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  ✨ <strong>RAG Active:</strong> For each user prompt, only the top {ragTopK} most relevant sections (~600 tokens) will be retrieved and passed to Groq, safely solving the 8,000 TPM limit!
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 pt-1">
                Direct Context sends the entire textarea content on every turn. If your text exceeds 8,000 tokens, switch to <strong>Smart RAG</strong> above.
              </p>
            )}
          </div>

          {/* Warning for exceeding TPM limit in Direct Mode */}
          {!useRag && isOverTpmLimit ? (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>
                  <strong>Context Exceeds Rate Limit:</strong> Background is ~<strong>{estTokens.toLocaleString()} tokens</strong>, exceeding the <strong>{tpmLimit.toLocaleString()} TPM</strong> limit for <code className="text-white font-mono">{selectedModel}</code>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUseRag(true);
                    handleIndexRagDocument();
                  }}
                  className="text-xs font-bold text-indigo-300 underline hover:text-white"
                >
                  👉 Switch to Smart RAG to chunk & reduce payload size
                </button>
              </div>
            </div>
          ) : !useRag && isLargeContext ? (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Large context:</strong> Background is ~{estTokens.toLocaleString()} tokens ({((estTokens / tpmLimit) * 100).toFixed(0)}% of {tpmLimit.toLocaleString()} TPM limit).
              </span>
            </div>
          ) : null}

          {/* Action toolbar for Company Background */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCompanyBackground(STARTER_COMPANY_TEMPLATE)}
              className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition flex items-center gap-1"
            >
              <FileText className="w-3 h-3 text-indigo-400" /> Insert Starter Template
            </button>

            {/* Local .txt/.md file import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.md,.markdown"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition flex items-center gap-1"
              title="Import organization background locally from a .txt or .md file"
            >
              <Upload className="w-3 h-3 text-emerald-400" /> Import .txt / .md
            </button>

            <button
              type="button"
              onClick={() => setCompanyBackground('')}
              disabled={!companyBackground}
              className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:bg-rose-500/20 hover:text-rose-400 disabled:opacity-40 transition flex items-center gap-1 ml-auto"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>

          <textarea
            value={companyBackground}
            onChange={(e) => setCompanyBackground(e.target.value)}
            placeholder="Paste your business details: products, services, FAQs, pricing, refund terms, escalation rules..."
            rows={8}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono resize-y"
          />
        </div>

        {/* 3. Custom Messages / Few-Shot Examples */}
        <CustomMessageEditor
          customMessages={customMessages}
          addCustomMessage={addCustomMessage}
          updateCustomMessage={updateCustomMessage}
          moveCustomMessage={moveCustomMessage}
          duplicateCustomMessage={duplicateCustomMessage}
          removeCustomMessage={removeCustomMessage}
        />

        {/* 4. Model Parameters */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Model Parameters
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Temperature */}
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Temperature</span>
                <span className="font-mono text-indigo-400 font-bold">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.0 Precise</span>
                <span>0.7 Balanced</span>
                <span>2.0 Creative</span>
              </div>
            </div>

            {/* Max Completion Tokens */}
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Max Output Tokens</span>
                <span className="font-mono text-indigo-400 font-bold">{maxCompletionTokens}</span>
              </div>
              <input
                type="number"
                min="128"
                max="8192"
                step="64"
                value={maxCompletionTokens}
                onChange={(e) => setMaxCompletionTokens(parseInt(e.target.value, 10) || 1024)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
              <div className="text-[10px] text-slate-500">
                `max_completion_tokens` parameter
              </div>
            </div>
          </div>
        </div>

        {/* 5. Quick Profile Save */}
        <div className="pt-2 border-t border-slate-800">
          <form onSubmit={handleQuickSaveProfile} className="flex items-center gap-2">
            <input
              type="text"
              value={profileNameInput}
              onChange={(e) => setProfileNameInput(e.target.value)}
              placeholder="Save as named profile..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!profileNameInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1 transition"
            >
              {profileSavedToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" /> Saved!
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" /> Save
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
