import React from 'react';
import { Card, Button, Row, List, Col, Typography, Space } from 'antd';
import { PlusOutlined, PlayCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { useSocket } from '../contexts/SocketContext';
import HeaderActions from '../components/HeaderActions';

const { Title, Text } = Typography;

export default function MenuPage() {
    const navigate = useNavigate();
    const { lobbies, joinLobby } = useSocket();
    const nickname = localStorage.getItem('checkers_nickname') || 'Игрок';

    const handleJoin = (id) => {
        joinLobby({ lobbyId: id, playerName: nickname });
    };


    return (
        <div>
            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    <Card title="Управление">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button type="primary" icon={<PlusOutlined />} block onClick={() => navigate('/create')}>Создать игру</Button>
                            {/* <HeaderActions /> */}
                        </Space>
                    </Card>
                </Col>

                <Col xs={24} md={16}>
                    <Card  title="Список активных игр">
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
                </Col>
            </Row>
        </div>
    );
}
