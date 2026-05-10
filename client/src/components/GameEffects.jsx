import { useEffect, useState } from 'react';
import { RANK_NAMES } from '../constants.js';
import Card from './Card';

function GameEffects({ effects, trades, currentPlayerId, players }) {
  const [visibleEffects, setVisibleEffects] = useState([]);
  const [tradeAnimation, setTradeAnimation] = useState(null);

  useEffect(() => {
    if (effects && effects.length > 0) {
      const newEffects = effects.map((effect, index) => ({
        ...effect,
        id: Date.now() + index
      }));
      
      setVisibleEffects(prev => [...prev, ...newEffects]);

      const timers = newEffects.map(effect => 
        setTimeout(() => {
          setVisibleEffects(prev => prev.filter(e => e.id !== effect.id));
        }, 3000)
      );

      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [effects]);

  useEffect(() => {
    if (trades && trades.length > 0) {
      setTradeAnimation({
        trades,
        id: Date.now()
      });

      const timer = setTimeout(() => {
        setTradeAnimation(null);
      }, 3000); // 3 seconds duration as requested

      return () => clearTimeout(timer);
    }
  }, [trades]);

  const getPlayerName = (id) => {
    const player = players?.find(p => p.id === id);
    return player ? player.name : id.slice(0, 4);
  };

  const getPlayerRank = (id) => {
    const player = players?.find(p => p.id === id);
    return player && player.rank ? RANK_NAMES[player.rank]?.name : '';
  };

  if (visibleEffects.length === 0 && !tradeAnimation) return null;

  const getEffectStyle = (type) => {
    switch (type) {
      case 'eightCut':
        return 'bg-yellow-500 text-yellow-900 border-yellow-400';
      case 'revolution':
        return 'bg-red-600 text-white border-red-500';
      case 'greatRevolution':
        return 'bg-red-800 text-white border-red-700';
      case 'elevenRevolution':
        return 'bg-purple-600 text-white border-purple-500';
      case 'maxThree':
        return 'bg-blue-600 text-white border-blue-500';
      case 'jokerThreeCombo':
        return 'bg-indigo-600 text-white border-indigo-500';
      case 'cardTrading':
        return 'bg-emerald-600 text-white border-emerald-500';
      case 'newRound':
        return 'bg-cyan-600 text-white border-cyan-500';
      default:
        return 'bg-blue-500 text-white border-blue-400';
    }
  };

  const getEffectIcon = (type) => {
    switch (type) {
      case 'eightCut':
        return '✂️';
      case 'revolution':
        return '🔄';
      case 'greatRevolution':
        return '💥';
      case 'elevenRevolution':
        return '🃏';
      case 'maxThree':
        return '♠️';
      case 'jokerThreeCombo':
        return '🃏+3';
      case 'cardTrading':
        return '🤝';
      case 'newRound':
        return '🎴';
      default:
        return '🎮';
    }
  };

  return (
    <>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
        {visibleEffects.map(effect => (
          <div
            key={effect.id}
            className={`
              px-8 py-4 rounded-xl border-2 shadow-2xl mb-2
              animate-bounce
              ${getEffectStyle(effect.type)}
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getEffectIcon(effect.type)}</span>
              <span className="text-xl font-bold">{effect.description}</span>
            </div>
          </div>
        ))}
      </div>

      {tradeAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-emerald-900 to-green-900 p-8 rounded-2xl border-2 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)] max-w-5xl w-full mx-4 relative overflow-hidden">
            
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>

            <div className="text-center mb-8 relative z-10">
              <div className="text-6xl mb-4 animate-bounce">🤝</div>
              <h2 className="text-3xl font-bold text-white tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-white drop-shadow-lg">
                进贡与回礼
              </h2>
            </div>
            
            <div className="space-y-6 relative z-10">
              {tradeAnimation.trades.map((trade, idx) => {
                const isInvolved = trade.fromPlayerId === currentPlayerId || trade.toPlayerId === currentPlayerId;
                const fromName = getPlayerName(trade.fromPlayerId);
                const toName = getPlayerName(trade.toPlayerId);
                const fromRank = getPlayerRank(trade.fromPlayerId);
                const toRank = getPlayerRank(trade.toPlayerId);

                return (
                  <div key={idx} className="bg-black/40 rounded-xl p-4 border border-emerald-500/30 flex items-center justify-between gap-4 transition-all hover:bg-black/50 hover:border-emerald-400/50">
                     {/* From Player */}
                     <div className="flex flex-col items-center gap-1 w-1/4">
                        <div className="text-emerald-200 font-bold text-lg truncate w-full text-center">
                          {fromName}
                        </div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                          {fromRank || '进贡者'}
                        </div>
                     </div>

                     {/* Cards & Animation */}
                     <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center gap-4">
                           {trade.cards.map((card, cardIdx) => (
                              <div key={cardIdx} className="transform hover:scale-110 transition-transform duration-200 relative group">
                                 {isInvolved ? (
                                   <div className="shadow-xl shadow-black/50">
                                      <Card card={card} small />
                                   </div>
                                 ) : (
                                   <div className="w-12 h-16 md:w-14 md:h-20 bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg border-2 border-blue-400/50 flex items-center justify-center shadow-xl shadow-black/50">
                                     <span className="text-2xl opacity-50">🎴</span>
                                   </div>
                                 )}
                              </div>
                           ))}
                        </div>
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium animate-pulse">
                           <span>➔</span>
                           <span>{trade.cards.length} 张牌</span>
                           <span>➔</span>
                        </div>
                     </div>

                     {/* To Player */}
                     <div className="flex flex-col items-center gap-1 w-1/4">
                        <div className="text-emerald-200 font-bold text-lg truncate w-full text-center">
                           {toName}
                        </div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                           {toRank || '接收者'}
                        </div>
                     </div>
                  </div>
                );
              })}
            </div>
            
            {/* Footer hint */}
            <div className="mt-8 text-center text-emerald-400/60 text-sm italic">
              仅交易双方可见具体牌面
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GameEffects;
