import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      
      {show && (
        <div
          className={`absolute ${positions[position]} z-50 px-3 py-2 text-xs rounded-lg shadow-lg max-w-xs animate-fade-in`}
          style={{
            background: 'var(--ink)',
            color: 'var(--paper)',
            border: '1px solid var(--border)',
          }}
        >
          {content}
          <div
            className={`absolute w-2 h-2 rotate-45 ${
              position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
              position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
              position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
              'left-[-4px] top-1/2 -translate-y-1/2'
            }`}
            style={{ background: 'var(--ink)', border: '1px solid var(--border)' }}
          />
        </div>
      )}
    </div>
  );
}

interface HelpTextProps {
  text: string;
}

export function HelpText({ text }: HelpTextProps) {
  return (
    <Tooltip content={text} position="right">
      <HelpCircle className="w-4 h-4 inline-block ml-1 cursor-help" style={{ color: 'var(--muted)' }} />
    </Tooltip>
  );
}
