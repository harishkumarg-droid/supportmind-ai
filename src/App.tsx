/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  MessageSquare, 
  BookOpen, 
  Send, 
  FileText, 
  Plus, 
  Trash2, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Loader2,
  Sparkles,
  User,
  ShieldCheck,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGeminiResponse, SYSTEM_INSTRUCTION } from './services/gemini';
import { cn } from './lib/utils';
import ReactMarkdown from 'react-markdown';

interface KnowledgeItem {
  id: number;
  title: string;
  content: string;
  category: string;
  source_type: string;
  created_at: string;
}

interface AIResponse {
  analysis: {
    intent: string;
    issueType: string;
    recommendedAction: string;
    stepByStepGuidance: string[];
    confidence: number;
    missingInfo?: string[];
  };
  replies: {
    best: string;
    short: string;
    detailed: string;
    internalNotes: string;
  };
  clarificationNeeded: boolean;
  clarificationQuestions: string[];
  sourcesUsed: string[];
}

export default function App() {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [customerMessage, setCustomerMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'assistant' | 'knowledge'>('assistant');
  const [isUploading, setIsUploading] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteCategory, setPasteCategory] = useState('General');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const fetchKnowledge = async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      setKnowledge(data);
    } catch (err) {
      console.error("Failed to fetch knowledge", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append('files', e.target.files[i]);
    }
    formData.append('category', 'Uploaded');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchKnowledge();
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteKnowledge = async () => {
    if (!pasteText || !pasteTitle) return;
    
    setIsUploading(true);
    try {
      const res = await fetch('/api/knowledge/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pasteTitle, content: pasteText, category: pasteCategory }),
      });
      if (res.ok) {
        fetchKnowledge();
        setShowPasteModal(false);
        setPasteText('');
        setPasteTitle('');
      }
    } catch (err) {
      console.error("Paste failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteKnowledge = async (id: number) => {
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKnowledge(prev => prev.filter(k => k.id !== id));
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleAnalyze = async () => {
    if (!customerMessage.trim()) return;
    
    setIsAnalyzing(true);
    setAiResult(null);

    try {
      const kbContent = knowledge.map(k => `[${k.title} - ${k.category}]: ${k.content}`).join('\n\n');
      const result = await getGeminiResponse(customerMessage, kbContent, SYSTEM_INSTRUCTION);
      setAiResult(result);
    } catch (err) {
      console.error("Analysis failed", err);
      alert(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#1C1917] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">SupportMind AI</h1>
          </div>
          
          <nav className="flex bg-stone-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('assistant')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'assistant' ? "bg-white shadow-sm text-emerald-700" : "text-stone-500 hover:text-stone-800"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Query Assistant
            </button>
            <button 
              onClick={() => setActiveTab('knowledge')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'knowledge' ? "bg-white shadow-sm text-emerald-700" : "text-stone-500 hover:text-stone-800"
              )}
            >
              <BookOpen className="w-4 h-4" />
              Knowledge Base
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-stone-500">Agent Mode</span>
              <span className="text-sm font-semibold text-emerald-600">Active</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center border-2 border-white shadow-sm">
              <User className="w-6 h-6 text-stone-500" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'assistant' ? (
            <motion.div 
              key="assistant"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Input Section */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                    <h2 className="font-semibold">Customer Message</h2>
                  </div>
                  <textarea 
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    placeholder="Paste the customer's message here..."
                    className="w-full h-48 p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none text-sm leading-relaxed"
                  />
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !customerMessage.trim()}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing Intent...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Expert Response
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-emerald-900 text-sm">Manager Tip</h3>
                      <p className="text-emerald-700 text-xs mt-1 leading-relaxed">
                        Always check the "Internal Notes" before sending a reply. It contains context that helps you understand the 'why' behind the suggested answer.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Section */}
              <div className="lg:col-span-7 space-y-6">
                {!aiResult && !isAnalyzing && (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 py-20 bg-white rounded-2xl border-2 border-dashed border-stone-200">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
                      <Send className="w-8 h-8" />
                    </div>
                    <p className="font-medium">Enter a message to see AI suggestions</p>
                    <p className="text-sm">Analysis, replies, and guidance will appear here</p>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="space-y-6 animate-pulse">
                    <div className="h-32 bg-white rounded-2xl border border-stone-200" />
                    <div className="h-64 bg-white rounded-2xl border border-stone-200" />
                  </div>
                )}

                {aiResult && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* Analysis Panel */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          <h2 className="font-semibold">Beginner Support Analysis</h2>
                        </div>
                        <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">
                          {aiResult.analysis.issueType}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Customer Intent</label>
                            <p className="text-sm font-medium text-stone-800 mt-1">{aiResult.analysis.intent}</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Recommended Action</label>
                            <p className="text-sm font-medium text-stone-800 mt-1">{aiResult.analysis.recommendedAction}</p>
                          </div>
                        </div>
                        <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Step-by-Step Guidance</label>
                          <ul className="mt-2 space-y-2">
                            {aiResult.analysis.stepByStepGuidance.map((step, idx) => (
                              <li key={idx} className="text-xs text-stone-600 flex gap-2">
                                <span className="font-bold text-emerald-600">{idx + 1}.</span>
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Clarifications */}
                    {aiResult.clarificationNeeded && (
                      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                          <h3 className="font-bold text-amber-900">Clarification Required</h3>
                        </div>
                        <p className="text-sm text-amber-800 mb-4">The AI is unsure about some details. Ask the customer these questions before proceeding:</p>
                        <ul className="space-y-2">
                          {aiResult.clarificationQuestions.map((q, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-amber-900 bg-white/50 p-2 rounded-lg border border-amber-100">
                              <HelpCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Replies */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <h2 className="font-semibold">Suggested Replies</h2>
                      </div>

                      {/* Best Reply */}
                      <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
                        <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex justify-between items-center">
                          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Best Reply (Recommended)</span>
                          <button 
                            onClick={() => copyToClipboard(aiResult.replies.best, 'best')}
                            className="text-stone-400 hover:text-emerald-600 transition-colors"
                          >
                            {copiedId === 'best' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="p-4 text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">
                          {aiResult.replies.best}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Short Reply */}
                        <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
                          <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Short Reply</span>
                            <button 
                              onClick={() => copyToClipboard(aiResult.replies.short, 'short')}
                              className="text-stone-400 hover:text-emerald-600 transition-colors"
                            >
                              {copiedId === 'short' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="p-4 text-xs leading-relaxed text-stone-800 italic">
                            "{aiResult.replies.short}"
                          </div>
                        </div>

                        {/* Internal Notes */}
                        <div className="bg-indigo-50 rounded-2xl overflow-hidden border border-indigo-100 shadow-sm">
                          <div className="bg-indigo-100/50 px-4 py-2 border-b border-indigo-200 flex items-center gap-2">
                            <Info className="w-3 h-3 text-indigo-600" />
                            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Internal Manager Notes</span>
                          </div>
                          <div className="p-4 text-xs leading-relaxed text-indigo-900">
                            {aiResult.replies.internalNotes}
                          </div>
                        </div>
                      </div>

                      {/* Detailed Reply */}
                      <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
                        <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex justify-between items-center">
                          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Detailed Explanation Reply</span>
                          <button 
                            onClick={() => copyToClipboard(aiResult.replies.detailed, 'detailed')}
                            className="text-stone-400 hover:text-emerald-600 transition-colors"
                          >
                            {copiedId === 'detailed' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="p-4 text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">
                          {aiResult.replies.detailed}
                        </div>
                      </div>

                      {/* Sources */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest w-full">Knowledge Sources Used</span>
                        {aiResult.sourcesUsed.map((source, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 rounded-md border border-stone-200 text-[10px] font-medium text-stone-600">
                            <FileText className="w-3 h-3" />
                            {source}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="knowledge"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Company Knowledge Base</h2>
                  <p className="text-stone-500">Upload policies, FAQs, and product info to train your AI assistant.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowPasteModal(true)}
                    className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Paste Text
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Documents
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    multiple 
                    className="hidden" 
                    accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.csv"
                  />
                </div>
              </div>

              {knowledge.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-stone-200 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-6">
                    <BookOpen className="w-10 h-10 text-stone-300" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Your Knowledge Base is Empty</h3>
                  <p className="text-stone-500 max-w-md mx-auto mb-8">
                    Start by uploading your company's support documentation. The AI uses this to generate accurate, policy-compliant responses.
                  </p>
                  <div className="flex gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="text-emerald-600 font-bold hover:underline">Upload Files</button>
                    <span className="text-stone-300">|</span>
                    <button onClick={() => setShowPasteModal(true)} className="text-emerald-600 font-bold hover:underline">Paste Manual Entry</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {knowledge.map((item) => (
                    <motion.div 
                      layout
                      key={item.id}
                      className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                          <FileText className="w-5 h-5" />
                        </div>
                        <button 
                          onClick={() => handleDeleteKnowledge(item.id)}
                          className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="font-bold text-stone-800 line-clamp-1 mb-1">{item.title}</h4>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full uppercase tracking-wider">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full uppercase tracking-wider">
                          {item.source_type.replace('.', '')}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-3 leading-relaxed mb-4">
                        {item.content}
                      </p>
                      <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[10px] text-stone-400">Added {new Date(item.created_at).toLocaleDateString()}</span>
                        <button className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                          View Full <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Paste Modal */}
      <AnimatePresence>
        {showPasteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasteModal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Add Manual Knowledge</h3>
                  <button onClick={() => setShowPasteModal(false)} className="text-stone-400 hover:text-stone-600">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1.5 block">Document Title</label>
                    <input 
                      type="text" 
                      value={pasteTitle}
                      onChange={(e) => setPasteTitle(e.target.value)}
                      placeholder="e.g. Refund Policy 2024"
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1.5 block">Category</label>
                      <select 
                        value={pasteCategory}
                        onChange={(e) => setPasteCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      >
                        <option>General</option>
                        <option>Policies</option>
                        <option>Product Info</option>
                        <option>Troubleshooting</option>
                        <option>FAQs</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1.5 block">Content</label>
                    <textarea 
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Paste the knowledge content here..."
                      className="w-full h-64 px-4 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none text-sm"
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button 
                    onClick={() => setShowPasteModal(false)}
                    className="flex-1 py-3 border border-stone-200 rounded-xl font-semibold hover:bg-stone-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handlePasteKnowledge}
                    disabled={!pasteText || !pasteTitle || isUploading}
                    className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:bg-stone-300 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save to Knowledge Base'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
