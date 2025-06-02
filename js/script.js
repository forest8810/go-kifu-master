// Go Kifu Master - JavaScript (修正版)
class GoGame {
    constructor() {
        this.boardSize = 19;
        this.board = this.createEmptyBoard();
        this.currentPlayer = 1; // 1: 黒, 2: 白
        this.moveHistory = [];
        this.capturedStones = { black: 0, white: 0 };
        this.isPlaybackMode = false;
        this.playbackPosition = 0;
        this.autoPlayInterval = null;
        this.currentMoveNumber = 0;
        this.initBoard();
    }
    
    createEmptyBoard() {
        return Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
    }
    
    initBoard() {
        const boardGrid = document.getElementById('boardGrid');
        const goBoard = document.getElementById('goBoard');
        boardGrid.innerHTML = '';
        
        const cellSize = 420 / 18;
        
        // 横線 (19本)
        for (let i = 0; i < 19; i++) {
            const hLine = document.createElement('div');
            hLine.className = 'grid-line horizontal';
            hLine.style.top = (i * cellSize) + 'px';
            hLine.style.left = '0px';
            boardGrid.appendChild(hLine);
        }
        
        // 縦線 (19本)
        for (let i = 0; i < 19; i++) {
            const vLine = document.createElement('div');
            vLine.className = 'grid-line vertical';
            vLine.style.left = (i * cellSize) + 'px';
            vLine.style.top = '0px';
            boardGrid.appendChild(vLine);
        }
        
        // 星の位置
        const starPoints = [
            [3, 3], [3, 9], [3, 15],
            [9, 3], [9, 9], [9, 15],
            [15, 3], [15, 9], [15, 15]
        ];
        
        starPoints.forEach(([row, col]) => {
            const star = document.createElement('div');
            star.className = 'star-point';
            star.style.left = (col * cellSize) + 'px';
            star.style.top = (row * cellSize) + 'px';
            boardGrid.appendChild(star);
        });
        
        // 交点を作成
        for (let row = 0; row < 19; row++) {
            for (let col = 0; col < 19; col++) {
                const intersection = document.createElement('div');
                intersection.className = 'intersection';
                intersection.style.left = (col * cellSize) + 'px';
                intersection.style.top = (row * cellSize) + 'px';
                intersection.dataset.row = row;
                intersection.dataset.col = col;
                intersection.addEventListener('click', () => this.makeMove(row, col));
                intersection.addEventListener('mouseenter', () => {
                    if (this.board[row][col] === 0 && !this.isPlaybackMode) {
                        intersection.style.background = 'rgba(0,0,0,0.1)';
                    }
                });
                intersection.addEventListener('mouseleave', () => {
                    intersection.style.background = 'transparent';
                });
                boardGrid.appendChild(intersection);
            }
        }
        
        this.updateDisplay();
    }
    
    makeMove(row, col) {
        if (this.isPlaybackMode || this.board[row][col] !== 0) {
            return false;
        }
        
        // 石を配置する前の盤面をコピー
        const tempBoard = this.board.map(row => [...row]);
        tempBoard[row][col] = this.currentPlayer;
        
        // 相手の石を取る処理
        const capturedGroups = this.getCapturedGroups(tempBoard, row, col, this.currentPlayer);
        let totalCaptured = 0;
        
        // 実際に石を取る
        capturedGroups.forEach(group => {
            group.forEach(([r, c]) => {
                tempBoard[r][c] = 0;
                totalCaptured++;
            });
        });
        
        // 自殺手チェック
        const myGroup = this.getGroup(tempBoard, row, col);
        const hasLiberty = this.groupHasLiberty(tempBoard, myGroup);
        
        if (!hasLiberty && capturedGroups.length === 0) {
            alert('自殺手は打てません');
            return false;
        }
        
        // 盤面を更新
        this.board = tempBoard;
        this.currentMoveNumber++;
        
        // アゲハマを更新
        if (this.currentPlayer === 1) {
            this.capturedStones.black += totalCaptured;
        } else {
            this.capturedStones.white += totalCaptured;
        }
        
        // 手順を記録（簡略化バージョン）
        this.moveHistory.push({
            r: row, // rowを短縮
            c: col, // colを短縮
            p: this.currentPlayer, // playerを短縮
            n: this.currentMoveNumber, // moveNumberを短縮
            cap: totalCaptured // capturedを短縮
        });
        
        // プレイヤー交代
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateDisplay();
        return true;
    }
    
