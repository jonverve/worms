const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const cellSize = 20;
let canvasSize = 400; // Initial canvas size
canvas.width = canvasSize;
canvas.height = canvasSize;

let speed; // Will be set based on difficulty
let worm = [{ x: 200, y: 200 }];
let food = { x: 0, y: 0 };
let superStar = null;
let superStarTimer = null;
let direction = { x: 0, y: 0 };
let score = 0;
let lastRenderTime = 0;
let difficulty = '';
let applesCollected = 0; // Counter to track the number of apples collected
let superStarCountdown = null;
let superStarCountdownInitial = null; // Initial countdown value in seconds
let appleLevels = null; // number of apples until level canvas shrinks


const directions = {
    ArrowUp: { x: 0, y: -cellSize },
    ArrowDown: { x: 0, y: cellSize },
    ArrowLeft: { x: -cellSize, y: 0 },
    ArrowRight: { x: cellSize, y: 0 },
};

let wormTexture = null; // Default texture (null for no texture)

function loadTexture(texturePath) {
    const img = new Image();
    img.src = texturePath;
    return img;
}

const grassTexture = loadTexture('grass_texture.png');
const woodTexture = loadTexture('wood_texture.png');
const metalTexture = loadTexture('metal_texture.png');
const starTexture = loadTexture('star.png');

function drawWorm() {
    worm.forEach(segment => {
        if (wormTexture) {
            ctx.drawImage(wormTexture, segment.x, segment.y, cellSize, cellSize);
        } else {
            drawCell(segment, 'green');
        }
    });
}

/* Commented out - switched to automatically picked by difficulty level
function selectTexture(texture) {
    switch (texture) {
        case 'grass':
            wormTexture = grassTexture;
            break;
        case 'wood':
            wormTexture = woodTexture;
            break;
        case 'metal':
            wormTexture = metalTexture;
            break;
        default:
            wormTexture = null;
    }
} */

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
            break;
        case 'Worm Wriggler':
		    superStarCountdownInitial = 4;
		    appleLevels = 10;
            speed = 10;
			wormTexture = woodTexture;
            break;
        case 'Speedy Serpent':
		    superStarCountdownInitial = 3;
		    appleLevels = 5;
            speed = 16;
			wormTexture = metalTexture;
            break;
        default:
            speed = 5;
    }

    worm = [{ x: 200, y: 200 }];
    food = { x: Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize, 
             y: Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize };
    direction = { x: 0, y: 0 };
    score = 0;
    lastRenderTime = 0;
    applesCollected = 0; // Reset apples collected counter

    updateScoreDisplay();
    gameLoop();
    updateScoreDisplay();
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
    const head = { x: worm[0].x + direction.x, y: worm[0].y + direction.y };
    worm.unshift(head);

    if (head.x === food.x && head.y === food.y) {
	    applesCollected++;
        score += 1;
        updateScoreDisplay();
        generateFood();
    } else {
        worm.pop();
    }
}


function generateFood() {
    food = {
        x: Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize,
        y: Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize
    };

    if (applesCollected % appleLevels === 0) {
        canvasSize -= cellSize; // Decrease canvas size by one block
        canvas.width = canvasSize;
        canvas.height = canvasSize;

		// EXPERIMENTAL - Move each segment of the worm away from the walls if necessary
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
    if (food.x >= canvasSize || food.y >= canvasSize) {
        generateFood(); // Regenerate food if it's out of bounds
        return;
    }
	
	// Generate a random number between 0 and 1
    const randomValue = Math.random();

    // Check if the random value is less than constant to determine if the super star should appear
    if (randomValue < 0.18) {
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
}

function updateScoreDisplay() {
    const scoreDisplay = document.getElementById('score');
scoreDisplay.textContent = `Score: ${score} (${difficulty}) Apples: ${applesCollected}`;
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    moveWorm();
    drawWorm();
    drawFood();
    checkSuperStarCollision();

    requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", function(event) {
    const newDirection = directions[event.key];
    if (newDirection) {
        direction = newDirection;
    }
});
