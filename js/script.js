// Go Kifu Master - JavaScript

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
    
    changeBoardSize(size) {
        this.boardSize = size;
        this.board = this.createEmptyBoard();
        this.currentPlayer = 1;
        this.moveHistory = [];
        this.capturedStones = { black: 0, white: 0 };
        this.currentMoveNumber = 0;
        this.isPlaybackMode = false;
        this.playbackPosition = 0;
        this.stopAutoPlay();
        
        // Update active button
        document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        this.initBoard();
    }
    
    initBoard() {
        const boardGrid = document.getElementById('boardGrid');
        const goBoard = document.getElementById('goBoard');
        boardGrid.innerHTML = '';
        
        const cellSize = 420 / 18; // 18区間で19本の線
        
        // Set board dimensions
        goBoard.style.width = '480px';
        goBoard.style.height = '480px';
        
        boardGrid.style.top = '30px';
        boardGrid.style.left = '30px';
        boardGrid.style.width = '420px';
        boardGrid.style.height = '420px';
        
        // Draw grid lines (19x19の碁盤)
        // 横線 (19本)
        for (let i = 0; i < 19; i++) {
            const hLine = document.createElement('div');
            hLine.className = 'grid-line horizontal';
            hLine.style.top = (i * cellSize) + 'px';
            hLine.style.left = '0px';
            hLine.style.width = '420px';
            hLine.style.height = '1px';
            boardGrid.appendChild(hLine);
        }
        
        // 縦線 (19本)
        for (let i = 0; i < 19; i++) {
            const vLine = document.createElement('div');
            vLine.className = 'grid-line vertical';
            vLine.style.left = (i * cellSize) + 'px';
            vLine.style.top = '0px';
            vLine.style.width = '1px';
            vLine.style.height = '420px';
            boardGrid.appendChild(vLine);
        }
        
        // 星の位置 (19路盤の標準的な星の位置)
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
            star.style.position = 'absolute';
            star.style.width = '6px';
            star.style.height = '6px';
            star.style.background = '#000';
            star.style.borderRadius = '50%';
            star.style.transform = 'translate(-50%, -50%)';
            boardGrid.appendChild(star);
        });
        
        // 交点を作成 (19x19 = 361個)
        for (let row = 0; row < 19; row++) {
            for (let col = 0; col < 19; col++) {
                const intersection = document.createElement('div');
                intersection.className = 'intersection';
                intersection.style.position = 'absolute';
                intersection.style.left = (col * cellSize) + 'px';
                intersection.style.top = (row * cellSize) + 'px';
                intersection.style.width = '26px';
                intersection.style.height = '26px';
                intersection.style.transform = 'translate(-50%, -50%)';
                intersection.style.cursor = 'pointer';
                intersection.style.borderRadius = '50%';
                intersection.style.transition = 'background 0.2s ease';
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
        
        // Check for suicide move
        const tempBoard = this.board.map(row => [...row]);
        tempBoard[row][col] = this.currentPlayer;
        
        // Capture opponent stones
        const capturedGroups = this.getCapturedGroups(tempBoard, row, col, this.currentPlayer);
        
        // Check if own group has liberties
        const myGroup = this.getGroup(tempBoard, row, col);
        const hasLiberty = this.groupHasLiberty(tempBoard, myGroup);
        
        if (!hasLiberty && capturedGroups.length === 0) {
            showModal('無効な手', '自殺手は打てません');
            return false;
        }
        
        // Place stone
        this.board[row][col] = this.currentPlayer;
        this.currentMoveNumber++;
        
        // Capture stones
        let totalCaptured = 0;
        capturedGroups.forEach(group => {
            group.forEach(([r, c]) => {
                this.board[r][c] = 0;
                totalCaptured++;
            });
        });
        
        // Update captured count
        if (this.currentPlayer === 1) {
            this.capturedStones.black += totalCaptured;
        } else {
            this.capturedStones.white += totalCaptured;
        }
        
        // Add to history
        this.moveHistory.push({
            row, col, 
            player: this.currentPlayer,
            moveNumber: this.currentMoveNumber,
            captured: totalCaptured,
            boardState: JSON.parse(JSON.stringify(this.board))
        });
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        this.updateDisplay();
        this.updateMovesList();
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
        // Update stones on board
        const intersections = document.querySelectorAll('.intersection');
        
        intersections.forEach((intersection) => {
            const row = parseInt(intersection.dataset.row);
            const col = parseInt(intersection.dataset.col);
            
            // Remove existing stones and numbers
            intersection.querySelectorAll('.stone, .move-number').forEach(el => el.remove());
            
            if (this.board[row][col] !== 0) {
                // Create stone
                const stone = document.createElement('div');
                stone.className = `stone ${this.board[row][col] === 1 ? 'black' : 'white'}`;
                intersection.appendChild(stone);
                
                // Show move numbers for recent moves
                const move = this.moveHistory.find(m => m.row === row && m.col === col);
                if (move && this.currentMoveNumber - move.moveNumber < 10) {
                    const moveNum = document.createElement('div');
                    moveNum.className = `move-number ${this.board[row][col] === 1 ? 'on-black' : 'on-white'}`;
                    moveNum.textContent = move.moveNumber;
                    intersection.appendChild(moveNum);
                }
            }
        });
        
        // Update turn indicator
        const turnStone = document.querySelector('.turn-stone');
        const turnText = document.querySelector('.turn-text');
        
        if (this.isPlaybackMode) {
            turnText.textContent = '棋譜再生モード';
            turnStone.className = 'turn-stone';
            turnStone.style.background = '#95a5a6';
        } else {
            turnStone.className = `turn-stone ${this.currentPlayer === 1 ? 'black' : 'white'}`;
            turnText.textContent = `${this.currentPlayer === 1 ? '黒' : '白'}番のターン`;
        }
        
        // Update stats
        document.getElementById('moveCount').textContent = this.moveHistory.length;
        document.getElementById('capturedByBlack').textContent = this.capturedStones.black;
        document.getElementById('capturedByWhite').textContent = this.capturedStones.white;
        document.getElementById('playbackInfo').textContent = `${this.playbackPosition}/${this.moveHistory.length}`;
    }
    
    updateMovesList() {
        const movesTimeline = document.getElementById('movesTimeline');
        movesTimeline.innerHTML = '';
        
        this.moveHistory.forEach((move, index) => {
            const moveRow = document.createElement('div');
            moveRow.className = 'move-row';
            
            // Move number
            const moveNumber = document.createElement('div');
            moveNumber.className = 'move-number-display';
            moveNumber.textContent = move.moveNumber;
            
            // Stone display
            const stoneDisplay = document.createElement('div');
            stoneDisplay.className = `move-stone-display ${move.player === 1 ? 'black' : 'white'}`;
            
            // Coordinate display
            const coordinate = document.createElement('div');
            coordinate.className = 'move-coordinate';
            
            if (move.row === -1) {
                coordinate.textContent = 'パス';
                coordinate.classList.add('pass');
            } else {
                const colLetter = String.fromCharCode(65 + move.col + (move.col >= 8 ? 1 : 0));
                coordinate.textContent = `${colLetter}${this.boardSize - move.row}`;
            }
            
            moveRow.appendChild(moveNumber);
            moveRow.appendChild(stoneDisplay);
            moveRow.appendChild(coordinate);
            
            // Click handler to jump to this move
            moveRow.addEventListener('click', () => this.jumpToMove(index + 1));
            
            // Highlight current move in playback mode
            if (this.isPlaybackMode && index === this.playbackPosition - 1) {
                moveRow.classList.add('current');
                // Scroll into view
                setTimeout(() => {
                    moveRow.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest' 
                    });
                }, 100);
            }
            
            movesTimeline.appendChild(moveRow);
        });
        
        // Auto-scroll to bottom if not in playback mode
        if (!this.isPlaybackMode && this.moveHistory.length > 0) {
            setTimeout(() => {
                movesTimeline.scrollTop = movesTimeline.scrollHeight;
            }, 100);
        }
    }
    
    jumpToMove(moveNumber) {
        if (moveNumber < 0 || moveNumber > this.moveHistory.length) return;
        
        this.isPlaybackMode = true;
        this.playbackPosition = moveNumber;
        this.updatePlaybackDisplay();
        this.updateMovesList();
    }
    
    updatePlaybackDisplay() {
        // Recreate board state up to playback position
        this.board = this.createEmptyBoard();
        
        for (let i = 0; i < this.playbackPosition; i++) {
            const move = this.moveHistory[i];
            if (move.row >= 0 && move.col >= 0) {
                this.board[move.row][move.col] = move.player;
            }
        }
        
        this.updateDisplay();
    }
    
    // Control methods
    undoMove() {
        if (this.moveHistory.length === 0 || this.isPlaybackMode) return;
        
        const lastMove = this.moveHistory.pop();
        this.currentMoveNumber--;
        
        // Restore captured count
        if (lastMove.player === 1) {
            this.capturedStones.black -= lastMove.captured;
        } else {
            this.capturedStones.white -= lastMove.captured;
        }
        
        if (this.moveHistory.length === 0) {
            this.board = this.createEmptyBoard();
            this.currentPlayer = 1;
        } else {
            const prevMove = this.moveHistory[this.moveHistory.length - 1];
            this.board = JSON.parse(JSON.stringify(prevMove.boardState));
            this.currentPlayer = lastMove.player;
        }
        
        this.updateDisplay();
        this.updateMovesList();
    }
    
    passMove() {
        if (this.isPlaybackMode) return;
        
        this.currentMoveNumber++;
        this.moveHistory.push({
            row: -1, col: -1,
            player: this.currentPlayer,
            moveNumber: this.currentMoveNumber,
            captured: 0,
            boardState: JSON.parse(JSON.stringify(this.board))
        });
        
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateDisplay();
        this.updateMovesList();
        
        showModal('パス', `${this.currentPlayer === 1 ? '白' : '黒'}がパスしました`);
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
        this.updateMovesList();
        document.getElementById('shareSection').style.display = 'none';
    }
    
    // Playback controls
    playbackFirst() {
        if (this.moveHistory.length === 0) return;
        this.isPlaybackMode = true;
        this.playbackPosition = 0;
        this.updatePlaybackDisplay();
        this.updateMovesList();
    }
    
    playbackPrev() {
        if (this.moveHistory.length === 0) return;
        this.isPlaybackMode = true;
        this.playbackPosition = Math.max(0, this.playbackPosition - 1);
        this.updatePlaybackDisplay();
        this.updateMovesList();
    }
    
    playbackNext() {
        if (this.moveHistory.length === 0) return;
        this.isPlaybackMode = true;
        this.playbackPosition = Math.min(this.moveHistory.length, this.playbackPosition + 1);
        this.updatePlaybackDisplay();
        this.updateMovesList();
    }
    
    playbackLast() {
        if (this.moveHistory.length === 0) return;
        this.isPlaybackMode = true;
        this.playbackPosition = this.moveHistory.length;
        this.updatePlaybackDisplay();
        this.updateMovesList();
    }
    
    togglePlayback() {
        if (this.moveHistory.length === 0) {
            showModal('エラー', '再生する棋譜がありません');
            return;
        }
        
        if (!this.isPlaybackMode) {
            this.isPlaybackMode = true;
            this.playbackPosition = 0;
            this.updatePlaybackDisplay();
            this.updateMovesList();
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
    
    exitPlaybackMode() {
        this.isPlaybackMode = false;
        this.stopAutoPlay();
        if (this.moveHistory.length > 0) {
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            this.board = JSON.parse(JSON.stringify(lastMove.boardState));
            this.currentPlayer = lastMove.player === 1 ? 2 : 1;
        } else {
            this.reset();
        }
        this.updateDisplay();
        this.updateMovesList();
    }
    
    // Kifu management
    getKifuString() {
        return JSON.stringify({
            boardSize: this.boardSize,
            moves: this.moveHistory,
            timestamp: new Date().toISOString(),
            capturedStones: this.capturedStones
        });
    }
    
    loadKifuString(kifuString) {
        try {
            const kifu = JSON.parse(kifuString);
            
            if (kifu.boardSize && kifu.boardSize !== this.boardSize) {
                this.changeBoardSize(kifu.boardSize);
                // Update UI
                document.querySelectorAll('.size-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.textContent.includes(kifu.boardSize)) {
                        btn.classList.add('active');
                    }
                });
            }
            
            this.reset();
            this.moveHistory = kifu.moves || [];
            this.capturedStones = kifu.capturedStones || { black: 0, white: 0 };
            this.currentMoveNumber = this.moveHistory.length;
            
            if (this.moveHistory.length > 0) {
                const lastMove = this.moveHistory[this.moveHistory.length - 1];
                this.board = JSON.parse(JSON.stringify(lastMove.boardState));
                this.currentPlayer = lastMove.player === 1 ? 2 : 1;
            }
            
            this.updateDisplay();
            this.updateMovesList();
            return true;
        } catch (e) {
            console.error('Error loading kifu:', e);
            return false;
        }
    }
    
    generateSGF() {
        let sgf = `(;FF[4]GM[1]SZ[${this.boardSize}]`;
        
        this.moveHistory.forEach(move => {
            if (move.row === -1) {
                sgf += `;${move.player === 1 ? 'B' : 'W'}[]`;
            } else {
                const col = String.fromCharCode(97 + move.col);
                const row = String.fromCharCode(97 + move.row);
                sgf += `;${move.player === 1 ? 'B' : 'W'}[${col}${row}]`;
            }
        });
        
        sgf += ')';
        return sgf;
    }
}

