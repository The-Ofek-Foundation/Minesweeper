var docWidth, docHeight;
var boardWidth, boardHeight, squareWidth;
var board, visiboard;
var dimensions;
var mineFrequency;
var difficulty;
var guessingRequired;
var gameOver, gameStarted;

var boardui = getElemId('board');
var brush = boardui.getContext("2d");
var mineImage = getElemId('mine');
var flagImage = getElemId('flag');
var questionMarkImage = getElemId('question-mark');
var mineQuestion = getElemId('mine-question');

function pageReady() {
	newGame();
	setTimeout(resizeSettingsTable, 0);

	setTimeout(function() {
		var explainSettings = getSessionData('settingsExplainedMinesweeper');
		if (!explainSettings) {
			alert("Remember that Ctrl + Click places down a flag!");
			setSessionData('settingsExplainedMinesweeper', true);
		}
	}, 100);
}

function onResize() {
	resizeSettingsTable();
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

	getSettings();
	populateSettingsForm(gameSettings.getSettings());
	gameSettings.setSettings(getNewSettings());
	getSettings();

	resizeBoard();

	generateBoard(dimensions[0], dimensions[1]);
	drawBoard();
}

function getSettings() {
	difficulty = gameSettings.getOrSet('difficulty', 'normal');
	dimensions = gameSettings.getOrSet('dimensions', [20, 10]);
	mineFrequency = gameSettings.getOrSet('mineFrequency', 0.1);
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
	else if (item === -4) // question mark
		brush.drawImage(questionMarkImage, 1 + i * squareWidth, 1 + a * squareWidth,
			squareWidth, squareWidth);
	else if (item === -5) // mine question mark
		brush.drawImage(mineQuestion, 1 + i * squareWidth, 1 + a * squareWidth,
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

function forcedMines(x, y) {
	var adjacentMines = visiboard[x][y];
	if (adjacentMines > 0) {
		var adjacentUnkown = countAdjacentItems(visiboard, x, y, -2) +
			countAdjacentItems(visiboard, x, y, -4);
		var adjacentFlags = countAdjacentItems(visiboard, x, y, -3) +
			countAdjacentItems(visiboard, x, y, -5);
		if (adjacentMines - adjacentFlags === adjacentUnkown && adjacentUnkown > 0)
			return true;
	}
	return false;
}

function forcedReveal(x, y) {
	var adjacentMines = visiboard[x][y];
	if (adjacentMines > 0) {
		var adjacentUnkown = countAdjacentItems(visiboard, x, y, -2) +
			countAdjacentItems(visiboard, x, y, -4);
		var adjacentFlags = countAdjacentItems(visiboard, x, y, -3) +
			countAdjacentItems(visiboard, x, y, -5);
		if (adjacentMines === adjacentFlags && adjacentUnkown > 0)
			return true;
	}
	return false;
}

function flagForcedMines(guess=false) {
	var somethingChanged = false;
	for (var i = 0; i < visiboard.length; i++)
		for (var a = 0; a < visiboard.length; a++)
			if (forcedMines(i, a)) {
				flagAdjacentUnknown(i, a, guess);
				somethingChanged = true;
			}
	return somethingChanged;
}

function revealForcedReveals(guess=false) {
	var somethingChanged = false;
	for (var i = 0; i < visiboard.length; i++)
		for (var a = 0; a < visiboard.length; a++)
			if (forcedReveal(i, a)) {
				revealAdjacentUnknown(i, a, guess);
				somethingChanged = true;
			}
	return somethingChanged;
}

// function guessReveal() {
// 	revealAllForced(false);
// 	for (var delta = 2; delta < 100; delta++)
// 		for (var i = 0; i < visiboard.length; i++)
// 			for (var a = 0; a < visiboard[i].length; a++) {
// 				var possibleCombinations =
// 					choose(countAdjacentItems(visiboard, x, y, -2) +
// 					countAdjacentItems(visiboard, x, y, -4), visiboard[i][a] -
// 					countAdjacentItems(visiboard, x, y, -3) -
// 					countAdjacentItems(visiboard, x, y, -5));
// 				if (possibleCombinations === delta)
// 					for (var g = 0; g < possibleCombinations; g++)
// 						guessRevealSquare(i, a, g);
// 			}

// }

function flagAdjacentUnknown(x, y, guess) {
	for (var i = x > 0 ? x - 1:x; i < visiboard.length && i <= x + 1; i++)
		for (var a = y > 0 ? y - 1:y; a < visiboard[i].length && a <= y + 1; a++)
			if (visiboard[i][a] === -2)
				visiboard[i][a] = guess ? -5:-3;
}

function revealAdjacentUnknown(x, y, guess) {
	for (var i = x > 0 ? x - 1:x; i < visiboard.length && i <= x + 1; i++)
		for (var a = y > 0 ? y - 1:y; a < visiboard[i].length && a <= y + 1; a++)
			if (visiboard[i][a] === -2)
				if (guess)
					visiboard[i][a] = -4;
				else revealSquare(i, a);
}

function revealAllForced(guess=false) {
	var somethingChanged = true;
	while (somethingChanged) {
		somethingChanged = false;
		if (flagForcedMines(guess))
			somethingChanged = true;
		if (revealForcedReveals(guess))
			somethingChanged = true;
	}
}

function generateValidBoard(width, height, x, y) {
	while (1 === 1) {
		generateBoard(width, height);
		if (board[x][y] !== 0)
			continue;
		if (guessingRequired === 'maybe')
			break;
		revealSquare(x, y);
		revealAllForced();
		if (guessingRequired === 'always' && !gameWon())
			break;
		if (guessingRequired === 'never' && gameWon())
			break;
	}
	for (var i = 0; i < width; i++)
		for (var a = 0; a < height; a++)
			visiboard[i][a] = -2;
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
				board[i][a] = countAdjacentItems(board, i, a, -1);
}

function countAdjacentItems(board, x, y, item) {
	var numItems = 0;

	for (var i = x > 0 ? x - 1:x; i < board.length && i <= x + 1; i++)
		for (var a = y > 0 ? y - 1:y; a < board[i].length && a <= y + 1; a++)
			if (board[i][a] === item)
				numItems++;
	return numItems;
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
		for (var i = 0; i < board.length; i++)
			for (var a = 0; a < board[i].length; a++)
				if (board[i][a] === -1)
					visiboard[i][a] = -1;
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
	e.preventDefault();
	var move = getMove(e.pageX - boardui.offsetLeft,
		e.pageY - wrapperTop - boardui.offsetTop);
	if (!gameStarted) {
		generateValidBoard(dimensions[0], dimensions[1], move[0], move[1]);
		gameStarted = true;
	}
	if (visiboard[move[0]][move[1]] === -2) {
		if (e.ctrlKey && e.shiftKey)
			visiboard[move[0]][move[1]] = -5;
		else if (e.ctrlKey)
			visiboard[move[0]][move[1]] = -3;
		else if (e.shiftKey)
			visiboard[move[0]][move[1]] = -4;
		else revealSquare(move[0], move[1]);
	} else if (visiboard[move[0]][move[1]] === -3 && e.ctrlKey ||
		visiboard[move[0]][move[1]] === -4 && e.shiftKey ||
		e.ctrlKey && e.shiftKey && visiboard[move[0]][move[1]] === -5)
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

var helpNum = 0;
document.addEventListener('keypress', function (event) {
	switch (event.which) {
		case 115: case 83: // s
			showSettingsForm();
			break;
		case 110: case 78: // n
			newGame();
			break;
		case 104: case 72: // h
			helpNum % 2 === 0 ? flagForcedMines():revealForcedReveals();
			helpNum++;
			drawBoard();
			break;
	}
});

function getNewSettings() {
	var settings = {
		'difficulty': getInputValue('difficulty'),
	};

	switch (settings['difficulty']) {
		case 'custom':
			settings['dimensions'] =
				[getInputValue('board-width'), getInputValue('board-height')];
			settings['mineFrequency'] = getInputValue('mine-frequency');
			guessingRequired = 'maybe';
			break;
		case 'easier':
			settings['dimensions'] = [10, 5];
			settings['mineFrequency'] = 0.2;
			guessingRequired = 'never';
			break;
		case 'easy':
			settings['dimensions'] = [15, 8];
			settings['mineFrequency'] = 0.1;
			guessingRequired = 'never';
			break;
		case 'normal':
			settings['dimensions'] = [30, 15];
			settings['mineFrequency'] = 0.1;
			guessingRequired = 'never';
			break;
		case 'hard':
			settings['dimensions'] = [40, 20];
			settings['mineFrequency'] = 0.2;
			guessingRequired = 'never';
			break;
		case 'very hard':
			settings['dimensions'] = [50, 25];
			settings['mineFrequency'] = 0.2;
			guessingRequired = 'maybe';
			break;
		case 'good luck':
			settings['dimensions'] = [60, 30];
			settings['mineFrequency'] = 0.2;
			guessingRequired = 'always';
			break;
	}

	return settings;
}

function populateSettingsForm(settings) {
	setInputValue('difficulty', difficulty);
	setInputValue('board-width', dimensions[0]);
	setInputValue('board-height', dimensions[1]);
	setInputValue('mine-frequency', mineFrequency);
}

var fact = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880];
function choose(n, r) {
	return fact[n] / (fact[r] * fact[n - r]);
}
