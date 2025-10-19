// client/src/pages/GamePage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Card, Row, Col, Space, Button, Typography, message, Modal, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext'; // подставьте ваш контекст
import {
  initBoard,
  cloneBoard,
  getPossibleMoves,
  getAllPossibleCaptures,
  getAllCaptureSequencesForPiece,
  checkWinner,
  countPieces
} from '../utils/board'; // подставьте путь к вашим утилитам

const { Text } = Typography;

// helper: generate short id
const makeId = () => Math.random().toString(36).slice(2,9);

// сохранить краткую историю
const addHistoryRecord = (rec) => {
  try {
    const key = 'checkers_history';
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(rec);
    localStorage.setItem(key, JSON.stringify(arr.slice(0, 50)));
  } catch (e) {
    console.warn('history save failed', e);
  }
};

export default function GamePage() {
  const navigate = useNavigate();
  const { socket, currentLobby, makeMove, leaveLobby, requestLobbies, setCurrentLobby } = useSocket();
  const nickname = localStorage.getItem('checkers_nickname') || 'Игрок';

  // game state
  const [board, setBoard] = useState(initBoard());
  const [selected, setSelected] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [myPlayer, setMyPlayer] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [waitingForPlayer, setWaitingForPlayer] = useState(false);
  const [winner, setWinner] = useState(null);

  // rematch state (client-only)
  const [rematchPending, setRematchPending] = useState(false);
  const rematchRequestIdRef = useRef(null);
  const rematchTimeoutRef = useRef(null);
  const REMATCH_TIMEOUT_MS = 30 * 1000;

  // info modal for leave/lobby-not-found/finished
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalText, setInfoModalText] = useState('');
  const autoCloseRef = useRef(null);

  // sync lobby -> ui
  useEffect(() => {
    if (!currentLobby) return;
    setWaitingForPlayer(currentLobby.players.length < 2);
    const other = currentLobby.players.find(p => p.id !== socket?.id);
    setOpponent(other || null);
    const me = currentLobby.players.find(p => p.id === socket?.id);
    if (me) {
      const role = currentLobby.players[0]?.id === me.id ? 1 : 2;
      setMyPlayer(role);
    } else setMyPlayer(null);
    const gs = currentLobby.gameState;
    if (gs && gs.board) {
      // server may store board; but we prefer client-side init if null
      setBoard(gs.board);
      if (typeof gs.turn !== 'undefined') setCurrentTurn(gs.turn);
    }
  }, [currentLobby, socket]);

  // utils
  const applySingleMove = (boardState, fromRow, fromCol, move) => {
    const b = cloneBoard(boardState);
    const movingPiece = b[fromRow][fromCol];
    b[move.row][move.col] = movingPiece;
    b[fromRow][fromCol] = null;
    if (move.isCapture && move.capturedRow != null) b[move.capturedRow][move.capturedCol] = null;
    // promotion
    if (!b[move.row][move.col].isKing) {
      if ((b[move.row][move.col].player === 1 && move.row === 0) ||
          (b[move.row][move.col].player === 2 && move.row === (board.length - 1))) {
        b[move.row][move.col].isKing = true;
      }
    }
    return b;
  };

  const chooseBestSequence = (sequences) => {
    if (!sequences || sequences.length === 0) return null;
    sequences.sort((a,b) => b.length - a.length);
    return sequences[0];
  };

  // show info modal and redirect after 1.7s (or by OK)
  const showInfoModalAndRedirect = (text, reason = 'info', winnerId = null) => {
    try {
      addHistoryRecord({
        at: new Date().toISOString(),
        lobbyName: currentLobby?.name || '—',
        opponent: opponent?.name || '—',
        reason,
        winner: winnerId
      });
    } catch (e) {}

    setInfoModalText(text);
    setInfoModalVisible(true);

    if (autoCloseRef.current) { clearTimeout(autoCloseRef.current); autoCloseRef.current = null; }
    autoCloseRef.current = setTimeout(() => {
      setInfoModalVisible(false);
      try { setCurrentLobby(null); } catch (e) {}
      if (typeof requestLobbies === 'function') requestLobbies();
      navigate('/');
    }, 1700);
  };

  // handle cell tap/click with chain captures
  const handleCellTap = (row, col) => {
    if (winner || currentTurn !== myPlayer || waitingForPlayer) return;
    const piece = board[row][col];

    if (selected) {
      const move = possibleMoves.find(m => m.row === row && m.col === col);
      if (!move) {
        if (piece && piece.player === myPlayer) {
          setSelected({ row, col });
          const moves = getPossibleMoves(board, row, col, piece);
          const forced = getAllPossibleCaptures(board, myPlayer);
          if (forced.length > 0) {
            const must = forced.some(c => c.row === row && c.col === col);
            setPossibleMoves(must ? moves : []);
          } else setPossibleMoves(moves);
        } else {
          setSelected(null);
          setPossibleMoves([]);
        }
        return;
      }

      // capture -> apply chain automatically (choose longest continuation every step)
      if (move.isCapture) {
        let b = applySingleMove(board, selected.row, selected.col, move);
        let sequences = getAllCaptureSequencesForPiece(b, move.row, move.col);

        while (sequences.length > 0) {
          const best = chooseBestSequence(sequences);
          if (!best || best.length === 0) break;
          const nextMove = best[0];
          b = applySingleMove(b, move.row, move.col, nextMove);
          // update move current position
          move.row = nextMove.row;
          move.col = nextMove.col;
          move.capturedRow = nextMove.capturedRow;
          move.capturedCol = nextMove.capturedCol;
          sequences = getAllCaptureSequencesForPiece(b, move.row, move.col);
        }

        const gWinner = checkWinner(b);
        const nextTurn = currentTurn === 1 ? 2 : 1;

        setBoard(b);
        setSelected(null);
        setPossibleMoves([]);
        setCurrentTurn(nextTurn);

        // emit to server
        if (makeMove && currentLobby) {
          makeMove({ lobbyId: currentLobby.id, board: b, turn: nextTurn, winner: gWinner });
        } else if (socket && currentLobby) {
          socket.emit('make_move', { lobbyId: currentLobby.id, board: b, turn: nextTurn, winner: gWinner });
        }

        if (gWinner) {
          setWinner(gWinner);
          showInfoModalAndRedirect(`Игра окончена. Победитель: ${gWinner}`, 'finished', gWinner);
        }
        return;
      }

      // normal move
      const newBoard = applySingleMove(board, selected.row, selected.col, move);
      const gWinner = checkWinner(newBoard);
      const nextTurn = currentTurn === 1 ? 2 : 1;
      setBoard(newBoard);
      setSelected(null);
      setPossibleMoves([]);
      setCurrentTurn(nextTurn);

      if (makeMove && currentLobby) {
        makeMove({ lobbyId: currentLobby.id, board: newBoard, turn: nextTurn, winner: gWinner });
      } else if (socket && currentLobby) {
        socket.emit('make_move', { lobbyId: currentLobby.id, board: newBoard, turn: nextTurn, winner: gWinner });
      }

      if (gWinner) {
        setWinner(gWinner);
        showInfoModalAndRedirect(`Игра окончена. Победитель: ${gWinner}`, 'finished', gWinner);
      }
      return;
    }

    // select own piece
    if (piece && piece.player === myPlayer) {
      setSelected({ row, col });
      const moves = getPossibleMoves(board, row, col, piece);
      const forced = getAllPossibleCaptures(board, myPlayer);
      if (forced.length > 0) {
        const must = forced.some(c => c.row === row && c.col === col);
        setPossibleMoves(must ? moves : []);
      } else setPossibleMoves(moves);
    }
  };

  // ------------------------------- REMATCH (client-only, embed into board objects) -------------------------------
  // We will attach small control object into one of our pieces:
  // piece.__rematch = { id, action: 'request'|'response', from, accept? }
  // Server will relay board; other client will detect and react.

  const findFirstOwnPiece = (b, player) => {
    for (let r = 0; r < b.length; r++) {
      for (let c = 0; c < b[r].length; c++) {
        const p = b[r][c];
        if (p && p.player === player) return { r, c };
      }
    }
    return null;
  };

  const sendBoardWithRematchMarker = (markerObj) => {
    if (!currentLobby) { message.error('Нет текущего лобби'); return; }
    const b = cloneBoard(board);
    const pos = findFirstOwnPiece(b, myPlayer);
    if (!pos) {
      message.error('Не найдено вашей шашки для вложения сигнала');
      return;
    }
    // attach marker to that piece (do not change player/isKing)
    b[pos.r][pos.c] = { ...b[pos.r][pos.c], __rematch: markerObj };
    // send via existing makeMove/socket
    if (makeMove) {
      makeMove({ lobbyId: currentLobby.id, board: b, turn: currentTurn, winner: null });
    } else if (socket) {
      socket.emit('make_move', { lobbyId: currentLobby.id, board: b, turn: currentTurn, winner: null });
    }
  };

  // request rematch (initiator)
  const requestRematch = () => {
    if (!socket || !currentLobby) { message.error('Нет соединения / лобби'); return; }
    if (rematchPending) { message.info('Запрос уже отправлен'); return; }
    const id = makeId();
    rematchRequestIdRef.current = id;
    setRematchPending(true);
    // attach marker and send
    sendBoardWithRematchMarker({ id, action: 'request', from: nickname });
    // start timeout
    if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
    rematchTimeoutRef.current = setTimeout(() => {
      if (rematchRequestIdRef.current === id) {
        rematchRequestIdRef.current = null;
        setRematchPending(false);
        message.info('Нет ответа на запрос реванша (таймаут)');
      }
    }, REMATCH_TIMEOUT_MS);
  };

  // respond rematch (accept true/false)
  const respondRematch = (id, accept) => {
    // attach response marker
    sendBoardWithRematchMarker({ id, action: 'response', from: nickname, accept: !!accept });
  };

  // scan board for __rematch markers
  const extractRematchFromBoard = (b) => {
    for (let r = 0; r < b.length; r++) {
      for (let c = 0; c < b[r].length; c++) {
        const cell = b[r][c];
        if (cell && cell.__rematch) return { marker: cell.__rematch, r, c };
      }
    }
    return null;
  };

  // apply board but strip __rematch markers for UI (so marker doesn't persist locally)
  const stripRematchFromBoard = (b) => {
    const nb = cloneBoard(b);
    for (let r = 0; r < nb.length; r++) for (let c = 0; c < nb[r].length; c++) {
      const cell = nb[r][c];
      if (cell && cell.__rematch) {
        // remove marker prop
        const { __rematch, ...rest } = cell;
        nb[r][c] = Object.keys(rest).length ? rest : null;
      }
    }
    return nb;
  };

  // socket listeners: move_accepted, player_left, error
  useEffect(() => {
    if (!socket) return;

    const onMoveAccepted = (data) => {
      // scan incoming board for rematch marker
      if (data && data.board) {
        const markerInfo = extractRematchFromBoard(data.board);
        if (markerInfo) {
          const { marker } = markerInfo;
          // if it's a request from opponent
          if (marker.action === 'request') {
            // ignore our own requests (we initiated)
            if (marker.from === nickname) {
              // it's our own request echoed back — server broadcasted it to everyone including us; ignore
            } else {
              // show confirm
              Modal.confirm({
                title: 'Запрос на реванш',
                content: `${marker.from || 'Противник'} предлагает реванш. Принять?`,
                okText: 'Принять',
                cancelText: 'Отклонить',
                onOk: () => {
                  respondRematch(marker.id, true);
                  message.success('Вы приняли реванш');
                },
                onCancel: () => {
                  respondRematch(marker.id, false);
                  message.info('Вы отклонили реванш');
                },
                centered: true,
                closable: false
              });
            }
            // strip marker and update board for UI (do not toggle turn)
            const nb = stripRematchFromBoard(data.board);
            setBoard(nb);
            if (typeof data.turn !== 'undefined') setCurrentTurn(data.turn);
            return;
          }

          // if it's a response
          if (marker.action === 'response') {
            // if we are initiator and ids match
            if (rematchRequestIdRef.current && marker.id === rematchRequestIdRef.current) {
              // clear timeout
              if (rematchTimeoutRef.current) { clearTimeout(rematchTimeoutRef.current); rematchTimeoutRef.current = null; }
              rematchRequestIdRef.current = null;
              setRematchPending(false);

              if (marker.accept) {
                // opponent accepted -> start new game
                setBoard(initBoard());
                setSelected(null);
                setPossibleMoves([]);
                setWinner(null);
                setCurrentTurn(1);
                addHistoryRecord({
                  at: new Date().toISOString(),
                  lobbyName: currentLobby?.name || '—',
                  opponent: opponent?.name || '—',
                  reason: 'rematch_started',
                  winner: null
                });
                message.success('Реванш принят — новая партия началась');
              } else {
                message.info('Реванш отклонён');
              }
            } else {
              // maybe other response not for us — ignore
            }
            const nb = stripRematchFromBoard(data.board);
            setBoard(nb);
            if (typeof data.turn !== 'undefined') setCurrentTurn(data.turn);
            return;
          }
        }
      }

      // otherwise normal move payload
      if (data.board) setBoard(data.board);
      if (typeof data.turn !== 'undefined') setCurrentTurn(data.turn);
      setSelected(null);
      setPossibleMoves([]);
      if (data.winner) {
        setWinner(data.winner);
        addHistoryRecord({
          at: new Date().toISOString(),
          lobbyName: currentLobby?.name || '—',
          opponent: opponent?.name || '—',
          reason: 'finished',
          winner: data.winner
        });
        showInfoModalAndRedirect(`Игра окончена. Победитель: ${data.winner}`, 'finished', data.winner);
      }
    };

    const onPlayerLeft = () => {
      message.warning('Противник покинул игру');
      showInfoModalAndRedirect('Противник покинул игру', 'opponent_left', null);
    };

    const onError = (err) => {
      const msg = err?.message || (typeof err === 'string' ? err : '');
      if (msg && (msg.toLowerCase().includes('лобби не найден') || msg.toLowerCase().includes('not found'))) {
        showInfoModalAndRedirect('Лобби не найдено', 'lobby_not_found', null);
      } else if (msg) {
        message.error(msg);
      }
    };

    socket.on('move_accepted', onMoveAccepted);
    socket.on('player_left', onPlayerLeft);
    socket.on('error', onError);

    return () => {
      socket.off('move_accepted', onMoveAccepted);
      socket.off('player_left', onPlayerLeft);
      socket.off('error', onError);
    };
  }, [socket, rematchRequestIdRef.current, currentLobby, opponent, makeMove, nickname]);

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, []);

  // UI handlers
  const handleRematchButton = () => requestRematch();

  const handleLeave = () => {
    if (leaveLobby && currentLobby) leaveLobby({ lobbyId: currentLobby.id });
    try { setCurrentLobby(null); } catch (e) {}
    if (typeof requestLobbies === 'function') requestLobbies();
    navigate('/');
  };

  // if lobby null show waiting
  if (!currentLobby) {
    return (
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>Ожидание создания/подтверждения лобби...</Text>
          <Spin />
          <div style={{ marginTop: 12 }}>
            <Button onClick={() => navigate('/')}>Назад в меню</Button>
          </div>
        </Space>
      </Card>
    );
  }

  const pieces = countPieces(board);

  return (
    <>
      <Card
        title={<Space><Text strong>{currentLobby?.name || 'Игра'}</Text> {waitingForPlayer && <Text type="secondary"> — Ожидание игрока...</Text>}</Space>}
        extra={<Space>
          <Button danger onClick={handleLeave}>Покинуть</Button>
        </Space>}
      >
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Card size="small">
              <Space direction="vertical">
                <div><Text type="secondary">Вы</Text><br/><Text strong>{nickname}</Text></div>
                <div><Text type="secondary">Противник</Text><br/><Text strong>{opponent?.name || '—'}</Text></div>
                <div><Text type="secondary">Ваш цвет</Text><br/><Text strong>{myPlayer === 1 ? 'Белые' : myPlayer === 2 ? 'Чёрные' : '—'}</Text></div>
                <div><Text type="secondary">Ход</Text><br/><Text strong>{currentTurn === myPlayer ? 'Ваш ход' : 'Ход противника'}</Text></div>
                <div><Text type="secondary">Шашек</Text><br/><Text strong>{`Вы: ${myPlayer === 1 ? pieces.player1 : pieces.player2} — Оппонент: ${myPlayer === 1 ? pieces.player2 : pieces.player1}`}</Text></div>
                {winner && <div style={{ marginTop: 8 }}><Text strong>{winner === myPlayer ? 'Вы победили!' : 'Вы проиграли'}</Text></div>}
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={16}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 48 * board.length,
                height: 48 * board.length,
                border: '4px solid #d9ad6a',
                boxSizing: 'content-box',
                userSelect: 'none',
                touchAction: 'manipulation',
              }}>
                {board.map((rowArr, r) => (
                  <div key={r} style={{ display: 'flex' }}>
                    {rowArr.map((cell, c) => {
                      const isBlack = (r + c) % 2 === 1;
                      const isSelected = selected && selected.row === r && selected.col === c;
                      const isPossible = possibleMoves.some(m => m.row === r && m.col === c);
                      return (
                        <div
                          key={c}
                          onClick={() => handleCellTap(r, c)}
                          onTouchStart={() => handleCellTap(r, c)}
                          style={{
                            width: 48,
                            height: 48,
                            background: isBlack ? '#7a4b10' : '#f4e9d8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            border: isSelected ? '3px solid #f6e05e' : isPossible ? '3px solid #52c41a' : '1px solid rgba(0,0,0,0.03)'
                          }}
                        >
                          {cell && (
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: 999,
                              background: cell.player === 1 ? '#fff' : '#111',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                            }}>
                              {cell.isKing && <span style={{ color: cell.player === 1 ? '#d4af37' : '#ffd966', fontSize: 16 }}>♛</span>}
                            </div>
                          )}
                          {isPossible && !cell && <div style={{ width: 8, height: 8, borderRadius: 999, background:'#52c41a' }} />}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Modal
        title="Информация"
        visible={infoModalVisible}
        onOk={() => {
          if (autoCloseRef.current) { clearTimeout(autoCloseRef.current); autoCloseRef.current = null; }
          setInfoModalVisible(false);
          try { setCurrentLobby(null); } catch (e) {}
          if (typeof requestLobbies === 'function') requestLobbies();
          navigate('/');
        }}
        onCancel={() => {
          if (autoCloseRef.current) { clearTimeout(autoCloseRef.current); autoCloseRef.current = null; }
          setInfoModalVisible(false);
          try { setCurrentLobby(null); } catch (e) {}
          if (typeof requestLobbies === 'function') requestLobbies();
          navigate('/');
        }}
        okText="ОК"
        cancelText="Отмена"
        closable={false}
      >
        <p>{infoModalText}</p>
      </Modal>
    </>
  );
}
