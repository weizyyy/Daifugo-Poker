import { Room, Player, GameState, Card } from './types.js';
import { GameStateMachine } from './gameState.js';

export class RoomManager {
  private rooms: Map<string, Room>;
  private playerRoomMap: Map<string, string>;
  private gameStates: Map<string, GameStateMachine>;

  constructor() {
    this.rooms = new Map();
    this.playerRoomMap = new Map();
    this.gameStates = new Map();
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createRoom(hostId: string, hostName: string): { success: boolean; room?: Room; message?: string } {
    if (this.playerRoomMap.has(hostId)) {
      return { success: false, message: '玩家已在房间中' };
    }

    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      players: [{
        id: hostId,
        name: hostName || `玩家${hostId.substring(0, 4)}`,
        hand: [],
        rank: null,
        score: 0,
        isHost: true,
        isReady: false,
        hasPassed: false,
        finishOrder: 0
      }],
      maxPlayers: 9,
      status: 'waiting',
      gameState: null,
      disconnectedPlayers: new Map()
    };

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(hostId, roomId);

    return { success: true, room };
  }

  joinRoom(roomId: string, playerId: string, playerName: string): { success: boolean; room?: Room; message?: string; isRejoin?: boolean } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, message: '房间不存在' };
    }

    if (this.playerRoomMap.has(playerId)) {
      return { success: false, message: '玩家已在房间中' };
    }

    const existingPlayer = room.players.find(p => p.name === playerName);
    if (existingPlayer) {
      return { success: false, message: '该名称的玩家已在房间中' };
    }

    const disconnectedPlayer = room.disconnectedPlayers.get(playerName);
    let isRejoin = false;

    if (room.status === 'playing') {
      if (!disconnectedPlayer) {
        return { success: false, message: '游戏已开始，只允许断线玩家重新加入' };
      }
      isRejoin = true;
      room.disconnectedPlayers.delete(playerName);
    }

    if (room.players.length >= room.maxPlayers) {
      if (!isRejoin) {
        return { success: false, message: '房间已满' };
      }
    }

    const newPlayer: Player = {
      id: playerId,
      name: playerName || `玩家${playerId.substring(0, 4)}`,
      hand: disconnectedPlayer?.hand || [],
      rank: disconnectedPlayer?.rank || null,
      score: 0,
      isHost: false,
      isReady: false,
      hasPassed: disconnectedPlayer?.hasPassed || false,
      finishOrder: disconnectedPlayer?.finishOrder || 0
    };

    room.players.push(newPlayer);
    this.playerRoomMap.set(playerId, roomId);

    if (isRejoin && room.gameState) {
      const gameStateMachine = this.gameStates.get(roomId);
      if (gameStateMachine) {
        gameStateMachine.rejoinPlayer(newPlayer);
        room.gameState = gameStateMachine.getState();
      }
    }

    return { success: true, room, isRejoin };
  }

  leaveRoom(playerId: string): { success: boolean; roomId?: string; room?: Room | null } {
    const roomId = this.playerRoomMap.get(playerId);
    
    if (!roomId) {
      return { success: false };
    }

    const room = this.rooms.get(roomId);
    
    if (!room) {
      this.playerRoomMap.delete(playerId);
      return { success: false };
    }

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      this.playerRoomMap.delete(playerId);
      return { success: false };
    }

    const player = room.players[playerIndex];
    const wasHost = player.isHost;
    const wasOnlyPlayer = room.players.length === 1;

    if (room.status === 'waiting' && wasOnlyPlayer) {
      this.rooms.delete(roomId);
      this.gameStates.delete(roomId);
      this.playerRoomMap.delete(playerId);
      return { success: true, roomId, room: null };
    }

    room.disconnectedPlayers.set(player.name, { ...player });
    room.players.splice(playerIndex, 1);
    this.playerRoomMap.delete(playerId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.gameStates.delete(roomId);
      return { success: true, roomId, room: null };
    }

    if (wasHost) {
      room.players[0].isHost = true;
    }

    return { success: true, roomId, room };
  }

  startGame(roomId: string): { success: boolean; room?: Room; message?: string } {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, message: '房间不存在' };
    }

    if (room.status === 'playing') {
      return { success: false, message: '游戏已开始' };
    }

    if (room.players.length < 3) {
      return { success: false, message: '至少需要3名玩家' };
    }

    const hostIndex = room.players.findIndex(p => p.isHost);
    const gameStateMachine = new GameStateMachine(
      room.players.map(p => ({ id: p.id, name: p.name }))
    );

    const result = gameStateMachine.startGame(hostIndex >= 0 ? hostIndex : 0);
    
    if (!result.success) {
      return { success: false, message: result.message };
    }

    room.status = 'playing';
    room.gameState = gameStateMachine.getState();
    this.gameStates.set(roomId, gameStateMachine);

    room.players.forEach(player => {
      const state = gameStateMachine.getState();
      const statePlayer = state.players.find(p => p.id === player.id);
      if (statePlayer) {
        player.hand = statePlayer.hand;
      }
    });

    return { success: true, room };
  }

  playCards(roomId: string, playerId: string, cardIds: string[]): { success: boolean; room?: Room; message?: string; effects?: any[] } {
    const gameStateMachine = this.gameStates.get(roomId);
    const room = this.rooms.get(roomId);

    if (!gameStateMachine || !room) {
      return { success: false, message: '游戏不存在' };
    }

    const state = gameStateMachine.getState();
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: '玩家不存在' };
    }

    const cards: Card[] = cardIds
      .map(id => player.hand.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);
    
    if (cards.length !== cardIds.length) {
      return { success: false, message: '手牌中不存在这些牌' };
    }

    const result = gameStateMachine.playCards(playerId, cards);
    
    if (!result.success) {
      return { success: false, message: result.message };
    }

    room.gameState = gameStateMachine.getState();
    room.players.forEach(p => {
      const statePlayer = room.gameState?.players.find(sp => sp.id === p.id);
      if (statePlayer) {
        p.hand = statePlayer.hand;
        p.rank = statePlayer.rank;
        p.score = statePlayer.score;
        p.finishOrder = statePlayer.finishOrder;
      }
    });

    return { success: true, room, effects: result.effects };
  }

  pass(roomId: string, playerId: string): { success: boolean; room?: Room; message?: string } {
    const gameStateMachine = this.gameStates.get(roomId);
    const room = this.rooms.get(roomId);

    if (!gameStateMachine || !room) {
      return { success: false, message: '游戏不存在' };
    }

    const result = gameStateMachine.pass(playerId);
    
    if (!result.success) {
      return { success: false, message: result.message };
    }

    room.gameState = gameStateMachine.getState();
    room.players.forEach(p => {
      const statePlayer = room.gameState?.players.find(sp => sp.id === p.id);
      if (statePlayer) {
        p.score = statePlayer.score;
        p.finishOrder = statePlayer.finishOrder;
      }
    });

    return { success: true, room };
  }

  dealCards(roomId: string): { success: boolean; room?: Room; message?: string } {
    const gameStateMachine = this.gameStates.get(roomId);
    const room = this.rooms.get(roomId);

    if (!gameStateMachine || !room) {
      return { success: false, message: '游戏不存在' };
    }

    const result = gameStateMachine.dealCards();
    
    if (!result.success) {
      return { success: false };
    }

    room.gameState = gameStateMachine.getState();
    room.players.forEach(p => {
      const statePlayer = room.gameState?.players.find(sp => sp.id === p.id);
      if (statePlayer) {
        p.hand = statePlayer.hand;
      }
    });

    return { success: true, room };
  }

  executeCardTrading(roomId: string): { success: boolean; room?: Room; effects?: any[]; trades?: any[]; message?: string } {
    const gameStateMachine = this.gameStates.get(roomId);
    const room = this.rooms.get(roomId);

    if (!gameStateMachine || !room) {
      return { success: false, message: '游戏不存在' };
    }

    const result = gameStateMachine.executeCardTrading();
    
    if (!result.success) {
      return { success: false };
    }

    room.gameState = gameStateMachine.getState();
    room.players.forEach(p => {
      const statePlayer = room.gameState?.players.find(sp => sp.id === p.id);
      if (statePlayer) {
        p.hand = statePlayer.hand;
      }
    });

    return { success: true, room, effects: result.effects, trades: result.trades };
  }

  startNewRound(roomId: string): { success: boolean; room?: Room; effects?: any[]; message?: string } {
    const gameStateMachine = this.gameStates.get(roomId);
    const room = this.rooms.get(roomId);

    if (!gameStateMachine || !room) {
      return { success: false, message: '游戏不存在' };
    }

    const result = gameStateMachine.startNewRound();
    
    if (!result.success) {
      return { success: false };
    }

    room.gameState = gameStateMachine.getState();
    room.players.forEach(p => {
      const statePlayer = room.gameState?.players.find(sp => sp.id === p.id);
      if (statePlayer) {
        p.hand = statePlayer.hand;
      }
    });

    return { success: true, room, effects: result.effects };
  }

  getRoomList(): { id: string; playerCount: number; maxPlayers: number; status: string; players: string[] }[] {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      status: room.status,
      players: room.players.map(p => p.name)
    }));
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getGameState(roomId: string): GameState | undefined {
    const gameStateMachine = this.gameStates.get(roomId);
    return gameStateMachine?.getState();
  }

  getGameStateMachine(roomId: string): GameStateMachine | undefined {
    return this.gameStates.get(roomId);
  }

}
