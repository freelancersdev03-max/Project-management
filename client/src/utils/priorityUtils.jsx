import React from 'react';

/**
 * Normalizes priority and returns detailed design tokens for priority styling.
 * Supports: CRITICAL, HIGH, MEDIUM, LOW
 */
export const getPriorityDetails = (priority) => {
  const normalized = String(priority || 'MEDIUM').trim().toUpperCase();
  switch (normalized) {
    case 'CRITICAL':
      return {
        key: 'CRITICAL',
        label: 'Critical',
        badgeBg: '#fee2e2',
        badgeText: '#dc2626',
        badgeBorder: '#fca5a5',
        borderColor: '#ef4444',
        borderStyle: '2px solid #ef4444',
        cardHeaderBg: 'rgba(254, 226, 226, 0.3)',
        glowShadow: '0 4px 14px rgba(239, 68, 68, 0.18)',
      };
    case 'HIGH':
      return {
        key: 'HIGH',
        label: 'High',
        badgeBg: '#ffedd5',
        badgeText: '#c2410c',
        badgeBorder: '#fdba74',
        borderColor: '#f97316',
        borderStyle: '2px solid #f97316',
        cardHeaderBg: 'rgba(255, 237, 213, 0.3)',
        glowShadow: '0 4px 14px rgba(249, 115, 22, 0.15)',
      };
    case 'MEDIUM':
      return {
        key: 'MEDIUM',
        label: 'Medium',
        badgeBg: '#dbeafe',
        badgeText: '#1d4ed8',
        badgeBorder: '#93c5fd',
        borderColor: '#3b82f6',
        borderStyle: '2px solid #3b82f6',
        cardHeaderBg: 'rgba(219, 234, 254, 0.3)',
        glowShadow: '0 4px 14px rgba(59, 130, 246, 0.12)',
      };
    case 'LOW':
    default:
      return {
        key: 'LOW',
        label: 'Low',
        badgeBg: '#f1f5f9',
        badgeText: '#475569',
        badgeBorder: '#cbd5e1',
        borderColor: '#94a3b8',
        borderStyle: '2px solid #94a3b8',
        cardHeaderBg: 'rgba(241, 245, 249, 0.3)',
        glowShadow: 'none',
      };
  }
};

export const PriorityBadge = ({ priority, size = 'md', className = '' }) => {
  const p = getPriorityDetails(priority);
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[9px]'
    : size === 'lg'
      ? 'px-3.5 py-1 text-xs'
      : 'px-2.5 py-1 text-[10px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-black uppercase tracking-wider transition-all ${sizeClasses} ${className}`}
      style={{
        background: p.badgeBg,
        color: p.badgeText,
        border: `1px solid ${p.badgeBorder}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: p.borderColor }}
      />
      {p.label}
    </span>
  );
};
