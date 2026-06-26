import React from 'react';
import './ProgressBar.css';

export default function ProgressBar({ current, total, categories }) {
  const pct = Math.round((current / total) * 100);

  return (
    <div className="progress-bar-wrapper">
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="progress-labels">
        <span className="progress-step">
          Pergunta <strong>{current}</strong> de <strong>{total}</strong>
        </span>
        <span className="progress-pct">{pct}%</span>
      </div>
    </div>
  );
}
