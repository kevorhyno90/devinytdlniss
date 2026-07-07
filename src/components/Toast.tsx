import type { Toast } from '../types';

interface Props {
  toasts: Toast[];
}

function toastEmoji(type: string): string {
  if (type === 'success') return '✅';
  if (type === 'error') return '❌';
  if (type === 'warning') return '⚠️';
  return 'ℹ️';
}

export default function ToastContainer({ toasts }: Props) {
  return (
    <div className="toast-container" id="toast-root">
      {toasts.map((t) => (
        <div key={t.id} id={`toast-${t.id}`} className={`toast toast-${t.type}`}>
          <span style={{ fontSize: 16 }}>{toastEmoji(t.type)}</span>
          <div style={{ flex: 1, lineHeight: 1.3 }}>{t.message}</div>
        </div>
      ))}
    </div>
  );
}