// Global game instance
let game = new GoGame();

// Event handlers
function changeBoardSize(size) {
    game.changeBoardSize(size);
}

function undoMove() {
    if (game.isPlaybackMode) {
        game.exitPlaybackMode();
    } else {
        game.undoMove();
    }
}

function resetGame() {
    if (confirm('新しいゲームを開始しますか？現在の対局は失われます。')) {
        game.reset();
        showModal('新しいゲーム', '新しいゲームを開始しました');
    }
}

function passMove() {
    game.passMove();
}

function saveKifu() {
    if (game.moveHistory.length === 0) {
        showModal('エラー', 'まだ手が打たれていません');
        return;
    }
    
    const kifuString = game.getKifuString();
    localStorage.setItem('go_kifu_latest', kifuString);
    showModal('保存完了', '棋譜をローカルストレージに保存しました');
}

function shareKifu() {
    if (game.moveHistory.length === 0) {
        showModal('エラー', 'まだ手が打たれていません');
        return;
    }
    
    const kifuString = game.getKifuString();
    const encodedKifu = btoa(encodeURIComponent(kifuString));
    const shareUrl = `${window.location.origin}${window.location.pathname}?kifu=${encodedKifu}`;
    
    document.getElementById('shareUrl').textContent = shareUrl;
    document.getElementById('shareSection').style.display = 'block';
    
    showModal('共有URL生成', 'URLを生成しました。リンクをコピーして共有できます。');
}

