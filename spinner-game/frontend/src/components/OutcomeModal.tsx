import { GameSettings } from "../types";
import WheelPanel from "./WheelPanel";
import { X } from "lucide-react";

interface PreviewModalProps {
  settings: GameSettings;
  onClose: () => void;
}

export default function PreviewModal({ settings, onClose }: PreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="relative bg-white text-black rounded-2xl p-6 md:p-8 w-[90vw] h-[90vh] max-w-4xl max-h-[90vh] flex flex-col items-center overflow-auto shadow-2xl">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="w-full flex-1 overflow-auto">
            <WheelPanel settings={settings} setSettings={() => {}} sleekMode={true} />
          </div>
        </div>
      </div>
    </div>
  );
}