// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Define the size of each grid square
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Audio Manager Class
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create sound effects using Web Audio API
            this.sounds = {
                eat: this.createTone(800, 0.1, 'sine'),
                gameOver: this.createTone(200, 0.5, 'sawtooth'),
                restart: this.createTone(600, 0.2, 'square'),
                pause: this.createTone(400, 0.15, 'triangle'),
                powerup: this.createTone(1000, 0.3, 'sine')
            };
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    createTone(frequency, duration, waveType) {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = waveType;
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
}

// Snake Class
class Snake {
    constructor() {
        this.body = [{ x: 10, y: 10 }];
        this.dx = 0;
        this.dy = 0;
        this.changingDirection = false;
    }

    move() {
        const head = { x: this.body[0].x + this.dx, y: this.body[0].y + this.dy };
        this.body.unshift(head);
        this.changingDirection = false;
    }

    grow() {
        // Snake grows by not removing the tail
    }

    shrink() {
        this.body.pop();
    }

    changeDirection(newDx, newDy) {
        if (this.changingDirection) return;
        
        const goingUp = this.dy === -1;
        const goingDown = this.dy === 1;
        const goingRight = this.dx === 1;
        const goingLeft = this.dx === -1;

        // Prevent the snake from reversing on itself
        if (newDx === -1 && !goingRight) { this.dx = -1; this.dy = 0; }
        if (newDy === -1 && !goingDown) { this.dx = 0; this.dy = -1; }
        if (newDx === 1 && !goingLeft) { this.dx = 1; this.dy = 0; }
        if (newDy === 1 && !goingUp) { this.dx = 0; this.dy = 1; }
        
        this.changingDirection = true;
    }

