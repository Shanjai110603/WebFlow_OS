import React from 'react';

export type TabType = 'overview' | 'privacy-security' | 'seo' | 'accessibility' | 'ux' | 'fixer' | 'history';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  issueCounts?: {
    privacySecurity: number;
    seo: number;
    accessibility: number;
    ux: number;
  };
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  issueCounts,
}) => {
  const tabs: { id: TabType; label: string; icon: string; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'privacy-security', label: 'Privacy & Security', icon: '🔒', count: issueCounts?.privacySecurity },
    { id: 'seo', label: 'SEO', icon: '🔍', count: issueCounts?.seo },
    { id: 'accessibility', label: 'Accessibility', icon: '♿', count: issueCounts?.accessibility },
    { id: 'ux', label: 'UX', icon: '📖', count: issueCounts?.ux },
    { id: 'fixer', label: 'Page Fixer', icon: '🛠️' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  return (
    <div
      className="flex items-center gap-1"
      style={{
        background: 'rgba(15, 15, 26, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: isActive
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.35) 0%, rgba(124, 58, 237, 0.2) 100%)'
                : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              border: isActive ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
              transition: 'var(--transition-fast)',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                style={{
                  background: isActive ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
