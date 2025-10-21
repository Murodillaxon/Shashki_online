import React, { useState } from 'react';
import { Card, Input, Button, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [nickname, setNickname] = useState(localStorage.getItem('checkers_nickname') || '');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!nickname.trim()) { message.warn('Введите ник'); return; }

    const socket = window.globalSocket || null;
    if (!socket || !socket.connected) {
      message.error('Нет подключения к серверу');
      return;
    }

    // Отправляем запрос на регистрацию ника
    socket.emit('register_nickname', { nickname: nickname.trim() });

    // Ожидаем ответ
    const onRegistered = (data) => {
      if (data && data.success) {
        localStorage.setItem('checkers_nickname', nickname.trim());
        message.success('Добро пожаловать, ' + nickname.trim());
        cleanupListeners();
        navigate('/');
      }
    };

    const onError = (err) => {
      if (err && err.message) {
        message.error(err.message);
      } else {
        message.error('Не удалось зарегистрировать ник');
      }
      cleanupListeners();
    };

    // Подписываемся один раз
    socket.once('nickname_registered', onRegistered);
    socket.once('nickname_error', onError);
    socket.once('error', onError);

    // Если за 3 секунды ничего не вернулось — убираем слушатели (без ожиданий в фоне)
    setTimeout(() => {
      cleanupListeners();
    }, 3000);

    function cleanupListeners() {
      try {
        socket.off('nickname_registered', onRegistered);
        socket.off('nickname_error', onError);
        socket.off('error', onError);
      } catch (e) { /* ignore */ }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
      <Card style={{ width: 420 }}>
        <h3>Войти</h3>
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Введите ник"
          maxLength={20}
          onPressEnter={handleLogin}
          style={{ marginBottom: 12 }}
        />
        <Space>
          <Button type="primary" onClick={handleLogin}>Войти</Button>
          <Button onClick={() => { setNickname(''); localStorage.removeItem('checkers_nickname'); }}>Очистить</Button>
        </Space>
      </Card>
    </div>
  );
}