    draw() {
        this.body.forEach((part, index) => {
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

    checkSelfCollision() {
        for (let i = 4; i < this.body.length; i++) {
            if (this.body[i].x === this.body[0].x && this.body[i].y === this.body[0].y) {
                return true;
            }
        }
        return false;
    }

    checkWallCollision() {
        const head = this.body[0];
        return head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount;
    }

    wrapAround() {
        const head = this.body[0];
        if (head.x < 0) head.x = tileCount - 1;
        if (head.x >= tileCount) head.x = 0;
        if (head.y < 0) head.y = tileCount - 1;
        if (head.y >= tileCount) head.y = 0;
    }

    reset() {
        this.body = [{ x: 10, y: 10 }];
        this.dx = 0;
        this.dy = 0;
        this.changingDirection = false;
    }
}

// Food Class
class Food {
    constructor() {
        this.x = 15;
        this.y = 15;
        this.type = 'normal';
    }

    generate(snakeBody, powerUps, obstacles = []) {
        this.x = Math.floor(Math.random() * tileCount);
        this.y = Math.floor(Math.random() * tileCount);
        this.type = Math.random() < 0.2 ? 'double' : 'normal'; // 20% chance for double points
        
        // Make sure food doesn't spawn on snake, power-ups, or obstacles
        const isValidPosition = (x, y) => {
            return !snakeBody.some(part => part.x === x && part.y === y) &&
                   !powerUps.some(powerUp => powerUp.x === x && powerUp.y === y) &&
                   !obstacles.some(obstacle => obstacle.x === x && obstacle.y === y);
        };
        
        if (!isValidPosition(this.x, this.y)) {
            this.generate(snakeBody, powerUps, obstacles);
        }
    }

    draw() {
        const gradient = ctx.createRadialGradient(
            this.x * gridSize + gridSize/2, this.y * gridSize + gridSize/2, 0,
            this.x * gridSize + gridSize/2, this.y * gridSize + gridSize/2, gridSize/2
        );
        
        if (this.type === 'double') {
            gradient.addColorStop(0, '#ffd700');
            gradient.addColorStop(1, '#ff8c00');
        } else {
            gradient.addColorStop(0, '#ff4757');
            gradient.addColorStop(1, '#c44569');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(this.x * gridSize + 2, this.y * gridSize + 2, gridSize - 4, gridSize - 4, 8);
        ctx.fill();
        
        // Add sparkle effect for double points food
        if (this.type === 'double') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x * gridSize + gridSize/2, this.y * gridSize + gridSize/2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    isEaten(snakeHead) {
        return snakeHead.x === this.x && snakeHead.y === this.y;
    }

    getPoints() {
        return this.type === 'double' ? 20 : 10;
    }
}

// PowerUp Class
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
    }

    static generate(snakeBody, food, existingPowerUps, obstacles = []) {
        const types = ['slowMotion', 'wallImmunity'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const powerUp = new PowerUp(
            Math.floor(Math.random() * tileCount),
            Math.floor(Math.random() * tileCount),
            type
        );
        
        // Make sure power-up doesn't spawn on snake, food, other power-ups, or obstacles
        const isValidPosition = (x, y) => {
            return !snakeBody.some(part => part.x === x && part.y === y) &&
                   !(food.x === x && food.y === y) &&
                   !existingPowerUps.some(pu => pu.x === x && pu.y === y) &&
                   !obstacles.some(obstacle => obstacle.x === x && obstacle.y === y);
        };
        
        if (isValidPosition(powerUp.x, powerUp.y)) {
            return powerUp;
        }
        return null;
    }

    draw() {
        const gradient = ctx.createRadialGradient(
            this.x * gridSize + gridSize/2, this.y * gridSize + gridSize/2, 0,
            this.x * gridSize + gridSize/2, this.y * gridSize + gridSize/2, gridSize/2
        );
        
        if (this.type === 'slowMotion') {
            gradient.addColorStop(0, '#4ecdc4');
            gradient.addColorStop(1, '#44a08d');
        } else if (this.type === 'wallImmunity') {
            gradient.addColorStop(0, '#a8e6cf');
            gradient.addColorStop(1, '#7fcdcd');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(this.x * gridSize + 1, this.y * gridSize + 1, gridSize - 2, gridSize - 2, 6);
        ctx.fill();
        
        // Add pulsing effect
        const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 0.9;
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.beginPath();
        ctx.arc(this.x * gridSize + gridSize/2, this.y * gridSize + gridSize/2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    isCollected(snakeHead) {
        return snakeHead.x === this.x && snakeHead.y === this.y;
    }
}

// Obstacle Class
class Obstacle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static generateObstacles(difficulty, snakeBody, food, powerUps) {
        const obstacles = [];
        let obstacleCount = 0;
        
        switch (difficulty) {
            case 'easy':
                obstacleCount = 0; // No obstacles
                break;
            case 'medium':
                obstacleCount = 8; // Some obstacles
                break;
            case 'hard':
                obstacleCount = 15; // Many obstacles
                break;
        }
        
        for (let i = 0; i < obstacleCount; i++) {
            const obstacle = new Obstacle(
                Math.floor(Math.random() * tileCount),
                Math.floor(Math.random() * tileCount)
            );
            
            // Make sure obstacle doesn't spawn on snake, food, power-ups, or other obstacles
            const isValidPosition = (x, y) => {
                return !snakeBody.some(part => part.x === x && part.y === y) &&
                       !(food.x === x && food.y === y) &&
                       !powerUps.some(pu => pu.x === x && pu.y === y) &&
                       !obstacles.some(obs => obs.x === x && obs.y === y);
            };
            
            if (isValidPosition(obstacle.x, obstacle.y)) {
                obstacles.push(obstacle);
            }
        }
        
        return obstacles;
    }

    draw() {
        // Create gradient for obstacle
        const gradient = ctx.createRadialGradient(
            this.x * gridSize + gridSize/2, this.y * gridSize + gridSize/2, 0,
            this.x * gridSize + gridSize/2, this.y * gridSize + gridSize/2, gridSize/2
        );
        gradient.addColorStop(0, '#8b4513');
        gradient.addColorStop(1, '#654321');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(this.x * gridSize + 1, this.y * gridSize + 1, gridSize - 2, gridSize - 2, 3);
        ctx.fill();
        
        // Add border effect
        ctx.strokeStyle = '#2c1810';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    checkCollision(snakeHead) {
        return snakeHead.x === this.x && snakeHead.y === this.y;
    }
}

// PowerUp Manager Class
class PowerUpManager {
    constructor() {
        this.powerUps = [];
        this.activePowerUps = {
            slowMotion: { active: false, duration: 0 },
            wallImmunity: { active: false, duration: 0 }
        };
    }

    update() {
        Object.keys(this.activePowerUps).forEach(key => {
            if (this.activePowerUps[key].active) {
                this.activePowerUps[key].duration -= 100;
                if (this.activePowerUps[key].duration <= 0) {
                    this.activePowerUps[key].active = false;
                    this.activePowerUps[key].duration = 0;
                }
            }
        });
    }

    activate(type) {
        if (type === 'slowMotion') {
            this.activePowerUps.slowMotion.active = true;
            this.activePowerUps.slowMotion.duration = 5000; // 5 seconds
        } else if (type === 'wallImmunity') {
            this.activePowerUps.wallImmunity.active = true;
            this.activePowerUps.wallImmunity.duration = 3000; // 3 seconds
        }
    }

    draw() {
        this.powerUps.forEach(powerUp => powerUp.draw());
    }

    checkCollisions(snakeHead) {
        this.powerUps.forEach((powerUp, index) => {
            if (powerUp.isCollected(snakeHead)) {
                this.activate(powerUp.type);
                this.powerUps.splice(index, 1);
                return true;
            }
        });
        return false;
    }

    maybeSpawn(snakeBody, food, obstacles = []) {
        if (Math.random() < 0.1 && this.powerUps.length < 2) { // 10% chance, max 2 power-ups
            const newPowerUp = PowerUp.generate(snakeBody, food, this.powerUps, obstacles);
            if (newPowerUp) {
                this.powerUps.push(newPowerUp);
            }
        }
    }

    reset() {
        this.powerUps = [];
        this.activePowerUps = {
            slowMotion: { active: false, duration: 0 },
            wallImmunity: { active: false, duration: 0 }
        };
    }

    getGameSpeed(baseSpeed) {
        if (this.activePowerUps.slowMotion.active) {
            return baseSpeed * 2; // Slow motion doubles the base speed (makes it slower)
        }
        return baseSpeed;
    }

    hasWallImmunity() {
        return this.activePowerUps.wallImmunity.active;
    }
}

// Score Manager Class
class ScoreManager {
    constructor(scoreElement, highScoreElement) {
        this.score = 0;
        this.difficulty = 'easy';
        this.scoreElement = scoreElement;
        this.highScoreElement = highScoreElement;
        this.highScore = this.getHighScore();
    }

    getHighScore() {
        return parseInt(localStorage.getItem(`snakeHighScore_${this.difficulty}`) || '0');
    }

    setHighScore(newScore) {
        localStorage.setItem(`snakeHighScore_${this.difficulty}`, newScore.toString());
        this.highScore = newScore;
        this.highScoreElement.textContent = newScore;
    }

    updateHighScore() {
        if (this.score > this.highScore) {
            this.setHighScore(this.score);
        }
    }

    addPoints(points) {
        this.score += points;
        this.scoreElement.textContent = this.score;
        this.updateHighScore();
    }

    reset() {
        this.score = 0;
        this.scoreElement.textContent = this.score;
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.highScore = this.getHighScore();
        this.highScoreElement.textContent = this.highScore;
    }
}

// Game Class
class Game {
    constructor(scoreElement, highScoreElement, currentDifficultyElement, difficultySelection, statsContainer, restartBtn, pauseBtn, controlBtns, difficultyBtns) {
        this.scoreElement = scoreElement;
        this.highScoreElement = highScoreElement;
        this.currentDifficultyElement = currentDifficultyElement;
        this.difficultySelection = difficultySelection;
        this.statsContainer = statsContainer;
        this.restartBtn = restartBtn;
        this.pauseBtn = pauseBtn;
        this.controlBtns = controlBtns;
        this.difficultyBtns = difficultyBtns;
        
        this.snake = new Snake();
        this.food = new Food();
        this.powerUpManager = new PowerUpManager();
        this.scoreManager = new ScoreManager(this.scoreElement, this.highScoreElement);
        this.audioManager = new AudioManager();
        this.obstacles = [];
        this.difficulty = 'easy';
        
        this.isGameOver = false;
        this.isPaused = false;
        this.gameLoop = null;
        this.gameStarted = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showDifficultySelection();
    }

    showDifficultySelection() {
        this.difficultySelection.style.display = 'block';
        this.statsContainer.style.display = 'none';
        canvas.style.display = 'none';
        document.querySelector('.controls').style.display = 'none';
    }

    hideDifficultySelection() {
        this.difficultySelection.style.display = 'none';
        this.statsContainer.style.display = 'flex';
        canvas.style.display = 'block';
        document.querySelector('.controls').style.display = 'block';
    }

    startGame(difficulty) {
        console.log('Starting game with difficulty:', difficulty);
        this.difficulty = difficulty;
        this.scoreManager.setDifficulty(difficulty);
        this.currentDifficultyElement.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        
        this.hideDifficultySelection();
        this.reset();
        this.start();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        console.log('Difficulty buttons found:', this.difficultyBtns.length);
        console.log('Difficulty buttons:', this.difficultyBtns);
        
        // Keyboard controls
        document.addEventListener('keydown', (event) => this.handleKeyPress(event));
        
        // Button controls
        this.restartBtn.addEventListener('click', () => this.restart());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        
        // Difficulty selection
        this.difficultyBtns.forEach((btn, index) => {
            console.log(`Setting up button ${index}:`, btn);
            btn.addEventListener('click', (e) => {
                console.log('Difficulty button clicked:', e.target);
                const difficulty = e.target.closest('.difficulty-btn').getAttribute('data-difficulty');
                console.log('Selected difficulty:', difficulty);
                this.startGame(difficulty);
            });
        });
        
        // Mobile controls
        this.controlBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const direction = e.target.getAttribute('data-direction');
                this.handleMobileDirection(direction);
            });
            
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const direction = e.target.getAttribute('data-direction');
                this.handleMobileDirection(direction);
            });
        });
    }

    handleKeyPress(event) {
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;
        const SPACE_KEY = 32;
        const P_KEY = 80;

    const keyPressed = event.keyCode;
        
        // Handle pause/resume with P key or space when game is over
        if (keyPressed === P_KEY || (keyPressed === SPACE_KEY && this.isGameOver)) {
            event.preventDefault();
            if (this.isGameOver) {
                this.restart();
            } else {
                this.togglePause();
            }
            return;
        }
        
        // Don't change direction if game is over, paused, or already changing direction
        if (this.isGameOver || this.isPaused || this.snake.changingDirection) return;

        // Handle direction changes
        if (keyPressed === LEFT_KEY) this.snake.changeDirection(-1, 0);
        if (keyPressed === UP_KEY) this.snake.changeDirection(0, -1);
        if (keyPressed === RIGHT_KEY) this.snake.changeDirection(1, 0);
        if (keyPressed === DOWN_KEY) this.snake.changeDirection(0, 1);
    }

    handleMobileDirection(direction) {
        if (this.isGameOver || this.isPaused || this.snake.changingDirection) return;
        
        switch (direction) {
            case 'up':
                this.snake.changeDirection(0, -1);
                break;
            case 'down':
                this.snake.changeDirection(0, 1);
                break;
            case 'left':
                this.snake.changeDirection(-1, 0);
                break;
            case 'right':
                this.snake.changeDirection(1, 0);
                break;
        }
    }

    start() {
        this.main();
    }

    calculateBaseSpeed() {
        let baseSpeed, minSpeed, speedReduction;
        
        switch (this.difficulty) {
            case 'easy':
                baseSpeed = 250; // Slowest
                minSpeed = 120;
                speedReduction = Math.floor(this.scoreManager.score / 50) * 8; // Slower progression
                break;
            case 'medium':
                baseSpeed = 180; // Medium
                minSpeed = 80;
                speedReduction = Math.floor(this.scoreManager.score / 40) * 10; // Medium progression
                break;
            case 'hard':
                baseSpeed = 120; // Fastest
                minSpeed = 50;
                speedReduction = Math.floor(this.scoreManager.score / 30) * 12; // Fastest progression
                break;
            default:
                baseSpeed = 200;
                minSpeed = 80;
                speedReduction = Math.floor(this.scoreManager.score / 50) * 10;
        }
        
        return Math.max(minSpeed, baseSpeed - speedReduction);
    }

    main() {
        if (this.isGameOver) {
            this.drawGameOver();
            return;
        }
        
        if (this.isPaused) {
            this.drawPauseScreen();
            this.gameLoop = setTimeout(() => this.main(), 100);
            return;
        }
        
        // Update power-ups
        this.powerUpManager.update();
        
        // Calculate base speed based on score, then apply power-up effects
        const baseSpeed = this.calculateBaseSpeed();
        const gameSpeed = this.powerUpManager.getGameSpeed(baseSpeed);
        
        this.gameLoop = setTimeout(() => {
            this.clearCanvas();
            this.food.draw();
            this.powerUpManager.draw();
            this.drawObstacles();
            this.moveSnake();
            this.snake.draw();
            this.main();
        }, gameSpeed);
    }

    moveSnake() {
        this.snake.move();

        // Check if the snake has eaten the food
        if (this.food.isEaten(this.snake.body[0])) {
            const points = this.food.getPoints();
            this.scoreManager.addPoints(points);
            this.audioManager.play('eat');
            this.food.generate(this.snake.body, this.powerUpManager.powerUps, this.obstacles);
            this.powerUpManager.maybeSpawn(this.snake.body, this.food, this.obstacles);
        } else {
            this.snake.shrink();
        }
        
        // Check for power-up collection
        if (this.powerUpManager.checkCollisions(this.snake.body[0])) {
            this.audioManager.play('powerup');
        }
        
        this.checkCollision();
    }

    drawObstacles() {
        this.obstacles.forEach(obstacle => obstacle.draw());
    }

    checkCollision() {
        // Check for self-collision
        if (this.snake.checkSelfCollision()) {
            this.gameOver();
            return;
        }

        // Check for obstacle collision
        if (this.obstacles.some(obstacle => obstacle.checkCollision(this.snake.body[0]))) {
            this.gameOver();
            return;
        }

        // Check for wall collision (unless wall immunity is active)
        if (!this.powerUpManager.hasWallImmunity()) {
            if (this.snake.checkWallCollision()) {
                this.gameOver();
                return;
            }
        } else {
            // Handle wall wrapping when immunity is active
            this.snake.wrapAround();
        }
    }

    gameOver() {
        this.isGameOver = true;
        if (this.gameLoop) {
            clearTimeout(this.gameLoop);
        }
        this.scoreManager.updateHighScore();
        this.audioManager.play('gameOver');
    }

    togglePause() {
        if (this.isGameOver) return;
        
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.audioManager.play('pause');
        }
    }

