const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const cellSize = 20;
const canvasSize = 400;
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

function drawWorm() {
    worm.forEach(segment => {
        if (wormTexture) {
            ctx.drawImage(wormTexture, segment.x, segment.y, cellSize, cellSize);
        } else {
            drawCell(segment, 'green');
        }
    });
}

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
}

function startGame(selectedDifficulty) {
    difficulty = selectedDifficulty;
    document.getElementById('openingScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';

    switch (difficulty) {
        case 'Easy Peasy':
            speed = 3;
            break;
        case 'Worm Wriggler':
            speed = 6;
            break;
        case 'Speedy Serpent':
            speed = 10;
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

    updateScoreDisplay();
    gameLoop();
}

function drawCell({ x, y }, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellSize, cellSize);
}

function drawFood() {
    drawCell(food, 'red');

    if (superStar) {
        drawCell(superStar, 'yellow');

        // Draw countdown text
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(superStarCountdown.toString(), superStar.x + cellSize / 2, superStar.y+15);
    }
}

function moveWorm() {
    const head = { x: worm[0].x + direction.x, y: worm[0].y + direction.y };
    worm.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 1;
        updateScoreDisplay();
        generateFood();
    } else {
        worm.pop();
    }
}

let superStarCountdown = 5; // Initial countdown value in seconds

function generateFood() {
    food = {
        x: Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize,
        y: Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize
    };

    // Generate a random number between 0 and 1
    const randomValue = Math.random();

    // Check if the random value is less than 0.5 to determine if the super star should appear
    if (randomValue < 0.15) {
        let starX, starY;
        do {
            starX = Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize;
            starY = Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize;
        } while (isCollisionWithSnake(starX, starY) || isCloseToApple(starX, starY));

        superStar = { x: starX, y: starY };
        superStarCountdown = 3; // Reset countdown value
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
    scoreDisplay.textContent = `Score: ${score} (${difficulty})`;
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
