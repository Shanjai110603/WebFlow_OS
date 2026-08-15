import React from 'react';
import { FixerState } from '@shared/types';

interface FixerTabProps {
  settings: FixerState;
  onSettingChange: (key: keyof Omit<FixerState, 'version' | 'typography' | 'lastUpdatedAt'>, value: any) => void;
  onTypographyChange: (key: string, value: any) => void;
}

export const FixerTab: React.FC<FixerTabProps> = ({
  settings,
  onSettingChange,
  onTypographyChange,
}) => {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Overview Card */}
      <div className="glass-card flex flex-col gap-2" style={{ padding: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          🛠️ Page Fixer & Reading Comfort
        </h3>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Apply real-time visual overrides to fix dark themes, typography readability, sticky banners, and distraction overlays.
        </p>
      </div>

      {/* Visual Override Toggles */}
      <div className="glass-card flex flex-col gap-3" style={{ padding: 14 }}>
        <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Visual Layout Overrides
        </h4>

        {/* Dark Mode */}
        <div className="flex items-center justify-between" style={{ paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>🌙</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 12 }}>Force Dark Mode</p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Apply contrast-preserving dark stylesheet</p>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => onSettingChange('darkMode', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Focus Mode */}
        <div className="flex items-center justify-between" style={{ paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>🎯</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 12 }}>Focus Mode</p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Dim non-essential sidebars & headers</p>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.focusMode}
              onChange={(e) => onSettingChange('focusMode', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Hide Sticky */}
        <div className="flex items-center justify-between" style={{ paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>🧹</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 12 }}>Hide Sticky Overlays</p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Deactivate floating headers and sticky ads</p>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.hideSticky}
              onChange={(e) => onSettingChange('hideSticky', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Reader Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>📖</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 12 }}>Distraction-Free Reader Mode</p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Extract core article text into isolated view</p>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={!!settings.readerMode}
              onChange={(e) => onSettingChange('readerMode', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Typography Comfort Controls */}
      <div className="glass-card flex flex-col gap-3" style={{ padding: 14 }}>
        <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Typography Customization
        </h4>

        {/* Font Size Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Font Size:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-purple-hover)' }}>{settings.typography.fontSize}%</span>
          </div>
          <input
            type="range"
            min="100"
            max="200"
            step="5"
            value={settings.typography.fontSize}
            onChange={(e) => onTypographyChange('fontSize', parseInt(e.target.value, 10))}
          />
        </div>

        {/* Line Height Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Line Spacing:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-purple-hover)' }}>{settings.typography.lineHeight}x</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.1"
            value={settings.typography.lineHeight}
            onChange={(e) => onTypographyChange('lineHeight', parseFloat(e.target.value))}
          />
        </div>

        {/* Font Family Selector */}
        <div className="flex flex-col gap-1">
          <label className="form-label" style={{ marginBottom: 2 }}>Font Style Theme:</label>
          <select
            value={settings.typography.fontFamily}
            onChange={(e) => onTypographyChange('fontFamily', e.target.value)}
            className="form-control"
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            <option value="default">Default Page Font</option>
            <option value="sans-serif">Clean Sans-Serif (Inter)</option>
            <option value="serif">Readable Serif</option>
            <option value="dyslexic">OpenDyslexic Accessibility Font</option>
          </select>
        </div>
      </div>
    </div>
  );
};
