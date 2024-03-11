const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const cellSize = 20;
let canvasSize = 400; // Initial canvas size
canvas.width = canvasSize;
canvas.height = canvasSize;

let blackHoleAfterSegment = null; // tracks the segment of the worm just before a blackhole, null if the worm not going through blackhole
let probBlackHole = 0.30; // probability of a black hole per apple level
let probStar = 0.22; // probability of a star per apple level
let blackHolesActive = false;
let blackHoles = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

const highScoreKey = 'wormGameHighScores';
const highScoreLength = 10;

let currentLevel = 1;
let applesPerLevel = 10;
let isLevelPaused = false; // To track if the game is paused for a new level

let directionQueue = []; // Initialize a queue to store direction changes
let speed; // Will be set based on difficulty
let worm = [{ x: 200, y: 200 }];
let food = { x: 0, y: 0 };
let direction = { x: 0, y: 0 };
let score = 0;
let appleWorth = 0;
let lastRenderTime = 0;
let difficulty = '';
let applesCollected = 0; // Counter to track the number of apples collected
let appleLevels = null; // number of apples until level canvas shrinks

let superStar = null;
let superStarTimer = null;
let superStarCountdown = null;
let superStarCountdownInitial = null; // Initial countdown value in seconds

let wormTexture = null;
let wormHeadTexture = null;
const worm1Texture = loadTexture('worm2.png');
const worm2Texture = loadTexture('worm.png');
const worm3Texture = loadTexture('worm3.png');
const worm1HeadTexture = loadTexture('worm3.png');
const worm2HeadTexture = loadTexture('worm2.png');
const worm3HeadTexture = loadTexture('worm.png');
const starTexture = loadTexture('star.png');
const appleTexture = loadTexture('apple2.png');
const blackholeTexture = loadTexture('blackhole.png');

const highScores = loadHighScores(); // Load high scores at the start

// should be all lower case for characters, since .toLowerCase() is called in event.key listener
const directions = {
    ArrowUp:    { x: 0, y: -cellSize },
    ArrowDown:  { x: 0, y: cellSize },
    ArrowLeft:  { x: -cellSize, y: 0 },
    ArrowRight: { x: cellSize, y: 0 },
    "w": { x: 0, y: -cellSize },
    "s": { x: 0, y: cellSize },
    "a": { x: -cellSize, y: 0 },
    "d": { x: cellSize, y: 0 },
};

function loadTexture(texturePath) {
    const img = new Image();
    img.src = texturePath;
    return img;
}

function startGame(selectedDifficulty) {
    difficulty = selectedDifficulty;
    document.getElementById('openingScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';

    switch (difficulty) {
        case 'Easy Peasy':
		    superStarCountdownInitial = 6;
		    appleLevels = 15;
            speed = 5;
			wormTexture = worm1Texture;
			wormHeadTexture = worm1HeadTexture;
			appleWorth = 1;
            break;
        case 'Worm Wriggler':
		    superStarCountdownInitial = 4;
		    appleLevels = 10;
            speed = 9;
			wormTexture = worm2Texture;
			wormHeadTexture = worm2HeadTexture;
			appleWorth = 2;
            break;
        case 'Speedy Serpent':
		    superStarCountdownInitial = 3;
		    appleLevels = 5;
            speed = 13;
			wormTexture = worm3Texture;
			wormHeadTexture = worm3HeadTexture;
			appleWorth = 3;
            break;
    }
	worm = [
        { x: 200, y: 200 }, // Head segment
        { x: 180, y: 200 }  // Second segment
    ];
    food = { x: Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize, 
             y: Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize };
    direction = { x: 0, y: 0 };
    score = 0;
    lastRenderTime = 0;
    applesCollected = 0; // Reset apples collected counter

    updateScoreDisplay();
	pauseGameForNewLevel();
    gameLoop();
}

// #############################
// ## GAMELOOP CORE FUNCTIONS ##
// #############################

function gameLoop(currentTime) {

	// Check for game over conditions
	if (checkWormWallCollision() || checkWormSelfCollision()) {
	
		if (isHighScore(score)) {
		updateHighScores(score);
		}
		alert("Game Over!");
		document.location.reload();
		return;
	}

	// Synch worm speed
    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
    if (secondsSinceLastRender < 1 / speed) {
        	
		requestAnimationFrame(gameLoop);
		
        return;
    }

    lastRenderTime = currentTime;
	
	processDirectionQueue(); // Process the direction queue before moving the worm

	// As long as level isn't paused, move worm, draw worm/food/blackholes, and check for if we got a star!
	if (!isLevelPaused) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		moveWorm();
		drawWorm();
		drawFood();
		drawBlackHoles();
		checkSuperStarCollision();
	}
	
    requestAnimationFrame(gameLoop);
}

