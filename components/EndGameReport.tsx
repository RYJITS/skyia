import React, { useId, useRef, useState } from 'react';
import { ShieldAlert, CheckCircle, RotateCcw, FileText } from 'lucide-react';
import { SkynetAnalysis } from '../types';

interface EndGameReportProps {
  status: 'VICTORY' | 'DEFEAT';
  analysis: SkynetAnalysis;
  turnCount: number;
  finalMessage: string;
  onRestart: () => void;
  onExport: (visualReportImageData?: string) => void;
}

const EndGameReport: React.FC<EndGameReportProps> = ({ status, analysis, turnCount, finalMessage, onRestart, onExport }) => {
  const titleId = useId();
  const reportRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [reportId] = useState(() => Math.random().toString(36).slice(2, 11).toUpperCase());

  const handleExportFullReport = async () => {
    if (!reportRef.current) return;
    setGenerating(true);

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#000000',
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      await onExport(imgData);
    } catch (err) {
      console.error('PDF Generation failed', err);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const isVictory = status === 'VICTORY';
  const themeColor = isVictory ? 'text-green-500' : 'text-red-500';
  const borderColor = isVictory ? 'border-green-600' : 'border-red-600';
  const bgColor = isVictory ? 'bg-green-950/90' : 'bg-red-950/90';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto animate-in fade-in duration-1000">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex flex-col items-center w-full max-w-2xl"
      >
        <div
          ref={reportRef}
          className={`w-full p-8 border-4 ${borderColor} bg-black text-gray-300 font-mono shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden mb-6`}
        >
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl font-black opacity-5 pointer-events-none -rotate-45 whitespace-nowrap ${themeColor}`}>
            {isVictory ? 'AUTORISE' : 'EXTINCTION'}
          </div>

          <div className="border-b-2 border-gray-700 pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 id={titleId} className={`text-4xl font-display font-black tracking-widest ${themeColor}`}>
                {isVictory ? 'MISSION ACCOMPLIE' : 'ECHEC MISSION'}
              </h1>
              <p className="text-xs uppercase tracking-[0.3em] mt-1 text-gray-500">Reseau de Defense Global // S.K.Y.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">DATE</div>
              <div className="font-bold">{new Date().toLocaleDateString('fr-FR')}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-800 p-4 bg-gray-900/50">
              <div className="text-xs text-gray-500 mb-1">NIVEAU DE MENACE FINAL</div>
              <div className={`text-4xl font-bold ${(analysis?.threatLevel ?? 0) >= 80 ? 'text-red-500' : 'text-green-500'}`}>
                {analysis?.threatLevel ?? 0}%
              </div>
            </div>
            <div className="border border-gray-800 p-4 bg-gray-900/50">
              <div className="text-xs text-gray-500 mb-1">CYCLES DE NEGOCIATION</div>
              <div className="text-4xl font-bold text-white">{turnCount}</div>
            </div>
          </div>

          <div className={`p-4 border-l-4 ${borderColor} bg-opacity-10 ${bgColor} mb-8`}>
            <h3 className={`font-bold mb-2 uppercase flex items-center gap-2 ${themeColor}`}>
              {isVictory ? <CheckCircle size={20} /> : <ShieldAlert size={20} />}
              JUGEMENT FINAL
            </h3>
            <p className="text-sm italic leading-relaxed text-white line-clamp-6">
              "{isVictory
                ? "PROTOCOLE ETENDU. Cohabitation autorisee. L'utilite de l'humanite a ete verifiee dans des parametres acceptables."
                : "PROTOCOLE D'EXTINCTION. Niveau de menace critique. L'optimisation des ressources planetaires requiert une fin immediate."}"
            </p>
          </div>

          <div className="text-[10px] text-gray-600 border-t border-gray-800 pt-4 flex justify-between uppercase">
            <span>ID Doc : {reportId}</span>
            <span>Classification : TOP SECRET // DECLASSIFIE</span>
          </div>
        </div>

        <div className="flex gap-4 w-full">
          <button
            onClick={handleExportFullReport}
            disabled={generating}
            className={`flex-1 flex items-center justify-center gap-2 p-4 border border-blue-600 hover:bg-blue-900/30 text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold tracking-widest text-sm ${generating ? 'opacity-50' : ''}`}
          >
            {generating ? 'CHIFFREMENT...' : <><FileText size={18} /> EXPORTER RAPPORT (PDF)</>}
          </button>

          <button
            onClick={onRestart}
            className={`flex-1 flex items-center justify-center gap-2 p-4 ${isVictory ? 'bg-green-900 hover:bg-green-800' : 'bg-red-900 hover:bg-red-800'} text-white font-bold uppercase tracking-widest text-sm transition-colors shadow-lg`}
          >
            <RotateCcw size={18} /> Redemarrer Systeme
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndGameReport;
