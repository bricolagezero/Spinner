import React, { useState } from 'react';
import { Edit, Link, QrCode } from 'lucide-react';
import { Spinner } from '../types';
import { UrlModal } from './UrlModal';
import { QrCodeModal } from './QrCodeModal';

interface SpinnerCardProps {
  spinner: Spinner;
  onEdit: (spinner: Spinner) => void;
}

export const SpinnerCard: React.FC<SpinnerCardProps> = ({ spinner, onEdit }) => {
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  const spinnerUrl = `${window.location.origin}/spinner/${spinner.id}`;

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <h3 className="text-xl font-semibold mb-4">{spinner.name || 'Unnamed Spinner'}</h3>
        <div className="space-y-2">
          <button
            onClick={() => onEdit(spinner)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={() => setShowUrlModal(true)}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <Link size={16} />
            View URL
          </button>
          <button
            onClick={() => setShowQrModal(true)}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <QrCode size={16} />
            View QR Code
          </button>
        </div>
      </div>

      <UrlModal
        isOpen={showUrlModal}
        onClose={() => setShowUrlModal(false)}
        url={spinnerUrl}
      />

      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        url={spinnerUrl}
        spinnerName={spinner.name || 'spinner'}
      />
    </>
  );
};
