import React from 'react';
import './WelcomeScreen.css';

const CATEGORIES = [
  { icon: '', label: 'Patrimônio e Cultura', cls: 'cat-patrimonio' },
  { icon: '', label: 'Mobilidade e Infraestrutura', cls: 'cat-mobilidade' },
  { icon: '', label: 'Moradia e Inclusão', cls: 'cat-moradia' },
  { icon: '', label: 'Segurança Urbana', cls: 'cat-seguranca' },
];

export default function WelcomeScreen({ onStart, user, onLogout }) {
  return (
    <div className="welcome">
      {user && (
        <div className="welcome-userbar">
          <span className="welcome-user">
            <span className="welcome-user-dot" />
            {user.name?.split(' ')[0]}
          </span>
          <button className="btn btn-ghost welcome-logout" onClick={onLogout}>
            Sair
          </button>
        </div>
      )}
      {/* Background texture */}
      <div className="welcome-bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="bg-glow" />
      </div>

      <div className="welcome-content">
        {/* Header badge */}
        <div className="badge">
          <span className="badge-dot" />
          Programa Curitiba de Volta ao Centro  2026
        </div>

        {/* Title */}
        <h1 className="welcome-title">
          Curitiba de Volta<br />
          <span className="title-accent">ao Centro</span>
        </h1>

        <p className="welcome-subtitle">
          Participação Pública com Sistemas de Informação Geográfica
        </p>

        {/* Quote */}
        <blockquote className="welcome-quote">
          "O principal objetivo do Programa é devolver o coração da cidade
          aos curitibanos, mediante a adoção de estratégias de transformação
          da Região Central com foco na requalificação urbanística e ambiental,
          integrando moradia, trabalho, segurança, cultura e lazer."
          <cite>— Prefeitura Municipal de Curitiba, 2026</cite>
        </blockquote>

        {/* Instructions */}
        <div className="welcome-instructions">
          <h2>Como participar</h2>
          <ol>
            <li>
              <span className="step-num">01</span>
              <span>Responda <strong>11 perguntas</strong> sobre o Centro de Curitiba</span>
            </li>
            <li>
              <span className="step-num">02</span>
              <span>Para cada pergunta, <strong>marque até 3 locais</strong> no mapa interativo</span>
            </li>
            <li>
              <span className="step-num">03</span>
              <span>Ao final, adicione um <strong>comentário opcional</strong> e envie sua contribuição</span>
            </li>
          </ol>
        </div>

        {/* Category pills */}
        <div className="welcome-categories">
          {CATEGORIES.map((c) => (
            <span key={c.label} className={`category-tag ${c.cls}`}>
              {c.icon} {c.label}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button className="btn btn-primary welcome-cta" onClick={onStart}>
          Iniciar questionário
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <p className="welcome-footer">
          Suas respostas são anônimas e serão utilizadas para testar um PILOTO de opiniões publicas em urbanismo.
        </p>
      </div>
    </div>
  );
}
