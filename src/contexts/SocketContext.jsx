import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { message } from 'antd';

// Укажите ваш адрес сервера
const SOCKET_URL =  'http://localhost:3001';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lobbies, setLobbies] = useState([]);
  const [currentLobby, setCurrentLobby] = useState(null);

  useEffect(() => {
    // Подключаемся при монтировании провайдера
    const s = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = s;
    // делаем сокет глобально доступным для простого обращения из LoginPage (можно убрать, если не нравится)
    window.globalSocket = s;

    s.on('connect', () => {
      setConnected(true);
      console.info('socket connected', s.id);
      // запрос списка лобби (сервер обычно шлет сам, но на всякий)
      s.emit('list_lobbies');
    });

    s.on('disconnect', () => {
      setConnected(false);
      console.info('socket disconnected');
    });

    s.on('lobbies_list', (data) => {
      setLobbies(data.lobbies || []);
    });

    s.on('lobby_created', (data) => {
      setCurrentLobby(data.lobby);
      message.success('Лобби создано');
    });

    s.on('joined_lobby', (data) => {
      setCurrentLobby(data.lobby);
      message.success('Вы присоединились к игре');
    });

    s.on('game_started', (data) => {
      setCurrentLobby(data.lobby);
      message.success('Игра началась');
    });

    s.on('move_accepted', (data) => {
      setCurrentLobby(prev => prev ? { ...prev, gameState: { board: data.board, turn: data.turn, winner: data.winner } } : prev);
    });

    s.on('player_left', () => {
      message.warning('Противник покинул игру');
      setCurrentLobby(null);
    });

    s.on('lobby_expired', (data) => {
      message.info(data.message || 'Лобби истекло');
      if (currentLobby && currentLobby.id === data.lobbyId) {
        setCurrentLobby(null);
      }
    });

    // Никнейм события
    s.on('nickname_registered', (data) => {
      if (data && data.success) {
        message.success(`Ник зарегистрирован: ${data.nickname}`);
      }
    });

    s.on('nickname_error', (err) => {
      if (err && err.message) message.error(err.message);
    });

    s.on('error', (err) => {
      if (err && err.message) message.error(err.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        window.globalSocket = null;
      }
    };
  }, []);

  // API для компонентов
  const api = {
    socket: socketRef.current,
    connected,
    lobbies,
    currentLobby,
    createLobby: (payload) => socketRef.current && socketRef.current.emit('create_lobby', payload),
    joinLobby: (payload) => socketRef.current && socketRef.current.emit('join_lobby', payload),
    leaveLobby: (payload) => socketRef.current && socketRef.current.emit('leave_lobby', payload),
    makeMove: (payload) => socketRef.current && socketRef.current.emit('make_move', payload),
    requestLobbies: () => socketRef.current && socketRef.current.emit('list_lobbies'),
    registerNickname: (nickname) => socketRef.current && socketRef.current.emit('register_nickname', { nickname }),
    setCurrentLobby, // allow pages to set
  };

  return (
    <SocketContext.Provider value={api}>
      {children}
    </SocketContext.Provider>
  );
};
