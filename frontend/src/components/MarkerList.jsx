import React from 'react';
import './MarkerList.css';

export default function MarkerList({ markers, onRemove, color }) {
  if (!markers.length) {
    return (
      <div className="marker-empty">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Nenhum local marcado ainda
      </div>
    );
  }

  return (
    <ul className="marker-list">
      {markers.map((m, i) => (
        <li key={m.id} className="marker-item">
          <span className="marker-badge" style={{ background: color }}>
            {i + 1}
          </span>
          <div className="marker-info">
            <span className="marker-coords">
              {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
            </span>
            {m.note && (
              <span className="marker-note">{m.note}</span>
            )}
          </div>
          <button
            className="marker-remove"
            onClick={() => onRemove(m.id)}
            title="Remover marcador"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
