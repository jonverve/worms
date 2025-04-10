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

// Monster variables
let monsterEnabled = false;
let monster = {
    x: 0,
    y: 0,
    centerX: 0,
    centerY: 0,
    angle: 0,
    radius: 4 * cellSize,
    speed: 0 // Will be set based on difficulty
};

// Golden apple properties
const goldenAppleTimeout = 5; // seconds before golden apple disappears
const goldenApplePoints = 5; // bonus points for golden apple
const goldenAppleGrowth = 3; // how many segments to grow
let goldenAppleProb = 0.1; // probability of spawning golden apple
let goldenAppleTimer = null;
let goldenAppleStartTime = null;

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
const highScoreLength = 5;

let currentLevel = 1;
let applesPerLevel = 10;
let isLevelPaused = false; // To track if the game is paused for a new level
let isForcedPause = false; // To track if we're in the forced pause period
let forcedPauseTimer = null; // To track the forced pause timer

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
let shrinkingEnabled = true; // Track if shrinking is enabled

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
const goldenAppleTexture = loadTexture('img/apple2.png'); // TODO: Replace with golden apple image
const blackholeTexture = loadTexture('img/blackhole.png');
const fixedBlockTexture = loadTexture('img/block.png');

const highScores = loadHighScores(); // Load high scores at the start

// Add these variables at the top with other game state variables
let debugMode = false;
let preserveWormState = false; // New variable to track worm state preservation

// Parse ASCII level design into block coordinates
function parseLevel(levelText) {
    const blocks = [];
    const blackHoles = [];
    const lines = levelText.split('\n');
    
    lines.forEach((line, y) => {
        if (line.startsWith('LINE')) {
            const lineNum = parseInt(line.split(':')[0].replace('LINE ', '')) - 1;
            const content = line.split(':')[1].trim();
            
            [...content].forEach((char, x) => {
                if (char === '#') {
                    blocks.push({ x: x * 20, y: lineNum * 20 });
                } else if (char === '@') {
                    blackHoles.push({ cell_x: x, cell_y: lineNum });
                }
            });
        }
    });
    return { blocks, blackHoles };
}

const levelDesigns = [
    "", // No Level 0
    "", // Empty Level 1
    `// Level 2 - Corner blocks with black holes
LINE 4:  ...#...........#....
LINE 5:  ....@...............
LINE 15: ..............@.....
LINE 16: ...#...........#....`,

    `// Level 3 - Vertical line with black holes
LINE 5:  .........#..........
LINE 6:  .........#..........
LINE 7:  ....@....#..........
LINE 8:  .........#..........
LINE 9:  .........#..........
LINE 10: .........#..........
LINE 11: .........#..........
LINE 12: .........#..........
LINE 13: .........#..........
LINE 14: .........#.....@....
LINE 15: .........#..........
LINE 16: .........#..........`,

    `// Level 4 - Two vertical bars with black holes
LINE 8:  ......#......#@.....
LINE 9:  ......#......#......
LINE 10: ......#......#......
LINE 11: ......#......#......
LINE 12: .....@#......#......`,

    `// Level 5 - Horizontal line with black holes
LINE 8:  .......@............
LINE 10: ....#############...
LINE 12: .............@......`,

    `// Level 6 - X pattern with black holes
LINE 5:  .....@..............
LINE 6:  ......#.....#.......
LINE 7:  .......#####........
LINE 8:  ........###.........
LINE 9:  .........#..........
LINE 11: .........#..........
LINE 12: ........###.........
LINE 13: .......#####........
LINE 14: ......#.....#.......
LINE 15: .............@......`,

    `// Level 7 - Diamond pattern with black holes
LINE 5:  ....@....#..........
LINE 6:  ........###.........
LINE 7:  .......#####........
LINE 8:  ......#.....#.......
LINE 10: ....#.........#.....
LINE 12: ......#.....#.......
LINE 13: .......#####........
LINE 14: ........###.........
LINE 15: .........#.....@....`,

    `// Level 8 - Maze with 2-cell paths
LINE 1:  ####################
LINE 2:  #.......#.........@#
LINE 3:  #..................#
LINE 4:  #..#####.###.......#
LINE 5:  #..#####.###.......#
LINE 6:  #..#.....#.........#
LINE 7:  #..#.....#.....##..#
LINE 8:  #..#..#..#.....##..#
LINE 9:  #..#..#..#......#..#
LINE 10: #..#..#..#..#...#..#
LINE 11: #..#..#.....#......#
LINE 12: #..#..#.....#......#
LINE 13: #..#..#.....#......#
LINE 14: #..#..#.....#......#
LINE 15: #..#..#.....#......#
LINE 16: #.....#.....#......#
LINE 17: #.....#.....#......#
LINE 18: #.....#.....#......#
LINE 19: #@....#.....#......#
LINE 20: ####################`,

    `// Level 9 - Spiral with black holes
LINE 3:  ....................
LINE 4:  ....#############...
LINE 5:  ....#...........#...
LINE 6:  ....#...........#...
LINE 7:  ....#...#####...#...
LINE 8:  ....#...#.......#...
LINE 9:  ....#...#.......#...
LINE 10: ....#...#.......#...
LINE 11: ....#...#.......#...
LINE 12: ....#...#.......#...
LINE 13: ....#...#########...
LINE 14: ....#...............
LINE 15: ....#@..............
LINE 16: ....################
LINE 17: ...................@`
];