function moveWorm() {
    let head = { x: worm[0].x + direction.x, y: worm[0].y + direction.y };
	let enteredBlackHole = false;

    if (blackHolesActive) {
		// Check if the worm's head enters a black hole
        for (let i = 0; i < blackHoles.length; i++) {
            if (head.x === blackHoles[i].x && head.y === blackHoles[i].y) {
                enteredBlackHole = true;
                let otherBH = blackHoles[(i + 1) % blackHoles.length];
                head = { x: otherBH.x + direction.x, y: otherBH.y + direction.y };
                if (blackHoleAfterSegment === null) {
                    // Only set to 1 when first entering the black hole
                    blackHoleAfterSegment = 1;
                }
                break;
            }
        }
    }

    worm.unshift(head);
	
    // Update blackHoleAfterSegment if the worm enters a black hole
	if (blackHoleAfterSegment !== null) {
        // Increment if already tracking a segment in the black hole
        blackHoleAfterSegment++;
        if (blackHoleAfterSegment > worm.length) {
            // Reset when worm is completely out of the black hole
            blackHoleAfterSegment = null;
        }
	}

	// check if worm got apple
    if (head.x === food.x && head.y === food.y) {
	    applesCollected++;
        score += appleWorth;
        updateScoreDisplay();
        generateFood();
		
		// Check if a new level is reached
		if (applesCollected % applesPerLevel === 0) {
			currentLevel++;
			updateScoreDisplay()
			pauseGameForNewLevel();
		}
		
    } else {
        worm.pop();
    }
}

function pauseGameForNewLevel() {
    // Pause game logic (e.g., stop rendering, disable movement)
    isLevelPaused = true;
	setTimeout(() => ignoreKeyPress = true, 5000);
	
    // Display level number and prompt for user action
    // Call this after a short delay to ensure game loop acknowledges the pause
    setTimeout(displayLevelInfo, 100);
}

function displayLevelInfo() {
    // ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${currentLevel}`, canvasSize / 2, canvasSize / 2 - 20);
    ctx.fillText('Press an arrow key to start', canvasSize / 2, canvasSize / 2 + 20);
    ctx.fillStyle = 'black';
    ctx.fillText(`Level ${currentLevel}`, canvasSize / 2 + 2, canvasSize / 2 - 18);
    ctx.fillText('Press an arrow key to start', canvasSize / 2 + 2, canvasSize / 2 + 18);
}

function updateScoreDisplay() {
    const scoreDisplay = document.getElementById('score');
	scoreDisplay.textContent = `Score: ${score} (${difficulty}) Apples: ${applesCollected} Level: ${currentLevel}`;
}

function checkWormWallCollision() {
    const hitLeftWall = worm[0].x < 0;
    const hitRightWall = worm[0].x > canvas.width - cellSize;
    const hitTopWall = worm[0].y < 0;
    const hitBottomWall = worm[0].y > canvas.height - cellSize;

    return hitLeftWall || hitRightWall || hitTopWall || hitBottomWall;
}

