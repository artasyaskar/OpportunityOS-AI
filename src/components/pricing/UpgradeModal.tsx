'use client';

import React from 'react';
import { PRICING_PLANS } from '@/lib/pricing';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-opacity duration-300">
      <div className="relative w-full max-w-4xl bg-[#0f111a] border border-gray-800 rounded-[2rem] shadow-2xl p-8 sm:p-12 overflow-hidden flex flex-col">
        
        {/* Dynamic Premium Background Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-all z-20"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-12 relative z-10">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 mb-6 shadow-lg shadow-indigo-500/10">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 tracking-tight">
            Unlock Unlimited AI Intelligence
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            You've reached the limit of your free AI processing credits. Upgrade to OpportunityOS Pro to unlock the full power of your AI Chief Opportunity Officer.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 relative z-10">
          {PRICING_PLANS.filter(p => p.id === 'free' || p.id === 'professional_monthly').map(plan => {
            const isPro = plan.id === 'professional_monthly';
            return (
              <div 
                key={plan.id} 
                className={`relative flex flex-col rounded-[1.5rem] p-8 transition-all duration-300 ${
                  isPro 
                    ? 'bg-gradient-to-b from-[#1c1f33] to-[#131524] border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20 scale-100 md:scale-105 z-10' 
                    : 'bg-[#151822] border border-gray-800 hover:border-gray-700 opacity-90 hover:opacity-100'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap tracking-wider uppercase">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className={`text-2xl font-bold mb-2 ${isPro ? 'text-white' : 'text-gray-300'}`}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-black ${isPro ? 'text-white' : 'text-gray-400'}`}>${plan.priceUSD}</span>
                    <span className="text-gray-500 font-medium">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-start">
                    <svg className={`w-6 h-6 mr-3 shrink-0 ${isPro ? 'text-indigo-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    <span className={`text-base font-medium ${isPro ? 'text-gray-200' : 'text-gray-400'}`}>
                      {plan.aiLimitDaily === 999 ? 'Unlimited AI Generations' : '100 Free AI Credits'}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className={`w-6 h-6 mr-3 shrink-0 ${isPro ? 'text-indigo-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    <span className={`text-base font-medium ${isPro ? 'text-gray-200' : 'text-gray-400'}`}>
                      {plan.opportunitiesLimit === 999 ? 'Unlimited Opportunity Saves' : 'Save up to 5 Opportunities'}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className={`w-6 h-6 mr-3 shrink-0 ${plan.advisorEnabled ? 'text-indigo-400' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    <span className={`text-base font-medium ${!plan.advisorEnabled ? 'text-gray-600 line-through' : (isPro ? 'text-gray-200' : 'text-gray-400')}`}>
                      AI Strategy Advisor
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className={`w-6 h-6 mr-3 shrink-0 ${plan.simulatorEnabled ? 'text-indigo-400' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    <span className={`text-base font-medium ${!plan.simulatorEnabled ? 'text-gray-600 line-through' : (isPro ? 'text-gray-200' : 'text-gray-400')}`}>
                      Interview Simulator
                    </span>
                  </li>
                </ul>

                <button 
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                    isPro 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-default'
                  }`}
                >
                  {isPro ? 'Upgrade to Pro' : 'Current Plan'}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
