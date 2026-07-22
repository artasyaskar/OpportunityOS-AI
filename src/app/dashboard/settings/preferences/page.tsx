'use client';

import { useState, useEffect } from 'react';
import { getPersonalizationPrefs, savePersonalizationPrefs, PersonalizationPreferences } from '@/lib/personalization';
import { Target } from 'lucide-react';

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<PersonalizationPreferences>({
    writingTone: 'professional',
    targetCountries: [],
    dreamUniversities: [],
    preferredFunding: 'fully_funded',
    researchInterests: [],
  });

  const [toast, setToast] = useState('');

  useEffect(() => {
    setPrefs(getPersonalizationPrefs());
  }, []);

  const handleSave = () => {
    savePersonalizationPrefs(prefs);
    setToast('Preferences saved successfully. OpportunityOS will now prioritize these targets.');
    setTimeout(() => setToast(''), 3000);
  };

  const handleArrayChange = (field: keyof PersonalizationPreferences, value: string) => {
    const arr = value.split(',').map(s => s.trim()).filter(s => s);
    setPrefs(prev => ({ ...prev, [field]: arr }));
  };

  return (
    <div className="dashboard-content animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Target size={28} style={{ color: '#818cf8' }} /> Target Personalization Engine
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '32px' }}>
        Unlike your Evidence Vault (which tracks verified facts like your GPA), this engine dictates what the AI *looks for*. Set your goals below to calibrate the discovery algorithms.
      </p>

      {toast && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '24px' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Target Geographies</h2>
          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
            Enter target countries separated by commas (e.g., United Kingdom, Germany, USA)
          </label>
          <input
            type="text"
            className="input"
            value={prefs.targetCountries.join(', ')}
            onChange={(e) => handleArrayChange('targetCountries', e.target.value)}
            style={{ width: '100%', padding: '12px', fontSize: '14px' }}
          />
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Dream Universities</h2>
          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
            Enter dream institutions separated by commas (e.g., Oxford, MIT, TUM)
          </label>
          <input
            type="text"
            className="input"
            value={prefs.dreamUniversities.join(', ')}
            onChange={(e) => handleArrayChange('dreamUniversities', e.target.value)}
            style={{ width: '100%', padding: '12px', fontSize: '14px' }}
          />
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Research / Study Interests</h2>
          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
            Keywords for opportunity matching (e.g., Artificial Intelligence, Public Policy)
          </label>
          <input
            type="text"
            className="input"
            value={prefs.researchInterests.join(', ')}
            onChange={(e) => handleArrayChange('researchInterests', e.target.value)}
            style={{ width: '100%', padding: '12px', fontSize: '14px' }}
          />
        </div>

        <div className="card" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>AI Writing Tone</h2>
            <select
              className="input"
              value={prefs.writingTone}
              onChange={(e) => setPrefs({ ...prefs, writingTone: e.target.value as any })}
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              <option value="professional">Corporate / Professional</option>
              <option value="academic">Strictly Academic</option>
              <option value="narrative_story">Narrative / Storytelling</option>
              <option value="critical_pitch">Aggressive Pitch</option>
            </select>
          </div>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Funding Baseline</h2>
            <select
              className="input"
              value={prefs.preferredFunding}
              onChange={(e) => setPrefs({ ...prefs, preferredFunding: e.target.value as any })}
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              <option value="fully_funded">Fully Funded (Tuition + Living)</option>
              <option value="partial_stipend">Partial / Stipend Only</option>
              <option value="tuition_only">Tuition Waiver Only</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            Calibrate Engine
          </button>
        </div>
      </div>
    </div>
  );
}
