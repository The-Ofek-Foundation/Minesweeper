var docWidth, docHeight;
var boardWidth, boardHeight, squareWidth;
var board, visiboard;
var dimensions = [20, 10];
var mineFrequency = 0.1;
var gameOver, gameStarted;

var boardui = getElemId('board');
var brush = boardui.getContext("2d");
var mineImage = getElemId('mine');
var flagImage = getElemId('flag');

function pageReady() {
	resizeBoard();
	newGame();

	setTimeout(function() {
		var explainSettings = getSessionData('settingsExplainedMinesweeper');
		if (!explainSettings) {
			alert("Remember that Ctrl + Click places down a flag!");
			setSessionData('settingsExplainedMinesweeper', true);
		}
	}, 100);
}

function onResize() {
	resizeBoard();
	drawBoard();
}

function resizeBoard() {
	docWidth = getElemWidth(contentWrapper);
	docHeight = getElemHeight(contentWrapper);
	wrapperTop = contentWrapper.offsetTop;

	var sw1 = parseInt((docWidth - 2) / dimensions[0]); // square width 1
	var sw2 = parseInt((docHeight - 2) / dimensions[1]);

	squareWidth = sw1 < sw2 ? sw1:sw2;
	boardWidth = squareWidth * dimensions[0] + 2;
	boardHeight = squareWidth * dimensions[1] + 2;

	setElemWidth(boardui, boardWidth);
	setElemHeight(boardui, boardHeight);
	setElemStyle(boardui, 'left', (docWidth - boardWidth) / 2 + "px")
	setElemStyle(boardui, 'top', (docHeight - boardHeight) / 2 + "px")
	boardui.setAttribute('width', boardWidth);
	boardui.setAttribute('height', boardHeight);
}

function newGame() {
	gameOver = false;
	gameStarted = false;
	generateBoard(dimensions[0], dimensions[1]);

	drawBoard();
}

function clearBoard() {
	brush.clearRect(0, 0, boardWidth, boardHeight);
	brush.fillStyle = "white";
	brush.fillRect(0, 0, boardWidth, boardHeight);
}

function drawGrid() {
	brush.lineWidth = 1;
	brush.strokeStyle = "black";
	brush.beginPath();
	for (var i = 0; i <= dimensions[0]; i++) {
		brush.moveTo(1 + i * squareWidth, 0);
		brush.lineTo(1 + i * squareWidth, docHeight);
	}
	for (var a = 0; a <= dimensions[1]; a++) {
		brush.moveTo(0, 1 + a * squareWidth);
		brush.lineTo(docWidth, 1 + a * squareWidth);
	}
	brush.stroke();
	brush.closePath();
}

function drawSquare(item, i, a) {
	if (item === -1) // bomb
		brush.drawImage(mineImage, 1 + i * squareWidth, 1 + a * squareWidth,
			squareWidth, squareWidth);
	else if (item === -3) // flag
		brush.drawImage(flagImage, 1 + i * squareWidth, 1 + a * squareWidth,
			squareWidth, squareWidth);
	else if (item === -2) { // unknown
		brush.fillStyle = 'gray';
		brush.fillRect(1 + i * squareWidth, 1 + a * squareWidth,
			squareWidth, squareWidth);
	} else if (item == -10) { // hover unknown
		brush.fillStyle = 'lightgray';
		brush.fillRect(1 + i * squareWidth, 1 + a * squareWidth,
			squareWidth, squareWidth);
	} else if (item > 0) {
		brush.fillStyle = 'red';
		brush.fillText(item, 1 + (i + 0.5) * squareWidth,
			1 + (a + 0.6) * squareWidth);
	}
}

function drawSquares(board) {
	brush.font = "bold " + (squareWidth / 3) + "px Arial";
	brush.textAlign = 'center';
	for (var i = 0; i < board.length; i++)
		for (var a = 0; a < board[i].length; a++)
			drawSquare(board[i][a], i, a);
}

