import React, { useState } from 'react';
import { Card, Input, Button, Row, Col, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

export default function CreateLobbyPage() {
  const { createLobby } = useSocket();
  const [lobbyName, setLobbyName] = useState('');
  const nickname = localStorage.getItem('checkers_nickname') || 'Игрок';
  const navigate = useNavigate();

  const handleCreate = () => {
    createLobby({ lobbyName: lobbyName.trim() || `Игра ${nickname}`, playerName: nickname });
    setLobbyName('');
    // перенаправление на страницу игры — сервер пришлёт lobby_created, GamePage будет отображён
    navigate('/game');
  };

  return (
    <Card title="Создать лобби">
      <Row gutter={12}>
        <Col span={24}>
          <Input placeholder={`Игра ${nickname}`} value={lobbyName} onChange={(e) => setLobbyName(e.target.value)} />
        </Col>
        <Col span={24}>
          <Space>
            <Button type="primary" onClick={handleCreate}>Создать</Button>
            <Button onClick={() => navigate('/')}>Назад</Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}
