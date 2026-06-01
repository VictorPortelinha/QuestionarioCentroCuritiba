import React from 'react';
import './SuccessScreen.css';

export default function SuccessScreen({ responseId, onRestart }) {
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
          Contribuição<br />
          <span className="title-accent">Registrada!</span>
        </h1>

        <p className="success-text">
          Obrigado por participar do Programa Curitiba de Volta ao Centro.
          Sua contribuição é fundamental para subsidiar as políticas públicas
          de requalificação urbana da Região Central.
        </p>

        {responseId && (
          <div className="success-id">
            <span className="success-id-label">Código de confirmação</span>
            <code className="success-id-code">{responseId}</code>
          </div>
        )}

        <div className="success-info">
          <div className="info-item">
            <span className="info-icon">🗺️</span>
            <div>
              <strong>Dados georreferenciados</strong>
              <p>Seus marcadores foram armazenados como pontos no mapa da cidade.</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">📊</span>
            <div>
              <strong>Análise participativa</strong>
              <p>As respostas serão analisadas pela equipe de planejamento urbano da Prefeitura.</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">🏙️</span>
            <div>
              <strong>Impacto real</strong>
              <p>Os resultados servirão de base para as ações do programa de revitalização do Centro.</p>
            </div>
          </div>
        </div>

        <button className="btn btn-outline success-restart" onClick={onRestart}>
          Responder novamente
        </button>
      </div>
    </div>
  );
}