    reset() {
        // Reset game state
        this.snake.reset();
        this.powerUpManager.reset();
        this.scoreManager.reset();
        
        // Generate obstacles for current difficulty
        this.obstacles = Obstacle.generateObstacles(
            this.difficulty, 
            this.snake.body, 
            this.food, 
            this.powerUpManager.powerUps
        );
        
        // Generate food considering obstacles
        this.food.generate(this.snake.body, this.powerUpManager.powerUps, this.obstacles);
        
        this.isGameOver = false;
        this.isPaused = false;
        
        // Clear any existing game loop
        if (this.gameLoop) {
            clearTimeout(this.gameLoop);
        }
    }

    restart() {
        this.reset();
        
        // Play restart sound
        this.audioManager.play('restart');
        
        // Start new game
        this.start();
    }

    clearCanvas() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawPauseScreen() {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Pause text
        ctx.fillStyle = '#4ecdc4';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 20);
        
        // Resume instruction
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('Press SPACE or P to resume', canvas.width / 2, canvas.height / 2 + 20);
    }

    drawGameOver() {
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
        ctx.fillText(`Final Score: ${this.scoreManager.score}`, canvas.width / 2, canvas.height / 2 + 10);
        
        // High score text
        if (this.scoreManager.score === this.scoreManager.highScore && this.scoreManager.score > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('🎉 NEW HIGH SCORE! 🎉', canvas.width / 2, canvas.height / 2 + 40);
        } else {
            ctx.fillStyle = '#a4b0be';
            ctx.font = '20px Arial';
            ctx.fillText(`High Score: ${this.scoreManager.highScore}`, canvas.width / 2, canvas.height / 2 + 40);
        }
        
        // Restart instruction
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText('Press SPACE or click Restart to play again', canvas.width / 2, canvas.height / 2 + 80);
    }
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Get elements after DOM is loaded
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('highScore');
    const currentDifficultyElement = document.getElementById('currentDifficulty');
    const difficultySelection = document.getElementById('difficultySelection');
    const statsContainer = document.getElementById('statsContainer');
    const restartBtn = document.getElementById('restartBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const controlBtns = document.querySelectorAll('.control-btn');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    
    console.log('DOM loaded, elements found:');
    console.log('Score element:', scoreElement);
    console.log('Difficulty buttons:', difficultyBtns.length);
    
    const game = new Game(scoreElement, highScoreElement, currentDifficultyElement, difficultySelection, statsContainer, restartBtn, pauseBtn, controlBtns, difficultyBtns);
});
