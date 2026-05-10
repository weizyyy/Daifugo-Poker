import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import Room from './components/Room';

function App() {
  const {
    socket,
    connected,
    currentRoom,
    currentPlayerId,
    rooms,
    error,
    effects,
    trades,
    createRoom,
    joinRoom,
    leaveRoom,
    getRoomList,
    startGame,
    playCards,
    pass,
    startNewRound,
    clearError,
    reconnect
  } = useSocket();

  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    if (connected) {
      getRoomList();
    }
  }, [connected, getRoomList]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      return;
    }
    createRoom(playerName.trim());
  };

  const handleJoinRoom = (roomId) => {
    if (!playerName.trim()) {
      return;
    }
    joinRoom(roomId, playerName.trim());
  };

  const handleLeaveRoom = () => {
    leaveRoom();
  };

  const handleStartGame = (roomId) => {
    startGame(roomId);
  };

  const handlePlayCards = (cardIds) => {
    playCards(cardIds);
  };

  const handlePass = () => {
    pass();
  };

  const handleStartNewRound = () => {
    startNewRound();
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">
            {error ? error : '连接服务器中...'}
          </div>
          {error && (
            <button
              onClick={reconnect}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-medium"
            >
              重新连接
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {currentRoom ? (
        <Room 
          room={currentRoom} 
          currentPlayerId={currentPlayerId}
          onLeave={handleLeaveRoom}
          onStartGame={handleStartGame}
          onPlayCards={handlePlayCards}
          onPass={handlePass}
          onStartNewRound={handleStartNewRound}
          effects={effects}
          trades={trades}
        />
      ) : (
        <Lobby
          playerName={playerName}
          setPlayerName={setPlayerName}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          rooms={rooms}
          error={error}
          setError={clearError}
        />
      )}
    </div>
  );
}

export default App;
