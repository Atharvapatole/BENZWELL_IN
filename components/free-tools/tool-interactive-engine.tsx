'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
  ChevronRight,
  RotateCcw,
  Tag,
  Building,
  FileCheck,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolInteractiveEngineProps {
  tool: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    short_description?: string;
    tool_type: string;
    lead_capture_enabled: boolean;
    cta_heading?: string;
    cta_description?: string;
    cta_button_text?: string;
    coupon_code?: string;
    product?: {
      id: string;
      title: string;
      slug: string;
      price: number;
      sale_price?: number;
      main_image?: string;
    };
    tool_config?: any;
  };
}

// Default rich questions for Real Estate / Flat Buying assessment
const DEFAULT_FLAT_QUESTIONS = [
  {
    id: 'city_location',
    title: 'Which city & micro-market are you considering?',
    subtitle: 'Location dynamics dictate regulatory scrutiny and title risks.',
    type: 'select',
    options: ['Mumbai / MMR', 'Pune / PCMC', 'Bangalore', 'Delhi / NCR', 'Hyderabad', 'Chennai', 'Other Metro / Tier 2'],
  },
  {
    id: 'property_type',
    title: 'Property Stage & Category',
    subtitle: 'Under-construction and resale flats have entirely different risk vectors.',
    type: 'radio',
    options: ['Under Construction (1-3 yrs away)', 'Near Possession (Ready in 6 months)', 'Ready-to-Move New Building', 'Resale Flat (Existing Society)'],
  },
  {
    id: 'rera_status',
    title: 'Have you verified the official RERA registration & encumbrance?',
    subtitle: 'Never rely on brochure promises or verbal assurances.',
    type: 'radio',
    options: [
      'Yes, verified RERA certificates and litigation status myself',
      'Builder shared a RERA number, but I have not verified the portal documents',
      'Not verified yet',
      'Project is unapproved / exempt from RERA',
    ],
  },
  {
    id: 'budget_range',
    title: 'Estimated All-Inclusive Budget',
    subtitle: 'Include stamp duty, registration, GST, and maintenance deposits.',
    type: 'select',
    options: ['Under ₹50 Lakhs', '₹50 Lakhs - ₹1 Crore', '₹1 Crore - ₹2.5 Crores', '₹2.5 Crores - ₹5 Crores', 'Above ₹5 Crores'],
  },
  {
    id: 'loan_status',
    title: 'Home Loan & Pre-approval Status',
    subtitle: 'Bank approvals verify technical feasibility, but not private title risks.',
    type: 'radio',
    options: [
      'Pre-approved with top nationalized/private bank',
      'Planning to apply with builder-recommended NBFC',
      'Self-funded / 100% Cash flow',
      'Not initiated yet',
    ],
  },
  {
    id: 'agreement_review',
    title: 'Have you received a Draft Agreement for Sale & Carpet Area breakdown?',
    subtitle: 'RERA carpet area vs usable area disputes cause 70% of buyer grievances.',
    type: 'radio',
    options: [
      'Yes, reviewed draft clauses and carpet area plan',
      'Builder only provided quotation sheet and brochure',
      'Agent said agreement will be given after paying token deposit',
      'Not reached this stage',
    ],
  },
];

