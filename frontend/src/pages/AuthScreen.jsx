import React, { useState } from 'react';
import { useAuth } from '../hooks/AuthContext';
import './AuthScreen.css';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [form, setForm]       = useState({
    name: '', email: '', age: '', password: '', confirmPassword: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (mode === 'register') {
      if (form.name.trim().length < 2) return 'Informe seu nome completo.';
      const age = parseInt(form.age, 10);
      if (Number.isNaN(age) || age < 16 || age > 120)
        return 'Idade deve estar entre 16 e 120 anos.';
      if (form.password.length < 8)
        return 'A senha deve ter ao menos 8 caracteres.';
      if (form.password !== form.confirmPassword)
        return 'As senhas não conferem.';
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      return 'E-mail inválido.';
    if (!form.password) return 'Informe a senha.';
    return null;
  };

  const handleSubmit = async () => {
    setError('');
    const v = validate();
    if (v) { setError(v); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({
          name: form.name.trim(),
          email: form.email.trim(),
          age: parseInt(form.age, 10),
          password: form.password,
          confirmPassword: form.confirmPassword,
        });
      }
      // sucesso → AuthProvider atualiza user → App troca de tela
    } catch (err) {
      setError(err.message || 'Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="auth-shell">
      <div className="auth-bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="bg-glow" />
      </div>

      <div className="auth-card">
        <div className="auth-brand">
          <span className="badge-dot" />
          PPSIG · Curitiba de Volta ao Centro
        </div>

        <h1 className="auth-title">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>
        <p className="auth-sub">
          {mode === 'login'
            ? 'Acesse para registrar sua contribuição no mapa participativo.'
            : 'Cadastre-se para participar da pesquisa de requalificação urbana.'}
        </p>

        <div className="auth-form">
          {mode === 'register' && (
            <div className="field">
              <label>Nome completo</label>
              <input
                type="text" value={form.name} onChange={set('name')}
                onKeyDown={onKeyDown} placeholder="Seu nome" autoComplete="name"
              />
            </div>
          )}

          <div className="field">
            <label>E-mail</label>
            <input
              type="email" value={form.email} onChange={set('email')}
              onKeyDown={onKeyDown} placeholder="voce@email.com" autoComplete="email"
            />
          </div>

          {mode === 'register' && (
            <div className="field">
              <label>Idade</label>
              <input
                type="number" value={form.age} onChange={set('age')}
                onKeyDown={onKeyDown} placeholder="Ex: 28" min="16" max="120"
              />
            </div>
          )}

          <div className="field">
            <label>Senha</label>
            <input
              type="password" value={form.password} onChange={set('password')}
              onKeyDown={onKeyDown} placeholder="Mínimo 8 caracteres"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="field">
              <label>Confirmar senha</label>
              <input
                type="password" value={form.confirmPassword}
                onChange={set('confirmPassword')} onKeyDown={onKeyDown}
                placeholder="Repita a senha" autoComplete="new-password"
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button
            className="btn btn-primary auth-submit"
            onClick={handleSubmit} disabled={loading}
          >
            {loading
              ? <><span className="spinner-sm" /> Aguarde...</>
              : (mode === 'login' ? 'Entrar' : 'Cadastrar')}
          </button>
        </div>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Não tem conta?{' '}
              <button onClick={() => { setMode('register'); setError(''); }}>
                Cadastre-se
              </button>
            </>
          ) : (
            <>Já tem conta?{' '}
              <button onClick={() => { setMode('login'); setError(''); }}>
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
