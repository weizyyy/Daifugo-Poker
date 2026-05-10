import Card from './Card';

const COMBINATION_NAMES = {
  single: '单张',
  pair: '对子',
  triple: '三张',
  quad: '四张',
  quint: '五张',
  sextuple: '六张',
  stairs: '阶梯',
  double_stairs: '二列阶梯'
};

const SUIT_NAMES = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣'
};

function TrickArea({ currentTrick, lastPlayerName, isRevolution, isElevenRevolution, lockState }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {isElevenRevolution && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600/90 text-white text-sm rounded-full animate-pulse z-10">
          11革命！只能出10或以下
        </div>
      )}

      {isRevolution && !isElevenRevolution && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-600/80 text-white text-sm rounded-full animate-pulse z-10">
          革命中！大小反转
        </div>
      )}

      {lockState?.isLocked && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-600/80 text-white text-xs rounded-full z-10">
          锁定: {SUIT_NAMES[lockState.lockedSuit]}色
        </div>
      )}

      {currentTrick ? (
        <div className="flex flex-col items-center">
          <div className="mb-2 text-gray-300 text-sm">
            {lastPlayerName} 出牌
            <span className="ml-2 text-yellow-400">
              {COMBINATION_NAMES[currentTrick.type]}
            </span>
          </div>
          
          <div className="flex gap-1 justify-center flex-wrap">
            {currentTrick.cards.map(card => (
              <Card key={card.id} card={card} small />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🃏</div>
          <div className="text-sm">等待出牌</div>
        </div>
      )}
    </div>
  );
}

export default TrickArea;