export function ToolInteractiveEngine({ tool }: ToolInteractiveEngineProps) {
  const [step, setStep] = useState<'welcome' | 'questions' | 'lead' | 'evaluating' | 'results'>('welcome');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [productData, setProductData] = useState<any>(tool.product);
  const [sessionId] = useState(() => `ses_${Math.random().toString(36).slice(2, 11)}`);

  // Track initial view
  useEffect(() => {
    fetch('/api/free-tools/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: tool.id, eventType: 'view', sessionId }),
    }).catch(() => {});
  }, [tool.id, sessionId]);

  const questions = tool.tool_config?.questions && Array.isArray(tool.tool_config.questions) && tool.tool_config.questions.length > 0
    ? tool.tool_config.questions
    : DEFAULT_FLAT_QUESTIONS;

  const currentQ = questions[currentIndex];

  const handleStart = () => {
    fetch('/api/free-tools/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: tool.id, eventType: 'start', sessionId }),
    }).catch(() => {});
    setStep('questions');
  };

  const handleSelectOption = (value: string) => {
    const updated = { ...answers, [currentQ.id]: value };
    setAnswers(updated);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      if (tool.lead_capture_enabled) {
        setStep('lead');
      } else {
        submitEvaluation(updated, null);
      }
    }
  };

  const submitEvaluation = async (answersPayload: Record<string, any>, leadPayload: any) => {
    setStep('evaluating');

    try {
      const res = await fetch('/api/free-tools/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: tool.id,
          toolSlug: tool.slug,
          answers: answersPayload,
          leadData: leadPayload,
          sessionId,
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        setEvaluation(data.evaluation);
        if (data.product) {
          setProductData(data.product);
        }
        setStep('results');
      } else {
        throw new Error(data.error || 'Evaluation failed');
      }
    } catch {
      // Fallback
      setStep('results');
    }
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitEvaluation(answers, {
      name: leadName,
      email: leadEmail,
      consent,
    });
  };

  const handleCtaClick = () => {
    fetch('/api/free-tools/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: tool.id, eventType: 'cta_click', sessionId }),
    }).catch(() => {});
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-10 px-4 sm:px-6">
      {/* 1. WELCOME SCREEN */}
      {step === 'welcome' && (
        <div className="bg-[#11131a] border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official BenzWell Free Tool</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            {tool.name}
          </h1>

          <p className="text-zinc-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            {tool.description ||
              tool.short_description ||
              'Answer a few quick questions to receive a tailored risk audit, due diligence checklist, and legal verification precautions.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10 text-left">
            <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4">
              <div className="text-sky-400 font-bold text-sm mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 100% Free Audit
              </div>
              <div className="text-zinc-400 text-xs">Complete personalized breakdown without payment.</div>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4">
              <div className="text-indigo-400 font-bold text-sm mb-1 flex items-center gap-1.5">
                <Building className="w-4 h-4" /> Real Due Diligence
              </div>
              <div className="text-zinc-400 text-xs">Identifies title flaws, hidden costs, and RERA loopholes.</div>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4">
              <div className="text-emerald-400 font-bold text-sm mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Private & Secure
              </div>
              <div className="text-zinc-400 text-xs">No spam. Your inputs are protected and never sold.</div>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-sky-500/20 hover:scale-[1.02] transition-all"
          >
            <span>Start Free Assessment</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 2. QUESTIONS SCREEN */}
      {step === 'questions' && currentQ && (
        <div className="bg-[#11131a] border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-2">
              <span>QUESTION {currentIndex + 1} OF {questions.length}</span>
              <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}% COMPLETED</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-snug">
            {currentQ.title}
          </h2>
          {currentQ.subtitle && (
            <p className="text-zinc-400 text-sm mb-6">{currentQ.subtitle}</p>
          )}

          <div className="space-y-3 mt-6">
            {currentQ.options.map((opt: string, i: number) => {
              const isSelected = answers[currentQ.id] === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(opt)}
                  className={cn(
                    'w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between group',
                    isSelected
                      ? 'bg-sky-500/15 border-sky-500 text-white shadow-md'
                      : 'bg-zinc-900/90 border-zinc-800 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/80'
                  )}
                >
                  <span className="font-semibold text-sm sm:text-base group-hover:text-white transition-colors">
                    {opt}
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-sky-400 transition-colors" />
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          {currentIndex > 0 && (
            <div className="mt-8 pt-6 border-t border-zinc-800/80 flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="text-xs font-bold text-zinc-400 hover:text-white transition-colors"
              >
                ← Previous Question
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. OPTIONAL LEAD CAPTURE */}
      {step === 'lead' && (
        <div className="bg-[#11131a] border border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 text-sky-400 mb-4 border border-sky-500/20">
              <FileCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              Your Analysis is Ready!
            </h2>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Where should we send your personalized audit report and verification checklist?
            </p>
          </div>

          <form onSubmit={handleLeadSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Your Name
              </label>
              <input
                type="text"
                required
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="e.g. rahul@example.com"
                className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            <label className="flex items-start gap-2.5 text-xs text-zinc-400 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-sky-500"
              />
              <span>
                I agree to receive my analysis report and helpful property due-diligence updates from BenzWell. Unsubscribe anytime.
              </span>
            </label>

            <button
              type="submit"
              className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Unlock My Free Audit & Results</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* 4. EVALUATING LOADING STATE */}
      {step === 'evaluating' && (
        <div className="bg-[#11131a] border border-zinc-800 rounded-3xl p-16 text-center shadow-2xl">
          <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin mx-auto mb-6" />
          <h3 className="text-xl font-extrabold text-white mb-2">
            Synthesizing Your Due Diligence Audit...
          </h3>
          <p className="text-zinc-400 text-sm max-w-sm mx-auto">
            Cross-referencing RERA rules, title scrutiny checkpoints, and common real estate pitfalls.
          </p>
        </div>
      )}

      {/* 5. RESULTS SCREEN */}
      {step === 'results' && evaluation && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header Card */}
          <div className="bg-[#11131a] border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-6">
              <div>
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block mb-1">
                  AUDIT RESULTS & READINESS
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Property Due Diligence Assessment
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-right">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">Readiness Level</div>
                  <div className={cn(
                    'text-sm font-extrabold',
                    evaluation.readinessLevel === 'High' ? 'text-emerald-400' : 'text-amber-400'
                  )}>
                    {evaluation.readinessLevel}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <p className="text-zinc-200 text-base leading-relaxed mb-8">
              {evaluation.summary}
            </p>

            {/* Key Findings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6">
                <h4 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Immediate Verification Steps
                </h4>
                <ul className="space-y-3">
                  {(evaluation.recommendedChecklist || []).map((item: string, i: number) => (
                    <li key={i} className="text-xs text-zinc-300 flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6">
                <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Red Flags To Avoid
                </h4>
                <ul className="space-y-3">
                  {(evaluation.redFlags || []).map((item: string, i: number) => (
                    <li key={i} className="text-xs text-red-200/90 flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Contextual BenzWell Product CTA */}
          {productData && (
            <div className="bg-gradient-to-br from-[#161926] to-[#0d0e14] border-2 border-sky-500/40 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-bold uppercase mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Recommended Complete Solution</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                    {tool.cta_heading || `Get the Full ${productData.title}`}
                  </h3>

                  <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                    {tool.cta_description ||
                      'Do not risk lakhs in deposits without the complete legal verification framework, 100+ point checklist, and clause-by-clause agreement analyzer.'}
                  </p>

                  {productData.couponCode && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-6">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Use coupon code <strong>{productData.couponCode}</strong> for exclusive discount</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      href={`/product/${productData.slug}`}
                      onClick={handleCtaClick}
                      className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-sky-500/25 transition-all"
                    >
                      <span>{productData.ctaButtonText || 'Get the Complete Guide'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    <div className="text-sm font-extrabold text-white">
                      ₹{productData.price}
                      {productData.originalPrice && productData.originalPrice > productData.price && (
                        <span className="text-xs text-zinc-500 line-through ml-2">
                          ₹{productData.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {productData.main_image && (
                  <div className="w-full md:w-56 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={productData.main_image}
                      alt={productData.title}
                      className="w-full rounded-2xl border border-zinc-700/60 shadow-xl object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Retake Button */}
          <div className="text-center pt-4">
            <button
              onClick={() => {
                setStep('welcome');
                setCurrentIndex(0);
                setAnswers({});
                setEvaluation(null);
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Assessment</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
