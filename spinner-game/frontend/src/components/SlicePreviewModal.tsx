import React from 'react';
import { X } from 'lucide-react';
import { Slice, GameSettings } from '../types/index';
import { motion } from 'framer-motion';

interface SlicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  slice: Slice;
  settings: GameSettings;
}

export const SlicePreviewModal: React.FC<SlicePreviewModalProps> = ({ isOpen, onClose, slice, settings }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9998]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white text-black rounded-2xl p-6 md:p-8 max-w-[80vw] max-h-[80vh] w-full max-w-2xl flex flex-col items-center overflow-auto shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-3xl font-bold mb-4 text-center">
          {(slice.sameHeadingAsLabel === false && (slice.modalHeading || "").trim().length > 0)
            ? (slice.modalHeading as string)
            : slice.label}
        </h2>
        {slice.outcomeImageUrl && (
          <img
            src={slice.outcomeImageUrl}
            className="mb-4 rounded-xl shadow-lg"
            style={{ maxHeight: "45vh", transform: "scale(" + (slice.outcomeImageScale ?? 0.6) + ")" }}
            alt=""
          />
        )}
        {slice.outcomeText && (
          <p className="mb-4 text-center" style={{ fontSize: slice.outcomeFontSize ?? 20 }}>
            {slice.outcomeText}
          </p>
        )}
        {settings.timerEnabled && (
          <div className="relative mt-2">
            <div className="relative w-24 h-24 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-3xl font-bold text-pink-600 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              {settings.timerSeconds}
            </div>
          </div>
        )}
        <button 
          onClick={onClose} 
          className="mt-6 px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-xl text-white text-lg font-semibold transition-colors shadow-lg"
        >
          Close Preview
        </button>
      </motion.div>
    </div>
  );
};
