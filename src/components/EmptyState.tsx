import { PackageSearch } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 p-4 rounded-full" style={{ background: 'var(--paper-warm)' }}>
        {icon || <PackageSearch className="w-8 h-8" style={{ color: 'var(--muted)' }} />}
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--ink)' }}>
        {title}
      </h3>
      <p className="text-sm mb-6 max-w-md" style={{ color: 'var(--muted)' }}>
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
