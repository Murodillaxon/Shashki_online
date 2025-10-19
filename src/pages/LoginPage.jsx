import React, { useState } from 'react';
import { Card, Input, Button, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [nickname, setNickname] = useState(localStorage.getItem('checkers_nickname') || '');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!nickname.trim()) { message.warn('Введите ник'); return; }
    localStorage.setItem('checkers_nickname', nickname.trim());
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
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
