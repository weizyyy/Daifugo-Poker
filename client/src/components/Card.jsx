const SUIT_SYMBOLS = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
  joker: '🃏'
};

const SUIT_COLORS = {
  spade: 'text-gray-900',
  heart: 'text-red-600',
  diamond: 'text-red-600',
  club: 'text-gray-900',
  joker: 'text-purple-600'
};

function Card({ card, selected, onClick, disabled, small }) {
  const isJoker = card.isJoker;
  const suitSymbol = SUIT_SYMBOLS[card.suit] || '';
  const suitColor = SUIT_COLORS[card.suit] || 'text-gray-900';

  const baseClasses = small
    ? 'w-10 h-15 text-xs'
    : 'w-16 h-24 text-sm md:w-20 md:h-28 md:text-base';

  const selectedClasses = selected
    ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900 -translate-y-2 shadow-lg shadow-yellow-400/30'
    : '';

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer hover:-translate-y-1 hover:shadow-lg';

  return (
    <div
      onClick={() => !disabled && onClick?.(card)}
      className={`
        relative ${baseClasses} ${selectedClasses} ${disabledClasses}
        bg-white rounded-lg shadow-md
        flex flex-col items-center justify-between p-1
        transition-all duration-150 ease-out
        select-none
      `}
    >
      <div className={`self-start font-bold ${suitColor} leading-none`}>
        {isJoker ? 'JOKER' : card.rank}
      </div>
      
      <div className={`${suitColor} text-lg md:text-2xl`}>
        {suitSymbol}
      </div>
      
      <div className={`self-end font-bold ${suitColor} leading-none rotate-180`}>
        {isJoker ? 'JOKER' : card.rank}
      </div>
    </div>
  );
}

export default Card;
