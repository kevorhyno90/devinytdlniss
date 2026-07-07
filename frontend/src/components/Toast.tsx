import type { Toast } from '../types';

interface Props {
  toasts: Toast[];
}

export default function ToastContainer({ toasts }: Props) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span style={{ fontSize: 16 }}>
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
