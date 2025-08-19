import React, { useState } from 'react';
import { Edit, Link, QrCode } from 'lucide-react';
import { UrlModal } from './UrlModal';
import { QrCodeModal } from './QrCodeModal';

interface SpinnerCardProps {
  slug: string;
  title: string;
  updatedAt?: string;
  onEdit: () => void;
}

export const SpinnerCard: React.FC<SpinnerCardProps> = ({ slug, title, updatedAt, onEdit }) => {
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  const spinnerUrl = `${window.location.origin}/spinner/game/${slug}`;

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <h3 className="text-xl font-semibold mb-4">{title || 'Unnamed Spinner'}</h3>
        <div className="text-sm text-gray-500 mb-4">
          {updatedAt ? new Date(updatedAt).toLocaleString() : '—'}
        </div>
        <div className="space-y-2">
          <button
            onClick={onEdit}
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
        spinnerName={title || 'spinner'}
      />
    </>
  );
};
};
