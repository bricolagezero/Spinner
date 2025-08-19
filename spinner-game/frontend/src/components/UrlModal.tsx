import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface UrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export const UrlModal: React.FC<UrlModalProps> = ({ isOpen, onClose, url }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Spinner URL</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="bg-gray-800 p-3 rounded-md mb-4 break-all">
          <code className="text-sm text-gray-200">{url}</code>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy URL
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
