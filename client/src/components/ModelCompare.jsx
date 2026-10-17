import React, { useState } from 'react';
import {
  Scale,
  Play,
  Clock,
  Zap,
  Layers,
  Sparkles,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { sendChatMessage } from '../lib/api.js';

export function ModelCompare({
  models,
  systemInstructions,
  companyBackground,
  customMessages
}) {
  const [modelA, setModelA] = useState(models[0]?.id || 'openai/gpt-oss-20b');
  const [modelB, setModelB] = useState(models[1]?.id || 'qwen/qwen3.8-27b');
  const [testPrompt, setTestPrompt] = useState('What are your office hours and what is your refund policy?');
  const [running, setRunning] = useState(false);

  const [resultA, setResultA] = useState(null);
  const [resultB, setResultB] = useState(null);
  const [errorA, setErrorA] = useState(null);
  const [errorB, setErrorB] = useState(null);

  const runComparison = async () => {
    if (!testPrompt.trim() || running) return;

    setRunning(true);
    setResultA(null);
    setResultB(null);
    setErrorA(null);
    setErrorB(null);

    const makePayload = (modelId) => ({
      model: modelId,
      systemInstructions,
      companyBackground,
      customMessages,
      history: [],
      message: testPrompt.trim(),
      options: {
        temperature: 0.7,
        maxCompletionTokens: 1024
      }
    });

    const callModelA = async () => {
      try {
        const res = await sendChatMessage(makePayload(modelA));
        setResultA(res);
      } catch (err) {
        setErrorA(err);
      }
    };

    const callModelB = async () => {
      try {
        const res = await sendChatMessage(makePayload(modelB));
        setResultB(res);
      } catch (err) {
        setErrorB(err);
      }
    };

    await Promise.allSettled([callModelA(), callModelB()]);
    setRunning(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">Side-by-Side Model Comparison</h2>
        </div>
        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
          Test identical organization instructions and background context simultaneously against two different Groq models. Compare answer quality, response latency, and token consumption side by side.
        </p>
      </div>

      {/* Model Selection and Prompt Input */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Model A</label>
            <select
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {models.map(m => (
                <option key={`a-${m.id}`} value={m.id}>
                  {m.name || m.id} {m.documentedFreeTier ? '★ Free-Plan' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Model B</label>
            <select
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {models.map(m => (
                <option key={`b-${m.id}`} value={m.id}>
                  {m.name || m.id} {m.documentedFreeTier ? '★ Free-Plan' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Test Question / Prompt</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter a prompt to compare between models..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={runComparison}
              disabled={running || !testPrompt.trim()}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/30"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${running ? 'animate-pulse' : ''}`} />
              <span>{running ? 'Comparing...' : 'Run Comparison'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-Side Results Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Model A Result */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Model A</span>
              <h3 className="text-sm font-bold text-white font-mono">{modelA}</h3>
            </div>
            {resultA && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {resultA.latencyMs}ms
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-mono">
                  <Zap className="w-3.5 h-3.5" />
                  {resultA.usage?.total_tokens || 0} tokens
                </span>
              </div>
            )}
          </div>

          <div className="min-h-[200px] p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed overflow-y-auto max-h-[400px]">
            {running && !resultA && !errorA ? (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                <span>Running Model A completion...</span>
              </div>
            ) : errorA ? (
              <div className="text-rose-400 p-2 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Error
                </div>
                <div>{errorA.message}</div>
              </div>
            ) : resultA ? (
              <div className="whitespace-pre-wrap">{resultA.reply}</div>
            ) : (
              <div className="text-center py-12 text-slate-600">
                Click "Run Comparison" to evaluate Model A
              </div>
            )}
          </div>
        </div>

        {/* Model B Result */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Model B</span>
              <h3 className="text-sm font-bold text-white font-mono">{modelB}</h3>
            </div>
            {resultB && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  {resultB.latencyMs}ms
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-mono">
                  <Zap className="w-3.5 h-3.5" />
                  {resultB.usage?.total_tokens || 0} tokens
                </span>
              </div>
            )}
          </div>

          <div className="min-h-[200px] p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed overflow-y-auto max-h-[400px]">
            {running && !resultB && !errorB ? (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                <span>Running Model B completion...</span>
              </div>
            ) : errorB ? (
              <div className="text-rose-400 p-2 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Error
                </div>
                <div>{errorB.message}</div>
              </div>
            ) : resultB ? (
              <div className="whitespace-pre-wrap">{resultB.reply}</div>
            ) : (
              <div className="text-center py-12 text-slate-600">
                Click "Run Comparison" to evaluate Model B
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
