// client/src/components/MobileDrawer.jsx
import React from 'react';
import { Drawer, Button, Space, Typography } from 'antd';
import { PlusOutlined, PlayCircleOutlined, LogoutOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function MobileDrawer({ visible, onClose, onCreate, onList, onLogout, serverUrl }) {
  return (
    <Drawer
      title="Меню"
      placement="left"
      onClose={onClose}
      visible={visible}
      bodyStyle={{ paddingBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button type="primary" icon={<PlusOutlined />} block onClick={() => { onCreate(); onClose(); }}>Создать игру</Button>
        <Button icon={<PlayCircleOutlined />} block onClick={() => { onList(); onClose(); }}>Список игр</Button>
        <Button danger icon={<LogoutOutlined />} block onClick={() => { onLogout(); onClose(); }}>Выйти</Button>
        <div style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Сервер: {serverUrl}</Text>
        </div>
      </Space>
    </Drawer>
  );
}
