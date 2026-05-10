import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

let SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

async function loadSocketUrl() {
  if (import.meta.env.DEV) return SOCKET_URL;
  try {
    const base = import.meta.env.BASE_URL || '/';
    const res = await fetch(base + 'config.json');
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.socketUrl) SOCKET_URL = cfg.socketUrl;
    }
  } catch { /* use default */ }
  return SOCKET_URL;
}

export function useSocket() {
  const [socketUrl, setSocketUrl] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);
  const [effects, setEffects] = useState([]);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    loadSocketUrl().then(setSocketUrl);
  }, []);

  useEffect(() => {
    if (!socketUrl) return;

    const socketInstance = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setConnected(false);
      setError('连接服务器失败');
    });

    socketInstance.on('roomList', (roomList) => {
      setRooms(roomList);
    });

    socketInstance.on('roomCreated', (room) => {
      setCurrentRoom(room);
      const me = room.players?.find(p => p.id === socketInstance.id);
      if (me) setCurrentPlayerId(me.id);
      setError(null);
    });

    socketInstance.on('roomJoined', (room) => {
      setCurrentRoom(room);
      const me = room.players?.find(p => p.id === socketInstance.id);
      if (me) setCurrentPlayerId(me.id);
      setError(null);
    });

    socketInstance.on('roomRejoined', (room) => {
      setCurrentRoom(room);
      const me = room.players?.find(p => p.id === socketInstance.id);
      if (me) setCurrentPlayerId(me.id);
      setError(null);
    });

    socketInstance.on('leftRoom', () => {
      setCurrentRoom(null);
      setCurrentPlayerId(null);
    });

    socketInstance.on('roomUpdate', (room) => {
      setCurrentRoom(room);
      const me = room.players?.find(p => p.id === socketInstance.id);
      if (me) setCurrentPlayerId(me.id);
    });

    socketInstance.on('gameStarted', (room) => {
      setCurrentRoom(room);
    });

    socketInstance.on('gameUpdate', (data) => {
      setCurrentRoom(data.room);
      if (data.effects && data.effects.length > 0) {
        setEffects(data.effects);
      }
      if (data.trades && data.trades.length > 0) {
        setTrades(data.trades);
      }
    });

    socketInstance.on('error', (err) => {
      setError(err.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [socketUrl]);

  const createRoom = useCallback((playerName) => {
    if (socket && connected) {
      setError(null);
      socket.emit('createRoom', { playerName });
    }
  }, [socket, connected]);

  const joinRoom = useCallback((roomId, playerName) => {
    if (socket && connected) {
      setError(null);
      socket.emit('joinRoom', { roomId, playerName });
    }
  }, [socket, connected]);

  const leaveRoom = useCallback(() => {
    if (socket && connected) {
      socket.emit('leaveRoom');
    }
  }, [socket, connected]);

  const getRoomList = useCallback(() => {
    if (socket && connected) {
      socket.emit('getRoomList');
    }
  }, [socket, connected]);

  const startGame = useCallback((roomId) => {
    if (socket && connected) {
      socket.emit('startGame', { roomId });
    }
  }, [socket, connected]);

  const playCards = useCallback((cardIds) => {
    if (socket && connected) {
      socket.emit('playCards', { cardIds });
    }
  }, [socket, connected]);

  const pass = useCallback(() => {
    if (socket && connected) {
      socket.emit('pass');
    }
  }, [socket, connected]);

  const startNewRound = useCallback(() => {
    if (socket && connected) {
      socket.emit('startNewRound');
    }
  }, [socket, connected]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearEffects = useCallback(() => {
    setEffects([]);
  }, []);

  const clearTrades = useCallback(() => {
    setTrades([]);
  }, []);

  const reconnect = useCallback(() => {
    if (socket) {
      setError(null);
      socket.connect();
    }
  }, [socket]);

  return {
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
    clearEffects,
    clearTrades,
    reconnect
  };
}
