'use client';

/**
 * Shared icon system for OpportunityOS.
 *
 * Single source of truth for every icon in the product, built on lucide-react.
 * Before this module, icons were emoji scattered across ~40 files with three
 * separate opportunity-type maps and two agent-icon maps that drifted apart.
 * Everything now resolves through the maps and helpers here so the visual
 * language stays consistent and a swap is a one-line change.
 *
 * Conventions:
 * - Icons inherit `currentColor` (set color on the parent) and default stroke.
 * - Decorative icons should be given aria-hidden by the caller; icon-only
 *   controls must supply an accessible label.
 */

import {
  // nav
  LayoutDashboard, Telescope, ClipboardList, PenLine, Archive, Map, Briefcase,
  BrainCircuit, Dna, Settings,
  // agents
  BarChart3, ClipboardCheck, GitCompare, Crosshair, ScanSearch, CalendarDays,
  RefreshCw, Gauge, ShieldCheck,
  // opportunity types
  GraduationCap, Landmark, Banknote, Code2, Rocket, Trophy, Flame,
  // doc types
  FileText, Lightbulb, Mail, Microscope,
  // status
  Check, AlertTriangle, X, Clock, Lock, Info, Loader2, Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type { LucideIcon };

/* ============================================================
   PRIMARY NAVIGATION  (Sidebar NAV_ITEMS)
============================================================ */
export const navIcons: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/dashboard/opportunities': Telescope,
  '/dashboard/applications': ClipboardList,
  '/dashboard/builder': PenLine,
  '/dashboard/vault': Archive,
  '/dashboard/roadmap': Map,
  '/dashboard/portfolio': Briefcase,
  '/dashboard/agents': BrainCircuit,
  '/dashboard/settings': Dna,
};

/* ============================================================
   AI AGENTS  (canonical map — replaces the two duplicate copies
   in agents/page.tsx and page.tsx)
============================================================ */
export const agentIcons: Record<string, LucideIcon> = {
  discovery: Telescope,
  probability: BarChart3,
  eligibility: ClipboardCheck,
  'gap-analysis': GitCompare,
  strategist: Crosshair,
  builder: PenLine,
  reviewer: ScanSearch,
  compliance: ShieldCheck,
  planner: CalendarDays,
  rejection: RefreshCw,
  portfolio: Briefcase,
  readiness: Gauge,
};

/* ============================================================
   OPPORTUNITY TYPES  (canonical — replaces TYPE_ICONS,
   OPPORTUNITY_TYPES_METADATA, and the inline dashboard ternary)
============================================================ */
const opportunityTypeMap: Record<string, LucideIcon> = {
  scholarship: GraduationCap,
  scholarships: GraduationCap,
  fellowship: Landmark,
  fellowships: Landmark,
  grant: Banknote,
  grants: Banknote,
  job: Code2,
  jobs: Code2,
  accelerator: Rocket,
  accelerators: Rocket,
  competition: Trophy,
  competitions: Trophy,
  hackathon: Code2,
  hackathons: Code2,
  bootcamp: Flame,
  bootcamps: Flame,
  internship: Briefcase,
  internships: Briefcase,
};

/** Resolve an opportunity `type` (any casing/plurality) to its icon. */
export function opportunityTypeIcon(type: string | undefined | null): LucideIcon {
  if (!type) return Sparkles;
  return opportunityTypeMap[type.toLowerCase().trim()] ?? Sparkles;
}

/* ============================================================
   DOCUMENT TYPES  (builder DOC_TYPES)
============================================================ */
export const docTypeIcons: Record<string, LucideIcon> = {
  sop: FileText,
  statement: FileText,
  essay: Lightbulb,
  personal: Lightbulb,
  cover: Mail,
  letter: Mail,
  research: Microscope,
  writing: PenLine,
};

/* ============================================================
   STATUS ICON  (replaces scattered ✓ ⚠️ ✕ ⏳ 🔒 ternaries)
============================================================ */
export type StatusKind =
  | 'success' | 'complete' | 'verified'
  | 'warning'
  | 'error' | 'rejected'
  | 'pending' | 'processing'
  | 'locked'
  | 'info';

const statusIconMap: Record<StatusKind, LucideIcon> = {
  success: Check,
  complete: Check,
  verified: Check,
  warning: AlertTriangle,
  error: X,
  rejected: X,
  pending: Clock,
  processing: Loader2,
  locked: Lock,
  info: Info,
};

export function StatusIcon({
  status,
  size = 16,
  className,
  'aria-label': ariaLabel,
}: {
  status: StatusKind;
  size?: number;
  className?: string;
  'aria-label'?: string;
}) {
  const Icon = statusIconMap[status] ?? Info;
  const spin = status === 'processing';
  return (
    <Icon
      size={size}
      className={className}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      style={spin ? { animation: 'rotate-slow 1s linear infinite' } : undefined}
    />
  );
}
