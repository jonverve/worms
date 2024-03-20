const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Cell is size of all sprites (worm, apples, & all other game elements)
let canvasCellWidth = 20;
let canvasCellHeight = 20;

// Pixels per cell
let cellSize = 20;

// Initial canvas width and height
canvas.width = cellSize * canvasCellWidth;
canvas.height = cellSize * canvasCellHeight;

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

let mouseStartX = 0;
let mouseStartY = 0;
let mouseEndX = 0;
let mouseEndY = 0;

let cheatMode = false;
let blackHoleAfterSegment = []; // tracks the segment of the worm just before a blackhole, null if the worm not going through blackhole. could be more than 1 segment (array) also used for cheatmode screenwrapping
let enteredBlackHole = 0; // tracks number of times the worm is through the black hole (could be more than 1)
let probBlackHole = 1; // probability of a black hole when spawned
let probStar = 0.25; // probability of a star per apple level
let blackHolesActive = false;
let blackHoles = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
let applesPerNewBlackHole = 5; // regen blackholes only every 5 apples
const minDistanceBetweenBlackHoles = 9 * cellSize; // Minimum distance between black holes when spawned

const highScoreKey = 'wormGameHighScores';
const highScoreLength = 30;

let currentLevel = 1;
let applesPerLevel = 10;
let isLevelPaused = false; // To track if the game is paused for a new level

let directionQueue = []; // Initialize a queue to store direction changes
let speed; // Will be set based on difficulty
let worm = [];
let food = { x: 0, y: 0, type: "apple" };
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
const worm1Texture = loadTexture('img/worm2.png');
const worm2Texture = loadTexture('img/worm.png');
const worm3Texture = loadTexture('img/worm3.png');
const worm1HeadTexture = loadTexture('img/worm3.png');
const worm2HeadTexture = loadTexture('img/worm2.png');
const worm3HeadTexture = loadTexture('img/worm.png');
const starTexture = loadTexture('img/star.png');
const appleTexture = loadTexture('img/apple2.png');
const blackholeTexture = loadTexture('img/blackhole.png');
const fixedBlockTexture = loadTexture('img/block.png');

const highScores = loadHighScores(); // Load high scores at the start

const fixedBlocksConfig = [
    [], // No Level 0
	[], // Empty Level 1
	[{ x: 60, y: 60 }, { x: 60, y: 300 }, { x: 300, y: 60 }, { x: 300, y: 300 }], // Level 2
    [{ x: 180, y: 80 }, { x: 180, y: 100 }, { x: 180, y: 120 }, { x: 180, y: 140 }, { x: 180, y: 160 }, { x: 180, y: 180 }, { x: 180, y: 200 }, { x: 180, y: 220 }, { x: 180, y: 240 }, { x: 180, y: 260 }], // Level 3
	[{ x: 80, y: 140 }, { x: 80, y: 160 }, { x: 80, y: 180 }, { x: 80, y: 200 }, { x: 260, y: 140 }, { x: 260, y: 160 }, { x: 260, y: 180 }, { x: 260, y: 200 }], // Level 4
    [{ x: 80, y: 160 }, { x: 100, y: 160 }, { x: 120, y: 160 }, { x: 140, y: 160 }, { x: 160, y: 160 }, { x: 180, y: 160 }, { x: 200, y: 160 }, { x: 220, y: 160 }], // Level 5
    // ... Add more configurations for additional levels
];
let fixedBlocks = [];

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
		    appleLevels = 10;
            speed = 13;
			wormTexture = worm3Texture;
			wormHeadTexture = worm3HeadTexture;
			appleWorth = 3;
            break;
    }
	worm = [
        { x: cellSize * canvasCellWidth / 2, y: cellSize * canvasCellHeight / 2 }, // Head segment
        { x: cellSize + cellSize * canvasCellWidth / 2, y: cellSize + cellSize * canvasCellHeight / 2 }  // Second segment
    ];
    food = { x: Math.floor(Math.random() * (canvas.width / cellSize)) * cellSize, 
             y: Math.floor(Math.random() * (canvas.height / cellSize)) * cellSize,
			 type: 'apple' };
    direction = { x: 0, y: 0 };
    score = 0;
    lastRenderTime = 0;
	fixedBlocks = fixedBlocksConfig[currentLevel] || [];

    applesCollected = 0; // Reset apples collected counter
    adjustCanvasSize(); // only adjusts if screenwidth is <= 600px
    updateScoreDisplay();
	pauseGameForNewLevel();
    gameLoop();
}