function copyToClipboard() {
    const url = document.getElementById('shareUrl').textContent;
    navigator.clipboard.writeText(url).then(() => {
        showModal('コピー完了', 'URLをクリップボードにコピーしました');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showModal('コピー完了', 'URLをクリップボードにコピーしました');
    });
}

function downloadSGF() {
    if (game.moveHistory.length === 0) {
        showModal('エラー', 'まだ手が打たれていません');
        return;
    }
    
    const sgf = game.generateSGF();
    const blob = new Blob([sgf], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kifu_${new Date().toISOString().slice(0,10)}.sgf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showModal('ダウンロード完了', 'SGFファイルをダウンロードしました');
}

function loadSGF(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const sgfContent = e.target.result;
        if (parseSGF(sgfContent)) {
            showModal('読み込み完了', 'SGFファイルを読み込みました');
        } else {
            showModal('エラー', 'SGFファイルの読み込みに失敗しました');
        }
    };
    reader.readAsText(file);
}

function parseSGF(sgfContent) {
    try {
        // Simple SGF parser (basic implementation)
        const sizeMatch = sgfContent.match(/SZ\[(\d+)\]/);
        const boardSize = sizeMatch ? parseInt(sizeMatch[1]) : 19;
        
        if (boardSize !== game.boardSize) {
            game.changeBoardSize(boardSize);
            document.querySelectorAll('.size-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent.includes(boardSize)) {
                    btn.classList.add('active');
                }
            });
        }
        
        game.reset();
        
        const moves = sgfContent.match(/[BW]\[[a-z]*\]/g) || [];
        moves.forEach((move, index) => {
            const color = move[0] === 'B' ? 1 : 2;
            const coord = move.slice(2, -1);
            
            if (coord === '') {
                // Pass move
                game.currentPlayer = color;
                game.passMove();
            } else if (coord.length === 2) {
                const col = coord.charCodeAt(0) - 97;
                const row = coord.charCodeAt(1) - 97;
                
                if (game.isValidPosition(row, col)) {
                    game.currentPlayer = color;
                    game.makeMove(row, col);
                }
            }
        });
        
        return true;
    } catch (e) {
        console.error('SGF parsing error:', e);
        return false;
    }
}

