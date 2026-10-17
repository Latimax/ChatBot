import React, { useState, useEffect } from 'react';
import { AppHeader } from './components/AppHeader.jsx';
import { PromptStudio } from './components/PromptStudio.jsx';
import { ChatPanel } from './components/ChatPanel.jsx';
import { RequestInspector } from './components/RequestInspector.jsx';
import { FreeModelExplorer } from './components/FreeModelExplorer.jsx';
import { ModelCompare } from './components/ModelCompare.jsx';
import { ProfilesManager } from './components/ProfilesManager.jsx';
import { TestScenarios } from './components/TestScenarios.jsx';
import { useChatPlayground } from './hooks/useChatPlayground.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { AlertTriangle, Key, ExternalLink, Sliders, MessageSquare, Code } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('playground'); // 'playground' | 'explorer' | 'compare' | 'scenarios' | 'profiles'
  const [mobilePlaygroundTab, setMobilePlaygroundTab] = useState('chat'); // 'prompt' | 'chat' | 'inspector'
  const [theme, setTheme] = useLocalStorage('gcp_theme', 'dark');

  const playgroundState = useChatPlayground();

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const handleRunScenario = (query) => {
    playgroundState.setDraftMessage(query);
    setActiveTab('playground');
    setMobilePlaygroundTab('chat');
  };

  const handleSelectAndChat = () => {
    setActiveTab('playground');
    setMobilePlaygroundTab('chat');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <AppHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        groqConfigured={playgroundState.groqConfigured}
        models={playgroundState.models}
        selectedModel={playgroundState.selectedModel}
        setSelectedModel={playgroundState.setSelectedModel}
        isStreaming={playgroundState.isStreaming}
        setIsStreaming={playgroundState.setIsStreaming}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Missing Key Warning / Setup Guide Banner */}
      {!playgroundState.groqConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Groq API Key not configured:</strong> Live completions are in Preview Mode. You can inspect effective payloads and browse documented models without an API key.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-400">Set GROQ_API_KEY in server/.env</span>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold flex items-center gap-1 transition"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
        {/* TAB 1: 3-Column Playground */}
        {activeTab === 'playground' && (
          <div className="flex-1 flex flex-col max-w-[1700px] w-full mx-auto space-y-3 overflow-hidden">
            {/* Mobile Column Switcher (Visible only below lg breakpoint) */}
            <div className="lg:hidden flex items-center justify-center p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-sm mx-auto w-full text-xs">
              <button
                type="button"
                onClick={() => setMobilePlaygroundTab('prompt')}
                className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition ${
                  mobilePlaygroundTab === 'prompt' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Prompt Studio
              </button>
              <button
                type="button"
                onClick={() => setMobilePlaygroundTab('chat')}
                className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition ${
                  mobilePlaygroundTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Chat
              </button>
              <button
                type="button"
                onClick={() => setMobilePlaygroundTab('inspector')}
                className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition ${
                  mobilePlaygroundTab === 'inspector' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                <Code className="w-3.5 h-3.5" /> Inspector
              </button>
            </div>

            {/* Desktop 3-Column Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-140px)] min-h-[600px]">
              {/* Column 1: Prompt Studio (3.5 cols on desktop) */}
              <div
                className={`lg:col-span-4 xl:col-span-3 h-full overflow-hidden ${
                  mobilePlaygroundTab === 'prompt' ? 'block' : 'hidden lg:block'
                }`}
              >
                <PromptStudio
                  systemInstructions={playgroundState.systemInstructions}
                  setSystemInstructions={playgroundState.setSystemInstructions}
                  companyBackground={playgroundState.companyBackground}
                  setCompanyBackground={playgroundState.setCompanyBackground}
                  customMessages={playgroundState.customMessages}
                  addCustomMessage={playgroundState.addCustomMessage}
                  updateCustomMessage={playgroundState.updateCustomMessage}
                  moveCustomMessage={playgroundState.moveCustomMessage}
                  duplicateCustomMessage={playgroundState.duplicateCustomMessage}
                  removeCustomMessage={playgroundState.removeCustomMessage}
                  temperature={playgroundState.temperature}
                  setTemperature={playgroundState.setTemperature}
                  maxCompletionTokens={playgroundState.maxCompletionTokens}
                  setMaxCompletionTokens={playgroundState.setMaxCompletionTokens}
                  saveProfile={playgroundState.saveProfile}
                  activeProfileName={playgroundState.activeProfileName}
                  selectedModel={playgroundState.selectedModel}
                  models={playgroundState.models}
                  useRag={playgroundState.useRag}
                  setUseRag={playgroundState.setUseRag}
                  ragTopK={playgroundState.ragTopK}
                  setRagTopK={playgroundState.setRagTopK}
                  ragStatus={playgroundState.ragStatus}
                  indexingRag={playgroundState.indexingRag}
                  handleIndexRagDocument={playgroundState.handleIndexRagDocument}
                  handleClearRagIndex={playgroundState.handleClearRagIndex}
                />
              </div>

              {/* Column 2: Chat Playground (5.5 cols on desktop) */}
              <div
                className={`lg:col-span-5 xl:col-span-6 h-full overflow-hidden ${
                  mobilePlaygroundTab === 'chat' ? 'block' : 'hidden lg:block'
                }`}
              >
                <ChatPanel
                  history={playgroundState.history}
                  draftMessage={playgroundState.draftMessage}
                  setDraftMessage={playgroundState.setDraftMessage}
                  isSending={playgroundState.isSending}
                  sendMessage={playgroundState.sendMessage}
                  stopGeneration={playgroundState.stopGeneration}
                  retryLastTurn={playgroundState.retryLastTurn}
                  clearChat={playgroundState.clearChat}
                  selectedModel={playgroundState.selectedModel}
                  models={playgroundState.models}
                  isStreaming={playgroundState.isStreaming}
                />
              </div>

              {/* Column 3: Request Inspector (3 cols on desktop) */}
              <div
                className={`lg:col-span-3 xl:col-span-3 h-full overflow-hidden ${
                  mobilePlaygroundTab === 'inspector' ? 'block' : 'hidden lg:block'
                }`}
              >
                <RequestInspector
                  effectivePayload={playgroundState.effectivePayload}
                  previewLoading={playgroundState.previewLoading}
                  lastUsage={playgroundState.lastUsage}
                  lastRateLimits={playgroundState.lastRateLimits}
                  lastLatencyMs={playgroundState.lastLatencyMs}
                  lastError={playgroundState.lastError}
                  lastStatus={playgroundState.lastStatus}
                  selectedModel={playgroundState.selectedModel}
                  lastRagMeta={playgroundState.lastRagMeta}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Free Model Explorer */}
        {activeTab === 'explorer' && (
          <div className="flex-1 overflow-y-auto">
            <FreeModelExplorer
              models={playgroundState.models}
              freeTierSnapshot={playgroundState.freeTierSnapshot}
              selectedModel={playgroundState.selectedModel}
              setSelectedModel={playgroundState.setSelectedModel}
              onSelectAndChat={handleSelectAndChat}
              loadModelsList={playgroundState.loadModelsList}
              loadingModels={playgroundState.loadingModels}
              liveDiscovery={playgroundState.liveDiscovery}
            />
          </div>
        )}

        {/* TAB 3: Side-by-Side Model Compare */}
        {activeTab === 'compare' && (
          <div className="flex-1 overflow-y-auto">
            <ModelCompare
              models={playgroundState.models}
              systemInstructions={playgroundState.systemInstructions}
              companyBackground={playgroundState.companyBackground}
              customMessages={playgroundState.customMessages}
            />
          </div>
        )}

        {/* TAB 4: Test Scenarios */}
        {activeTab === 'scenarios' && (
          <div className="flex-1 overflow-y-auto">
            <TestScenarios onRunScenario={handleRunScenario} />
          </div>
        )}

        {/* TAB 5: Saved Profiles */}
        {activeTab === 'profiles' && (
          <div className="flex-1 overflow-y-auto">
            <ProfilesManager
              savedProfiles={playgroundState.savedProfiles}
              loadProfile={playgroundState.loadProfile}
              deleteProfile={playgroundState.deleteProfile}
              exportProfiles={playgroundState.exportProfiles}
              importProfiles={playgroundState.importProfiles}
              resetToDefaults={playgroundState.resetToDefaults}
              clearAllData={playgroundState.clearAllData}
              activeProfileName={playgroundState.activeProfileName}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-2.5 text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Groq Chat Playground · Documented snapshot 2026-10-17 · Server-side proxy protects credentials
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://console.groq.com/docs/rate-limits"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-400 transition"
            >
              Rate Limits Documentation
            </a>
            <a
              href="https://console.groq.com/settings/limits"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-400 transition"
            >
              Account Limits Console
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
