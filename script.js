
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const cellSize = 20;
const canvasSize = 400;
canvas.width = canvasSize;
canvas.height = canvasSize;

let speed = 5; // Speed in frames per second
let worm = [{ x: 200, y: 200 }];
let food = { x: 0, y: 0 };
let direction = { x: 0, y: 0 };
let score = 0;
let lastRenderTime = 0;

const directions = {
    ArrowUp: { x: 0, y: -cellSize },
    ArrowDown: { x: 0, y: cellSize },
    ArrowLeft: { x: -cellSize, y: 0 },
    ArrowRight: { x: cellSize, y: 0 },
};

function drawCell({ x, y }, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellSize, cellSize);
}

function drawWorm() {
    worm.forEach(segment => drawCell(segment, 'green'));
}

function drawFood() {
    drawCell(food, 'red');
}

function moveWorm() {
    if (direction.x === 0 && direction.y === 0) return; // Prevent movement if no direction is set

    const head = { x: worm[0].x + direction.x, y: worm[0].y + direction.y };
    worm.unshift(head);

    if (checkGameOver()) {
        alert(`Game Over! Your score: ${score}`);
        document.location.reload();
        return;
    }

    if (head.x === food.x && head.y === food.y) {
        score += 1;
        updateScoreDisplay();
        generateFood();
    } else {
        worm.pop();
    }
}

function checkGameOver() {
    const hitLeftWall = worm[0].x < 0;
    const hitRightWall = worm[0].x >= canvasSize;
    const hitTopWall = worm[0].y < 0;
    const hitBottomWall = worm[0].y >= canvasSize;

    if (hitLeftWall || hitRightWall || hitTopWall || hitBottomWall) {
        return true;
    }

    for (let i = 1; i < worm.length; i++) {
        if (worm[i].x === worm[0].x && worm[i].y === worm[0].y) {
            return true;
        }
    }

    return false;
}

function updateScoreDisplay() {
    const scoreDisplay = document.getElementById('score');
    scoreDisplay.textContent = `Score: ${score}`;
}

function generateFood() {
    function randomCoord() {
        return Math.floor(Math.random() * (canvasSize / cellSize)) * cellSize;
    }

    let newFoodPosition;
    while (true) {
        newFoodPosition = { x: randomCoord(), y: randomCoord() };
        if (!worm.some(segment => segment.x === newFoodPosition.x && segment.y === newFoodPosition.y)) {
            break;
        }
    }

    food = newFoodPosition;
}

function gameLoop(currentTime) {
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

function changeDirection(event) {
    const newDirection = directions[event.key];
    if (newDirection && 
        !(newDirection.x === -direction.x && newDirection.y === direction.y) &&
        !(newDirection.x === direction.x && newDirection.y === -direction.y)) {
        direction = newDirection;
    }
}

document.addEventListener("keydown", changeDirection);
generateFood();
gameLoop();
