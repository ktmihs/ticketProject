'use client';

import { useEffect } from 'react';

interface ErrorAlertProps {
  error: string | null;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function ErrorAlert({ error, onClose, autoClose = true, duration = 5000 }: ErrorAlertProps) {
  useEffect(() => {
    if (error && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [error, autoClose, duration, onClose]);

  if (!error) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-semibold">오류가 발생했습니다</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-red-700 hover:text-red-900"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
