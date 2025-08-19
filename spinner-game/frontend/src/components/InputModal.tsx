import React, { useState } from 'react';
import { X } from 'lucide-react';

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  placeholder?: string;
  defaultValue?: string;
}

export const InputModal: React.FC<InputModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title, 
  placeholder = '',
  defaultValue = ''
}) => {
  const [value, setValue] = useState(defaultValue);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value || defaultValue);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none mb-4"
            autoFocus
          />
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
