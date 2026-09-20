import { InputHTMLAttributes, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ValidatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  warning?: string;
  help?: string;
  icon?: ReactNode;
}

export function ValidatedInput({ 
  label, 
  error, 
  warning, 
  help, 
  icon,
  className = '',
  ...props 
}: ValidatedInputProps) {
  const hasError = !!error;
  const hasWarning = !!warning && !hasError;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`
            w-full px-3 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-colors
            ${icon ? 'pl-10' : ''}
            ${hasError 
              ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
              : hasWarning
              ? 'border-yellow-500 focus:ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
              : 'border-gray-300 dark:border-gray-600 focus:ring-accent bg-white dark:bg-gray-800'
            }
            ${className}
          `}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${props.id}-error` : hasWarning ? `${props.id}-warning` : help ? `${props.id}-help` : undefined}
        />
      </div>
      
      {/* Error message */}
      {hasError && (
        <div id={`${props.id}-error`} className="mt-1 flex items-start gap-1 text-sm text-red-600 dark:text-red-400" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Warning message */}
      {hasWarning && (
        <div id={`${props.id}-warning`} className="mt-1 flex items-start gap-1 text-sm text-yellow-600 dark:text-yellow-400" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}
      
      {/* Help text */}
      {help && !hasError && !hasWarning && (
        <div id={`${props.id}-help`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {help}
        </div>
      )}
    </div>
  );
}
