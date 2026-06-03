import { useState } from 'react';
import ReactDOM from 'react-dom';

export default function AdminPasswordModal({ onSubmit, onDismiss, error }) {
  const [value, setValue] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(value);
  };

  return ReactDOM.createPortal(
    <>
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          zIndex: 1999,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#1c1c22',
        borderRadius: '24px 24px 0 0',
        border: '1px solid rgba(255,255,255,0.08)',
        borderBottom: 'none',
        padding: '28px 20px calc(32px + env(safe-area-inset-bottom))',
        zIndex: 2000,
        boxSizing: 'border-box',
      }}>
        <div style={{
          width: 36,
          height: 4,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 2,
          margin: '0 auto 24px',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 36 }}>🔐</span>
        </div>

        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'white',
          textAlign: 'center',
          marginBottom: 6,
        }}>Degens Only</h2>
        <p style={{
          fontSize: 14,
          color: '#8E8E93',
          textAlign: 'center',
          marginBottom: 24,
        }}>Enter the password to make changes.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={value}
            onChange={event => setValue(event.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%',
              background: '#26262e',
              border: error
                ? '1px solid rgba(224,123,106,0.6)'
                : '1px solid rgba(255,255,255,0.10)',
              borderRadius: 12,
              padding: '14px 16px',
              color: 'white',
              fontSize: 16,
              boxSizing: 'border-box',
              marginBottom: error ? 8 : 16,
              outline: 'none',
            }}
          />

          {error && (
            <p style={{
              fontSize: 13,
              color: '#E07B6A',
              marginBottom: 16,
              textAlign: 'center',
            }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={!value.trim()}
            style={{
              width: '100%',
              padding: '14px',
              background: value.trim() ? '#E8C96A' : 'rgba(232,201,106,0.3)',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: value.trim() ? 'pointer' : 'not-allowed',
              marginBottom: 10,
              boxSizing: 'border-box',
            }}
          >
            Enter
          </button>

          <button
            type="button"
            onClick={onDismiss}
            style={{
              width: '100%',
              padding: '14px',
              background: 'rgba(255,255,255,0.06)',
              color: '#8E8E93',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            Cancel
          </button>
        </form>
      </div>
    </>,
    document.body
  );
}
