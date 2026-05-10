function Lobby({ 
  playerName, 
  setPlayerName, 
  onCreateRoom, 
  onJoinRoom,
  rooms,
  error,
  setError 
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          大富豪扑克
        </h1>

        <div className="bg-gray-700 rounded-lg p-6 mb-8">
          <div className="flex gap-4 items-center">
            <label className="text-white text-lg">玩家名称:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="输入你的名称"
              className="flex-1 px-4 py-2 rounded-lg bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={12}
            />
            <button
              onClick={onCreateRoom}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              创建房间
            </button>
          </div>
          
          {error && (
            <div className="mt-4 text-red-400 text-center">
              {error}
              <button 
                onClick={() => setError('')}
                className="ml-2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-700 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">房间列表</h2>
          
          {rooms.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              暂无房间，创建一个开始游戏吧！
            </div>
          ) : (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-gray-600 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-white font-mono text-lg">
                      房间 #{room.id}
                    </span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      room.status === 'waiting' 
                        ? 'bg-yellow-600 text-yellow-100' 
                        : 'bg-green-600 text-green-100'
                    }`}>
                      {room.status === 'waiting' ? '等待中' : '游戏中'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-gray-300 text-sm">
                      <span>{room.playerCount} / {room.maxPlayers} 人</span>
                      {room.players && room.players.length > 0 && (
                        <div className="text-gray-400 text-xs mt-1">
                          {room.players.join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onJoinRoom(room.id)}
                      disabled={room.playerCount >= room.maxPlayers && room.status === 'waiting'}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        room.playerCount >= room.maxPlayers && room.status === 'waiting'
                          ? 'bg-gray-500 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {room.status === 'playing' ? '重新加入' : room.playerCount >= room.maxPlayers ? '已满' : '加入'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;
