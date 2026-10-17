import React, { useRef, useEffect } from 'react';
import {
  Send,
  Square,
  RotateCcw,
  Trash2,
  Sparkles,
  Layers,
  CornerDownLeft,
  Bot
} from 'lucide-react';
import { MessageBubble } from './MessageBubble.jsx';

export function ChatPanel({
  history,
  draftMessage,
  setDraftMessage,
  isSending,
  sendMessage,
  stopGeneration,
  retryLastTurn,
  clearChat,
  selectedModel,
  models,
  isStreaming
}) {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const activeModelMeta = models.find(m => m.id === selectedModel);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isSending]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (draftMessage.trim() && !isSending) {
        sendMessage();
      }
    }
  };

  const handleSuggestionClick = (query) => {
    setDraftMessage(query);
    textareaRef.current?.focus();
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Top Bar */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Chat Playground</h2>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {selectedModel}
          </span>
          {activeModelMeta?.documentedFreeTier && (
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
              Free Plan Eligible
            </span>
          )}
        </div>

        {/* Actions: Clear & Retry */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={retryLastTurn}
            disabled={history.length === 0 || isSending}
            title="Retry last prompt"
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Retry</span>
          </button>

          <button
            type="button"
            onClick={clearChat}
            disabled={history.length === 0 || isSending}
            title="Clear conversation history"
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Messages Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-semibold text-slate-200">Start Testing Your Chatbot</h3>
              <p className="text-xs text-slate-400">
                Ask questions against the organization background defined in the Prompt Studio to see how accurately the model responds.
              </p>
            </div>

            {/* Quick suggested test questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
              {[
                'What are your pricing plans and refund policy?',
                'Do you support custom container migration?',
                'Can I get 24/7 phone support on Developer tier?',
                'Who should I contact for an enterprise security audit?'
              ].map((query, qIdx) => (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => handleSuggestionClick(query)}
                  className="p-2.5 text-left rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-xs text-slate-300 transition"
                >
                  "{query}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          history.map((msg, idx) => (
            <MessageBubble
              key={msg.id || idx}
              message={msg}
              isStreaming={isSending && idx === history.length - 1}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Textarea & Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 space-y-2">
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 focus-within:border-indigo-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your test question (Enter to send, Shift+Enter for newline)..."
            rows={3}
            className="w-full bg-transparent p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none"
          />

          {/* Bottom input bar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-900/80 bg-slate-950/60 rounded-b-xl">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <CornerDownLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Enter to send</span>
              <span className="text-slate-600">·</span>
              <span>{draftMessage.length} chars</span>
            </div>

            <div className="flex items-center gap-2">
              {isSending ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Generation</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!draftMessage.trim() || isSending}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-indigo-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
