import { ReactNode, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'warning';
  icon?: ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  icon,
}: ConfirmDialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const variantStyles = {
    default: {
      button: 'bg-accent hover:bg-accent/90 text-white',
      icon: <AlertTriangle className="w-6 h-6 text-accent" />,
    },
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
    },
    warning: {
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          {icon || styles.icon}

          {/* Title */}
          <h3
            id="confirm-dialog-title"
            className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            {title}
          </h3>

          {/* Message */}
          <div
            id="confirm-dialog-description"
            className="mt-2 text-sm text-gray-600 dark:text-gray-400"
          >
            {message}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${styles.button}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
