import React from 'react';
import './SuccessScreen.css';

export default function AlreadyResponded({ user, responseId, onLogout }) {
  return (
    <div className="success-shell">
      <div className="success-bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="success-glow" />
      </div>

      <div className="success-content">
        <div className="success-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="var(--c-accent)" strokeWidth="2" />
            <path d="M12 20l6 6 10-12" stroke="var(--c-accent)" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="success-title">
          Você já<br />
          <span className="title-accent">participou!</span>
        </h1>

        <p className="success-text">
          {user?.name?.split(' ')[0]}, sua contribuição já foi registrada.
          Cada participante pode enviar apenas uma resposta para garantir a
          integridade da pesquisa.
        </p>

        {responseId && (
          <div className="success-id">
            <span className="success-id-label">Código da sua contribuição</span>
            <code className="success-id-code">{responseId}</code>
          </div>
        )}

        <div className="success-info">
          <div className="info-item">
            <span className="info-icon">🔒</span>
            <div>
              <strong>Resposta única</strong>
              <p>O sistema bloqueia múltiplos envios do mesmo usuário e dispositivo.</p>
            </div>
          </div>
        </div>

        <button className="btn btn-outline success-restart" onClick={onLogout}>
          Sair da conta
        </button>
      </div>
    </div>
  );
}
