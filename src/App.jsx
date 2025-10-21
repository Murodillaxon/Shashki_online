// client/src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout } from 'antd';
import 'antd/dist/reset.css';

import { SocketProvider } from './contexts/SocketContext';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import CreateLobbyPage from './pages/CreateLobbyPage';
import LobbyListPage from './pages/LobbyListPage';
import GamePage from './pages/GamePage';
import MobileDrawer from './components/MobileDrawer';
import HeaderActions from './components/HeaderActions';

const { Header, Content } = Layout;

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const nick = localStorage.getItem('checkers_nickname');
    if (!nick) navigate('/login');
    // если ник есть — остаёмся на текущей странице
  }, [navigate]);

  return (
    <SocketProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#fff', padding: '0 16px' }}>
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            🎮 Онлайн Шашки
            <HeaderActions />
          </div>
        </Header>

        <Content style={{ padding: 16 }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<MenuPage />} />
            <Route path="/create" element={<CreateLobbyPage />} />
            <Route path="/list" element={<LobbyListPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>

      {/* Mobile drawer — компонент можно показать/скрыть внутри него при необходимости */}
      <MobileDrawer />
    </SocketProvider>
  );
}
