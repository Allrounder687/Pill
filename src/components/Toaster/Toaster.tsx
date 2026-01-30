import { useEffect, type FC } from 'react';
import { useToastStore } from '../../stores/useToastStore';
import './Toaster.css';

const Toaster: FC = () => {
  const { toasts, removeToast } = useToastStore();
  
  useEffect(() => {
    console.log('[Toaster] Mounted');
  }, []);

  return (
    <div className="toaster-container">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast-item ${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          <div className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
          </div>
          <div className="toast-message">{toast.message}</div>
        </div>
      ))}
    </div>
  );
};

export default Toaster;