    getCapturedGroups(board, row, col, player) {
        const opponent = player === 1 ? 2 : 1;
        const directions = [[-1,0], [1,0], [0,-1], [0,1]];
        const capturedGroups = [];
        
        directions.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isValidPosition(newRow, newCol) && 
                board[newRow][newCol] === opponent) {
                
                const group = this.getGroup(board, newRow, newCol);
                if (!this.groupHasLiberty(board, group)) {
                    capturedGroups.push(group);
                }
            }
        });
        
        return capturedGroups;
    }
    
    getGroup(board, row, col) {
        const color = board[row][col];
        if (color === 0) return [];
        
        const group = [];
        const visited = new Set();
        const stack = [[row, col]];
        
        while (stack.length > 0) {
            const [r, c] = stack.pop();
            const key = `${r},${c}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            group.push([r, c]);
            
            const directions = [[-1,0], [1,0], [0,-1], [0,1]];
            directions.forEach(([dr, dc]) => {
                const newR = r + dr;
                const newC = c + dc;
                
                if (this.isValidPosition(newR, newC) && 
                    board[newR][newC] === color &&
                    !visited.has(`${newR},${newC}`)) {
                    stack.push([newR, newC]);
                }
            });
        }
        
        return group;
    }
    
    groupHasLiberty(board, group) {
        const directions = [[-1,0], [1,0], [0,-1], [0,1]];
        
        return group.some(([row, col]) => {
            return directions.some(([dr, dc]) => {
                const newRow = row + dr;
                const newCol = col + dc;
                return this.isValidPosition(newRow, newCol) && 
                       board[newRow][newCol] === 0;
            });
        });
    }
    
    isValidPosition(row, col) {
        return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
    }
    
    updateDisplay() {
        const intersections = document.querySelectorAll('.intersection');
        
        intersections.forEach((intersection) => {
            const row = parseInt(intersection.dataset.row);
            const col = parseInt(intersection.dataset.col);
            
            intersection.querySelectorAll('.stone').forEach(el => el.remove());
            
            if (this.board[row][col] !== 0) {
                const stone = document.createElement('div');
                stone.className = `stone ${this.board[row][col] === 1 ? 'black' : 'white'}`;
                intersection.appendChild(stone);
            }
        });
    }
    
    // 修正版：棋譜再生時の正確な盤面再構築
    updatePlaybackDisplay() {
        // 盤面を初期化
        this.board = this.createEmptyBoard();
        this.capturedStones = { black: 0, white: 0 };
        
        // 指定した手数まで再現
        for (let i = 0; i < this.playbackPosition; i++) {
            const move = this.moveHistory[i];
            if (move.r >= 0 && move.c >= 0) {
                // 石を配置
                const tempBoard = this.board.map(row => [...row]);
                tempBoard[move.r][move.c] = move.p;
                
                // 取りの処理を再現
                const capturedGroups = this.getCapturedGroups(tempBoard, move.r, move.c, move.p);
                capturedGroups.forEach(group => {
                    group.forEach(([r, c]) => {
                        tempBoard[r][c] = 0;
                    });
                });
                
                // アゲハマ更新
                if (move.p === 1) {
                    this.capturedStones.black += move.cap || 0;
                } else {
                    this.capturedStones.white += move.cap || 0;
                }
                
                this.board = tempBoard;
            }
        }
        
        this.updateDisplay();
    }
    
    undoMove() {
        if (this.moveHistory.length === 0 || this.isPlaybackMode) return;
        
        const lastMove = this.moveHistory.pop();
        this.currentMoveNumber--;
        
        // アゲハマを元に戻す
        if (lastMove.p === 1) {
            this.capturedStones.black -= lastMove.cap || 0;
        } else {
            this.capturedStones.white -= lastMove.cap || 0;
        }
        
        // 盤面を再構築
        this.reconstructBoard();
        this.updateDisplay();
    }
    
    reconstructBoard() {
        this.board = this.createEmptyBoard();
        this.capturedStones = { black: 0, white: 0 };
        
        // 全ての手を再現
        this.moveHistory.forEach(move => {
            if (move.r >= 0 && move.c >= 0) {
                const tempBoard = this.board.map(row => [...row]);
                tempBoard[move.r][move.c] = move.p;
                
                const capturedGroups = this.getCapturedGroups(tempBoard, move.r, move.c, move.p);
                capturedGroups.forEach(group => {
                    group.forEach(([r, c]) => {
                        tempBoard[r][c] = 0;
                    });
                });
                
                if (move.p === 1) {
                    this.capturedStones.black += move.cap || 0;
                } else {
                    this.capturedStones.white += move.cap || 0;
                }
                
                this.board = tempBoard;
            }
        });
        
        // 現在のプレイヤーを設定
        if (this.moveHistory.length > 0) {
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            this.currentPlayer = lastMove.p === 1 ? 2 : 1;
        } else {
            this.currentPlayer = 1;
        }
    }
    
    reset() {
        this.board = this.createEmptyBoard();
        this.currentPlayer = 1;
        this.moveHistory = [];
        this.capturedStones = { black: 0, white: 0 };
        this.currentMoveNumber = 0;
        this.isPlaybackMode = false;
        this.playbackPosition = 0;
        this.stopAutoPlay();
        this.updateDisplay();
    }
    
    playbackFirst() {
        if (this.moveHistory.length === 0) return;
        this.isPlaybackMode = true;
        this.playbackPosition = 0;
        this.updatePlaybackDisplay();
    }
    
    playbackPrev() {
        if (this.moveHistory.length === 0) return;
        this.isPlaybackMode = true;
        this.playbackPosition = Math.max(0, this.playbackPosition - 1);
        this.updatePlaybackDisplay();
    }
    
    playbackNext() {
        if (this.moveHistory.length === 0) return;
        this.isPlaybackMode = true;
        this.playbackPosition = Math.min(this.moveHistory.length, this.playbackPosition + 1);
        this.updatePlaybackDisplay();
    }
    
    playbackLast() {
        if (this.moveHistory.length === 0) return;
        this.isPlaybackMode = true;
        this.playbackPosition = this.moveHistory.length;
        this.updatePlaybackDisplay();
    }
    
    togglePlayback() {
        if (this.moveHistory.length === 0) {
            alert('再生する棋譜がありません');
            return;
        }
        
        if (!this.isPlaybackMode) {
            this.isPlaybackMode = true;
            this.playbackPosition = 0;
            this.updatePlaybackDisplay();
        }
        
        if (this.autoPlayInterval) {
            this.stopAutoPlay();
        } else {
            this.startAutoPlay();
        }
    }
    
    startAutoPlay() {
        this.autoPlayInterval = setInterval(() => {
            if (this.playbackPosition >= this.moveHistory.length) {
                this.stopAutoPlay();
                return;
            }
            this.playbackNext();
        }, 1000);
        
        const playButton = document.getElementById('playButton');
        playButton.querySelector('.icon').textContent = '⏸️';
        playButton.querySelector('.label').textContent = '停止';
        playButton.classList.add('active');
    }
    
    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
        const playButton = document.getElementById('playButton');
        playButton.querySelector('.icon').textContent = '▶️';
        playButton.querySelector('.label').textContent = '再生';
        playButton.classList.remove('active');
    }
    
    passMove() {
        if (this.isPlaybackMode) return;
        
        this.currentMoveNumber++;
        this.moveHistory.push({
            r: -1, c: -1,
            p: this.currentPlayer,
            n: this.currentMoveNumber,
            cap: 0
        });
        
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateDisplay();
        
        alert(`${this.currentPlayer === 1 ? '白' : '黒'}がパスしました`);
    }
    
    saveKifu() {
        if (this.moveHistory.length === 0) {
            alert('まだ手が打たれていません');
            return;
        }
        
        // 簡略化されたデータ
        const kifuData = JSON.stringify({
            s: this.boardSize, // sizeを短縮
            m: this.moveHistory, // movesを短縮
            t: Date.now() // timestampを短縮
        });
        
        localStorage.setItem('go_kifu_latest', kifuData);
        alert('棋譜を保存しました');
    }
    
    // 修正版：短いURL生成
    shareKifu() {
        if (this.moveHistory.length === 0) {
            alert('まだ手が打たれていません');
            return;
        }
        
        // 最小限のデータのみを含める
        const compactData = {
            s: this.boardSize,
            m: this.moveHistory.map(move => [move.r, move.c, move.p])
        };
        
        try {
            const compactString = JSON.stringify(compactData);
            const encodedKifu = btoa(compactString);
            
            // URL長さチェック
            const shareUrl = `${window.location.origin}${window.location.pathname}?k=${encodedKifu}`;
            
            if (shareUrl.length > 2000) {
                alert('棋譜が長すぎて共有URLを生成できません。手数を減らしてください。');
                return;
            }
            
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert('共有URLをクリップボードにコピーしました');
            }).catch(() => {
                prompt('この URL をコピーして共有してください:', shareUrl);
            });
            
        } catch (e) {
            alert('共有URL生成中にエラーが発生しました');
        }
    }
}

// Global game instance
let game = new GoGame();

// Event handlers
function changeBoardSize(size) {
    game.boardSize = size;
    game.reset();
    
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    game.initBoard();
}

function undoMove() {
    if (game.isPlaybackMode) {
        game.isPlaybackMode = false;
        game.stopAutoPlay();
        game.reconstructBoard();
        game.updateDisplay();
    } else {
        game.undoMove();
    }
}

function resetGame() {
    if (confirm('新しいゲームを開始しますか？現在の対局は失われます。')) {
        game.reset();
        alert('新しいゲームを開始しました');
    }
}

function passMove() {
    game.passMove();
}

function saveKifu() {
    game.saveKifu();
}

function shareKifu() {
    game.shareKifu();
}

function playbackFirst() {
    game.playbackFirst();
}

function playbackPrev() {
    game.playbackPrev();
}

function playbackNext() {
    game.playbackNext();
}

function playbackLast() {
    game.playbackLast();
}

function togglePlayback() {
    game.togglePlayback();
}

// Initialize on load
window.addEventListener('load', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const kifuParam = urlParams.get('k') || urlParams.get('kifu'); // 新旧両対応
    
    if (kifuParam) {
        try {
            const kifuString = atob(kifuParam);
            const kifu = JSON.parse(kifuString);
            
            game.reset();
            
            // 新形式の場合
            if (kifu.m && Array.isArray(kifu.m) && Array.isArray(kifu.m[0])) {
                game.boardSize = kifu.s || 19;
                game.moveHistory = kifu.m.map((move, index) => ({
                    r: move[0],
                    c: move[1], 
                    p: move[2],
                    n: index + 1,
                    cap: 0
                }));
            } 
            // 旧形式の場合
            else if (kifu.moves) {
                game.moveHistory = kifu.moves.map(move => ({
                    r: move.row || move.r,
                    c: move.col || move.c,
                    p: move.player || move.p,
                    n: move.moveNumber || move.n,
                    cap: move.captured || move.cap || 0
                }));
            }
            
            game.currentMoveNumber = game.moveHistory.length;
            game.reconstructBoard();
            game.updateDisplay();
            alert('共有された棋譜を読み込みました');
            
        } catch (e) {
            alert('棋譜の読み込みに失敗しました');
        }
    }
    
    // ローカルストレージからの読み込み
    const savedKifu = localStorage.getItem('go_kifu_latest');
    if (savedKifu && !kifuParam) {
        if (confirm('保存された棋譜がありますが、読み込みますか？')) {
            try {
                const kifu = JSON.parse(savedKifu);
                game.reset();
                
                if (kifu.m) {
                    game.boardSize = kifu.s || 19;
                    game.moveHistory = kifu.m;
                } else if (kifu.moves) {
                    game.moveHistory = kifu.moves.map(move => ({
                        r: move.row || move.r,
                        c: move.col || move.c,
                        p: move.player || move.p,
                        n: move.moveNumber || move.n,
                        cap: move.captured || move.cap || 0
                    }));
                }
                
                game.currentMoveNumber = game.moveHistory.length;
                game.reconstructBoard();
                game.updateDisplay();
                
            } catch (e) {
                console.error('Error loading saved kifu:', e);
            }
        }
    }
});
