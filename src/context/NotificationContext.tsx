import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onReset?: () => void;
}

interface NotificationContextType {
    showToast: (message: string, type?: NotificationType) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Notification[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    } | null>(null);

    const showToast = useCallback((message: string, type: NotificationType = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfirmDialog({ options, resolve });
        });
    }, []);

    const handleConfirm = (value: boolean) => {
        if (confirmDialog) {
            confirmDialog.resolve(value);
            setConfirmDialog(null);
        }
    };

    return (
        <NotificationContext.Provider value={{ showToast, confirm }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-20 md:bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-[slideIn_0.3s_ease-out]
                            ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : ''}
                            ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : ''}
                            ${toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : ''}
                            ${toast.type === 'info' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500' : ''}
                        `}
                    >
                        {toast.type === 'success' && <CheckCircle size={20} />}
                        {toast.type === 'error' && <XCircle size={20} />}
                        {toast.type === 'warning' && <AlertCircle size={20} />}
                        {toast.type === 'info' && <Info size={20} />}
                        <span className="font-bold text-sm tracking-tight">{toast.message}</span>
                        <button
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                            className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmDialog && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm border dark:border-zinc-800 shadow-2xl p-8 overflow-hidden">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 text-cyan-500">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-xl font-black dark:text-gray-100 uppercase tracking-tight mb-2">
                                {confirmDialog.options.title}
                            </h3>
                            <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm leading-relaxed mb-8">
                                {confirmDialog.options.message}
                            </p>
                            <div className="flex flex-col w-full gap-3">
                                <button
                                    onClick={() => handleConfirm(true)}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    {confirmDialog.options.confirmText || 'Confirm'}
                                </button>
                                <button
                                    onClick={() => handleConfirm(false)}
                                    className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 dark:text-gray-100 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                                >
                                    {confirmDialog.options.cancelText || 'Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
