const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const cellSize = 20;
const canvasSize = 400;
canvas.width = canvasSize;
canvas.height = canvasSize;

let speed; // Will be set based on difficulty
let worm = [{ x: 200, y: 200 }];
let food = { x: 0, y: 0 };
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



// Add a global variable to store the chosen texture
let wormTexture = null; // Default texture (null for no texture)

// Function to load textures
function loadTexture(texturePath) {
    const img = new Image();
    img.src = texturePath;
    return img;
}

// Preload textures
const grassTexture = loadTexture('grass_texture.png');
const woodTexture = loadTexture('wood_texture.png');
const metalTexture = loadTexture('metal_texture.png');
// Add more textures as needed

// Modify the drawWorm function to use textures
function drawWorm() {
    worm.forEach(segment => {
        if (wormTexture) {
            ctx.drawImage(wormTexture, segment.x, segment.y, cellSize, cellSize);
        } else {
            drawCell(segment, 'green'); // Default color if no texture selected
        }
    });
}

// Function to handle texture selection
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
        // Add more cases for additional textures
        default:
            wormTexture = null; // No texture selected
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

    // Reset game state
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
}

function moveWorm() {
    const head = { x: worm[0].x + direction.x, y: worm[0].y + direction.y };
    worm.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 1;
        updateScoreDisplay(); // Update score display
        generateFood();
    } else {
        worm.pop();
    }
}

function generateFood() {
    food = { x: Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize, 
             y: Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize };
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

    requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", function(event) {
    const newDirection = directions[event.key];
    if (newDirection) {
        direction = newDirection;
    }
});

// gameLoop();  // No longer start the game loop automatically
