// экспортируем все функции игрового ядра (взято из вашего App.jsx)
export const BOARD_SIZE = 8;

export const initBoard = () => {
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

export const cloneBoard = (board) => board.map(row => row.map(cell => cell ? { ...cell } : null));

/* вставьте сюда реализацию getPossibleMoves, getAllPossibleCaptures,
   findNormalCaptureSequences, findKingCaptureSequences, getAllCaptureSequencesForPiece,
   checkWinner, countPieces — скопируйте их из вашего App.jsx (они одинаковые) */

export const getPossibleMoves = (board, row, col, piece) => {
  const moves = [];
  const captures = [];

  if (piece.isKing) {
    const directions = [[-1,-1],[-1,1],[1,-1],[1,1]];
    directions.forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;
      let sawEnemy = false;
      let enemyPos = null;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        const cell = board[r][c];
        if (!cell) {
          if (!sawEnemy) moves.push({ row: r, col: c, isCapture: false });
          else captures.push({ row: r, col: c, isCapture: true, capturedRow: enemyPos.row, capturedCol: enemyPos.col });
          r += dr; c += dc;
          continue;
        }
        if (cell.player === piece.player) break;
        if (cell.player !== piece.player) {
          if (sawEnemy) break;
          sawEnemy = true;
          enemyPos = { row: r, col: c };
          r += dr; c += dc;
          continue;
        }
      }
    });
    return captures.length > 0 ? captures : moves;
  }

  const forwardDirs = piece.player === 1 ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
  forwardDirs.forEach(([dr, dc]) => {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && !board[nr][nc]) {
      moves.push({ row: nr, col: nc, isCapture: false });
    }
  });

  const allDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
  allDirs.forEach(([dr, dc]) => {
    const nr = row + dr, nc = col + dc, jr = row + 2*dr, jc = col + 2*dc;
    if (
      nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE &&
      jr >= 0 && jr < BOARD_SIZE && jc >= 0 && jc < BOARD_SIZE
    ) {
      const mid = board[nr][nc];
      if (mid && mid.player !== piece.player && !board[jr][jc]) {
        captures.push({ row: jr, col: jc, isCapture: true, capturedRow: nr, capturedCol: nc });
      }
    }
  });

  return captures.length > 0 ? captures : moves;
};

export const getAllPossibleCaptures = (board, player) => {
  const captures = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece && piece.player === player) {
        const moves = getPossibleMoves(board, r, c, piece);
        if (moves.some(m => m.isCapture)) captures.push({ row: r, col: c });
      }
    }
  }
  return captures;
};

const findNormalCaptureSequences = (board, row, col, player) => {
  const sequences = [];
  const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];

  const dfs = (b, r, c, path) => {
    let found = false;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc, jr = r + 2*dr, jc = c + 2*dc;
      if (
        nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE &&
        jr >= 0 && jr < BOARD_SIZE && jc >= 0 && jc < BOARD_SIZE
      ) {
        const mid = b[nr][nc];
        if (mid && mid.player !== player && !b[jr][jc]) {
          const nb = b.map(row => row.map(cell => cell ? { ...cell } : null));
          nb[nr][nc] = null;
          nb[jr][jc] = nb[r][c];
          nb[r][c] = null;
          const move = { row: jr, col: jc, isCapture: true, capturedRow: nr, capturedCol: nc };
          found = true;
          dfs(nb, jr, jc, path.concat([move]));
        }
      }
    }
    if (!found && path.length > 0) sequences.push(path);
  };

  dfs(board, row, col, []);
  return sequences;
};

const findKingCaptureSequences = (board, row, col, player) => {
  const sequences = [];
  const directions = [[-1,-1],[-1,1],[1,-1],[1,1]];

  const dfs = (b, r, c, path) => {
    let found = false;
    for (const [dr, dc] of directions) {
      let rr = r + dr, cc = c + dc;
      let sawEnemy = false;
      let enemyPos = null;
      while (rr >= 0 && rr < BOARD_SIZE && cc >= 0 && cc < BOARD_SIZE) {
        const cell = b[rr][cc];
        if (!cell) {
          if (!sawEnemy) { rr += dr; cc += dc; continue; }
          const nr = rr, nc = cc;
          const nb = b.map(row => row.map(cell => cell ? { ...cell } : null));
          nb[enemyPos.row][enemyPos.col] = null;
          nb[nr][nc] = nb[r][c];
          nb[r][c] = null;
          const move = { row: nr, col: nc, isCapture: true, capturedRow: enemyPos.row, capturedCol: enemyPos.col };
          found = true;
          dfs(nb, nr, nc, path.concat([move]));
          rr += dr; cc += dc;
          continue;
        }
        if (cell.player === player) break;
        if (cell.player !== player) {
          if (sawEnemy) break;
          sawEnemy = true;
          enemyPos = { row: rr, col: cc };
          rr += dr; cc += dc;
          continue;
        }
      }
    }
    if (!found && path.length > 0) sequences.push(path);
  };

  dfs(board, row, col, []);
  return sequences;
};

export const getAllCaptureSequencesForPiece = (board, row, col) => {
  const piece = board[row][col];
  if (!piece) return [];
  if (piece.isKing) return findKingCaptureSequences(board, row, col, piece.player);
  return findNormalCaptureSequences(board, row, col, piece.player);
};

export const checkWinner = (board) => {
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

export const countPieces = (board) => {
  let p1=0,p2=0;
  for (let r=0;r<BOARD_SIZE;r++) for (let c=0;c<BOARD_SIZE;c++){
    const p = board[r][c];
    if (p) { if (p.player===1) p1++; else p2++; }
  }
  return { player1: p1, player2: p2 };
};
