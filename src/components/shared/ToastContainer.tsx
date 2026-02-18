import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error:   <XCircle    className="w-5 h-5 text-red-500"   />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  info:    <Info       className="w-5 h-5 text-blue-500"  />,
};

const bg = {
  success: 'bg-green-50 border-green-200',
  error:   'bg-red-50   border-red-200',
  warning: 'bg-yellow-50 border-yellow-200',
  info:    'bg-blue-50  border-blue-200',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${bg[t.type]} animate-[fadeIn_0.3s_ease]`}>
          {icons[t.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{t.title}</p>
            {t.message && <p className="text-xs text-gray-600 mt-0.5">{t.message}</p>}
          </div>
          <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
