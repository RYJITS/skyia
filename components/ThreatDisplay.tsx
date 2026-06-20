import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { SkynetAnalysis } from '../types';

interface ThreatDisplayProps {
  analysis: SkynetAnalysis;
  historyThreats: number[];
}

const ThreatDisplay: React.FC<ThreatDisplayProps> = ({ analysis, historyThreats }) => {
  const data = historyThreats.map((level, index) => ({
    time: index,
    threat: level,
  }));

  return (
    <div className="bg-black border border-red-900/30 p-0 md:p-4 h-full flex flex-col">
      <div className="flex justify-between items-end mb-0 md:mb-2">
        <h2 className="hidden md:block text-red-500 font-display tracking-widest text-[10px] md:text-sm border-b border-red-900/50 pb-1 w-full truncate">
          EXTINCTION PROBABILITY
        </h2>
      </div>

      <div className="flex-1 relative w-full flex flex-col min-w-0 overflow-hidden md:h-full min-h-[56px] md:min-h-[120px]">
        <ResponsiveContainer width="99%" height="100%" minHeight={56}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorThreat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={1} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} hide />
            <ReferenceLine y={90} stroke="red" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{ backgroundColor: '#000', borderColor: '#330000', color: '#f00' }}
              itemStyle={{ color: '#f00' }}
            />
            <Area
              type="monotone"
              dataKey="threat"
              stroke="#ef4444"
              fillOpacity={1}
              fill="url(#colorThreat)"
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Overlay Value */}
        <div className="absolute top-0 right-1 md:top-2 md:right-2 text-lg md:text-4xl font-bold text-white font-display drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] md:drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] leading-6 md:leading-normal">
          {analysis.threatLevel}%
        </div>

        {/* Mobile ONLY Title Overlay (inside chart) - Black Text */}
        <div className="md:hidden absolute top-0 left-1 pl-2 text-[10px] text-black font-bold font-display tracking-widest pointer-events-none leading-6 z-10">
          EXTINCTION PROBABILITY
        </div>
      </div>

      {/* Logs hidden on mobile to save vertical space for the chart */}
      <div className="mt-2 md:mt-4 font-mono text-[10px] md:text-xs overflow-y-auto max-h-[50px] md:max-h-none hidden md:block">
        <h3 className="text-gray-500 mb-1 md:mb-2">NEURAL NET LOGS</h3>
        <ul className="space-y-1">
          {analysis.log?.map((log, i) => (
            <li key={i} className="text-red-400/80 truncate">
              <span className="text-gray-600 mr-2">{`>>`}</span>
              {log}
            </li>
          ))}
          {(!analysis.log || analysis.log.length === 0) && (
            <li className="text-red-900/50 italic">Processing...</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ThreatDisplay;
