import React, { useState, useEffect } from 'react';
import WelcomeScreen from './pages/WelcomeScreen';
import QuestionnaireScreen from './pages/QuestionnaireScreen';
import SuccessScreen from './pages/SuccessScreen';
import './App.css';

const SCREENS = {
  WELCOME: 'welcome',
  QUESTIONNAIRE: 'questionnaire',
  SUCCESS: 'success',
};

function App() {
  const [screen, setScreen] = useState(SCREENS.WELCOME);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittedId, setSubmittedId] = useState(null);

  useEffect(() => {
    fetch('/api/questions')
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleStart = () => setScreen(SCREENS.QUESTIONNAIRE);

  const handleSubmit = async (markers, comment) => {
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markers, comment }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmittedId(data.id);
        setScreen(SCREENS.SUCCESS);
      } else {
        alert('Erro ao enviar resposta. Tente novamente.');
      }
    } catch {
      alert('Erro de conexão. Verifique se o servidor está rodando.');
    }
  };

  const handleRestart = () => {
    setScreen(SCREENS.WELCOME);
    setSubmittedId(null);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Carregando questionário...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {screen === SCREENS.WELCOME && (
        <WelcomeScreen onStart={handleStart} />
      )}
      {screen === SCREENS.QUESTIONNAIRE && (
        <QuestionnaireScreen
          questions={questions}
          onSubmit={handleSubmit}
          onBack={() => setScreen(SCREENS.WELCOME)}
        />
      )}
      {screen === SCREENS.SUCCESS && (
        <SuccessScreen responseId={submittedId} onRestart={handleRestart} />
      )}
    </div>
  );
}

export default App;
