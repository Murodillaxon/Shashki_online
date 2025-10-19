import React from 'react';
import { Card, List, Button } from 'antd';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';

export default function LobbyListPage() {
  const { lobbies, joinLobby } = useSocket();
  const nickname = localStorage.getItem('checkers_nickname') || 'Игрок';
  const navigate = useNavigate();

  const handleJoin = (id) => {
    joinLobby({ lobbyId: id, playerName: nickname });
    navigate('/game');
  };

  return (
    <Card title="Список активных игр">
      <List
        dataSource={lobbies}
        locale={{ emptyText: 'Нет активных игр' }}
        renderItem={l => (
          <List.Item actions={[<Button type="primary" onClick={() => handleJoin(l.id)} key="join">Войти</Button>]}>
            <List.Item.Meta title={l.name} description={l.players && l.players[0] ? `${l.players[0].name} ждёт` : 'Ожидание'} />
          </List.Item>
        )}
      />
    </Card>
  );
}
