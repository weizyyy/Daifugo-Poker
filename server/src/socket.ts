import { Server, Socket } from 'socket.io';
import { RoomManager } from './roomManager.js';
import { Player } from './types.js';

const roomManager = new RoomManager();

function validatePlayerName(name: unknown): string | null {
  if (typeof name !== 'string') return '玩家名称必须为字符串';
  const trimmed = name.trim();
  if (trimmed.length < 1) return '玩家名称不能为空';
  if (trimmed.length > 16) return '玩家名称不能超过16个字符';
  if (!/^[^\x00-\x1f]*$/.test(trimmed)) return '玩家名称包含非法字符';
  return null;
}

export function setupSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('createRoom', (data: { playerName: string }) => {
      const { playerName } = data;
      const validationError = validatePlayerName(playerName);
      if (validationError) {
        socket.emit('error', { message: validationError });
        return;
      }
      const result = roomManager.createRoom(socket.id, playerName.trim());
      
      if (result.success && result.room) {
        socket.join(result.room.id);
        socket.emit('roomCreated', result.room);
        io.emit('roomList', roomManager.getRoomList());
      } else {
        socket.emit('error', { message: result.message });
      }
    });

    socket.on('joinRoom', (data: { roomId: string; playerName: string }) => {
      const { roomId, playerName } = data;
      if (typeof roomId !== 'string' || roomId.trim().length === 0) {
        socket.emit('error', { message: '房间ID无效' });
        return;
      }
      const validationError = validatePlayerName(playerName);
      if (validationError) {
        socket.emit('error', { message: validationError });
        return;
      }
      const result = roomManager.joinRoom(roomId.trim(), socket.id, playerName.trim());
      
      if (result.success && result.room) {
        socket.join(result.room.id);

        if (result.isRejoin) {
          socket.emit('roomRejoined', result.room);
        } else {
          socket.emit('roomJoined', result.room);
        }
        
        io.to(result.room.id).emit('roomUpdate', result.room);
        io.emit('roomList', roomManager.getRoomList());
      } else {
        socket.emit('error', { message: result.message });
      }
    });

    socket.on('leaveRoom', () => {
      const result = roomManager.leaveRoom(socket.id);
      
      if (result.success) {
        socket.leave(result.roomId!);
        socket.emit('leftRoom');
        
        if (result.room) {
          io.to(result.roomId!).emit('roomUpdate', result.room);
        }
        io.emit('roomList', roomManager.getRoomList());
      }
    });

    socket.on('getRoomList', () => {
      socket.emit('roomList', roomManager.getRoomList());
    });

    socket.on('startGame', (data: { roomId: string }) => {
      const { roomId } = data;
      if (typeof roomId !== 'string' || roomId.trim().length === 0) {
        socket.emit('error', { message: '房间ID无效' });
        return;
      }
      const room = roomManager.getRoom(roomId);
      
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }

      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.isHost) {
        socket.emit('error', { message: '只有房主可以开始游戏' });
        return;
      }

      const result = roomManager.startGame(roomId);
      
      if (result.success && result.room) {
        io.to(roomId).emit('gameStarted', result.room);
        io.emit('roomList', roomManager.getRoomList());
      } else {
        socket.emit('error', { message: result.message });
      }
    });

    socket.on('playCards', (data: { cardIds: string[] }) => {
      const roomId = [...socket.rooms].find(r => r !== socket.id);
      
      if (!roomId) {
        socket.emit('error', { message: '你不在任何房间中' });
        return;
      }

      const result = roomManager.playCards(roomId, socket.id, data.cardIds);
      
      if (result.success && result.room) {
        io.to(roomId).emit('gameUpdate', {
          room: result.room,
          effects: result.effects
        });

        // When round ends, auto-trigger: deal -> sudden fall check -> card trading
        if (result.room.gameState?.phase === 'roundEnd') {
          // Step 1: Check sudden fall (daifugo didn't win again)
          const gameStateMachine = roomManager.getGameStateMachine(roomId);
          if (gameStateMachine) {
            gameStateMachine.checkSuddenFall();
            // Sync updated ranks back to room
            const updatedState = gameStateMachine.getState();
            result.room.gameState = updatedState;
            result.room.players.forEach((p: Player) => {
              const statePlayer = updatedState.players.find((sp: Player) => sp.id === p.id);
              if (statePlayer) {
                p.rank = statePlayer.rank;
              }
            });
            // Broadcast sudden fall result
            io.to(roomId).emit('gameUpdate', { room: result.room });
          }

          // Step 2: Deal new cards after delay
          setTimeout(() => {
            const dealResult = roomManager.dealCards(roomId);
            
            if (dealResult.success && dealResult.room) {
              io.to(roomId).emit('gameUpdate', {
                room: dealResult.room
              });

              // Step 3: Execute card trading after another delay
              setTimeout(() => {
                const tradeResult = roomManager.executeCardTrading(roomId);
                if (tradeResult.success && tradeResult.room) {
                  io.to(roomId).emit('gameUpdate', {
                    room: tradeResult.room,
                    effects: tradeResult.effects,
                    trades: tradeResult.trades
                  });
                }
              }, 3000);
            }
          }, 1500);
        }
      } else {
        socket.emit('error', { message: result.message });
      }
    });

    socket.on('pass', () => {
      const roomId = [...socket.rooms].find(r => r !== socket.id);
      
      if (!roomId) {
        socket.emit('error', { message: '你不在任何房间中' });
        return;
      }

      const result = roomManager.pass(roomId, socket.id);
      
      if (result.success && result.room) {
        io.to(roomId).emit('gameUpdate', {
          room: result.room
        });
      } else {
        socket.emit('error', { message: result.message });
      }
    });

    socket.on('startNewRound', () => {
      const roomId = [...socket.rooms].find(r => r !== socket.id);
      
      if (!roomId) {
        socket.emit('error', { message: '你不在任何房间中' });
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }

      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.isHost) {
        socket.emit('error', { message: '只有房主可以开始新回合' });
        return;
      }

      const result = roomManager.startNewRound(roomId);
      
      if (result.success && result.room) {
        io.to(roomId).emit('gameUpdate', {
          room: result.room,
          effects: result.effects
        });
      } else {
        socket.emit('error', { message: '无法开始新回合' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      const result = roomManager.leaveRoom(socket.id);
      
      if (result.success && result.room) {
        io.to(result.roomId!).emit('roomUpdate', result.room);
        io.emit('roomList', roomManager.getRoomList());
      }
    });
  });
}