const fixedBlocksConfig = [
    [], // No Level 0
    [], // Empty Level 1
    parseLevel(levelDesigns[2]),
    parseLevel(levelDesigns[3]),
    parseLevel(levelDesigns[4]),
    parseLevel(levelDesigns[5]),
    parseLevel(levelDesigns[6]),
    parseLevel(levelDesigns[7]),
    parseLevel(levelDesigns[8]),
    parseLevel(levelDesigns[9])
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

// Add this function to handle debug mode toggling
function toggleDebugMode() {
    debugMode = document.getElementById('debugMode').checked;
    const debugControls = document.getElementById('debugControls');
    
    // Ensure debug controls are properly shown/hidden
    if (debugControls) {
        debugControls.style.display = debugMode ? 'block' : 'none';
    }
    
    // Remove the "View Level Designs" button from main screen when debug mode is off
    const mainLevelDesignsButton = document.querySelector('#openingScreen > button:last-child');
    if (mainLevelDesignsButton) {
        mainLevelDesignsButton.style.display = debugMode ? 'inline-block' : 'none';
    }

    // Update level selector to current level if game is running
    if (debugMode && difficulty) {
        document.getElementById('levelSelector').value = currentLevel.toString();
    }

    // Add event listener for preserve worm state checkbox
    const preserveWormStateCheckbox = document.getElementById('preserveWormState');
    if (preserveWormStateCheckbox) {
        preserveWormStateCheckbox.addEventListener('change', toggleWormStatePreservation);
    }

    // Initialize preserveWormState based on checkbox state
    if (preserveWormStateCheckbox) {
        preserveWormState = preserveWormStateCheckbox.checked;
    }

    // Initialize probability controls
    const starProbInput = document.getElementById('starProb');
    const blackHoleProbInput = document.getElementById('blackHoleProb');
    const goldenAppleProbInput = document.getElementById('goldenAppleProb');

    if (starProbInput) {
        starProbInput.value = probStar;
        starProbInput.addEventListener('change', function() {
            probStar = parseFloat(this.value);
        });
    }

    if (blackHoleProbInput) {
        blackHoleProbInput.value = probBlackHole;
        blackHoleProbInput.addEventListener('change', function() {
            probBlackHole = parseFloat(this.value);
        });
    }

    if (goldenAppleProbInput) {
        goldenAppleProbInput.value = goldenAppleProb;
        goldenAppleProbInput.addEventListener('change', function() {
            goldenAppleProb = parseFloat(this.value);
        });
    }
}

// Add function to handle worm state preservation setting
function toggleWormStatePreservation() {
    preserveWormState = document.getElementById('preserveWormState').checked;
}

// Helper function to initialize worm at center of screen
function initializeWorm() {
    const centerX = cellSize * Math.floor(canvasCellWidth / 2);
    const centerY = cellSize * Math.floor(canvasCellHeight / 2);
    return [
        { x: centerX, y: centerY },
        { x: centerX - cellSize, y: centerY }
    ];
}

// Add function to handle level changes
function setLevel(level) {
    if (!debugMode || !difficulty) return; // Only work in debug mode and when game is running
    
    const newLevel = parseInt(level);
    if (newLevel === currentLevel) return; // No change needed
    
    // Reset worm to center of screen
    worm = initializeWorm();
    direction = { x: 0, y: 0 }; // Reset direction
    
    currentLevel = newLevel;
    fixedBlocks = fixedBlocksConfig[currentLevel] || [];
    
    // Update black holes if they exist in the level design
    const levelData = parseLevel(levelDesigns[currentLevel] || "");
    if (levelData.blackHoles && levelData.blackHoles.length === 2) {
        blackHoles[0] = cellToPixel(levelData.blackHoles[0]);
        blackHoles[1] = cellToPixel(levelData.blackHoles[1]);
        blackHolesActive = true;
    } else {
        blackHolesActive = false;
    }
    
    // Generate new food in a safe location
    generateObjects();
    
    // Update display
    updateScoreDisplay();
    pauseGameForNewLevel();
}

// Modify the startGame function to handle debug controls
function startGame(selectedDifficulty) {
    difficulty = selectedDifficulty;
    shrinkingEnabled = document.getElementById('shrinkingEnabled').checked || false;
    cheatMode = debugMode && document.getElementById('cheatModeEnabled').checked;
    monsterEnabled = debugMode && document.getElementById('monsterEnabled').checked;
    
    // Safely get preserveWormState value
    const preserveWormStateCheckbox = document.getElementById('preserveWormState');
    preserveWormState = debugMode && preserveWormStateCheckbox ? preserveWormStateCheckbox.checked : false;
    
    // Set initial level based on debug mode and level selector
    if (debugMode) {
        currentLevel = parseInt(document.getElementById('levelSelector').value);
    } else {
        currentLevel = 1; // Default to level 1 when not in debug mode
    }

    document.getElementById('openingScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';

    // Set up high score event listeners
    const highScorePanel = document.getElementById('highScorePanel');
    const highScoreForm = document.getElementById('highScoreForm');
    const highScoreList = document.getElementById('highScoreList').getElementsByTagName('tbody')[0];
    const playerNameInput = document.getElementById('playerName');
    const submitScoreButton = document.getElementById('submitScore');
    const closeButton = highScorePanel.querySelector('.close-button');
    const highScoreIcon = document.getElementById('highScoreIcon');

    // Remove any existing event listeners
    highScoreIcon.replaceWith(highScoreIcon.cloneNode(true));
    closeButton.replaceWith(closeButton.cloneNode(true));
    submitScoreButton.replaceWith(submitScoreButton.cloneNode(true));

    // Get fresh references after cloning
    const newHighScoreIcon = document.getElementById('highScoreIcon');
    const newCloseButton = highScorePanel.querySelector('.close-button');
    const newSubmitScoreButton = document.getElementById('submitScore');

    // Add new event listeners
    newHighScoreIcon.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        highScorePanel.style.display = 'block';
        showHighScores();
        isLevelPaused = true;
    });

    newCloseButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        highScorePanel.style.display = 'none';
        isLevelPaused = true;
    });

    newSubmitScoreButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const playerName = playerNameInput.value.trim();
        if (playerName) {
            updateHighScores(score, playerName);
            showHighScores();
            document.getElementById('highScoreForm').style.display = 'none';
        }
    });

    // Close panel when clicking outside
    document.addEventListener('click', function(event) {
        if (!highScorePanel.contains(event.target) && event.target !== highScoreIcon) {
            if (highScorePanel.style.display === 'block') {
                highScorePanel.style.display = 'none';
                if (event.target === canvas) {
                    isLevelPaused = false;
                }
            }
        }
    });

    switch (difficulty) {
        case 'Easy Peasy':
            superStarCountdownInitial = 6;
            appleLevels = 15;
            speed = 5;
            monster.speed = 0.1; // Match worm speed
            wormTexture = worm1Texture;
            wormHeadTexture = worm1HeadTexture;
            appleWorth = 1;
            break;
        case 'Worm Wriggler':
            superStarCountdownInitial = 4;
            appleLevels = 10;
            speed = 9;
            monster.speed = 0.18; // Match worm speed
            wormTexture = worm2Texture;
            wormHeadTexture = worm2HeadTexture;
            appleWorth = 2;
            break;
        case 'Speedy Serpent':
            superStarCountdownInitial = 3;
            appleLevels = 10;
            speed = 13;
            monster.speed = 0.26; // Match worm speed
            wormTexture = worm3Texture;
            wormHeadTexture = worm3HeadTexture;
            appleWorth = 3;
            break;
    }

    // Initialize worm at center of screen
    worm = initializeWorm();
    direction = { x: cellSize, y: 0 }; // Start moving right
    score = 0;
    lastRenderTime = 0;
    applesCollected = 0;
    fixedBlocks = fixedBlocksConfig[currentLevel] || [];

    adjustCanvasSize();
    initializeMonster();
    generateObjects();
    updateScoreDisplay();
    
    // Set initial pause state and show start message
    isLevelPaused = true;
    
    // Render the game elements
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFixedBlocks();
    drawWorm();
    drawFood();
    drawBlackHoles();
    if (monsterEnabled) {
        // Draw monster at its initial position without movement
        drawCell({ x: monster.centerX, y: monster.centerY }, 'purple');
    }
    
    // Show start message
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.fillText('Press an arrow key to start', canvas.width / 2 + 2, canvas.height / 2);
    
    gameLoop();
}

