import React from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  User,
  Bot,
  Cog,
  HelpCircle
} from 'lucide-react';

export function CustomMessageEditor({
  customMessages,
  addCustomMessage,
  updateCustomMessage,
  moveCustomMessage,
  duplicateCustomMessage,
  removeCustomMessage
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Custom Messages / Few-Shot Examples ({customMessages.length})
          </label>
          <span
            className="text-slate-500 hover:text-slate-300 cursor-pointer"
            title="Prepend fixed system instructions or sample user/assistant dialogue turns before the conversation history."
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => addCustomMessage('system')}
            className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> System
          </button>
          <button
            type="button"
            onClick={() => addCustomMessage('user')}
            className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> User
          </button>
          <button
            type="button"
            onClick={() => addCustomMessage('assistant')}
            className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Assistant
          </button>
        </div>
      </div>

      {customMessages.length === 0 ? (
        <div className="text-center py-4 px-3 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
          No custom few-shot messages added yet. Add sample user/assistant turns to guide the model's style and answers.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {customMessages.map((msg, index) => {
            const isSystem = msg.role === 'system';
            const isUser = msg.role === 'user';
            const isAssistant = msg.role === 'assistant';

            return (
              <div
                key={msg.id}
                className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2 hover:border-slate-700 transition-colors"
              >
                {/* Header row: Role selector & actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">#{index + 1}</span>
                    <select
                      value={msg.role}
                      onChange={(e) => updateCustomMessage(msg.id, { role: e.target.value })}
                      className={`text-xs font-semibold px-2 py-0.5 rounded border focus:outline-none cursor-pointer ${
                        isSystem
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : isUser
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      <option value="system">System (Instruction)</option>
                      <option value="user">User (Example Prompt)</option>
                      <option value="assistant">Assistant (Example Response)</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveCustomMessage(index, -1)}
                      title="Move Up"
                      className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === customMessages.length - 1}
                      onClick={() => moveCustomMessage(index, 1)}
                      title="Move Down"
                      className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateCustomMessage(index)}
                      title="Duplicate"
                      className="p-1 rounded hover:bg-slate-800 hover:text-slate-200"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCustomMessage(msg.id)}
                      title="Remove"
                      className="p-1 rounded hover:bg-rose-500/20 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content Textarea */}
                <textarea
                  value={msg.content}
                  onChange={(e) => updateCustomMessage(msg.id, { content: e.target.value })}
                  placeholder={
                    isSystem
                      ? 'System rule or tone constraint...'
                      : isUser
                      ? 'Sample user input...'
                      : 'Desired assistant response...'
                  }
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y font-mono"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
