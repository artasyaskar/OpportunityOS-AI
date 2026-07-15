export type AuditEventCategory = 'system' | 'security' | 'user_action' | 'ai_generation' | 'payment';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  category: AuditEventCategory;
  action: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export class AuditLogger {
  /**
   * Logs a critical action to the Audit Trail.
   */
  static log(
    userId: string,
    category: AuditEventCategory,
    action: string,
    metadata?: Record<string, any>
  ): void {
    const logEntry: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      category,
      action,
      metadata,
    };

    console.log(`[AUDIT] [${category.toUpperCase()}] User: ${userId} - ${action}`, metadata || '');

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('opportunityos_audit_logs');
        const logs: AuditLog[] = stored ? JSON.parse(stored) : [];
        logs.unshift(logEntry);
        // Keep last 1000 logs
        if (logs.length > 1000) logs.pop();
        localStorage.setItem('opportunityos_audit_logs', JSON.stringify(logs));
      } catch (e) {
        console.error('Failed to write audit log to local storage', e);
      }
    }
  }

  static getLogs(): AuditLog[] {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('opportunityos_audit_logs');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }
}