function adjustCanvasSize() {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    if (screenWidth <= 600) {  // Using screenWidth for mobile detection
        // Find the best fitting cellSize for the viewport
        const maxCellsFitWidth = Math.floor(screenWidth / cellSize);
        const maxCellsFitHeight = Math.floor(screenHeight / cellSize);
        const minCellsFit = Math.min(maxCellsFitWidth, maxCellsFitHeight);

        cellSize = Math.floor(Math.min(screenWidth, screenHeight) / minCellsFit);
        console.log('new mobile cell size', cellSize);

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
    // Initialize lastRenderTime if it's 0 (first frame)
    if (lastRenderTime === 0) {
        lastRenderTime = currentTime;
    }
    
    // Check for game over conditions
    if (!cheatMode && (checkWormWallCollision() || checkWormSelfCollision() || checkWormBlockCollision() || checkWormMonsterCollision())) {
        gameOver();
        return;
    }

    // Manage worm speed
    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
    if (secondsSinceLastRender < 1 / speed) {
        requestAnimationFrame(gameLoop);
        return;
    }

    lastRenderTime = currentTime;
    
    processDirectionQueue();

    if (!isLevelPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        moveWorm();
        
        if (monsterEnabled) {
            monster.angle += monster.speed;
            monster.x = monster.centerX + Math.cos(monster.angle) * monster.radius;
            monster.y = monster.centerY + Math.sin(monster.angle) * monster.radius;
            
            // Check for collisions with walls and adjust if needed
            if (monster.x < 0) monster.x = 0;
            if (monster.x > canvas.width - cellSize) monster.x = canvas.width - cellSize;
            if (monster.y < 0) monster.y = 0;
            if (monster.y > canvas.height - cellSize) monster.y = canvas.height - cellSize;
        }
        
        drawFixedBlocks();
        drawWorm();
        drawFood();
        drawBlackHoles();
        
        if (monsterEnabled) {
            // Round the monster's position to the nearest cell
            const monsterCellX = Math.round(monster.x / cellSize) * cellSize;
            const monsterCellY = Math.round(monster.y / cellSize) * cellSize;
            drawCell({ x: monsterCellX, y: monsterCellY }, 'purple');
        }
        
        checkSuperStarCollision();
    } else {
        // When paused, draw the game state first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawFixedBlocks();
        drawWorm();
        drawFood();
        drawBlackHoles();
        if (monsterEnabled) {
            const monsterCellX = Math.round(monster.x / cellSize) * cellSize;
            const monsterCellY = Math.round(monster.y / cellSize) * cellSize;
            drawCell({ x: monsterCellX, y: monsterCellY }, 'purple');
        }

        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw "PAUSED" text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
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
        if (!cheatMode) {
            if (food.type === 'golden') {
                score += goldenApplePoints;
                // Add extra growth for golden apple
                for (let i = 0; i < goldenAppleGrowth - 1; i++) {
                    worm.push({ ...worm[worm.length - 1] });
                }
            } else {
                score += appleWorth;
            }
        }
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
    isForcedPause = true;
    
    // Clear any existing forced pause timer
    if (forcedPauseTimer) {
        clearTimeout(forcedPauseTimer);
    }
    
    // Set a timer to end the forced pause after 0.75 seconds
    forcedPauseTimer = setTimeout(() => {
        isForcedPause = false;
    }, 750);
    
    // Display level number and prompt for user action
    setTimeout(displayLevelInfo, 100);
}

function displayLevelInfo() {
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.fillText(`Level ${currentLevel}`, canvas.width / 2 + 2, canvas.height / 2 - 18);
    ctx.fillText('Press an arrow key to start', canvas.width / 2 + 2, canvas.height / 2);
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

function checkWormMonsterCollision() {
    if (!monsterEnabled) return false;
    
    // Get the worm's head position
    const wormHead = worm[0];
    
    // Get the monster's current position
    const monsterX = Math.round(monster.x / cellSize) * cellSize;
    const monsterY = Math.round(monster.y / cellSize) * cellSize;
    
    // Check if worm's head is at the same position as the monster
    const isSameCell = wormHead.x === monsterX && wormHead.y === monsterY;
    
    // Check for direct horizontal or vertical adjacency (no diagonal)
    const isAdjacent = 
        (Math.abs(wormHead.x - monsterX) === cellSize && wormHead.y === monsterY) || // Horizontal
        (Math.abs(wormHead.y - monsterY) === cellSize && wormHead.x === monsterX);   // Vertical
    
    if (isSameCell || isAdjacent) {
        // Apply pop animation to monster
        applyPopAnimation({ x: monsterX, y: monsterY, type: 'monster' });
        return true;
    }
    return false;
}

function checkSuperStarCollision() {
    if (superStar && worm[0].x >= superStar.x && worm[0].x < superStar.x + cellSize &&
        worm[0].y >= superStar.y && worm[0].y < superStar.y + cellSize) {
            if (!cheatMode) { score += 4; } // only add to score if not in cheatmode
            updateScoreDisplay();
	        // Add pop animation to super star
            applyPopAnimation(superStar);

            clearInterval(superStarTimer); // Clear the interval timer properly
            superStar = null;
            superStarTimer = null;
            superStarCountdown = 0;
            
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
    //    5. generate blackholes from level design

   // shrink canvas every appleLevels and only if canvas height/width is over a certain size
   if (shrinkingEnabled && (applesCollected % appleLevels === 0) && (canvas.height > 6 * cellSize) && (canvas.height > 6 * cellSize)) {
        // Decrease canvas size by one block in height and width
        canvas.width -= cellSize;
        canvas.height -= cellSize;
		
		// Ensure that the worm is correctly repositioned in all scenarios when the canvas shrinks
		repositionWormIfOutOfBounds();
    }

    // Parse level data to get both blocks and black holes
    const levelData = parseLevel(levelDesigns[currentLevel] || "");
    fixedBlocks = levelData.blocks;
    
    // Update black holes configuration if we're not currently going through a black hole
    if (levelData.blackHoles.length === 2 && blackHoleAfterSegment.length === 0) {
        blackHoles[0] = cellToPixel(levelData.blackHoles[0]);
        blackHoles[1] = cellToPixel(levelData.blackHoles[1]);
        blackHolesActive = true;
    } else if (blackHoleAfterSegment.length === 0) {
        blackHolesActive = false;
    }

    // Generate super star if good dice roll
    if (Math.random() < probStar) {
        let starX, starY;
		let loopCount = 0;
        do {
			loopCount++;
            starX = Math.floor(Math.random() * (canvas.width / cellSize)) * cellSize;
            starY = Math.floor(Math.random() * (canvas.height / cellSize)) * cellSize;
        } while ((loopCount < 15) && (isCollisionWithSnake(starX, starY) || isCloseToApple(starX, starY) || isCollisionWithBlackHole(starX, starY) || isCollisionWithFixedBlocks(starX, starY)));
		
        superStar = { x: starX, y: starY, type: 'star' };
		
		// Countdown logic
        superStarCountdown = superStarCountdownInitial;
        superStarTimer = setInterval(() => {
			if (!isLevelPaused) {
				superStarCountdown--;
			}
            if (superStarCountdown <= 0) {
                superStar = null;
                clearInterval(superStarTimer);
            }
        }, 1000);
    } else {
        superStar = null;
        superStarCountdown = 0;
        clearInterval(superStarTimer);
    }

	// generate apple
	let validPosition = false;
    while (!validPosition) {
        food.x = Math.floor(Math.random() * (canvas.width / cellSize)) * cellSize;
        food.y = Math.floor(Math.random() * (canvas.height / cellSize)) * cellSize;
		
        if (Math.random() < goldenAppleProb) {
            food.type = 'golden';
            if (goldenAppleTimer) {
                clearTimeout(goldenAppleTimer);
            }
            goldenAppleStartTime = Date.now();
            goldenAppleTimer = setTimeout(() => {
                if (food.type === 'golden') {
                    food.type = 'apple';
                }
            }, goldenAppleTimeout * 1000);
        } else {
            food.type = 'apple';
        }

        if (food.type === 'golden') {
            if (food.x > cellSize && food.x < canvas.width - cellSize && 
                food.y > cellSize && food.y < canvas.height - cellSize) {
                continue;
            }
        }

        if (!isCollisionWithSnake(food.x, food.y) && 
            !isCollisionWithStar(food.x, food.y) &&
            !isCollisionWithFixedBlocks(food.x, food.y) &&
			!isCollisionWithBlackHole(food.x, food.y)) {
            validPosition = true;
		}	
		
		if ((currentLevel + 1) % applesPerLevel === 0) { 
			if (food.x === canvas.width || food.x === 0 || food.y === canvas.height || food.y === 0) {
				validPosition = false;
			}
		}
    }

    // Only reset monster position if it's a new level and not the initial game start
    if (applesCollected % applesPerLevel === 0 && monsterEnabled && applesCollected > 0) {
        initializeMonster();
    }

    // Reset worm to initial state if not preserving worm state and it's a new level
    if (applesCollected % applesPerLevel === 0 && applesCollected > 0 && !preserveWormState) {
        worm = initializeWorm();
        direction = { x: 0, y: 0 };
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
    if (texture) {
        // Only rotate if it's the head texture
        if (texture === wormHeadTexture) {
            ctx.save();
            ctx.translate(segment.x + cellSize/2, segment.y + cellSize/2);
            
            // Calculate rotation angle based on direction
            let angle = 0;
            if (direction.x > 0) angle = 0; // Right
            else if (direction.x < 0) angle = Math.PI; // Left
            else if (direction.y > 0) angle = Math.PI/2; // Down
            else if (direction.y < 0) angle = -Math.PI/2; // Up
            
            ctx.rotate(angle);
            ctx.drawImage(texture, -cellSize/2, -cellSize/2, cellSize, cellSize);
            ctx.restore();
        } else {
            ctx.drawImage(texture, segment.x, segment.y, cellSize, cellSize);
        }
    } else {
        drawCell(segment, 'green');
    }
}

function drawCell({ x, y }, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellSize, cellSize);
}

function drawFood() {
    if (food.type === 'golden') {
        // Draw golden apple with pulsing effect
        const pulseScale = 1 + 0.2 * Math.sin(Date.now() / 200); // Pulsing effect
        const centerX = food.x + cellSize / 2;
        const centerY = food.y + cellSize / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(pulseScale, pulseScale);
        ctx.translate(-centerX, -centerY);
        
        // Draw with enhanced golden tint and glow
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 5;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(food.x, food.y, cellSize, cellSize);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        ctx.drawImage(goldenAppleTexture, food.x, food.y, cellSize, cellSize);
        
        ctx.restore();

        // Draw countdown if golden apple
        if (goldenAppleTimer && goldenAppleStartTime) {
            const timeLeft = Math.ceil((goldenAppleTimeout * 1000 - (Date.now() - goldenAppleStartTime)) / 1000);
            if (timeLeft > 0) {
                ctx.fillStyle = 'black';
                ctx.font = '9px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(timeLeft.toString(), 8+food.x + cellSize / 2, food.y+6);
            }
        }
    } else {
        if (appleTexture) {
            ctx.drawImage(appleTexture, food.x, food.y, cellSize, cellSize);
        } else {
            drawCell(food, 'red');
        }
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
        case 'golden':
            texture = goldenAppleTexture;
            break;
        case 'apple':
            texture = appleTexture;
            break;
        case 'monster':
            texture = null; // Monster will use a purple cell
            break;
        default:
            texture = worm1Texture; // Fallback texture
    }

    let objElement = document.createElement('div');
    objElement.style.position = 'absolute';
    objElement.style.left = `${canvasRect.left + obj.x}px`;
    objElement.style.top = `${canvasRect.top + obj.y}px`;
    objElement.style.width = `${cellSize}px`;
    objElement.style.height = `${cellSize}px`;

    if (texture) {
        let imgElement = document.createElement('img');
        imgElement.src = texture.src;
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
        objElement.appendChild(imgElement);
    } else if (obj.type === 'monster') {
        objElement.style.backgroundColor = 'purple';
    }

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

function showLevelDesigns() {
    document.getElementById('openingScreen').style.display = 'none';
    document.getElementById('levelDesignScreen').style.display = 'block';
    updateLevelPreviews();
}

function updateLevelPreviews() {
    const container = document.getElementById('levelGridContainer');
    const selectedDifficulty = document.getElementById('shrinkingDifficulty').value;
    container.innerHTML = ''; // Clear existing content
    
    // Create preview for each level (excluding level 0)
    for (let level = 1; level <= 9; level++) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'levelPreview';
        
        // Calculate effective size based on level and difficulty
        let effectiveWidth = canvasCellWidth;
        let effectiveHeight = canvasCellHeight;
        
        if (selectedDifficulty) {
            // Calculate how many times the level would have shrunk based on difficulty
            const applesForLevel = (level - 1) * applesPerLevel;
            
            // Set shrink interval based on difficulty
            const shrinkInterval = selectedDifficulty === 'Easy Peasy' ? 15 : 10;
            const shrinkCount = Math.floor(applesForLevel / shrinkInterval);
            
            // Calculate effective size for this difficulty
            effectiveWidth = Math.max(6, canvasCellWidth - shrinkCount);
            effectiveHeight = Math.max(6, canvasCellHeight - shrinkCount);
        }
        
        const title = document.createElement('h3');
        title.textContent = `Level ${level} (${effectiveWidth} x ${effectiveHeight})`;
        previewDiv.appendChild(title);
        
        // Create a small canvas for this level
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to 50% of normal game size
        const previewCellSize = cellSize * 0.5;
        canvas.width = effectiveWidth * previewCellSize;
        canvas.height = effectiveHeight * previewCellSize;
        
        // Draw border to show original size if shrunk
        if (selectedDifficulty && (effectiveWidth < canvasCellWidth || effectiveHeight < canvasCellHeight)) {
            ctx.strokeStyle = '#999';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                0, 0,
                canvasCellWidth * previewCellSize,
                canvasCellHeight * previewCellSize
            );
            ctx.setLineDash([]);
        }
        
        // Parse level data to get both blocks and black holes
        const levelData = parseLevel(levelDesigns[level] || "");
        
        // Draw fixed blocks
        levelData.blocks.forEach(block => {
            const x = (block.x / cellSize) * previewCellSize;
            const y = (block.y / cellSize) * previewCellSize;
            if (x / previewCellSize >= effectiveWidth || y / previewCellSize >= effectiveHeight) {
                return;
            }
            if (fixedBlockTexture) {
                ctx.drawImage(fixedBlockTexture, x, y, previewCellSize, previewCellSize);
            } else {
                ctx.fillStyle = 'brown';
                ctx.fillRect(x, y, previewCellSize, previewCellSize);
            }
        });
        
        // Draw black holes
        levelData.blackHoles.forEach(hole => {
            if (hole.cell_x >= effectiveWidth || hole.cell_y >= effectiveHeight) {
                return;
            }
            const x = hole.cell_x * previewCellSize;
            const y = hole.cell_y * previewCellSize;
            if (blackholeTexture) {
                ctx.drawImage(blackholeTexture, x, y, previewCellSize, previewCellSize);
            } else {
                ctx.fillStyle = 'black';
                ctx.fillRect(x, y, previewCellSize, previewCellSize);
            }
        });
        
        previewDiv.appendChild(canvas);
        container.appendChild(previewDiv);
    }
}

function hideLevelDesigns() {
    document.getElementById('levelDesignScreen').style.display = 'none';
    document.getElementById('openingScreen').style.display = 'block';
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

// Modify the handleKeyInput function to respect debug mode for cheat mode toggling
function handleKeyInput(event) {
    let keyPressed = event.key;
    if (['W', 'A', 'S', 'D', 'X', 'w', 'a', 's', 'd', 'x'].includes(keyPressed)) {
        keyPressed = keyPressed.toLowerCase();
    }
    
    if (keyPressed === "x" && debugMode) {
        cheatMode = !cheatMode;
        if (cheatMode) {
            document.getElementById('cheatModeEnabled').checked = true;
        }
        score = 0;
        updateScoreDisplay();
    }

    const newDirection = directions[keyPressed];
    if (newDirection) {
        if (isLevelPaused && !isForcedPause) {
            direction = newDirection;
            isLevelPaused = false;
        } else if (!isLevelPaused) {
            changeDirection(newDirection);
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
    // Unpause the game if it is paused and not in forced pause
    if (isLevelPaused && !isForcedPause) {
        isLevelPaused = false;
        return; // Exit the function to avoid changing the direction if the game was paused
    }
    
    if (!isLevelPaused) {
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
}

function handleMouseDown(event) {
    const highScorePanel = document.getElementById('highScorePanel');
    if (highScorePanel && highScorePanel.style.display === 'block') {
        return;
    }
    
    mouseStartX = event.clientX;
    mouseStartY = event.clientY;
}

function handleMouseMove(event) {
    // No logging needed for mousemove
}

function handleMouseUp(event) {
    const highScorePanel = document.getElementById('highScorePanel');
    if (highScorePanel && highScorePanel.style.display === 'block') {
        return;
    }
    
    if (isLevelPaused && !isForcedPause) {
        isLevelPaused = false;
        return;
    }
    
    if (!isLevelPaused) {
        mouseEndX = event.clientX;
        mouseEndY = event.clientY;

        const deltaX = mouseEndX - mouseStartX;
        const deltaY = mouseEndY - mouseStartY;

        let mouseDirection;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            mouseDirection = deltaX > 0 ? directions['ArrowRight'] : directions['ArrowLeft'];
        } else {
            mouseDirection = deltaY > 0 ? directions['ArrowDown'] : directions['ArrowUp'];
        }

        changeDirection(mouseDirection);
    }
}

// Mouse
document.addEventListener('mousedown', handleMouseDown, false);
document.addEventListener('mousemove', handleMouseMove, false);
document.addEventListener('mouseup', handleMouseUp, false);

// Keyboard
document.addEventListener("keydown", handleKeyInput);

// Add touch event listeners with { passive: false }
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

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

// Convert cell coordinates to pixel coordinates
function cellToPixel(cellCoord) {
    return {
        x: cellCoord.cell_x * cellSize,
        y: cellCoord.cell_y * cellSize
    };
}

function initializeMonster() {
    if (!monsterEnabled) return;
    
    monster.centerX = Math.floor(Math.random() * (canvas.width / cellSize - 8)) * cellSize + 4 * cellSize;
    monster.centerY = Math.floor(Math.random() * (canvas.height / cellSize - 8)) * cellSize + 4 * cellSize;
    monster.x = monster.centerX;
    monster.y = monster.centerY;
    monster.angle = 0;
}

// Update game over logic to show high score form
function gameOver() {
    // Show game over message
    const gameOverMessage = `Game Over!\nFinal score: ${score}\nApples collected: ${applesCollected}\nLevel: ${currentLevel}\nDifficulty: ${difficulty}`;
    alert(gameOverMessage);

    // Get high score elements
    const highScorePanel = document.getElementById('highScorePanel');
    const highScoreForm = document.getElementById('highScoreForm');
    const highScoreList = document.getElementById('highScoreList').getElementsByTagName('tbody')[0];

    // Show high score form if it's a high score
    if (isHighScore(score)) {
        highScoreForm.style.display = 'block';
        highScorePanel.style.display = 'block';
    } else {
        highScoreForm.style.display = 'none';
    }

    // Display current high scores
    const highScores = loadHighScores();
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

    // TODO FIX THIS - should not just reload the page after a pause, but should wait for the user to close the high score screen
    //     also depends on if they got a high score or not
    // Reload the game after a short delay
    //setTimeout(() => {
    //    document.location.reload();
    //}, 5000); // 5 second delay to allow viewing high scores
}

// Add event listeners for high score functionality
document.addEventListener('DOMContentLoaded', function() {
    const highScoreIcon = document.getElementById('highScoreIcon');
    const highScorePanel = document.getElementById('highScorePanel');
    const closeButton = highScorePanel.querySelector('.close-button');
    const submitScoreButton = document.getElementById('submitScore');
    const playerNameInput = document.getElementById('playerName');

    highScoreIcon.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        highScorePanel.style.display = 'block';
        showHighScores();
        isLevelPaused = true;
    });

    closeButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        highScorePanel.style.display = 'none';
        isLevelPaused = true;
    });

    submitScoreButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const playerName = playerNameInput.value.trim();
        if (playerName) {
            updateHighScores(score, playerName);
            showHighScores();
            document.getElementById('highScoreForm').style.display = 'none';
        }
    });

    document.addEventListener('click', function(event) {
        if (!highScorePanel.contains(event.target) && event.target !== highScoreIcon) {
            if (highScorePanel.style.display === 'block') {
                highScorePanel.style.display = 'none';
                if (event.target === canvas) {
                    isLevelPaused = false;
                }
            }
        }
    });
});