function checkWormSelfCollision() {
    for (let i = 1; i < worm.length; i++) {
        if (worm[i].x === worm[0].x && worm[i].y === worm[0].y) {
            return true;
        }
    }
    return false;
}

function checkSuperStarCollision() {
    if (superStar && worm[0].x >= superStar.x && worm[0].x < superStar.x + cellSize &&
        worm[0].y >= superStar.y && worm[0].y < superStar.y + cellSize) {
            score += 4;
            updateScoreDisplay();
            clearTimeout(superStarTimer);
            superStar = null;
            superStarTimer = null;
        if (worm.length >= 4) {
            worm.splice(worm.length - 2, 2);
        }
    }
}

// #################################
// ## GENERATE GAME FIELD OBJECTS ##
// #################################

function generateBlackHoles() {
    const margin = 4 * cellSize;

    // Spawn the first black hole near the worm head
    spawnBlackHoleNear(worm[0], 6, 0);

    // Determine the target for the second black hole
    let target;
    if (superStar && Math.random() < 0.5) {
        // 50% chance to spawn near the star if it exists
        target = superStar;
    } else {
        // Otherwise, spawn near the apple
        target = food;
    }
    do {
		spawnBlackHoleNear(target, 6, 1);
	} while (blackHoles[0].x == blackHoles[1].x && blackHoles[0].y == blackHoles[1].y)

    blackHolesActive = true;
}

function spawnBlackHoleNear(target, range, index) {
    const margin = 4 * cellSize;
	let i = index;
	do {
		// Adjust the range to account for the minimum distance from the canvas edges
           blackHoles[i].x = target.x + (Math.floor(Math.random() * (2 * range + 1)) - range) * cellSize;
           blackHoles[i].y = target.y + (Math.floor(Math.random() * (2 * range + 1)) - range) * cellSize;
	} while (isOutOfBounds(blackHoles[i].x, blackHoles[i].y) || isCollisionWithSnake(blackHoles[i].x, blackHoles[i].y) || isCollisionWithApple(blackHoles[i].x, blackHoles[i].y));
}

function isOutOfBounds(x, y) {
    return x < 0 || x >= canvasSize || y < 0 || y >= canvasSize;
}

function isCollisionWithSnake(x, y) {
    return worm.some(segment => segment.x === x && segment.y === y);
}

function isCollisionWithApple(x, y) {
    // Check if apple matches the given coordinates
    return food.x === x && food.y === y;
}

function isCollisionWithBlackHole(x, y) {
    // Assuming blackHoles is an array of black hole positions
    return blackHoles.some(bh => bh.x === x && bh.y === y);
}

function isCollisionWithStar(x, y) {
    // Check if the super star exists and matches the given coordinates
    return superStar && superStar.x === x && superStar.y === y;
}

function generateFood() {
	// order of this subroute:
	//    1. decrease canvas size (at correct time)
	//    2. generate stars	(at random)
	//    3. generate apple 
	//    4. generate blackholes (at random) last to they can be strategically placed

   // check for canvas size shrink 
   if (applesCollected % appleLevels === 0) {
        canvasSize -= cellSize; // Decrease canvas size by one block
        canvas.width = canvasSize;
        canvas.height = canvasSize;
		
		// Ensure that the worm is correctly repositioned in all scenarios when the canvas shrinks
		repositionWormIfOutOfBounds();
    }
	
    // Generate super star if good dice roll
    if (Math.random() < probStar) {
        let starX, starY;
        do {
            starX = Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize;
            starY = Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize;
        } while (isCollisionWithSnake(starX, starY) || isCloseToApple(starX, starY));

        superStar = { x: starX, y: starY };
		
		// Countdown logic
        superStarCountdown = superStarCountdownInitial; // Reset countdown value
        superStarTimer = setInterval(() => {
			if (!isLevelPaused) {
				superStarCountdown--;
			}
            if (superStarCountdown <= 0) {
                superStar = null;
                clearInterval(superStarTimer);
            }
        }, 1000); // Update countdown every second
    } else {
        superStar = null; // No super star this time
        superStarCountdown = 0; // Reset countdown value
        clearInterval(superStarTimer); // Clear any existing timer
    }

	// generate apple
	let validPosition = false;
    while (!validPosition) {
        // Randomly generate apple position
        food.x = Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize;
        food.y = Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize;

        // Check for collisions with snake, black holes, and the star
        if (!isCollisionWithSnake(food.x, food.y) && 
            !isCollisionWithStar(food.x, food.y)) {
            validPosition = true;
        }
    }
    // debug - console.log('apple location x y', food.x, food.y, 'apple # ', applesCollected);


	// Generate black holes if good dice roll - do last so black holes can be strategically placed based on worm head and apple/star
	// Only generate if the worm is NOT teleporting through the black holes. If it is, then keep current black hole in place
	if (blackHoleAfterSegment === null) {
		if (Math.random() < probBlackHole) {
			generateBlackHoles();
		} else {
			blackHolesActive = false;
		}
	}
}

