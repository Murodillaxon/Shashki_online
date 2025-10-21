import React, { useEffect, useState, useCallback } from 'react';
import { Card, List, Button, Spin, Empty, Typography, Space, message } from 'antd';
import { useSocket } from '../contexts/SocketContext'; // путь поправь если нужно

const { Text } = Typography;

// Укажи URL сервера (тот же, что в SocketProvider / server)
const SERVER_URL = 'https://shashkaback-production.up.railway.app';

export default function OnlinePlayers({ autoRefresh = true, refreshInterval = 5000 }) {
    const socketApi = useSocket(); // опционально: может быть undefined, если провайдера нет
    const [loading, setLoading] = useState(false);
    const [nicknames, setNicknames] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchNicknames = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await fetch(`${SERVER_URL}/nicknames`);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            const json = await resp.json();
            setNicknames(Array.isArray(json.nicknames) ? json.nicknames : []);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Failed to fetch nicknames:', err);
            message.error('Не удалось получить список онлайн-ников');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // начальный запрос
        fetchNicknames();

        // авто-обновление по таймеру
        let timer = null;
        if (autoRefresh) {
            timer = setInterval(() => {
                fetchNicknames();
            }, refreshInterval);
        }

        // подписываемся на события сокета для мгновенного обновления (если есть socket)
        const sock = (socketApi && socketApi.socket) || window.globalSocket || null;
        const onRelevant = () => {
            // при изменениях лобби/регистрации — обновляем список
            fetchNicknames();
        };

        if (sock) {
            try {
                sock.on('lobbies_list', onRelevant);
                sock.on('lobby_created', onRelevant);
                sock.on('joined_lobby', onRelevant);
                sock.on('player_left', onRelevant);
                sock.on('nickname_registered', onRelevant);
                sock.on('disconnect', onRelevant);
            } catch (e) {
                // ignore
            }
        }

        return () => {
            if (timer) clearInterval(timer);
            if (sock) {
                try {
                    sock.off('lobbies_list', onRelevant);
                    sock.off('lobby_created', onRelevant);
                    sock.off('joined_lobby', onRelevant);
                    sock.off('player_left', onRelevant);
                    sock.off('nickname_registered', onRelevant);
                    sock.off('disconnect', onRelevant);
                } catch (e) { }
            }
        };
    }, [autoRefresh, refreshInterval, fetchNicknames, socketApi]);

    return (
        <Card title="Онлайн игроки" extra={
            <Space>
                <Button size="small" onClick={fetchNicknames}>Обновить</Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {lastUpdate ? `Обновлено: ${lastUpdate.toLocaleTimeString()}` : ''}
                </Text>
            </Space>
        } >
            {loading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                    <Spin />
                </div>
            ) : nicknames.length === 0 ? (
                <Empty description="Пока никого нет онлайн" />
            ) : (
                <List
                    size="small"
                    dataSource={nicknames}
                    renderItem={(item, idx) => (
                        <List.Item>
                            <List.Item.Meta
                                title={<Text>{item}</Text>}
                                description={<Text type="secondary">#{idx + 1}</Text>}
                            />
                        </List.Item>
                    )}
                />
            )}
        </Card>
    );
}
