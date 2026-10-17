import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage.js';
import {
  checkHealth,
  fetchModels,
  fetchFreeTierLimits,
  fetchPreview,
  sendChatMessage,
  streamChatMessage,
  fetchRagStatus,
  indexRagDocument,
  clearRagIndex
} from '../lib/api.js';

export const STARTER_COMPANY_TEMPLATE = `Organization name: Acme Cloud Solutions
Website: https://acmecloud.example.com
What we do: Next-generation cloud automation and serverless container hosting for development teams.
Products and services: Managed Kubernetes clusters, auto-scaling worker nodes, global edge caching, and automated SSL.
Target customers: Fast-growing software companies, web developers, and DevOps engineers.
Location / service regions: Global operations with primary datacenters in US-East, US-West, EU-Central, and Asia-Pacific.
Opening hours: Customer support available 24/7/365. Office headquarters: Monday–Friday 9:00 AM – 6:00 PM EST.
Pricing: Developer Starter at $15/month; Growth Tier at $49/month; Enterprise Custom from $299/month. Free 14-day trial with no credit card required.
Support / contact details: Support ticket desk: support@acmecloud.example.com; Live chat at acmecloud.example.com/chat.
Refund / cancellation policy: 30-day money-back guarantee for first-time subscribers. Subscriptions can be cancelled anytime with no exit fees.
Frequently asked questions:
- Q: Can I migrate my existing Docker containers?
  A: Yes, our one-click container importer handles Docker Compose and Kubernetes manifests seamlessly.
- Q: Do you provide dedicated IPs?
  A: Dedicated IPv4 and IPv6 addresses are included on Growth and Enterprise tiers.
Things the chatbot must never promise:
- Never promise arbitrary discounts beyond published tiers.
- Never guarantee zero downtime SLAs for non-enterprise tiers.
- Never state that phone support is available without an active Enterprise contract.
Escalation / handoff instructions: If the customer requests custom enterprise contracts or reports a security incident, direct them immediately to enterprise@acmecloud.example.com.
Last updated: 2026-10-17`;

export const STARTER_SYSTEM_INSTRUCTIONS = `You are Acme Cloud Solutions' friendly, accurate support assistant. Use provided organization facts when applicable, don't invent company details, acknowledge uncertainty, and keep answers helpful, concise, and clear.`;

