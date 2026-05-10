import { useState, useEffect } from 'react';
import Card from './Card';

function Hand({ cards, isMyTurn, onPlay, onPass, disabled, isElevenRevolution }) {
  const [selectedCards, setSelectedCards] = useState([]);

  // Clear selection only when hand card count changes (i.e., actual cards dealt/played)
  const cardCount = cards.length;
  useEffect(() => {
    setSelectedCards([]);
  }, [cardCount]);

  const handleCardClick = (card) => {
    if (disabled || !isMyTurn) return;

    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.id === card.id);
      if (isSelected) {
        return prev.filter(c => c.id !== card.id);
      } else {
        return [...prev, card];
      }
    });
  };

  const handlePlay = () => {
    if (selectedCards.length === 0) return;
    onPlay?.(selectedCards.map(c => c.id));
    setSelectedCards([]);
  };

  const handlePass = () => {
    setSelectedCards([]);
    onPass?.();
  };

  const canPlay = selectedCards.length > 0 && isMyTurn;

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm rounded-t-2xl p-4 border-t border-x border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white font-medium">
          我的手牌
          <span className="ml-2 text-gray-400 text-sm">
            ({cards.length} 张)
          </span>
        </div>
        
        {isMyTurn && (
          <div className="flex gap-2">
            <button
              onClick={handlePass}
              disabled={disabled}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              跳过
            </button>
            <button
              onClick={handlePlay}
              disabled={!canPlay || disabled}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              出牌 ({selectedCards.length})
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-1 max-h-56 overflow-y-auto">
        {cards.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            暂无手牌
          </div>
        ) : (
          cards.map(card => (
            <Card
              key={card.id}
              card={card}
              selected={selectedCards.some(c => c.id === card.id)}
              onClick={handleCardClick}
              disabled={disabled || !isMyTurn}
              small
            />
          ))
        )}
      </div>

      {isMyTurn && (
        <div className="mt-2 text-center">
          {isElevenRevolution && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm mb-2 mr-2">
              11革命中：只能出10或以下的牌！
            </span>
          )}
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm animate-pulse">
            轮到你出牌了！
          </span>
        </div>
      )}
    </div>
  );
}

export default Hand;
