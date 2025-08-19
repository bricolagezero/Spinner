import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { GameSettings } from "../types";
import WheelPanel from "./WheelPanel";

interface PreviewModalProps {
  settings: GameSettings;
  onClose: () => void;
}

export default function PreviewModal({ settings, onClose }: PreviewModalProps) {
  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50 overflow-hidden" onClose={onClose}>
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0" />
          </Transition.Child>

          <div className="relative bg-white text-black rounded-2xl p-6 md:p-8 w-[90vw] h-[90vh] max-w-4xl max-h-[90vh] flex flex-col items-center overflow-auto shadow-2xl">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-4"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </Transition.Child>

            <div className="w-full flex-1 overflow-auto">
              <WheelPanel settings={settings} isPreview={true} />
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}