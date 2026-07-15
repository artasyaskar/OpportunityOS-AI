'use client';

import React from 'react';
import { PRICING_PLANS } from '@/lib/pricing';
import { useProfile } from '@/components/auth/ProfileContext';
import { CreditManager } from '@/lib/services/CreditManager';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { profile, updateProfile } = useProfile();

  if (!isOpen) return null;

  const handleDemoRefill = async () => {
    try {
      await updateProfile({ aiCredits: 1000 });
      alert('1000 Demo AI Credits Added! (Hackathon Mode)');
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl p-8 overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-10 relative z-10">
          <div className="inline-block p-3 rounded-full bg-indigo-500/20 mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Out of AI Credits</h2>
          <p className="text-gray-300 max-w-lg mx-auto">
            You've run out of your free AI processing credits. Upgrade to OpportunityOS Pro to unlock unlimited applications, deep strategy insights, and advanced AI matching.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 relative z-10">
          {PRICING_PLANS.filter(p => p.id === 'free' || p.id === 'professional_monthly').map(plan => (
            <div key={plan.id} className={`rounded-2xl p-6 border ${plan.id === 'professional_monthly' ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-700 bg-gray-800/50'} relative overflow-hidden`}>
              {plan.id === 'professional_monthly' && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  RECOMMENDED
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-extrabold text-white">${plan.priceUSD}</span>
                <span className="text-gray-400">/month</span>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-300">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {plan.aiLimitDaily === 999 ? 'Unlimited AI Generations' : '100 Free AI Credits'}
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {plan.opportunitiesLimit === 999 ? 'Unlimited Opportunity Saved' : 'Save up to 5 Opportunities'}
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className={`w-5 h-5 mr-2 ${plan.advisorEnabled ? 'text-green-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className={!plan.advisorEnabled ? 'text-gray-500 line-through' : ''}>AI Strategy Advisor</span>
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className={`w-5 h-5 mr-2 ${plan.simulatorEnabled ? 'text-green-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className={!plan.simulatorEnabled ? 'text-gray-500 line-through' : ''}>Interview Simulator</span>
                </li>
              </ul>

              <button className={`w-full py-3 rounded-lg font-bold transition-all ${plan.id === 'professional_monthly' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                {plan.id === 'professional_monthly' ? 'Upgrade to Pro' : 'Current Plan'}
              </button>
            </div>
          ))}
        </div>

        {/* Hackathon Demo Refill Button */}
        <div className="mt-8 text-center relative z-10">
          <button onClick={handleDemoRefill} className="text-xs text-gray-500 hover:text-indigo-400 border border-gray-700 border-dashed rounded px-3 py-1 transition-colors">
            🧑‍💻 Hackathon Demo: Refill 1000 Credits
          </button>
        </div>
      </div>
    </div>
  );
}
