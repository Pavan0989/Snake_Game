// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const restartBtn = document.getElementById('restartBtn');

// Define the size of each grid square
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game variables
let snake = [
    { x: 10, y: 10 } // Starting position of the snake's head
];
let food = { x: 15, y: 15 };
let dx = 0; // Direction in x (1 for right, -1 for left)
let dy = 0; // Direction in y (1 for down, -1 for up)
let score = 0;
let changingDirection = false; // Prevents the snake from reversing on itself
let isGameOver = false;
let gameLoop; // Store the game loop timeout ID

// High score management
function getHighScore() {
    return parseInt(localStorage.getItem('snakeHighScore') || '0');
}

function setHighScore(newScore) {
    localStorage.setItem('snakeHighScore', newScore.toString());
    highScoreElement.textContent = newScore;
}

function updateHighScore() {
    const currentHighScore = getHighScore();
    if (score > currentHighScore) {
        setHighScore(score);
    }
}

// --- Main Game Loop ---
function main() {
    if (isGameOver) {
        drawGameOver();
        return;
    }
    
    // Set a timeout to control the speed of the game
    gameLoop = setTimeout(function onTick() {
        changingDirection = false;
        clearCanvas();
        drawFood();
        moveSnake();
        drawSnake();
        
        // Call main again to create the loop
        main();
    }, 100); // 100ms = 10 frames per second
}

// --- Functions ---

// Clears the canvas for the next frame
function clearCanvas() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Draws the food on the canvas
function drawFood() {
    // Create gradient for food
    const gradient = ctx.createRadialGradient(
        food.x * gridSize + gridSize/2, food.y * gridSize + gridSize/2, 0,
        food.x * gridSize + gridSize/2, food.y * gridSize + gridSize/2, gridSize/2
    );
    gradient.addColorStop(0, '#ff4757');
    gradient.addColorStop(1, '#c44569');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4, 8);
    ctx.fill();
}

// Draws the snake on the canvas
function drawSnake() {
    snake.forEach((part, index) => {
        if (index === 0) {
            // Head with gradient
            const gradient = ctx.createRadialGradient(
                part.x * gridSize + gridSize/2, part.y * gridSize + gridSize/2, 0,
                part.x * gridSize + gridSize/2, part.y * gridSize + gridSize/2, gridSize/2
            );
            gradient.addColorStop(0, '#2ed573');
            gradient.addColorStop(1, '#1e90ff');
            
            ctx.fillStyle = gradient;
        } else {
            // Body with different gradient
            const gradient = ctx.createLinearGradient(
                part.x * gridSize, part.y * gridSize,
                part.x * gridSize + gridSize, part.y * gridSize + gridSize
            );
            gradient.addColorStop(0, '#7bed9f');
            gradient.addColorStop(1, '#2ed573');
            
            ctx.fillStyle = gradient;
        }
        
        ctx.beginPath();
        ctx.roundRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2, 4);
        ctx.fill();
    });
}

// Draw game over screen
function drawGameOver() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Game over text
    ctx.fillStyle = '#ff4757';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
    
    // Score text
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    
    // High score text
    const currentHighScore = getHighScore();
    if (score === currentHighScore && score > 0) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('🎉 NEW HIGH SCORE! 🎉', canvas.width / 2, canvas.height / 2 + 40);
    } else {
        ctx.fillStyle = '#a4b0be';
        ctx.font = '20px Arial';
        ctx.fillText(`High Score: ${currentHighScore}`, canvas.width / 2, canvas.height / 2 + 40);
    }
    
    // Restart instruction
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('Press SPACE or click Restart to play again', canvas.width / 2, canvas.height / 2 + 80);
}

// Moves the snake and checks for collisions
function moveSnake() {
    // Create the new head of the snake
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head); // Add the new head to the beginning of the snake array

    // Check if the snake has eaten the food
    const hasEatenFood = snake[0].x === food.x && snake[0].y === food.y;
    if (hasEatenFood) {
        score += 10;
        scoreElement.textContent = score;
        updateHighScore(); // Check and update high score
        generateFood(); // Create new food
    } else {
        // Remove the last part of the snake's tail if it hasn't eaten
        snake.pop();
    }
    
    checkCollision();
}

// Generates a new random position for the food
function generateFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    // If the new food position is on the snake, generate a new one
    snake.forEach(part => {
        if (part.x === food.x && part.y === food.y) {
            generateFood();
        }
    });
}

// Checks for wall or self-collision
function checkCollision() {
    // Check for self-collision (head hits any other part of the body)
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
            gameOver();
        }
    }

    // Check for wall collision
    const hitLeftWall = snake[0].x < 0;
    const hitRightWall = snake[0].x >= tileCount;
    const hitTopWall = snake[0].y < 0;
    const hitBottomWall = snake[0].y >= tileCount;

    if (hitLeftWall || hitRightWall || hitTopWall || hitBottomWall) {
        gameOver();
    }
}

// Handle game over
function gameOver() {
    isGameOver = true;
    if (gameLoop) {
        clearTimeout(gameLoop);
    }
    updateHighScore(); // Final high score update
}

// Restart game function
function restartGame() {
    // Reset game variables
    snake = [{ x: 10, y: 10 }];
    dx = 0;
    dy = 0;
    score = 0;
    changingDirection = false;
    isGameOver = false;
    
    // Clear any existing game loop
    if (gameLoop) {
        clearTimeout(gameLoop);
    }
    
    // Update UI
    scoreElement.textContent = score;
    
    // Generate new food
    generateFood();
    
    // Start new game
    main();
}

// --- Event Listener for Keyboard Controls ---
document.addEventListener('keydown', changeDirection);

function changeDirection(event) {
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;
    const SPACE_KEY = 32;

    const keyPressed = event.keyCode;
    
    // Handle restart with space key
    if (keyPressed === SPACE_KEY) {
        event.preventDefault();
        restartGame();
        return;
    }
    
    // Don't change direction if game is over or already changing direction
    if (isGameOver || changingDirection) return;
    changingDirection = true;

    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;

    // Prevent the snake from reversing on itself
    if (keyPressed === LEFT_KEY && !goingRight) { dx = -1; dy = 0; }
    if (keyPressed === UP_KEY && !goingDown) { dx = 0; dy = -1; }
    if (keyPressed === RIGHT_KEY && !goingLeft) { dx = 1; dy = 0; }
    if (keyPressed === DOWN_KEY && !goingUp) { dx = 0; dy = 1; }
}

// --- Event Listeners ---
restartBtn.addEventListener('click', restartGame);

// Initialize high score display
highScoreElement.textContent = getHighScore();

// --- Start the Game ---
generateFood(); // Create the first food item
main(); // Start the game loop
