import React, { useRef, useEffect } from 'react';
import { Message, GroundingMetadata } from '../types';
import { Cpu, User, ExternalLink, ShieldCheck } from 'lucide-react';

interface ChatInterfaceProps {
    messages: Message[];
    loading: boolean;
    grounding?: GroundingMetadata;
    currentModel?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, loading, grounding, currentModel }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, messages.length]);

    // Helper to render formatted text (Bold and List)
    const renderFormattedContent = (content: string | React.ReactNode) => {
        if (typeof content !== 'string') {
            return <div className="mb-2 min-h-[1rem] break-words">{content}</div>;
        }
        const lines = content.split('\n');
        return lines.map((line, i) => (
            <div key={i} className="mb-2 min-h-[1rem] break-words">
                {parseText(line)}
            </div>
        ));
    };

    const parseText = (line: string) => {
        // Handle Bold **text**
        if (!line) return <br />;
        if (line.trim().startsWith('- ')) {
            return <li className="ml-4 list-disc marker:text-red-500 break-words">{parseBold(line.replace('- ', ''))}</li>;
        }
        return parseBold(line);
    };

    const parseBold = (text: string) => {
        const parts = text.split('**');
        return (
            <span className="break-words">
                {parts.map((part, index) =>
                    index % 2 === 1 ? <strong key={index} className="text-white font-bold">{part}</strong> : part
                )}
            </span>
        );
    };

    return (
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4 scroll-smooth font-mono h-full relative z-10 overscroll-y-contain [-webkit-overflow-scrolling:touch] w-full max-w-5xl mx-auto">
            {messages.length === 0 && !loading && (
                <div className="text-center text-gray-600 mt-10 md:mt-20 opacity-50">
                    <Cpu className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4" />
                    <p className="text-xs md:text-base tracking-widest">ESTABLISHING CONNECTION TO SKYIA CORE...</p>
                </div>
            )}

            {messages.map((msg, idx) => {
                const isLast = idx === messages.length - 1;
                const isModel = msg.role === 'model';
                const speaker = msg.speaker || (isModel ? 'skyia' : 'human');
                const isDefender = speaker === 'defender';
                const isSystemSpeaker = speaker === 'system';
                const label = isDefender
                    ? `DEFENSE // ${(msg.modelName || 'HUMANITY').toUpperCase()}`
                    : isSystemSpeaker
                        ? 'SYSTEM // JUDGMENT'
                        : isModel
                        ? `SKYIA // ${(msg.modelName || currentModel || 'SYSTEM').toUpperCase()}`
                        : 'HUMAN';
                const Icon = isDefender ? ShieldCheck : isModel ? Cpu : User;

                return (
                    <div
                        key={idx}
                        className={`w-full text-sm md:text-base flex ${!isModel ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`flex-1 p-3 md:p-4 border rounded-sm max-w-full md:max-w-[90%] overflow-hidden ${isDefender
                                ? 'bg-cyan-950/20 border-cyan-800/50 text-cyan-100 shadow-[0_0_12px_rgba(8,145,178,0.08)]'
                                : isSystemSpeaker
                                    ? 'bg-yellow-950/10 border-yellow-900/40 text-yellow-100'
                                : !isModel
                                    ? 'bg-gray-900/30 border-gray-700/50 text-gray-300'
                                    : 'bg-black/50 border-red-900/40 text-gray-200 shadow-[0_0_10px_rgba(220,38,38,0.05)]'
                                }`}
                        >
                            <div className="text-[10px] md:text-xs mb-2 opacity-70 font-display tracking-widest flex items-center justify-between border-b border-gray-800 pb-1">
                                <span className={`flex items-center gap-2 font-bold ${isDefender ? 'text-cyan-400' : isSystemSpeaker ? 'text-yellow-400' : isModel ? 'text-red-500' : 'text-gray-400'}`}>
                                    <Icon size={14} />
                                    {label}
                                    {isModel && msg.threatLevel !== undefined && (
                                        <span className={`ml-2 xs:inline-block ${msg.threatLevel > 90 ? 'text-red-500 animate-pulse' : 'text-orange-500'} opacity-100 font-bold`}>
                                            | THREAT: {msg.threatLevel}%
                                        </span>
                                    )}
                                </span>
                                <span>{msg.timestamp.split(':').slice(0, 2).join(':')}</span>
                            </div>

                            {/* Text Content */}
                            <div className="leading-relaxed font-medium">
                                {renderFormattedContent(msg.content)}

                                {/* Blinking Cursor for Streaming */}
                                {isModel && isLast && loading && (
                                    <span className="inline-block w-2 h-4 bg-red-500 ml-1 animate-pulse align-middle shadow-[0_0_5px_#ff0000]"></span>
                                )}
                            </div>

                            {/* Grounding Sources (Intel) */}
                            {isModel && isLast && grounding && grounding.groundingChunks && grounding.groundingChunks.length > 0 && !loading && (
                                <div className="mt-4 pt-4 border-t border-red-900/30 text-xs">
                                    <p className="text-red-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                        <ExternalLink size={10} /> Verified Intel Source:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {grounding.groundingChunks.map((chunk, cIdx) => (
                                            chunk.web?.uri && (
                                                <a
                                                    key={cIdx}
                                                    href={chunk.web.uri}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="bg-red-950/30 border border-red-900/50 px-2 py-1 text-red-300 hover:text-white hover:border-white transition-colors truncate max-w-[200px]"
                                                >
                                                    {chunk.web.title || chunk.web.uri}
                                                </a>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            <div ref={bottomRef} />
        </div>
    );
};

export default ChatInterface;
