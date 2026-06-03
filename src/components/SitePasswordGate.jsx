import { useEffect, useRef, useState } from 'react';
import { isUnlocked, unlock } from '../hooks/useAdminAuth';

const ADMIN_PASSWORD = 'thedegens';

export default function SitePasswordGate({ children }) {
  const [authenticated, setAuthenticated] = useState(isUnlocked());
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!authenticated && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [authenticated]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (value === ADMIN_PASSWORD) {
      unlock();
      setAuthenticated(true);
      return;
    }

    setError('Wrong password.');
    setShaking(true);
    setValue('');
    setTimeout(() => setShaking(false), 500);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (authenticated) return children;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: 9999,
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: 'radial-gradient(ellipse at 35% 30%, #4a1a0a, #1a0804)',
        border: '1.5px solid rgba(212,175,55,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
        marginBottom: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 16px rgba(212,175,55,0.08)',
      }}>
        🎩
      </div>

      <h1 style={{
        fontSize: 26,
        fontWeight: 800,
        color: 'white',
        marginBottom: 6,
        letterSpacing: '-0.02em',
      }}>
        MonoTracker
      </h1>

      <p style={{
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 36,
        textAlign: 'center',
        maxWidth: 240,
        lineHeight: 1.5,
      }}>
        Private access only. Enter the password to continue.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 320,
          animation: shaking ? 'shake 0.5s ease' : 'none',
        }}
      >
        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={event => {
            setValue(event.target.value);
            setError('');
          }}
          placeholder="Password"
          autoComplete="current-password"
          style={{
            width: '100%',
            background: '#1c1c22',
            border: error
              ? '1px solid rgba(224,123,106,0.7)'
              : '1px solid rgba(255,255,255,0.10)',
            borderRadius: 14,
            padding: '15px 16px',
            color: 'white',
            fontSize: 16,
            boxSizing: 'border-box',
            marginBottom: 8,
            outline: 'none',
            textAlign: 'center',
            letterSpacing: '0.1em',
            transition: 'border-color 0.2s ease',
          }}
        />

        <div style={{
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}>
          {error && (
            <p style={{
              fontSize: 13,
              color: '#E07B6A',
              textAlign: 'center',
              margin: 0,
            }}>
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!value.trim()}
          style={{
            width: '100%',
            padding: 15,
            background: value.trim()
              ? 'linear-gradient(135deg, #E8C96A, #D4AF37)'
              : 'rgba(232,201,106,0.25)',
            color: value.trim() ? '#0a0a0f' : 'rgba(232,201,106,0.5)',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: value.trim() ? 'pointer' : 'not-allowed',
            letterSpacing: '0.02em',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
          }}
        >
          Enter
        </button>
      </form>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