// Playback controls
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

// Timeline control functions
function showAllMoves() {
    document.querySelectorAll('.moves-filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.move-row').forEach(row => {
        row.style.display = 'grid';
    });
}

function showRecentMoves() {
    document.querySelectorAll('.moves-filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const moveRows = document.querySelectorAll('.move-row');
    const totalMoves = moveRows.length;
    
    moveRows.forEach((row, index) => {
        if (index >= totalMoves - 10) {
            row.style.display = 'grid';
        } else {
            row.style.display = 'none';
        }
    });
}

function clearSelection() {
    document.querySelectorAll('.moves-filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.move-row').forEach(row => {
        row.classList.remove('current');
    });
    
    if (game.isPlaybackMode) {
        game.exitPlaybackMode();
    }
}

// Modal functions
function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Window click to close modal
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
}

// Initialize on load
window.addEventListener('load', function() {
    // Load kifu from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const kifuParam = urlParams.get('kifu');
    
    if (kifuParam) {
        try {
            const kifuString = decodeURIComponent(atob(kifuParam));
            if (game.loadKifuString(kifuString)) {
                showModal('棋譜読み込み', '共有された棋譜を読み込みました');
            }
        } catch (e) {
            showModal('エラー', '棋譜の読み込みに失敗しました');
        }
    }
    
    // Load saved kifu from localStorage
    const savedKifu = localStorage.getItem('go_kifu_latest');
    if (savedKifu && !kifuParam) {
        if (confirm('保存された棋譜がありますが、読み込みますか？')) {
            game.loadKifuString(savedKifu);
        }
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'z':
                e.preventDefault();
                undoMove();
                break;
            case 's':
                e.preventDefault();
                saveKifu();
                break;
        }
    }
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            playbackPrev();
            break;
        case 'ArrowRight':
            e.preventDefault();
            playbackNext();
            break;
        case ' ':
            e.preventDefault();
            togglePlayback();
            break;
        case 'Escape':
            if (game.isPlaybackMode) {
                game.exitPlaybackMode();
            }
            break;
    }
});

// Responsive board resizing
window.addEventListener('resize', function() {
    game.initBoard();
});