function drawBoard() {
	clearBoard();
	drawSquares(visiboard);
	drawGrid();
}

function generateBoard(width, height) {
	board = new Array(width);
	visiboard = new Array(width);
	for (var i = 0; i < width; i++) {
		board[i] = new Array(height);
		visiboard[i] = new Array(height);
		for (var a = 0; a < height; a++) {
			if (Math.random() <= mineFrequency)
				board[i][a] = -1;
			else board[i][a] = 0;
			visiboard[i][a] = -2;
		}
	}

	for (var i = 0; i < width; i++)
		for (var a = 0; a < height; a++)
			if (board[i][a] === 0)
				board[i][a] = countAdjacentMines(board, i, a);
}

function countAdjacentMines(board, x, y) {
	var numMines = 0;

	for (var i = x > 0 ? x - 1:x; i < board.length && i <= x + 1; i++)
		for (var a = y > 0 ? y - 1:y; a < board[i].length && a <= y + 1; a++)
			if (board[i][a] === -1)
				numMines++;
	return numMines;
}

function revealAdjacentSquares(x, y) {
	visiboard[x][y] = board[x][y];
	for (var i = x > 0 ? x - 1:x; i < board.length && i <= x + 1; i++)
		for (var a = y > 0 ? y - 1:y; a < board[i].length && a <= y + 1; a++)
			if (board[i][a] === 0 && visiboard[i][a] !== 0)
				revealAdjacentSquares(i, a);
			else visiboard[i][a] = board[i][a];
}

function revealSquare(x, y) {
	if (board[x][y] === -1) {
		alert('Game Over!');
		visiboard = board;
		gameOver = true;
		return;
	}
	if (board[x][y] === 0)
		revealAdjacentSquares(x, y);
	else visiboard[x][y] = board[x][y];
}

function getMove(xloc, yloc) {
	return [parseInt(xloc / squareWidth), parseInt(yloc / squareWidth)];
}

function gameWon() {
	for (var i = 0; i < board.length; i++)
		for (var a = 0; a < board[i].length; a++)
			if (board[i][a] === -1) continue;
			else if (visiboard[i][a] !== board[i][a])
				return false;
	return true;
}

var lasthover = [-1, -1];
boardui.addEventListener('mousemove', function (e) {
	var move = getMove(e.pageX - boardui.offsetLeft,
		e.pageY - wrapperTop - boardui.offsetTop);
	if (move[0] !== lasthover[0] || move[1] !== lasthover[1]) {
		lasthover = move;
		if (visiboard[move[0]][move[1]] === -2) {
			var temp = visiboard[move[0]][move[1]];
			visiboard[move[0]][move[1]] = -10;
			drawBoard();
			visiboard[move[0]][move[1]] = temp;
		}
	}
});

boardui.addEventListener('mousedown', function (e) {
	if (e.which === 3)
		return;
	var move = getMove(e.pageX - boardui.offsetLeft,
		e.pageY - wrapperTop - boardui.offsetTop);
	if (!gameStarted) {
		while (board[move[0]][move[1]] !== 0)
			generateBoard(dimensions[0], dimensions[1]);
		gameStarted = true;
	}
	if (visiboard[move[0]][move[1]] === -2) {
		if (e.ctrlKey)
			visiboard[move[0]][move[1]] = -3;
		else revealSquare(move[0], move[1]);
	} else if (visiboard[move[0]][move[1]] === -3 && e.ctrlKey)
		visiboard[move[0]][move[1]] = -2;
	drawBoard();
	if (!gameOver && gameWon()) {
		setTimeout(function () {
			alert("Congratz, you win!");
			visiboard = board;
			drawBoard();
		}, 100);
	}
});

document.addEventListener('keypress', function (event) {
	switch (event.which) {
		case 115: case 83: // s
			// showSettingsForm();
			break;
		case 110: case 78: // n
			newGame();
			break;
	}
});
