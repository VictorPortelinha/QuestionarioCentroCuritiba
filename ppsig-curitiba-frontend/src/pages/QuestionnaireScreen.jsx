import React, { useState, useMemo } from 'react';
import MapComponent from '../components/MapComponent';
import ProgressBar from '../components/ProgressBar';
import MarkerList from '../components/MarkerList';
import { useMapMarkers, useCategoryColor } from '../hooks/useUMap';
import './QuestionnaireScreen.css';

const CATEGORY_LABELS = {
  patrimonio: 'Patrimônio e Cultura',
  mobilidade: 'Mobilidade e Infraestrutura',
  moradia:    'Moradia e Inclusão',
  seguranca:  'Segurança Urbana',
};

export default function QuestionnaireScreen({ questions, onSubmit, onBack }) {
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [comment, setComment]         = useState('');
  const [confirming, setConfirming]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const {
    markers, addMarker, removeMarker, updateNote,
    getCount, getForQuestion, totalMarkers,
  } = useMapMarkers(3);

  const question  = questions[currentIdx];
  const isFirst   = currentIdx === 0;
  const isLast    = currentIdx === questions.length - 1;
  const color     = useCategoryColor(question?.category);
  const qMarkers  = getForQuestion(question?.id);

  /* Group questions for the sidebar overview */
  const grouped = useMemo(() => {
    const g = {};
    questions.forEach((q) => {
      if (!g[q.category]) g[q.category] = [];
      g[q.category].push(q);
    });
    return g;
  }, [questions]);

  const handleNext = () => {
    if (!isLast) setCurrentIdx((i) => i + 1);
    else setConfirming(true);
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentIdx((i) => i - 1);
    else onBack();
  };

  const handleConfirmedSubmit = async () => {
    setSubmitting(true);
    await onSubmit(markers, comment);
    setSubmitting(false);
  };

  if (confirming) {
    return (
      <ReviewScreen
        questions={questions}
        markers={markers}
        comment={comment}
        onCommentChange={setComment}
        onSubmit={handleConfirmedSubmit}
        onBack={() => setConfirming(false)}
        submitting={submitting}
        totalMarkers={totalMarkers}
      />
    );
  }

  return (
    <div className="qs-shell">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="qs-sidebar">
        <div className="qs-sidebar-header">
          <button className="btn btn-ghost" onClick={onBack}>
            ← Início
          </button>
          <span className="sidebar-title">Questionário</span>
        </div>

        <ProgressBar
          current={currentIdx + 1}
          total={questions.length}
        />

        <nav className="qs-nav">
          {Object.entries(grouped).map(([cat, qs]) => (
            <div key={cat} className="qs-nav-group">
              <div className={`qs-nav-cat category-tag cat-${cat}`}>
                {qs[0]?.icon} {CATEGORY_LABELS[cat]}
              </div>
              {qs.map((q) => {
                const idx   = questions.indexOf(q);
                const count = getCount(q.id);
                const active = idx === currentIdx;
                return (
                  <button
                    key={q.id}
                    className={`qs-nav-item ${active ? 'active' : ''} ${count > 0 ? 'has-markers' : ''}`}
                    onClick={() => setCurrentIdx(idx)}
                  >
                    <span className="nav-icon">{q.icon}</span>
                    <span className="nav-text">Pergunta {q.id}</span>
                    {count > 0 && (
                      <span className="nav-count">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <button
          className="btn btn-primary qs-finish-btn"
          onClick={() => setConfirming(true)}
        >
          Revisar e Enviar
        </button>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="qs-main">
        {/* Question header */}
        <div className="qs-header">
          <div className={`category-tag cat-${question?.category}`}>
            {question?.icon} {CATEGORY_LABELS[question?.category]}
          </div>
          <h2 className="qs-question-text">{question?.text}</h2>
          <p className="qs-map-instruction">
            Clique no mapa para marcar até <strong>{question?.max_markers}</strong> locais.
            Clique em um marcador para adicionar uma nota ou removê-lo.
          </p>
        </div>

        {/* Map */}
        <MapComponent
          question={question}
          markers={qMarkers}
          onAddMarker={addMarker}
          onRemoveMarker={removeMarker}
          onUpdateNote={updateNote}
        />

        {/* Marker list */}
        <div className="qs-markers-section">
          <div className="qs-markers-header">
            <span className="qs-markers-label">Locais marcados</span>
            <span className="qs-markers-counter" style={{ color }}>
              {qMarkers.length} / {question?.max_markers}
            </span>
          </div>
          <MarkerList
            markers={qMarkers}
            onRemove={(id) => removeMarker(question.id, id)}
            color={color}
          />
        </div>

        {/* Nav buttons */}
        <div className="qs-nav-actions">
          <button className="btn btn-outline" onClick={handlePrev}>
            {isFirst ? '← Início' : '← Anterior'}
          </button>
          <button className="btn btn-primary" onClick={handleNext}>
            {isLast ? 'Revisar →' : 'Próxima →'}
          </button>
        </div>
      </main>
    </div>
  );
}

/* ── Review / Submit screen ──────────────────────────────────────── */
function ReviewScreen({
  questions, markers, comment, onCommentChange,
  onSubmit, onBack, submitting, totalMarkers,
}) {
  return (
    <div className="review-shell">
      <div className="review-content">
        <button className="btn btn-ghost review-back" onClick={onBack}>
          ← Voltar ao questionário
        </button>

        <div className="review-header">
          <h2 className="review-title">Revisar suas respostas</h2>
          <p className="review-subtitle">
            Você marcou <strong>{totalMarkers} local{totalMarkers !== 1 ? 'is' : ''}</strong> no total.
            Verifique antes de enviar.
          </p>
        </div>

        <div className="review-summary">
          {questions.map((q) => {
            const qm = markers[String(q.id)] ?? [];
            return (
              <div key={q.id} className="review-item">
                <div className="review-item-header">
                  <span className={`category-tag cat-${q.category}`}>
                    {q.icon}
                  </span>
                  <span className="review-item-text">{q.text}</span>
                  <span className={`review-item-count ${qm.length > 0 ? 'has' : 'empty'}`}>
                    {qm.length} local{qm.length !== 1 ? 'is' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="review-comment">
          <label className="review-comment-label" htmlFor="final-comment">
            Comentário final <span>(opcional — até 600 caracteres)</span>
          </label>
          <textarea
            id="final-comment"
            className="review-comment-area"
            placeholder="Se desejar, adicione um breve comentário justificando suas escolhas..."
            value={comment}
            onChange={(e) => onCommentChange(e.target.value.slice(0, 600))}
            rows={4}
          />
          <span className="char-count">{comment.length}/600</span>
        </div>

        <div className="review-actions">
          <button className="btn btn-outline" onClick={onBack}>
            ← Editar respostas
          </button>
          <button
            className="btn btn-primary review-submit"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <><span className="spinner-sm" /> Enviando...</>
            ) : (
              <>✓ Enviar contribuição</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
