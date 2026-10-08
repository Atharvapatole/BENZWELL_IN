'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Send,
  Bot,
  User,
  Paperclip,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Headphones,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  sendSupportAiMessageAction,
  uploadSupportAttachmentAction,
  getSupportAiSessionMessagesAction,
} from '@/actions/support-ai';
import { createClient } from '@/lib/supabase/client';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
  attachments?: any[];
  uiActions?: any[];
  timestamp: string;
}

const QUICK_ACTIONS = [
  { label: '📦 My Purchases', prompt: 'Show me my purchased digital products and active downloads.' },
  { label: '🔍 Check My Order', prompt: 'I want to check the status of my recent BenzWell order.' },
  { label: '⚡ Download Problem', prompt: 'I paid for my product but I cannot find or download it.' },
  { label: '💳 Payment Issue', prompt: 'I experienced a payment problem during Razorpay checkout.' },
  { label: '👨‍💼 Human Support', prompt: 'I would like to escalate my issue and speak with human support.' },
];

export function SupportAiChatInterface() {
  const [sessionToken, setSessionToken] = useState<string>('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Session Token & Auth Check
  useEffect(() => {
    let token = localStorage.getItem('bz_support_session_token');
    if (!token) {
      token = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('bz_support_session_token', token);
    }
    setSessionToken(token);

    // Check user auth state
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    // Load existing messages for this session
    getSupportAiSessionMessagesAction(token).then((res) => {
      if (res.success && res.messages && res.messages.length > 0) {
        setMessages(
          res.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            provider: m.provider_used,
            model: m.model_used,
            attachments: m.attachment_metadata || [],
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        );
      } else {
        // Default Welcome Message
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content:
              "👋 Welcome to **BenzWell AI Support**!\n\nI'm your 24/7 assistant connected directly to BenzWell's backend systems. I can help verify orders, look up active entitlements, generate 5-minute temporary download access, troubleshoot payments, or connect you with our human team.\n\nHow can I help you today?",
            provider: 'groq',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    });
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (attachments.length >= 3) {
      setUploadError('Maximum 3 attachments per message allowed.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await uploadSupportAttachmentAction(formData);
    setIsUploading(false);

    if (res.success && res.attachment) {
      setAttachments((prev) => [...prev, res.attachment]);
    } else {
      setUploadError(res.error || 'Failed to upload file.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() && attachments.length === 0) return;
    if (isLoading) return;

    const userMessageItem: MessageItem = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      attachments: [...attachments],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessageItem]);
    setInputMessage('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsLoading(true);

    const res = await sendSupportAiMessageAction({
      sessionToken,
      messageText: text,
      attachments: currentAttachments,
    });

    setIsLoading(false);

    if (res.message) {
      const assistantMessageItem: MessageItem = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: res.message.content,
        provider: res.message.provider,
        model: res.message.model,
        uiActions: res.uiActions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMessageItem]);
    }
  };

  return (
    <div className="flex flex-col h-[750px] max-h-[85vh] rounded-3xl bg-white/80 dark:bg-[#11131a]/90 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#161822]/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">BenzWell Support AI</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Verified Assistant
              </span>
            </div>
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Multi-Provider Resilient Engine (Groq • Mistral • Gemini)</span>
            </p>
          </div>
        </div>

        {/* User Auth Badge */}
        <div>
          {user ? (
            <div className="flex items-center gap-2 text-xs bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1.5 rounded-full text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium truncate max-w-[140px]">{user.email}</span>
            </div>
          ) : (
            <Link
              href="/login?redirect=/support-ai"
              className="text-xs font-semibold text-sky-500 hover:text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
              <span>Sign In for Orders</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-sky-500/20">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[82%] space-y-2`}>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-sky-600 text-white rounded-tr-none shadow-md'
                    : 'bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200 dark:border-zinc-700/70 shadow-sm'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap font-sans text-sm">{m.content}</div>

                {/* Attachments Preview */}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20 dark:border-zinc-700 flex flex-wrap gap-2">
                    {m.attachments.map((att: any, idx: number) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg text-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">{att.originalFilename}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Interactive UI Actions */}
              {m.uiActions && m.uiActions.length > 0 && (
                <div className="space-y-2 pt-1">
                  {m.uiActions.map((action: any, idx: number) => {
                    if (action.type === 'download_ready') {
                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-700/80 text-emerald-200 space-y-2.5 animate-in fade-in duration-300"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Entitlement Verified • Download Ready</span>
                          </div>
                          <p className="text-xs text-zinc-300">
                            <strong>{action.payload.product_title}</strong> is unlocked. Click below to download (5-minute secure access link):
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <Link
                              href={action.payload.download_url}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-md"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Now</span>
                            </Link>
                            <Link
                              href="/account/downloads"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-700 transition-colors"
                            >
                              <span>Account Library</span>
                            </Link>
                          </div>
                        </div>
                      );
                    }

                    if (action.type === 'ticket_created' || action.type === 'escalated') {
                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-700/80 text-indigo-200 space-y-2 animate-in fade-in duration-300"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                            <Headphones className="w-4 h-4" />
                            <span>Support Ticket Assigned</span>
                          </div>
                          <p className="text-xs text-zinc-300">
                            Ticket Number: <strong className="text-white font-mono">{action.payload.ticket_number}</strong>
                          </p>
                          <p className="text-xs text-zinc-400">
                            Our support staff has been alerted and will follow up directly at info@benzwell.in.
                          </p>
                        </div>
                      );
                    }

                    if (action.type === 'auth_required') {
                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-800 text-sky-300 flex items-center justify-between gap-3 text-xs"
                        >
                          <span>{action.payload.message}</span>
                          <Link
                            href="/login?redirect=/support-ai"
                            className="px-3 py-1.5 rounded-xl bg-sky-500 text-zinc-950 font-bold text-xs hover:bg-sky-400 transition-colors flex-shrink-0"
                          >
                            Sign In
                          </Link>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}

              {/* Timestamp & Provider Meta */}
              <div
                className={`text-[10px] text-zinc-400 px-1 flex items-center gap-1.5 ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <span>{m.timestamp}</span>
                {m.provider && (
                  <span className="text-zinc-500">• {m.provider.toUpperCase()}</span>
                )}
              </div>
            </div>

            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 items-center text-zinc-400 text-xs py-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0 border border-sky-500/20">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700/60">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Analyzing backend records & verifying request...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Pills */}
      <div className="px-6 py-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-[#141620]/40 overflow-x-auto flex items-center gap-2 no-scrollbar">
        {QUICK_ACTIONS.map((action, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleSendMessage(action.prompt)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-sky-400 hover:border-sky-500/40 border border-zinc-200 dark:border-zinc-700/80 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="px-6 py-2 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded-xl text-xs text-zinc-800 dark:text-zinc-200"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span className="truncate max-w-[120px]">{att.originalFilename}</span>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(idx)}
                className="text-zinc-400 hover:text-red-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="px-6 py-1.5 bg-red-950/60 text-red-300 text-xs flex items-center gap-2 border-t border-red-800">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-[#161822]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* File Attachment Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isLoading}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Attach screenshot or file (Max 5MB)"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder="Type your question, order issue, or download inquiry..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />

          {/* Send Button */}
          <Button
            type="submit"
            disabled={isLoading || (!inputMessage.trim() && attachments.length === 0)}
            className="bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