function isCloseToApple(x, y) {
    return Math.abs(x - food.x) < 5 * cellSize && Math.abs(y - food.y) < 5 * cellSize;
}

function repositionWormIfOutOfBounds() {
	// This code ensures that if any part of the worm is outside the canvas boundaries,
	// the entire worm is moved just enough to bring it back within the canvas. It checks
	// for out-of-bounds conditions on all four sides and calculates the necessary movement
	// in both the x and y directions.
    let maxX = Math.max(...worm.map(segment => segment.x));
    let maxY = Math.max(...worm.map(segment => segment.y));
    let minX = Math.min(...worm.map(segment => segment.x));
    let minY = Math.min(...worm.map(segment => segment.y));
    let moveX = 0, moveY = 0;

    if (maxX >= canvasSize) {
        moveX = canvasSize - cellSize - maxX;
    } else if (minX < 0) {
        moveX = -minX;
    }

    if (maxY >= canvasSize) {
        moveY = canvasSize - cellSize - maxY;
    } else if (minY < 0) {
        moveY = -minY;
    }
	// debug - console.log("minX, minY", minX, minY)
    worm = worm.map(segment => {
        return { x: segment.x + moveX, y: segment.y + moveY };
    });
	
	// if the worm is in the black hole, need to shift that too
	if (blackHoleAfterSegment !== null) {
		blackHoles[0].x += moveX;
		blackHoles[0].y += moveY;
		blackHoles[1].x += moveX;
		blackHoles[1].y += moveY;
	}
}

// #############################
// ## DRAW GAME FIELD OBJECTS ##
// #############################

function drawBlackHoles() {
    if (!blackHolesActive) return;
    blackHoles.forEach(bh => {

		if (blackholeTexture) {
			ctx.drawImage(blackholeTexture, bh.x, bh.y, cellSize, cellSize);
		} else {
			drawCell(bh, 'black');
		} 

    });
}

function drawWorm() {
    for (let i = worm.length - 1; i >= 0; i--) {
        if (i === 0) {
		drawWormSegment(worm[i], wormHeadTexture);
		} else

		drawWormSegment(worm[i], wormTexture);

		// only draw middle segments if not last segment and segment is not between black holes
		if (i > 0 && i !== blackHoleAfterSegment-1 ) {
			const nextSegment = worm[i - 1];
			// Calculate the position of the new segment
			const newSegment = {
				x: (worm[i].x + nextSegment.x) / 2,
				y: (worm[i].y + nextSegment.y) / 2
			};
			drawWormSegment(newSegment, wormTexture);
		}
	}
}

function drawWormSegment(segment, texture) {
    if (wormTexture) {
        ctx.drawImage(texture, segment.x, segment.y, cellSize, cellSize);
    } else {
        drawCell(segment, 'green');
    }
}

function drawCell({ x, y }, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellSize, cellSize);
}

