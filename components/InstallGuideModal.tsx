import React, { useId } from 'react';
import { X, Share, PlusSquare, Smartphone } from 'lucide-react';

interface InstallGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isOpen, onClose }) => {
    const titleId = useId();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 font-mono">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="w-full max-w-md bg-black border border-green-900/50 shadow-[0_0_50px_rgba(0,255,0,0.05)] relative overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300"
            >

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-green-900/30 bg-black/50">
                    <h2 id={titleId} className="text-green-500 font-display tracking-widest flex items-center gap-2 text-sm md:text-base">
                        <Smartphone size={18} /> INSTALLATION PROTOCOL
                    </h2>
                    <button onClick={onClose} aria-label="Close installation guide" className="text-gray-500 hover:text-green-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <p className="text-gray-300 text-sm leading-relaxed text-center">
                        To enable <strong className="text-green-400">FULL SCREEN MODE</strong> on iOS, you must install this interface to your device.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded border border-gray-700">
                            <div className="bg-gray-700 p-2 rounded text-blue-400">
                                <Share size={24} />
                            </div>
                            <div className="text-sm text-gray-300">
                                1. Tap the <strong className="text-white">Share</strong> button in your browser toolbar.
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded border border-gray-700">
                            <div className="bg-gray-700 p-2 rounded text-gray-300">
                                <PlusSquare size={24} />
                            </div>
                            <div className="text-sm text-gray-300">
                                2. Select <strong className="text-white">Add to Home Screen</strong> from the menu.
                            </div>
                        </div>
                    </div>

                    <div className="text-center pt-2">
                        <button
                            onClick={onClose}
                            className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-4"
                        >
                            ACKNOWLEDGE
                        </button>
                    </div>
                </div>

                {/* Decorative Scanline */}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,0,0.03),rgba(0,255,0,0.01),rgba(0,255,0,0.03))] bg-[length:100%_2px,3px_100%] z-50 opacity-20"></div>
            </div>
        </div>
    );
};

export default InstallGuideModal;
