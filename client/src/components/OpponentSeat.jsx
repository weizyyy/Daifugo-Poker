import { RANK_NAMES } from '../constants.js';

function OpponentSeat({ player, position, isCurrentTurn, style }) {
  const posStyle = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: 'translate(-50%, -50%)',
    ...style
  };

  if (!player) {
    return (
      <div
        className="absolute w-20 h-24 md:w-24 md:h-28 rounded-xl border-2 border-dashed border-gray-600/50 flex items-center justify-center bg-gray-800/30"
        style={posStyle}
      >
        <span className="text-gray-600 text-3xl">?</span>
      </div>
    );
  }

  const rankInfo = player.rank ? RANK_NAMES[player.rank] : null;
  const isFinished = player.hand.length === 0;

  return (
    <div
      className={`
        absolute w-20 min-h-[6rem] md:w-24 md:min-h-[7rem] h-auto rounded-xl
        flex flex-col items-center justify-center p-2
        transition-all duration-200
        ${isCurrentTurn 
          ? 'bg-gradient-to-br from-yellow-600 to-amber-700 ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/30' 
          : isFinished
            ? 'bg-gray-700/50 opacity-60'
            : 'bg-gray-700/80'
        }
      `}
      style={posStyle}
    >
      <div className="relative">
        <div className={`
          w-10 h-10 md:w-12 md:h-12 rounded-full 
          flex items-center justify-center text-xl md:text-2xl
          ${isCurrentTurn ? 'bg-yellow-500/30' : 'bg-gray-600'}
        `}>
          {isFinished 
            ? '✓' 
            : rankInfo 
              ? rankInfo.emoji 
              : player.isHost 
                ? '👑' 
                : '👤'
          }
        </div>
        
        {isCurrentTurn && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
        )}
      </div>

      <div className="text-white text-xs md:text-sm font-medium truncate max-w-full mt-1">
        {player.name}
      </div>

      {rankInfo && (
        <div className={`text-xs mt-0.5 ${rankInfo.color} font-medium`}>
          {rankInfo.name}
        </div>
      )}

      {player.score !== undefined && player.score !== 0 && (
        <div className={`text-xs mt-0.5 ${player.score > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {player.score > 0 ? '+' : ''}{player.score}
        </div>
      )}

      {!isFinished && (
        <div className={`
          text-xs mt-0.5 px-2 py-0.5 rounded-full
          ${isCurrentTurn 
            ? 'bg-yellow-500/30 text-yellow-200' 
            : 'bg-gray-600 text-gray-300'
          }
        `}>
          {player.hand.length} 张
        </div>
      )}
    </div>
  );
}

export default OpponentSeat;
