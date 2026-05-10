import React from 'react';
import { RANK_NAMES } from '../constants.js';
import OpponentSeat from './OpponentSeat';
import TrickArea from './TrickArea';
import Hand from './Hand';
import GameEffects from './GameEffects';

function Room({ room, currentPlayerId, onLeave, onStartGame, onPlayCards, onPass, onStartNewRound, effects, trades }) {
  const gameState = room.gameState;
  const isPlaying = room.status === 'playing';

  const currentPlayer = room.players.find(p => p.id === currentPlayerId);
  const myHand = currentPlayer?.hand || [];
  const isMyTurn = gameState?.players?.[gameState?.currentPlayerIndex]?.id === currentPlayerId;

  const getOpponentSeatPosition = (index, total) => {
    const startAngle = 140;
    const angleRange = 260;
    const angle = startAngle + (index * angleRange) / Math.max(total - 1, 1);
    const radius = 42;
    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
    return { x, y };
  };

  const myPlayerIndex = room.players.findIndex(p => p.id === currentPlayerId);
  const opponents = room.players.filter(p => p.id !== currentPlayerId);
  const opponentPositions = opponents.map((opponent, i) => {
    const opponentIndex = room.players.findIndex(p => p.id === opponent.id);
    let relativeIndex = (opponentIndex - myPlayerIndex - 1 + room.players.length) % room.players.length;
    return getOpponentSeatPosition(relativeIndex, opponents.length);
  });

  const getLastTrickPlayerName = () => {
    if (!gameState?.currentTrick) return null;
    const playerId = gameState.currentTrick.playerId;
    const player = room.players.find(p => p.id === playerId);
    return player?.name || null;
  };

  const getPhaseDisplay = () => {
    if (!gameState) return null;

    switch (gameState.phase) {
      case 'roundEnd':
        const sortedPlayers = [...gameState.players].sort((a, b) => {
          return a.finishOrder - b.finishOrder;
        });
        return (
          <div className="text-center max-w-md mx-auto">
            <div className="text-yellow-400 text-xl font-bold mb-4">回合结束！</div>
            <div className="bg-gray-800/80 rounded-lg p-3 mb-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-gray-400">排名</div>
                <div className="text-gray-400">玩家</div>
                <div className="text-gray-400">阶级 / 积分</div>
                {sortedPlayers.map((player, index) => {
                  const rankInfo = player.rank ? RANK_NAMES[player.rank] : null;
                  return (
                    <React.Fragment key={player.id}>
                      <div className="text-white font-medium">#{index + 1}</div>
                      <div className="text-white truncate">{player.name}</div>
                      <div className={rankInfo ? rankInfo.color : 'text-gray-500'}>
                        {rankInfo ? rankInfo.name : '-'} 
                        <span className="ml-1 text-xs">
                          ({player.score > 0 ? '+' : ''}{player.score || 0})
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
            <div className="text-gray-400 text-sm">正在准备换牌...</div>
          </div>
        );
      case 'trading':
        return (
          <div className="text-center">
            <div className="text-emerald-400 text-lg font-bold mb-2">换牌阶段</div>
            {currentPlayer?.isHost && (
              <button
                onClick={onStartNewRound}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-medium"
              >
                开始新回合
              </button>
            )}
            {!currentPlayer?.isHost && (
              <div className="text-gray-400 text-sm">等待房主开始新回合...</div>
            )}
          </div>
        );
      case 'gameEnd':
        const finalSortedPlayers = [...gameState.players].sort((a, b) => {
          return b.score - a.score;
        });
        return (
          <div className="text-center max-w-md mx-auto">
            <div className="text-purple-400 text-xl font-bold mb-4">游戏结束！</div>
            <div className="bg-gray-800/80 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div className="text-gray-400">排名</div>
                <div className="text-gray-400">玩家</div>
                <div className="text-gray-400">总积分</div>
                {finalSortedPlayers.map((player, index) => {
                  const rankInfo = player.rank ? RANK_NAMES[player.rank] : null;
                  return (
                    <React.Fragment key={player.id}>
                      <div className="text-white font-medium">#{index + 1}</div>
                      <div className="text-white truncate">{player.name}</div>
                      <div className={rankInfo ? rankInfo.color : 'text-gray-500'}>
                        {player.score || 0}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isPlaying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="text-white">
              <span className="text-xl font-semibold">房间 #{room.id}</span>
              <span className="ml-4 text-gray-400">
                {room.players.length} / {room.maxPlayers} 人
              </span>
            </div>
            <button
              onClick={onLeave}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              离开房间
            </button>
          </div>

          <div className="bg-gray-800/50 rounded-2xl p-6 mb-6">
            <h3 className="text-white text-lg font-medium mb-4">房间玩家</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {room.players.map(player => (
                <div
                  key={player.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg
                    ${player.id === currentPlayerId 
                      ? 'bg-blue-600/30 ring-1 ring-blue-500' 
                      : 'bg-gray-700/50'
                    }
                  `}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-lg">
                    {player.isHost ? '👑' : '👤'}
                  </div>
                  <div>
                    <div className="text-white font-medium">{player.name}</div>
                    {player.isHost && (
                      <div className="text-xs text-yellow-400">房主</div>
                    )}
                    {player.id === currentPlayerId && (
                      <div className="text-xs text-blue-400">你</div>
                    )}
                    {player.score !== undefined && player.score !== 0 && (
                      <div className={`text-xs ${player.score > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        积分: {player.score > 0 ? '+' : ''}{player.score}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            {room.players.length < 3 ? (
              <div className="text-gray-400 mb-4">
                等待更多玩家加入... (至少需要3人)
              </div>
            ) : (
              <div className="text-green-400 mb-4">
                人数已足够，可以开始游戏！
              </div>
            )}

            {currentPlayer?.isHost && (
              <button
                onClick={() => onStartGame?.(room.id)}
                disabled={room.players.length < 3}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition-colors text-lg font-medium"
              >
                开始游戏
              </button>
            )}

            {!currentPlayer?.isHost && room.players.length >= 3 && (
              <div className="text-gray-400">
                等待房主开始游戏...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-b from-emerald-900 via-green-900 to-gray-900 flex flex-col overflow-hidden">
      <GameEffects effects={effects} trades={trades} currentPlayerId={currentPlayerId} players={room.players} />
      <div className="flex-shrink-0 px-4 py-2 bg-gray-900/80 backdrop-blur-sm flex justify-between items-center border-b border-gray-700">
        <div className="text-white">
          <span className="font-semibold">房间 #{room.id}</span>
          <span className="ml-3 text-gray-400 text-sm">
            第 {gameState?.roundNumber || 1} 局
          </span>
          {gameState?.isGreatRevolution && (
            <span className="ml-3 px-2 py-0.5 bg-red-800 text-white text-xs rounded-full">
              大革命
            </span>
          )}
          {gameState?.isRevolution && !gameState?.isGreatRevolution && (
            <span className="ml-3 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
              革命中
            </span>
          )}
        </div>
        <button
          onClick={onLeave}
          className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-sm transition-colors"
        >
          离开
        </button>
      </div>

      {/* Persistent Score Panel */}
      {isPlaying && (
        <div className="absolute top-14 left-4 z-20 pointer-events-none">
          <div className="bg-gray-900/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-700 pointer-events-auto">
            <h3 className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">积分榜</h3>
            <div className="space-y-1">
              {room.players
                .slice()
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((player, index) => (
                  <div key={player.id} className="flex justify-between items-center text-sm gap-4 min-w-[140px]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className={`text-xs w-4 ${index === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{index + 1}</span>
                      <span className={`truncate max-w-[80px] ${player.id === currentPlayerId ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                        {player.name}
                      </span>
                    </div>
                    <span className="text-white font-mono">{player.score || 0}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-4xl max-h-[60vh]">
            <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-green-800 to-green-900 shadow-2xl border-4 border-amber-800/50">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-700/30 to-transparent" />
            </div>

            <div className="absolute inset-[15%] rounded-full">
              <TrickArea
                currentTrick={gameState?.currentTrick}
                lastPlayerName={getLastTrickPlayerName()}
                isRevolution={gameState?.isRevolution}
                isElevenRevolution={gameState?.isElevenRevolution}
                lockState={gameState?.lockState}
              />
            </div>

            {opponents.map((player, index) => (
              <OpponentSeat
                key={player.id}
                player={player}
                position={opponentPositions[index]}
                isCurrentTurn={gameState?.players?.[gameState?.currentPlayerIndex]?.id === player.id}
              />
            ))}
          </div>
        </div>
      </div>

      {gameState?.phase !== 'playing' && (
        <div className="flex-shrink-0 px-4 py-3 bg-gray-900/90 backdrop-blur-sm border-t border-gray-700">
          {getPhaseDisplay()}
        </div>
      )}

      <div className="flex-shrink-0">
        <Hand
          cards={myHand}
          isMyTurn={isMyTurn && gameState?.phase === 'playing'}
          onPlay={onPlayCards}
          onPass={onPass}
          disabled={gameState?.phase !== 'playing'}
          isElevenRevolution={gameState?.isElevenRevolution}
        />
      </div>
    </div>
  );
}

export default Room;
