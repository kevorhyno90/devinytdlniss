import React, { useState } from 'react';
import { setToken, getToken } from '../api/client';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to authenticate');
      
      setToken(data.token);
      // Reload app to apply authentication
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    setToken('');
    window.location.reload();
  };

  if (getToken()) {
    return (
      <div className="page" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>You are logged in</h2>
        <button className="btn btn-primary" onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 400, margin: '2rem auto', padding: '1rem', background: 'var(--surface-color)', borderRadius: 12 }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>{isLogin ? 'Login to Sync' : 'Create Account'}</h2>
      {error && <div style={{ color: 'var(--error-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          className="search-input"
          type="text" 
          placeholder="Username" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
          required 
        />
        <input 
          className="search-input"
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}
