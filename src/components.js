import React from 'react';
import { Button, Typography, Space } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';

const { Text } = Typography;

const HeaderActions = ({ isLoggedIn, nickname, handleLogout }) => (
  <Space>
    {isLoggedIn && (
      <>
        <Text strong>{nickname}</Text>
        <Button icon={<LogoutOutlined />} onClick={handleLogout}>Выйти</Button>
      </>
    )}
  </Space>
);

export default HeaderActions;