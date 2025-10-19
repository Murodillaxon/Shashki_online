const BOARD_SIZE = 8;

const initBoard = () => {
  const b = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { player: 2, isKing: false };
    }
  }
  for (let r = BOARD_SIZE - 3; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { player: 1, isKing: false };
    }
  }
  return b;
};

const cloneBoard = (board) => board.map(row => row.map(c => c ? { ...c } : null));

const getPossibleMoves = (board, row, col, piece) => {
  const moves = [], captures = [];
  const dirs = piece.isKing ? [[-1,-1],[-1,1],[1,-1],[1,1]] : (piece.player === 1 ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]]);
  dirs.forEach(([dr,dc]) => {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
      if (!board[nr][nc]) moves.push({ row: nr, col: nc, isCapture: false });
      else if (board[nr][nc].player !== piece.player) {
        const jr = nr + dr, jc = nc + dc;
        if (jr >= 0 && jr < BOARD_SIZE && jc >= 0 && jc < BOARD_SIZE && !board[jr][jc]) {
          captures.push({ row: jr, col: jc, isCapture: true, capturedRow: nr, capturedCol: nc });
        }
      }
    }
  });
  return captures.length ? captures : moves;
};

const getAllPossibleCaptures = (board, player) => {
  const caps = [];
  for (let r=0;r<BOARD_SIZE;r++) for (let c=0;c<BOARD_SIZE;c++){
    const p = board[r][c];
    if (p && p.player === player) {
      const m = getPossibleMoves(board, r, c, p);
      if (m.some(x => x.isCapture)) caps.push({ row: r, col: c });
    }
  }
  return caps;
};

const checkWinner = (board) => {
  let p1=0,p2=0,p1can=false,p2can=false;
  for (let r=0;r<BOARD_SIZE;r++) for (let c=0;c<BOARD_SIZE;c++){
    const p = board[r][c];
    if (p) {
      if (p.player===1) { p1++; if (getPossibleMoves(board,r,c,p).length>0) p1can=true; }
      else { p2++; if (getPossibleMoves(board,r,c,p).length>0) p2can=true; }
    }
  }
  if (p1===0 || !p1can) return 2;
  if (p2===0 || !p2can) return 1;
  return null;
};

const countPieces = (board) => {
  let p1=0,p2=0;
  for (let r=0;r<BOARD_SIZE;r++) for (let c=0;c<BOARD_SIZE;c++){
    const p = board[r][c];
    if (p) { if (p.player===1) p1++; else p2++; }
  }
  return { player1: p1, player2: p2 };
};

export { initBoard, cloneBoard, getPossibleMoves, getAllPossibleCaptures, checkWinner, countPieces };