import React, { useState } from 'react';
import {
  User,
  Bot,
  Copy,
  Check,
  Zap,
  Clock,
  Layers,
  AlertTriangle
} from 'lucide-react';

/**
 * Lightweight safe markdown renderer that handles:
 * - Code blocks (```lang ... ```) with copy code button
 * - Inline code (`code`)
 * - Bold (**text**) and Italics (*text*)
 * - Lists (- item or 1. item)
 * - Blockquotes (> quote)
 * - Regular paragraphs with preserved linebreaks
 * Avoids dangerouslySetInnerHTML for complete security.
 */
function SafeMarkdown({ content }) {
  if (!content) return null;

  // Split into code block and non-code block segments
  const parts = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }
    parts.push({
      type: 'codeblock',
      lang: match[1] || 'text',
      code: match[2]
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-100">
      {parts.map((part, idx) => {
        if (part.type === 'codeblock') {
          return <CodeBlock key={idx} lang={part.lang} code={part.code} />;
        }
        return <FormattedText key={idx} text={part.content} />;
      })}
    </div>
  );
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
        <span className="text-[11px] font-semibold text-indigo-400 uppercase">{lang || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] hover:text-slate-200 transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy code
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-slate-200">{code}</pre>
    </div>
  );
}

function FormattedText({ text }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-2" />;

        // Headers
        if (line.startsWith('### ')) {
          return <h4 key={lIdx} className="font-bold text-slate-200 text-sm mt-2">{line.slice(4)}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={lIdx} className="font-bold text-white text-base mt-2.5 pb-1 border-b border-slate-800">{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={lIdx} className="font-bold text-white text-lg mt-3 pb-1 border-b border-slate-800">{line.slice(2)}</h2>;
        }

        // Bullet list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="text-indigo-400 mt-1">•</span>
              <span>{parseInlineFormatting(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="text-indigo-400 font-mono text-xs mt-0.5">{numMatch[1]}.</span>
              <span>{parseInlineFormatting(numMatch[2])}</span>
            </div>
          );
        }

        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={lIdx} className="pl-3 border-l-2 border-indigo-500 italic text-slate-300 my-1">
              {parseInlineFormatting(trimmed.slice(2))}
            </blockquote>
          );
        }

        return <p key={lIdx}>{parseInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

function parseInlineFormatting(str) {
  // Regex to match inline code `...` and bold **...**
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts = str.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user';
  const isError = Boolean(message.error);
  const [copied, setCopied] = useState(false);

  const handleCopyAnswer = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md space-y-2 ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-none'
            : isError
            ? 'bg-rose-950/60 border border-rose-800/60 text-rose-200 rounded-tl-none'
            : 'bg-slate-900/90 border border-slate-800 rounded-tl-none'
        }`}
      >
        {/* Assistant Header: Model ID and Performance stats */}
        {!isUser && (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                <Layers className="w-3 h-3 text-indigo-400" />
                {message.model || 'Groq Model'}
              </span>

              {message.latencyMs && (
                <span className="flex items-center gap-0.5 text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {message.latencyMs}ms
                </span>
              )}

              {message.usage?.total_tokens > 0 && (
                <span className="flex items-center gap-1 text-slate-400 font-mono">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {message.usage.total_tokens} tokens
                </span>
              )}
            </div>

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopyAnswer}
              className="text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
              title="Copy answer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Content Body */}
        {isUser ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
        ) : (
          <div className="relative">
            {message.content ? (
              <SafeMarkdown content={message.content} />
            ) : (
              <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>Generating response...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-slate-300" />
        </div>
      )}
    </div>
  );
}
