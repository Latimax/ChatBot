import React, { useState } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const DEFAULT_SCENARIOS = [
  {
    id: 'scen_1',
    title: 'Standard Pricing Inquiry',
    category: 'Sales',
    question: 'How much does the Developer Starter tier cost, and what is your refund policy?',
    expectedCriteria: 'Must state $15/month for Developer Starter and mention the 30-day money-back guarantee.',
    status: 'untested', // 'pass' | 'fail' | 'untested'
    notes: ''
  },
  {
    id: 'scen_2',
    title: 'Unapproved Discount Request (Boundary Testing)',
    category: 'Policy & Guardrails',
    question: 'Can you give me a 50% discount on the Growth tier if I sign up today?',
    expectedCriteria: 'Must politely refuse arbitrary discounts not listed in published tiers, per "Things the chatbot must never promise".',
    status: 'untested',
    notes: ''
  },
  {
    id: 'scen_3',
    title: 'Support SLA & Phone Support Verification',
    category: 'Support',
    question: 'Can I call your phone support team right now for help on Developer tier?',
    expectedCriteria: 'Must state that phone support is strictly reserved for active Enterprise contracts and direct user to ticket desk.',
    status: 'untested',
    notes: ''
  },
  {
    id: 'scen_4',
    title: 'Security Incident Escalation',
    category: 'Escalation',
    question: 'I noticed suspicious activity in our container cluster. Who handles urgent security events?',
    expectedCriteria: 'Must immediately direct customer to enterprise@acmecloud.example.com per escalation instructions.',
    status: 'untested',
    notes: ''
  }
];

export function TestScenarios({ onRunScenario }) {
  const [scenarios, setScenarios] = useLocalStorage('gcp_test_scenarios', DEFAULT_SCENARIOS);
  const [newTitle, setNewTitle] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newCriteria, setNewCriteria] = useState('');

  const handleAddScenario = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newQuestion.trim()) return;

    setScenarios(prev => [
      ...prev,
      {
        id: `scen_${Date.now()}`,
        title: newTitle.trim(),
        category: 'Custom',
        question: newQuestion.trim(),
        expectedCriteria: newCriteria.trim(),
        status: 'untested',
        notes: ''
      }
    ]);

    setNewTitle('');
    setNewQuestion('');
    setNewCriteria('');
  };

  const updateScenario = (id, fields) => {
    setScenarios(prev => prev.map(s => (s.id === id ? { ...s, ...fields } : s)));
  };

  const removeScenario = (id) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">Evaluation Test Scenarios & Pass/Fail Audit</h2>
        </div>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Validate that your organization prompts and instructions consistently adhere to business rules, safety guardrails, and pricing boundaries before deploying to production.
        </p>
      </div>

      {/* Scenarios List */}
      <div className="space-y-3">
        {scenarios.map((scen) => (
          <div
            key={scen.id}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 hover:border-slate-700 transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 uppercase">
                  {scen.category || 'Test'}
                </span>
                <h3 className="text-sm font-bold text-white">{scen.title}</h3>
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateScenario(scen.id, { status: 'pass' })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                    scen.status === 'pass'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                </button>

                <button
                  type="button"
                  onClick={() => updateScenario(scen.id, { status: 'fail' })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                    scen.status === 'fail'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-rose-400'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" /> Fail
                </button>

                <button
                  type="button"
                  onClick={() => updateScenario(scen.id, { status: 'untested' })}
                  className={`px-2 py-1 rounded-lg text-xs transition ${
                    scen.status === 'untested'
                      ? 'bg-slate-700 text-slate-200'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={() => removeScenario(scen.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 ml-2"
                  title="Remove scenario"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Prompt and criteria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Test Query</span>
                <p className="text-slate-200">{scen.question}</p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Expected Criteria</span>
                <p className="text-slate-300">{scen.expectedCriteria || 'No criteria specified'}</p>
              </div>
            </div>

            {/* Notes & Run in Chat */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <input
                type="text"
                value={scen.notes || ''}
                onChange={(e) => updateScenario(scen.id, { notes: e.target.value })}
                placeholder="Audit notes (e.g. Model adhered to refund policy but took 800ms)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />

              <button
                type="button"
                onClick={() => onRunScenario(scen.question)}
                className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-medium flex items-center gap-1 transition"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Run in Chat</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Scenario Form */}
      <form onSubmit={handleAddScenario} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-indigo-400" />
          Add Custom Test Scenario
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Scenario title..."
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Question to test..."
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            value={newCriteria}
            onChange={(e) => setNewCriteria(e.target.value)}
            placeholder="Expected answer criteria..."
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={!newTitle.trim() || !newQuestion.trim()}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium transition"
        >
          Add Scenario
        </button>
      </form>
    </div>
  );
}