export function useChatPlayground() {
  // API Health & Config status
  const [groqConfigured, setGroqConfigured] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(true);

  // Models
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [liveDiscovery, setLiveDiscovery] = useState(false);
  const [freeTierSnapshot, setFreeTierSnapshot] = useState(null);
  const [isFreeOnly, setIsFreeOnly] = useLocalStorage('gcp_is_free_only', false);

  // Playground Configuration persisted in localStorage
  const [selectedModel, setSelectedModel] = useLocalStorage('gcp_selected_model', 'openai/gpt-oss-20b');
  const [systemInstructions, setSystemInstructions] = useLocalStorage('gcp_system_instructions', STARTER_SYSTEM_INSTRUCTIONS);
  const [companyBackground, setCompanyBackground] = useLocalStorage('gcp_company_background', STARTER_COMPANY_TEMPLATE);
  const [customMessages, setCustomMessages] = useLocalStorage('gcp_custom_messages', []);
  const [temperature, setTemperature] = useLocalStorage('gcp_temperature', 0.7);
  const [maxCompletionTokens, setMaxCompletionTokens] = useLocalStorage('gcp_max_tokens', 1024);
  const [isStreaming, setIsStreaming] = useLocalStorage('gcp_streaming', true);

  // RAG (Retrieval-Augmented Generation) state
  const [useRag, setUseRag] = useLocalStorage('gcp_use_rag', false);
  const [ragTopK, setRagTopK] = useLocalStorage('gcp_rag_top_k', 3);
  const [ragStatus, setRagStatus] = useState(null);
  const [indexingRag, setIndexingRag] = useState(false);
  const [lastRagMeta, setLastRagMeta] = useState(null);

  // Active Chat Session state
  const [history, setHistory] = useLocalStorage('gcp_chat_history', []);
  const [draftMessage, setDraftMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Diagnostics & Inspector
  const [effectivePayload, setEffectivePayload] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lastUsage, setLastUsage] = useState(null);
  const [lastRateLimits, setLastRateLimits] = useState(null);
  const [lastLatencyMs, setLastLatencyMs] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [lastStatus, setLastStatus] = useState(null);

  // Profiles
  const [savedProfiles, setSavedProfiles] = useLocalStorage('gcp_saved_profiles', []);
  const [activeProfileName, setActiveProfileName] = useState(null);

  // Abort controller ref for stop generation
  const abortControllerRef = useRef(null);

  // Check backend health
  const refreshHealth = useCallback(async () => {
    try {
      setCheckingHealth(true);
      const data = await checkHealth();
      setGroqConfigured(Boolean(data.groqConfigured));
    } catch {
      setGroqConfigured(false);
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  // Fetch models & free limits
  const loadModelsList = useCallback(async (force = false) => {
    try {
      setLoadingModels(true);
      const [modelsData, limitsData] = await Promise.all([
        fetchModels(force),
        fetchFreeTierLimits()
      ]);

      setModels(modelsData.models || []);
      setLiveDiscovery(Boolean(modelsData.liveDiscovery));
      setFreeTierSnapshot(limitsData);

      // If selectedModel is not found in models list, set to first available or recommended
      if (modelsData.models?.length > 0) {
        const found = modelsData.models.some(m => m.id === selectedModel);
        if (!found) {
          const rec = modelsData.models.find(m => m.recommended || m.documentedFreeTier) || modelsData.models[0];
          setSelectedModel(rec.id);
        }
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoadingModels(false);
    }
  }, [selectedModel, setSelectedModel]);

  // Load RAG status
  const refreshRagStatus = useCallback(async () => {
    try {
      const data = await fetchRagStatus();
      setRagStatus(data);
      if (data?.isIndexed) {
        // Automatically default to Smart RAG when a knowledge base is already indexed
        setUseRag(true);
      }
    } catch (err) {
      console.warn('Could not load RAG status:', err);
    }
  }, [setUseRag]);

  const handleIndexRagDocument = async (contentToUse = null) => {
    const textToIndex = contentToUse !== null ? contentToUse : companyBackground;
    if (!textToIndex || !textToIndex.trim()) return;

    try {
      setIndexingRag(true);
      const res = await indexRagDocument({
        title: 'Company Knowledge Base',
        content: textToIndex
      });
      await refreshRagStatus();
      setUseRag(true);
      return res;
    } catch (err) {
      console.error('Failed to index document for RAG:', err);
      throw err;
    } finally {
      setIndexingRag(false);
    }
  };

  const handleClearRagIndex = async () => {
    try {
      await clearRagIndex();
      await refreshRagStatus();
    } catch (err) {
      console.error('Failed to clear RAG index:', err);
    }
  };

  useEffect(() => {
    refreshHealth();
    loadModelsList();
    refreshRagStatus();

    // Auto-sync status on window focus or short interval
    const interval = setInterval(refreshRagStatus, 4000);
    const handleFocus = () => refreshRagStatus();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshHealth, loadModelsList, refreshRagStatus]);

  // Update Effective Preview automatically when inputs change
  useEffect(() => {
    let ignore = false;
    const updatePreview = async () => {
      setPreviewLoading(true);
      try {
        const payload = {
          model: selectedModel,
          systemInstructions,
          companyBackground,
          customMessages,
          history: history.map(h => ({ role: h.role, content: h.content })),
          message: draftMessage.trim() || 'What are your support hours and pricing?',
          options: {
            temperature,
            maxCompletionTokens
          },
          useRag,
          ragTopK
        };

        const previewData = await fetchPreview(payload);
        if (!ignore) {
          setEffectivePayload(previewData);
          if (previewData.rag) {
            setLastRagMeta(previewData.rag);
          }
        }
      } catch (err) {
        if (!ignore) {
          // ignore draft preview error
        }
      } finally {
        if (!ignore) setPreviewLoading(false);
      }
    };

    const timeout = setTimeout(updatePreview, 300);
    return () => {
      ignore = true;
      clearTimeout(timeout);
    };
  }, [selectedModel, systemInstructions, companyBackground, customMessages, history, draftMessage, temperature, maxCompletionTokens, useRag, ragTopK]);

  // Send message action
  const sendMessage = async (overrideMessage = null) => {
    const textToSend = overrideMessage !== null ? overrideMessage : draftMessage;
    const cleanText = textToSend.trim();
    if (!cleanText || isSending) return;

    setDraftMessage('');
    setLastError(null);
    setIsSending(true);

    const userMessageId = `usr_${Date.now()}`;
    const assistantMessageId = `ast_${Date.now()}`;

    const newHistoryTurn = {
      id: userMessageId,
      role: 'user',
      content: cleanText,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...history, newHistoryTurn];
    setHistory(updatedHistory);

    // Initial assistant placeholder
    const assistantTurn = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      model: selectedModel,
      latencyMs: null,
      usage: null,
      timestamp: new Date().toISOString()
    };

    setHistory([...updatedHistory, assistantTurn]);

    const payload = {
      model: selectedModel,
      systemInstructions,
      companyBackground,
      customMessages,
      history: history.map(h => ({ role: h.role, content: h.content })),
      message: cleanText,
      options: {
        temperature,
        maxCompletionTokens
      },
      useRag,
      ragTopK
    };

    abortControllerRef.current = new AbortController();

    if (isStreaming) {
      let accumulatedReply = '';
      try {
        await streamChatMessage(payload, {
          signal: abortControllerRef.current.signal,
          onMeta: (meta) => {
            if (meta.rateLimits) {
              setLastRateLimits(meta.rateLimits);
            }
            if (meta.rag) {
              setLastRagMeta(meta.rag);
            }
          },
          onDelta: (chunk) => {
            accumulatedReply += chunk;
            setHistory(prev =>
              prev.map(item =>
                item.id === assistantMessageId
                  ? { ...item, content: accumulatedReply }
                  : item
              )
            );
          },
          onDone: (doneData) => {
            setLastLatencyMs(doneData.latencyMs);
            if (doneData.usage) setLastUsage(doneData.usage);
            if (doneData.rag) setLastRagMeta(doneData.rag);
            setLastStatus(200);
            setHistory(prev =>
              prev.map(item =>
                item.id === assistantMessageId
                  ? {
                      ...item,
                      content: accumulatedReply,
                      latencyMs: doneData.latencyMs,
                      usage: doneData.usage,
                      rag: doneData.rag
                    }
                  : item
              )
            );
            setIsSending(false);
          },
          onError: (err) => {
            setLastError(err);
            setLastStatus(err.status || 500);
            if (err.rateLimits) setLastRateLimits(err.rateLimits);
            setHistory(prev =>
              prev.map(item =>
                item.id === assistantMessageId
                  ? {
                      ...item,
                      content: accumulatedReply || `⚠️ Error: ${err.message}`,
                      error: true
                    }
                  : item
              )
            );
            setIsSending(false);
          }
        });
      } catch (err) {
        setLastError(err);
        setIsSending(false);
      }
    } else {
      // Non-streaming completion
      try {
        const result = await sendChatMessage(payload, abortControllerRef.current.signal);
        setLastLatencyMs(result.latencyMs);
        setLastUsage(result.usage);
        setLastRateLimits(result.rateLimits);
        if (result.rag) setLastRagMeta(result.rag);
        setLastStatus(200);

        setHistory(prev =>
          prev.map(item =>
            item.id === assistantMessageId
              ? {
                  ...item,
                  content: result.reply,
                  latencyMs: result.latencyMs,
                  usage: result.usage,
                  model: result.model,
                  rag: result.rag
                }
              : item
          )
        );
      } catch (err) {
        setLastError(err);
        setLastStatus(err.status || 500);
        if (err.rateLimits) setLastRateLimits(err.rateLimits);

        setHistory(prev =>
          prev.map(item =>
            item.id === assistantMessageId
              ? {
                  ...item,
                  content: `⚠️ ${err.message}`,
                  error: true
                }
              : item
          )
        );
      } finally {
        setIsSending(false);
      }
    }
  };

  // Stop generation action
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSending(false);
    }
  };

  // Retry last turn
  const retryLastTurn = () => {
    if (history.length === 0 || isSending) return;
    const lastUserTurn = [...history].reverse().find(t => t.role === 'user');
    if (lastUserTurn) {
      // Remove last assistant and user turn, then re-send
      const index = history.findIndex(t => t.id === lastUserTurn.id);
      const trimmedHistory = history.slice(0, index);
      setHistory(trimmedHistory);
      sendMessage(lastUserTurn.content);
    }
  };

  // Custom Messages handlers
  const addCustomMessage = (role = 'system') => {
    setCustomMessages(prev => [
      ...prev,
      {
        id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        role,
        content: ''
      }
    ]);
  };

  const updateCustomMessage = (id, fields) => {
    setCustomMessages(prev =>
      prev.map(item => (item.id === id ? { ...item, ...fields } : item))
    );
  };

  const moveCustomMessage = (index, direction) => {
    setCustomMessages(prev => {
      const copy = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const duplicateCustomMessage = (index) => {
    setCustomMessages(prev => {
      const copy = [...prev];
      const item = copy[index];
      const dup = {
        ...item,
        id: `cm_${Date.now()}_dup`
      };
      copy.splice(index + 1, 0, dup);
      return copy;
    });
  };

  const removeCustomMessage = (id) => {
    setCustomMessages(prev => prev.filter(item => item.id !== id));
  };

  // Profile management
  const saveProfile = (name) => {
    if (!name || !name.trim()) return;
    const newProfile = {
      id: `prof_${Date.now()}`,
      name: name.trim(),
      updatedAt: new Date().toISOString(),
      data: {
        model: selectedModel,
        systemInstructions,
        companyBackground,
        customMessages,
        temperature,
        maxCompletionTokens,
        isStreaming
      }
    };

    setSavedProfiles(prev => {
      const filtered = prev.filter(p => p.name.toLowerCase() !== name.trim().toLowerCase());
      return [newProfile, ...filtered];
    });
    setActiveProfileName(name.trim());
  };

  const loadProfile = (profile) => {
    if (!profile || !profile.data) return;
    const { data } = profile;
    if (data.model) setSelectedModel(data.model);
    if (data.systemInstructions !== undefined) setSystemInstructions(data.systemInstructions);
    if (data.companyBackground !== undefined) setCompanyBackground(data.companyBackground);
    if (Array.isArray(data.customMessages)) setCustomMessages(data.customMessages);
    if (data.temperature !== undefined) setTemperature(data.temperature);
    if (data.maxCompletionTokens !== undefined) setMaxCompletionTokens(data.maxCompletionTokens);
    if (data.isStreaming !== undefined) setIsStreaming(data.isStreaming);
    setActiveProfileName(profile.name);
  };

  const deleteProfile = (profileId) => {
    setSavedProfiles(prev => prev.filter(p => p.id !== profileId));
  };

  const exportProfiles = () => {
    const exportData = {
      appName: 'Groq Chat Playground Profiles',
      exportedAt: new Date().toISOString(),
      profiles: savedProfiles
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groq-playground-profiles-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProfiles = (jsonData) => {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const importedList = Array.isArray(parsed.profiles) ? parsed.profiles : Array.isArray(parsed) ? parsed : null;
      if (!importedList) throw new Error('Invalid profiles format');

      setSavedProfiles(prev => {
        const map = new Map(prev.map(p => [p.name.toLowerCase(), p]));
        for (const item of importedList) {
          if (item.name && item.data) {
            map.set(item.name.toLowerCase(), {
              ...item,
              id: item.id || `prof_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
            });
          }
        }
        return Array.from(map.values());
      });
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  };

  const resetToDefaults = () => {
    setSystemInstructions(STARTER_SYSTEM_INSTRUCTIONS);
    setCompanyBackground(STARTER_COMPANY_TEMPLATE);
    setCustomMessages([]);
    setTemperature(0.7);
    setMaxCompletionTokens(1024);
    setIsStreaming(true);
    setActiveProfileName(null);
  };

  const clearChat = () => {
    setHistory([]);
    setLastError(null);
    setLastUsage(null);
  };

  const clearAllData = () => {
    clearChat();
    resetToDefaults();
    setSavedProfiles([]);
    window.localStorage.clear();
  };

  return {
    groqConfigured,
    checkingHealth,
    refreshHealth,
    models,
    loadingModels,
    liveDiscovery,
    freeTierSnapshot,
    loadModelsList,
    isFreeOnly,
    setIsFreeOnly,
    selectedModel,
    setSelectedModel,
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
    isStreaming,
    setIsStreaming,
    history,
    draftMessage,
    setDraftMessage,
    isSending,
    sendMessage,
    stopGeneration,
    retryLastTurn,
    clearChat,
    effectivePayload,
    previewLoading,
    lastUsage,
    lastRateLimits,
    lastLatencyMs,
    lastError,
    lastStatus,
    savedProfiles,
    activeProfileName,
    saveProfile,
    loadProfile,
    deleteProfile,
    exportProfiles,
    importProfiles,
    resetToDefaults,
    clearAllData,
    // RAG features
    useRag,
    setUseRag,
    ragTopK,
    setRagTopK,
    ragStatus,
    indexingRag,
    lastRagMeta,
    handleIndexRagDocument,
    handleClearRagIndex
  };
}