function drawFood() {
	if (appleTexture) {
		ctx.drawImage(appleTexture, food.x, food.y, cellSize, cellSize);
	} else {
		drawCell(food, 'red');
	} 


    if (superStar) {
		if (starTexture) {
            ctx.drawImage(starTexture, superStar.x, superStar.y, cellSize, cellSize);
        } else {
            drawCell(superStar, 'yellow');
        }

        // Draw countdown text
        ctx.fillStyle = 'black';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(superStarCountdown.toString(), 8+superStar.x + cellSize / 2, superStar.y+6);
    }
}

// ##########################
// ## HIGH SCORE FUNCTIONS ##
// ##########################

function showHighScores() {
    const highScores = loadHighScores();
    const highScoreList = document.getElementById('highScoreList').getElementsByTagName('tbody')[0];
	//const newRow = highScoreList.insertRow(0)
	highScoreList.innerHTML = highScores.map((score, index) => 
    `<tr>
        <td>${index + 1}</td>
        <td>${score.name}</td>
        <td>${score.totalScore}</td>
        <td>${score.difficulty}</td>
        <td>${score.applesCollected}</td>
        <td>${score.levelAchieved}</td>
    </tr>`
	).join('');
    document.getElementById('highScoreScreen').style.display = 'block';
  //  document.getElementById('openingScreen').style.display = 'none';
}

function hideHighScores() {
    document.getElementById('highScoreScreen').style.display = 'none';
 //   document.getElementById('openingScreen').style.display = 'block';
}

function loadHighScores() {
    const highScoresJSON = localStorage.getItem(highScoreKey);
    if (highScoresJSON) {
        return JSON.parse(highScoresJSON);
    } else {
        return []; // Return an empty array if there are no high scores
    }
}

function isHighScore(currentScore) {
    const highScores = loadHighScores();
    if (highScores.length < highScoreLength) {
        return true; // The list is not full, so it's a high score
    }

    // Find the lowest score in the high score list
    const lowestHighScore = highScores[highScores.length - 1].totalScore;
    return currentScore > lowestHighScore;
}

function updateHighScores(currentScore) {
    const highScores = loadHighScores(); // Load existing high scores

    // Create an object for the new score
    const newScore = { 
        name: prompt("Congratulations! Enter your name for the high score:"), // Prompt for the player's name
        difficulty: difficulty,
        applesCollected: applesCollected,
        levelAchieved: currentLevel,
        totalScore: score
    };

    // Add the new score to the list and sort it
    highScores.push(newScore);
    highScores.sort((a, b) => b.totalScore - a.totalScore); // Sort in descending order of scores

    // Keep only the top scores
    if (highScores.length > highScoreLength) {
        highScores.pop(); // Remove the last item if there are more than 5 scores
    }

    saveHighScores(highScores); // Save the updated list of high scores
}

function saveHighScores(highScores) {
    localStorage.setItem(highScoreKey, JSON.stringify(highScores));
}

// #########################################
// ## GAME KEY CONTROL LISTENER AND LOGIC ##
// #########################################

function changeDirection(event) {
	let keyPressed = event.key;
    if (['W', 'A', 'S', 'D', 'w', 'a', 's', 'd'].includes(keyPressed)) {
        keyPressed = keyPressed.toLowerCase(); // Convert WASD keys to lowercase
	}
    const newDirection = directions[keyPressed];
    if (newDirection) {

        // Unpause the game and start the new level
		if (isLevelPaused) {
			isLevelPaused = false;
		}

        // Limit the queue to only the last 3 directions
        if (directionQueue.length < 3) {
            directionQueue.push(newDirection);
        }
    }
}

function processDirectionQueue() {
    while (directionQueue.length > 0) {
        const newDirection = directionQueue.shift();
        // Check if the new direction is not opposite to the current direction
        if (!(newDirection.x === -direction.x && newDirection.y === -direction.y)) {
            direction = newDirection;
            break; // Exit after processing one direction change
        }
    }
}

document.addEventListener("keydown", changeDirection);
