export interface DiagnosticMetrics {
  endpoint: string;
  latencyMs: number;
  status: 'success' | 'error';
  timestamp: string;
  providerType?: string;
}

export function logDiagnostic(metrics: DiagnosticMetrics) {
  if (typeof window === 'undefined') return;
  try {
    const logs = localStorage.getItem('observability_logs') 
      ? JSON.parse(localStorage.getItem('observability_logs')!) 
      : [];
    
    logs.push({
      ...metrics,
      timestamp: new Date().toISOString()
    });

    // Cap local telemetry logs to avoid bloated storage
    if (logs.length > 50) {
      logs.shift();
    }

    localStorage.setItem('observability_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Telemetry observer failed:', e);
  }
}

export function getDiagnosticLogs(): DiagnosticMetrics[] {
  if (typeof window === 'undefined') return [];
  try {
    const logs = localStorage.getItem('observability_logs');
    if (logs) return JSON.parse(logs);
  } catch (e) {}
  return [];
}
