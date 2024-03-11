const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const cellSize = 20;
let canvasSize = 400; // Initial canvas size
canvas.width = canvasSize;
canvas.height = canvasSize;

let probBlackHole = 0.30; // probability of a black hole per apple level
let probStar = 0.22; // probability of a star per apple level
let blackHolesActive = false;
let blackHoles = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

let currentLevel = 1;
let applesPerLevel = 10;
let isLevelPaused = false; // To track if the game is paused for a new level

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

let wormTexture = null; // Default texture (null for no texture)
const grassTexture = loadTexture('grass_texture.png');
const woodTexture = loadTexture('wood_texture.png');
const metalTexture = loadTexture('metal_texture.png');
const starTexture = loadTexture('star.png');

const directions = {
    ArrowUp: { x: 0, y: -cellSize },
    ArrowDown: { x: 0, y: cellSize },
    ArrowLeft: { x: -cellSize, y: 0 },
    ArrowRight: { x: cellSize, y: 0 },
};

function loadTexture(texturePath) {
    const img = new Image();
    img.src = texturePath;
    return img;
}

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
    
	spawnBlackHoleNear(target, 6, 1);

    blackHolesActive = true;
}

function spawnBlackHoleNear(target, range, index) {
    const margin = 4 * cellSize;
	let i = index;
	do {
		// Adjust the range to account for the minimum distance from the canvas edges
           blackHoles[i].x = target.x + (Math.floor(Math.random() * (2 * range + 1)) - range) * cellSize;
           blackHoles[i].y = target.y + (Math.floor(Math.random() * (2 * range + 1)) - range) * cellSize;
	} while (isOutOfBounds(blackHoles[i].x, blackHoles[i].y) || isCollisionWithSnake(blackHoles[i].x, blackHoles[i].y));
}

function isOutOfBounds(x, y) {
    return x < 0 || x >= canvasSize || y < 0 || y >= canvasSize;
}

function drawBlackHoles() {
    if (!blackHolesActive) return;
    blackHoles.forEach(bh => {
        drawCell(bh, 'black');
    });
}

function drawWorm() {
    worm.forEach(segment => {
        if (wormTexture) {
            ctx.drawImage(wormTexture, segment.x, segment.y, cellSize, cellSize);
        } else {
            drawCell(segment, 'green');
        }
    });
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
			wormTexture = grassTexture;
			appleWorth = 1;
            break;
        case 'Worm Wriggler':
		    superStarCountdownInitial = 4;
		    appleLevels = 10;
            speed = 10;
			wormTexture = woodTexture;
			appleWorth = 2;
            break;
        case 'Speedy Serpent':
		    superStarCountdownInitial = 3;
		    appleLevels = 5;
            speed = 16;
			wormTexture = metalTexture;
			appleWorth = 3;
            break;
    }
	worm = [
        { x: 200, y: 200 }, // Head segment
        { x: 180, y: 200 }  // Second segment, adjust position as needed
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

function drawCell({ x, y }, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellSize, cellSize);
}

function drawFood() {
    drawCell(food, 'red');

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


function moveWorm() {
    let head = { x: worm[0].x + direction.x, y: worm[0].y + direction.y };

    if (blackHolesActive) {
        for (let i = 0; i < blackHoles.length; i++) {
            if (head.x === blackHoles[i].x && head.y === blackHoles[i].y) {
                // Find the other black hole
                let otherBH = blackHoles[(i + 1) % blackHoles.length];
                head = { x: otherBH.x + direction.x, y: otherBH.y + direction.y };
                break;
            }
        }
    }

    worm.unshift(head);

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
	//    1. decrease canvas size (if time)
	//    2. generate stars	
	//    3. generate apple 
	//    4. generate blackholes last to they can be strategically placed


   // check for canvas size shrink 
   if (applesCollected % appleLevels === 0) {
        canvasSize -= cellSize; // Decrease canvas size by one block
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        worm.forEach(segment => {
            if (segment.x >= canvasSize) {
                segment.x = canvasSize - cellSize * 2;
            }
            if (segment.y >= canvasSize) {
                segment.y = canvasSize - cellSize * 2;
            }
        });
    }

    // Check and adjust food position to fit within new canvas size
//    if (food.x >= canvasSize || food.y >= canvasSize) {
//        generateFood(); // Regenerate food if it's out of bounds
//        return;
//    }

    
	
    // Generate super star if good dice roll
    if (Math.random() < probStar) {
        let starX, starY;
        do {
            starX = Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize;
            starY = Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize;
        } while (isCollisionWithSnake(starX, starY) || isCloseToApple(starX, starY));

        superStar = { x: starX, y: starY };
        superStarCountdown = superStarCountdownInitial; // Reset countdown value
        superStarTimer = setInterval(() => {
            superStarCountdown--;
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
            !isCollisionWithBlackHole(food.x, food.y) &&
            !isCollisionWithStar(food.x, food.y)) {
            validPosition = true;
        }
    }

// Generate black holes if good dice roll - do last so black holes can be strategically placed
	if (Math.random() < probBlackHole) {
        generateBlackHoles();
    } else {
        blackHolesActive = false;
    }
	
}

function updateScoreDisplay() {
    const scoreDisplay = document.getElementById('score');
scoreDisplay.textContent = `Score: ${score} (${difficulty}) Apples: ${applesCollected} Level: ${currentLevel}`;
}

function checkGameOver() {
    const hitLeftWall = worm[0].x < 0;
    const hitRightWall = worm[0].x > canvas.width - cellSize;
    const hitTopWall = worm[0].y < 0;
    const hitBottomWall = worm[0].y > canvas.height - cellSize;

    return hitLeftWall || hitRightWall || hitTopWall || hitBottomWall;
}

function checkSelfCollision() {
    for (let i = 1; i < worm.length; i++) {
        if (worm[i].x === worm[0].x && worm[i].y === worm[0].y) {
            return true;
        }
    }
    return false;
}

function isCollisionWithSnake(x, y) {
    return worm.some(segment => segment.x === x && segment.y === y);
}

function isCloseToApple(x, y) {
    return Math.abs(x - food.x) < 5 * cellSize && Math.abs(y - food.y) < 5 * cellSize;
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

function gameLoop(currentTime) {
    if (checkGameOver() || checkSelfCollision()) {
        alert("Game Over!");
        document.location.reload();
        return;
    }

    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
    if (secondsSinceLastRender < 1 / speed) {
        requestAnimationFrame(gameLoop);
        return;
    }

    lastRenderTime = currentTime;

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

document.addEventListener("keydown", function(event) {
	const newDirection = directions[event.key];
	if (newDirection) {
		if (isLevelPaused) {
            isLevelPaused = false;
            // Unpause the game and start the new level
		}
       
        if (newDirection && !(direction.x === newDirection.x * -1 && direction.y === newDirection.y * -1)) {
        direction = newDirection; // Update direction if it's not the opposite
    }     
    }
});