function adjustCanvasSize() {
    if (window.innerWidth <= 600) {
        // Find the best fitting cellSize for the viewport
        const maxCellsFitWidth = Math.floor(window.innerWidth / cellSize);
        const maxCellsFitHeight = Math.floor(window.innerHeight / cellSize);
        const minCellsFit = Math.min(maxCellsFitWidth, maxCellsFitHeight);

        cellSize = Math.floor(Math.min(window.innerWidth, window.innerHeight) / minCellsFit);

        canvas.width = cellSize * minCellsFit;
        canvas.height = cellSize * minCellsFit;
    } else {
        // Reset to default sizes for larger screens
        cellSize = 20;
        canvas.width = cellSize * canvasCellWidth;
        canvas.height = cellSize * canvasCellHeight;
    }

    // Update any other game elements that depend on cellSize...
}

// #############################
// ## GAMELOOP CORE FUNCTIONS ##
// #############################

function gameLoop(currentTime) {
	// Check for game over conditions
	if (!cheatMode && (checkWormWallCollision() || checkWormSelfCollision() || checkWormBlockCollision())) {
			
		if (isHighScore(score)) {
		let playerName = prompt("Congratulations! Enter your name for the high score: (cancel to not record score)"); // Prompt for the player's name
		if (playerName) { updateHighScores(score, playerName); }
		}
		alert("Game Over! \nFinal score: " + score + "\nApples collected: " + applesCollected + "\nLevel: " + currentLevel + "\nDifficulty level: " + difficulty);
		document.location.reload();
		return;
	} 		

	// Manage worm speed
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
		drawFixedBlocks();
		drawWorm();
		drawFood();
		drawBlackHoles();
		checkSuperStarCollision();
	}
	
    requestAnimationFrame(gameLoop);
}

function moveWorm() {
    let head = { x: worm[0].x + direction.x, y: worm[0].y + direction.y };
	let enteredBlackHole = 0;

    // Check if the worm's head enters a black hole
    if (blackHolesActive) {
        for (let i = 0; i < blackHoles.length; i++) {
            if (head.x === blackHoles[i].x && head.y === blackHoles[i].y) {
                headEnteredBlackHole = true;
                let otherBH = blackHoles[(i + 1) % blackHoles.length];
                head = { x: otherBH.x + direction.x, y: otherBH.y + direction.y };
                if (enteredBlackHole === 0) {
                    enteredBlackHole++;
                }
                blackHoleAfterSegment.push(1);
                break;
            }
        }
    }

    // Cheat mode: Loop worm from one edge to the other
    if (cheatMode && checkWormWallCollision()) {
        headEnteredBlackHole = true;
        if (head.x < 0) {
            head.x = canvas.width - cellSize;
        } else if (head.x >= canvas.width) {
            head.x = 0;
        }

        if (head.y < 0) {
            head.y = canvas.height - cellSize;
        } else if (head.y >= canvas.height) {
            head.y = 0;
        }
		if (enteredBlackHole === 0) {
			enteredBlackHole++;
		}
        blackHoleAfterSegment.push(1);
    }

    worm.unshift(head);
	
    // Update and filter blackHoleAfterSegment array
    blackHoleAfterSegment = blackHoleAfterSegment.map(segment => segment + 1).filter(segment => {
        if (segment <= worm.length) {
            return true;
        } else {
            if (enteredBlackHole > 0) {
                enteredBlackHole--;
            }
            return false;
        }
    });

	// check if worm got apple
    if (head.x === food.x && head.y === food.y) {
	    applesCollected++;
        if (!cheatMode) { score += appleWorth; } // only increment score if not in cheat mode
        updateScoreDisplay();
		applyPopAnimation(food);

		// Check if a new level is reached
		if (applesCollected % applesPerLevel === 0) {
			currentLevel++;
			updateScoreDisplay();
			pauseGameForNewLevel();
		}
		generateObjects();
		
    } else {
        worm.pop();
    }
}

function pauseGameForNewLevel() {
    // Pause game logic (e.g., stop rendering, disable movement)
    isLevelPaused = true;
	
    // Display level number and prompt for user action
    // Call this after a short delay to ensure game loop acknowledges the pause
    setTimeout(displayLevelInfo, 100);
}

