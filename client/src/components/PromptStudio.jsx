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
  Check
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
  activeProfileName
}) {
  const fileInputRef = useRef(null);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Character and word count
  const charCount = companyBackground.length;
  const wordCount = companyBackground.trim() ? companyBackground.trim().split(/\s+/).length : 0;
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
              <span className="text-[11px] font-mono text-slate-400">
                {charCount.toLocaleString()} chars · {wordCount.toLocaleString()} words
              </span>
            </div>
          </div>

          {/* Warning for large context */}
          {isLargeContext && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Large context:</strong> Pasting extensive docs adds tokens to <em>every</em> conversation turn. Verify your model's TPM rate limit in the inspector.
              </span>
            </div>
          )}

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
