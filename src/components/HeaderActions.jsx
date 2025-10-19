import React from 'react';
import { Space, Text, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export default function HeaderActions() {
  const nickname = localStorage.getItem('checkers_nickname') || '';
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('checkers_nickname');
    navigate('/login');
  };

  return (
    <Space direction="vertical">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>{nickname}</span>
        <Button icon={<LogoutOutlined />} onClick={handleLogout}>Выйти</Button>
      </div>
    </Space>
  );
}