function displayLevelInfo() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${currentLevel}`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText('Press an arrow key to start', canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillStyle = 'black';
    ctx.fillText(`Level ${currentLevel}`, canvas.width / 2 + 2, canvas.height / 2 - 18);
    ctx.fillText('Press an arrow key to start', canvas.width / 2 + 2, canvas.height / 2 + 18);
}

function updateScoreDisplay() {
    const scoreDisplay = document.getElementById('score');
	scoreDisplay.textContent = `${difficulty} Level ${currentLevel}. Apples: ${applesCollected} Score: ${score}`;
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

function checkWormBlockCollision() {
    return fixedBlocks.some(block => 
        worm[0].x === block.x && worm[0].y === block.y
    );
}

function checkSuperStarCollision() {
    if (superStar && worm[0].x >= superStar.x && worm[0].x < superStar.x + cellSize &&
        worm[0].y >= superStar.y && worm[0].y < superStar.y + cellSize) {
            if (!cheatMode) { score += 4; } // only add to score if not in cheatmode
            updateScoreDisplay();
	        // Add pop animation to super star
            applyPopAnimation(superStar);

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

function generateObjects() {
	// order of this subroute:
	//    1. decrease canvas size (at correct time)
	//    2. generate fixed blocks (since they don't move)
	//    3. generate stars	(at random)
	//    4. generate apple 
	//    5. generate blackholes (at random) last so they can be strategically placed

   // shrink canvas every appleLevels and only if canvas height/width is over a certain size
   if ((applesCollected % appleLevels === 0) && (canvas.height > 6 * cellSize) && (canvas.height > 6 * cellSize)) {
        // Decrease canvas size by one block in height and width
        canvas.width -= cellSize;
        canvas.height -= cellSize;
		
		// Ensure that the worm is correctly repositioned in all scenarios when the canvas shrinks
		repositionWormIfOutOfBounds();
    }

	// generate fixed blocks
    fixedBlocks = fixedBlocksConfig[currentLevel] || [];

    // Generate super star if good dice roll
    if (Math.random() < probStar) {
        let starX, starY;
		let loopCount = 0;
        do {
			loopCount++;
            starX = Math.floor(Math.random() * (canvas.width / cellSize)) * cellSize;
            starY = Math.floor(Math.random() * (canvas.height / cellSize)) * cellSize;
			console.log("starX, starY", starX, starY);
        } while ((loopCount < 15) && (isCollisionWithSnake(starX, starY) || isCloseToApple(starX, starY) || isCollisionWithBlackHole(starX, starY) || isCollisionWithFixedBlocks(starX, starY)));
		
        superStar = { x: starX, y: starY, type: 'star' };
		
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
        food.x = Math.floor(Math.random() * (canvas.width / cellSize)) * cellSize;
        food.y = Math.floor(Math.random() * (canvas.height / cellSize)) * cellSize;
		food.type = 'apple';
		console.log("food.x, food.y: ", food.x, food.y);

        // Check for collisions with snake, black holes, and the star
        if (!isCollisionWithSnake(food.x, food.y) && 
            !isCollisionWithStar(food.x, food.y) &&
            !isCollisionWithFixedBlocks(food.x, food.y) &&
			!isCollisionWithBlackHole(food.x, food.y)) {
            validPosition = true;
		}	
		// make sure apple isn't next to border if level will shrink next round (i.e. is 1 less than multiple of applesPerLevel)
		if ((currentLevel + 1) % applesPerLevel === 0) { 
			if (food.x === canvas.width || food.x === 0 || food.y === canvas.height || food.y === 0) {
				validPosition = false;
			}
		}
        
    }
    // debug - console.log('apple location x y', food.x, food.y, 'apple # ', applesCollected);


	// Generate black holes if good dice roll - do last so black holes can be strategically placed based on worm head and apple/star
	// Only generate if the worm is NOT teleporting through the black holes. If it is, then keep current black hole in place
	// Only generate every applesPerNewBlackHole and if size of shrinking canvas is greater than a ratio of minDistanceBetweenBlackHoles (otherwise they can't fit!)

	// Check if the number of apples collected is a multiple of applesPerNewBlackHole and make sure worm is not currently in a blackhole
	if ((applesCollected % applesPerNewBlackHole === 0) && (blackHoleAfterSegment.length === 0)) {
		blackHolesActive = false; // Set blackHolesActive to false by default

		// make sure canvas is big enough to accomodate separation
		if (canvas.width + canvas.height > 3.0 * minDistanceBetweenBlackHoles) {
			
			if (Math.random() < probBlackHole) {
				let loopCount = 0;
				do {
					loopCount++;
					generateBlackHoles();
				} while (areBlackHolesTooClose() && (loopCount < 15));
				// Set blackHolesActive to true only if the above conditions are met
				if (loopCount < 15) { blackHolesActive = true; }
			}
		}
	}
}


function generateBlackHoles() {
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

function areBlackHolesTooClose() {
	    let positionIsInvalid = false;
		// Ensure black holes are at least minDistanceBetweenBlackHoles away from each other
		let i = 1;
		for (let j = 0; j < i; j++) {
			let xDistance = Math.abs(blackHoles[j].x - blackHoles[i].x);
			let yDistance = Math.abs(blackHoles[j].y - blackHoles[i].y);
			let totalDistance = xDistance + yDistance;
			console.log("totalDistance", totalDistance);
			if (totalDistance < minDistanceBetweenBlackHoles) {
				positionIsInvalid = true;
				break;
			}
		}
	return positionIsInvalid;
}

function spawnBlackHoleNear(target, range, index) {
    const margin = 4 * cellSize; // margin is to keep blackholes away from the edge of the canvas
    let i = index;
    let positionIsValid;
    do {
        // Calculate potential new positions
        let potentialX = target.x + (Math.floor(Math.random() * (2 * range + 1)) - range) * cellSize;
        let potentialY = target.y + (Math.floor(Math.random() * (2 * range + 1)) - range) * cellSize;

        // Ensure the positions are within the canvas boundaries considering the margin
        potentialX = Math.max(margin, Math.min(potentialX, canvas.width - margin - cellSize));
        potentialY = Math.max(margin, Math.min(potentialY, canvas.height - margin - cellSize));

        // Assign the validated positions
        blackHoles[i].x = potentialX;
        blackHoles[i].y = potentialY;
		
		console.log("blackhole x y: ", potentialX, potentialY);

        // Check if the position is valid (5 criteria)
        positionIsValid = !isOutOfBounds(blackHoles[i].x, blackHoles[i].y) &&
                          !isCollisionWithSnake(blackHoles[i].x, blackHoles[i].y) &&
                          !isCollisionWithApple(blackHoles[i].x, blackHoles[i].y) &&
						  !isCollisionWithFixedBlocks(blackHoles[i].x, blackHoles[i].y) &&
                          !isCollisionWithStar(blackHoles[i].x, blackHoles[i].y);

    } while (!positionIsValid);
}

function isOutOfBounds(x, y) {
    return x < 0 || x >= canvas.width || y < 0 || y >= canvas.height;
}

function isCollisionWithSnake(x, y) {
    return worm.some(segment => segment.x === x && segment.y === y);
}

function isCollisionWithFixedBlocks(x, y) {
    return fixedBlocks.some(block => 
        x === block.x && y === block.y
    );
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

    if (maxX >= canvas.width) {
        moveX = canvas.width - cellSize - maxX;
    } else if (minX < 0) {
        moveX = -minX;
    }

    if (maxY >= canvas.height) {
        moveY = canvas.height - cellSize - maxY;
    } else if (minY < 0) {
        moveY = -minY;
    }
	// debug - console.log("minX, minY, moveX, moveY", minX, minY, moveX, moveY)
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

function drawFixedBlocks() {
    fixedBlocks.forEach(block => {		
		if (fixedBlockTexture) {
			ctx.drawImage(fixedBlockTexture, block.x, block.y, cellSize, cellSize);
		} else {
			drawCell(block, 'brown');
		} 
    });
}

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
		// worm head
        if (i === 0) {

			if(cheatMode && Math.random() < 0.5) {
				drawWormSegment(worm[i], starTexture); // blink worm head if cheatmode is on
		} else {
			drawWormSegment(worm[i], wormHeadTexture); } 
 	
		} else

		// draw worm body
		drawWormSegment(worm[i], wormTexture);

        // draw worm middle segments - only draw if not last segment and segment is not between black holes
        if (i > 0 && !blackHoleAfterSegment.includes(i + 1)) {
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

function applyPopAnimation(obj) {
    let canvasRect = canvas.getBoundingClientRect();
    let texture;

    switch (obj.type) {
        case 'star':
            texture = starTexture;
            break;
        case 'apple':
            texture = appleTexture;
            break;
        // Add cases for other types as needed
        default:
            texture = worm1Texture; // Fallback texture
    }

    let objElement = document.createElement('div');
    objElement.style.position = 'absolute';
    objElement.style.left = `${canvasRect.left + obj.x}px`;
    objElement.style.top = `${canvasRect.top + obj.y}px`;
    objElement.style.width = `${cellSize}px`;
    objElement.style.height = `${cellSize}px`;

    let imgElement = document.createElement('img');
    imgElement.src = texture.src;
    imgElement.style.width = '100%';
    imgElement.style.height = '100%';

    objElement.appendChild(imgElement);
    objElement.classList.add('pop-animation');
    document.body.appendChild(objElement);

    objElement.addEventListener('animationend', () => {
        document.body.removeChild(objElement);
    });
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

function updateHighScores(currentScore, playerName) {
    const highScores = loadHighScores(); // Load existing high scores

    // Create an object for the new score
    const newScore = { 
        name: playerName,
        difficulty: difficulty,
        applesCollected: applesCollected,
        levelAchieved: currentLevel,
        totalScore: score
    };

    // Add the new score to the list and sort it
    highScores.push(newScore);
    highScores.sort((a, b) => b.totalScore - a.totalScore); // Sort in descending order of scores

    // Keep only the top scores
    while (highScores.length > highScoreLength) {
        highScores.pop(); // Remove the last item if there are too many scores
    }

    saveHighScores(highScores); // Save the updated list of high scores
}

function saveHighScores(highScores) {
    localStorage.setItem(highScoreKey, JSON.stringify(highScores));
}

// ###################################################
// ## GAME KEY AND SWIPE CONTROL LISTENER AND LOGIC ##
// ###################################################

function processDirectionQueue() {
    while (directionQueue.length > 0) {
        const newDirection = directionQueue.shift();
        if (!(newDirection.x === -direction.x && newDirection.y === -direction.y)) {
            direction = newDirection;
            break;
        }
    }
}
function changeDirection(newDirection) {
    // Limit the queue to only the last 3 directions
    if (directionQueue.length < 3) {
        directionQueue.push(newDirection);
    }
}

// Modified function for keyboard input
function handleKeyInput(event) {
    let keyPressed = event.key;
    if (['W', 'A', 'S', 'D', 'X', 'w', 'a', 's', 'd', 'x'].includes(keyPressed)) {
        keyPressed = keyPressed.toLowerCase(); // Convert WASD keys to lowercase
    }
    
    if (keyPressed === "x") {
        cheatMode = !cheatMode;
        score = 0; // clear score when you enter cheat mode
        updateScoreDisplay();
    }

    const newDirection = directions[keyPressed];
    if (newDirection) {
        changeDirection(newDirection); // Use the changeDirection function

        // Unpause the game and start the new level
        if (isLevelPaused) {
            isLevelPaused = false;
        }
    }
}

// Touch control handlers
function handleTouchStart(event) {
    event.preventDefault(); // Prevent default action	
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}

function handleTouchMove(event) {
    event.preventDefault(); // Prevent default action
    touchEndX = event.changedTouches[0].clientX;
    touchEndY = event.changedTouches[0].clientY;
}

// Updated touch control functions
function handleTouchEnd() {
    event.preventDefault(); // Prevent default action
	// Unpause the game if it is paused
    if (isLevelPaused) {
        isLevelPaused = false;
        return; // Exit the function to avoid changing the direction if the game was paused
    }
	
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    let touchDirection;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        touchDirection = deltaX > 0 ? directions['ArrowRight'] : directions['ArrowLeft'];
    } else {
        // Vertical swipe
        touchDirection = deltaY > 0 ? directions['ArrowDown'] : directions['ArrowUp'];
    }

    changeDirection(touchDirection); // Use the same changeDirection function
}

function handleMouseDown(event) {
    mouseStartX = event.clientX;
    mouseStartY = event.clientY;
}

function handleMouseMove(event) {
    // You might not need to handle mousemove unless you want real-time tracking
}

function handleMouseUp(event) {
    // Unpause the game if it is paused
    if (isLevelPaused) {
        isLevelPaused = false;
        return; // Exit the function to avoid changing the direction if the game was paused
    }
	
    mouseEndX = event.clientX;
    mouseEndY = event.clientY;

    const deltaX = mouseEndX - mouseStartX;
    const deltaY = mouseEndY - mouseStartY;

    let mouseDirection;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal movement
        mouseDirection = deltaX > 0 ? directions['ArrowRight'] : directions['ArrowLeft'];
    } else {
        // Vertical movement
        mouseDirection = deltaY > 0 ? directions['ArrowDown'] : directions['ArrowUp'];
    }

    changeDirection(mouseDirection);
}

// Mouse
document.addEventListener('mousedown', handleMouseDown, false);
document.addEventListener('mousemove', handleMouseMove, false);
document.addEventListener('mouseup', handleMouseUp, false);

// Keyboard
document.addEventListener("keydown", handleKeyInput);

// Add touch event listeners with { passive: false }
document.addEventListener('touchstart', handleTouchStart, { passive: false });
document.addEventListener('touchmove', handleTouchMove, { passive: false });
document.addEventListener('touchend', handleTouchEnd, { passive: false });

