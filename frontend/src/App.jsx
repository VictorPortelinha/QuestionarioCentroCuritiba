import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/AuthContext';
import { api } from './utils/api';
import AuthScreen from './pages/AuthScreen';
import WelcomeScreen from './pages/WelcomeScreen';
import QuestionnaireScreen from './pages/QuestionnaireScreen';
import SuccessScreen from './pages/SuccessScreen';
import AlreadyResponded from './pages/AlreadyResponded';
import './App.css';

const SCREENS = {
  WELCOME: 'welcome',
  QUESTIONNAIRE: 'questionnaire',
  SUCCESS: 'success',
  ALREADY: 'already',
};

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();

  const [screen, setScreen]         = useState(SCREENS.WELCOME);
  const [questions, setQuestions]   = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submittedId, setSubmittedId] = useState(null);

  // Carrega perguntas + verifica se o usuário já respondeu
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([api.questions(), api.myResponse()])
      .then(([qData, rData]) => {
        setQuestions(qData.questions || []);
        if (rData.has_responded) {
          setSubmittedId(rData.response?.id || null);
          setScreen(SCREENS.ALREADY);
        }
      })
      .catch(() => { /* mantém estado padrão */ })
      .finally(() => setDataLoading(false));
  }, [user]);

  const handleSubmit = async (markers, comment) => {
    try {
      const data = await api.submit({ markers, comment });
      if (data.success) {
        setSubmittedId(data.id);
        setScreen(SCREENS.SUCCESS);
      }
    } catch (err) {
      if (err.status === 409 || err.status === 429) {
        // Já respondeu / spam bloqueado
        setScreen(SCREENS.ALREADY);
      } else {
        alert(err.message || 'Erro ao enviar resposta.');
      }
    }
  };

  // ── Estados de carregamento ──
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Carregando...</p>
      </div>
    );
  }

  // ── Não autenticado → tela de login/cadastro ──
  if (!user) {
    return <AuthScreen />;
  }

  if (dataLoading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Carregando questionário...</p>
      </div>
    );
  }

  // ── Autenticado ──
  return (
    <div className="app">
      {screen === SCREENS.ALREADY && (
        <AlreadyResponded user={user} responseId={submittedId} onLogout={logout} />
      )}
      {screen === SCREENS.WELCOME && (
        <WelcomeScreen user={user} onStart={() => setScreen(SCREENS.QUESTIONNAIRE)} onLogout={logout} />
      )}
      {screen === SCREENS.QUESTIONNAIRE && (
        <QuestionnaireScreen
          questions={questions}
          onSubmit={handleSubmit}
          onBack={() => setScreen(SCREENS.WELCOME)}
        />
      )}
      {screen === SCREENS.SUCCESS && (
        <SuccessScreen
          responseId={submittedId}
          onRestart={() => setScreen(SCREENS.ALREADY)}
        />
      )}
    </div>
  );
}
