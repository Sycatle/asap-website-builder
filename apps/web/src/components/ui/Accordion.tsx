import { useState, type ReactNode } from 'react';

interface AccordionProps {
  children: ReactNode;
  defaultOpen?: boolean;
}

interface AccordionHeaderProps {
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

interface AccordionContentProps {
  children: ReactNode;
  isOpen: boolean;
}

export function AccordionHeader({ children, isOpen, onToggle }: AccordionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
    >
      <div className="flex-1">{children}</div>
      <svg
        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export function AccordionContent({ children, isOpen }: AccordionContentProps) {
  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      {children}
    </div>
  );
}

export function Accordion({ children, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {typeof children === 'function' 
        ? (children as (props: { isOpen: boolean; toggle: () => void }) => ReactNode)({ isOpen, toggle: () => setIsOpen(!isOpen) })
        : children}
    </div>
  );
}

export function useAccordion(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return {
    isOpen,
    toggle: () => setIsOpen(!isOpen),
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
