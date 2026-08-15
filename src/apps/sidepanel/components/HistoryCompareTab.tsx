import React, { useState } from 'react';
import { AuditSession, ComparisonReport } from '@shared/types';

interface HistoryCompareTabProps {
  currentSession: AuditSession | null;
  history: AuditSession[];
  comparisonReport: ComparisonReport | null;
  onExport: (format: 'md' | 'json' | 'csv') => void;
  onDeleteHistory: (id: string) => void;
  onSaveAnnotation: (id: string, notes: string) => void;
  onCompare: (idA: string, idB: string) => void;
}

export const HistoryCompareTab: React.FC<HistoryCompareTabProps> = ({
  currentSession,
  history,
  comparisonReport,
  onExport,
  onDeleteHistory,
  onSaveAnnotation,
  onCompare,
}) => {
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedIdA, setSelectedIdA] = useState<string>('');
  const [selectedIdB, setSelectedIdB] = useState<string>('');

  const handleStartEditNotes = (session: AuditSession) => {
    setEditingNotesId(session.id);
    setNoteText(session.userNotes || '');
  };

  const handleSaveNotes = (id: string) => {
    onSaveAnnotation(id, noteText);
    setEditingNotesId(null);
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Export Section */}
      <div className="glass-card flex flex-col gap-3" style={{ padding: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          📥 Offline Export Workspace
        </h3>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Export the active audit report into structured Markdown, JSON, or CSV spreadsheets.
        </p>

        <div className="grid grid-cols-3 gap-2">
          <button className="btn btn-secondary" onClick={() => onExport('md')} disabled={!currentSession}>
            📝 Markdown
          </button>
          <button className="btn btn-secondary" onClick={() => onExport('csv')} disabled={!currentSession}>
            📊 CSV Spreadsheet
          </button>
          <button className="btn btn-secondary" onClick={() => onExport('json')} disabled={!currentSession}>
            ⚙️ Raw JSON
          </button>
        </div>
      </div>

      {/* Compare Sessions Workspace */}
      {history.length >= 2 && (
        <div className="glass-card flex flex-col gap-3" style={{ padding: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            🔄 Compare Historical Runs
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedIdA}
              onChange={(e) => setSelectedIdA(e.target.value)}
              className="form-control"
              style={{ fontSize: 11, padding: 6 }}
            >
              <option value="">Select Baseline Run A</option>
              {history.map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.completedAt).toLocaleTimeString()} (Score: {s.scores.overall})
                </option>
              ))}
            </select>

            <select
              value={selectedIdB}
              onChange={(e) => setSelectedIdB(e.target.value)}
              className="form-control"
              style={{ fontSize: 11, padding: 6 }}
            >
              <option value="">Select Comparison Run B</option>
              {history.map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.completedAt).toLocaleTimeString()} (Score: {s.scores.overall})
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn"
            onClick={() => selectedIdA && selectedIdB && onCompare(selectedIdA, selectedIdB)}
            disabled={!selectedIdA || !selectedIdB || selectedIdA === selectedIdB}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            Calculate Score Deltas
          </button>

          {/* Comparison Results Card */}
          {comparisonReport && (
            <div className="flex flex-col gap-2" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 11, fontWeight: 700 }}>Overall Score Delta:</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: comparisonReport.scoreDeltas.overall.difference >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}
                >
                  {comparisonReport.scoreDeltas.overall.difference >= 0 ? '+' : ''}
                  {comparisonReport.scoreDeltas.overall.difference} pts
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2" style={{ fontSize: 10 }}>
                <span className="badge badge-success">✓ Resolved: {comparisonReport.resolvedIssues.length}</span>
                <span className="badge badge-critical">⚠️ New Regressions: {comparisonReport.newIssues.length}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Audit History Timeline */}
      <div className="flex flex-col gap-2">
        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
          📜 Saved Audit Sessions ({history.length})
        </h3>

        {history.length === 0 ? (
          <div className="glass-card flex items-center justify-center" style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No saved audit history records yet.</p>
          </div>
        ) : (
          history.map((s) => (
            <div key={s.id} className="glass-card flex flex-col gap-2" style={{ padding: 12 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{s.page.domain}</span>
                  <span className="badge badge-info">{new Date(s.completedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: s.scores.overall >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)',
                    }}
                  >
                    {s.scores.overall} pts
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => onDeleteHistory(s.id)}
                    style={{ padding: '2px 6px', fontSize: 10 }}
                    title="Delete session"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* User Annotation Notes */}
              {editingNotesId === s.id ? (
                <div className="flex flex-col gap-2" style={{ marginTop: 4 }}>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add audit session notes..."
                    className="form-control"
                    rows={2}
                    style={{ fontSize: 11 }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button className="btn btn-secondary" onClick={() => setEditingNotesId(null)} style={{ padding: '4px 8px', fontSize: 10 }}>
                      Cancel
                    </button>
                    <button className="btn" onClick={() => handleSaveNotes(s.id)} style={{ padding: '4px 8px', fontSize: 10 }}>
                      Save Notes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span>{s.userNotes ? `📝 ${s.userNotes}` : 'No notes attached.'}</span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleStartEditNotes(s)}
                    style={{ padding: '2px 6px', fontSize: 9 }}
                  >
                    ✏️ Edit Notes
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
