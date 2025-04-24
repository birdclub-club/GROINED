class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });  // Disable alpha for better performance
        
        // Enable image smoothing for better quality
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        this.canvas.width = 1400;
        this.canvas.height = 600;
        
        // Add frame timing properties
        this.lastFrameTime = performance.now();
        this.deltaTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.accumulator = 0;
        this.fixedTimeStep = 1 / 60; // Fixed time step for physics updates
        this.lastRenderTime = 0; // Add last render time
        this.renderInterval = 1000 / 60; // Target 60 FPS for rendering
        
        // Initialize payout system
        this.payoutSystem = new PayoutSystem();
        this.currentWager = 0;
        
        // Initialize wallet balance (always start with 10 $GRIND)
        this.walletBalance = 10;
        document.getElementById('walletBalance').textContent = `Balance: ${this.formatBalance(this.walletBalance)} $GRIND`;
        
        // Add event listener for popup dismissal
        document.getElementById('dismissPopup').addEventListener('click', () => {
            document.getElementById('higherWagerPopup').classList.add('hidden');
        });
        
        // Initialize sound system
        this.sounds = {
            jump: new Audio('./ASSETS/Sounds/jump.mp3'),
            collision: [],  // Changed to array to store multiple collision sounds
            gameOver: new Audio('./ASSETS/Sounds/gameover.mp3'),
            background: new Audio('./ASSETS/Sounds/background/background.mp3'),
            spark: new Audio('./ASSETS/Sounds/spark.mp3'),
            groined: [],  // Added array for groined sounds
            sMin: new Audio('./ASSETS/Sounds/s-min.mp3')  // Added s-min sound
        };
        
        // Add flag to track if collision sound is playing
        this.isCollisionSoundPlaying = false;
        
        // Add background music position tracking
        this.backgroundMusicPosition = 0;
        this.backgroundMusicEndedHandler = null;  // Store the ended event handler
        
        // Initialize collision sounds
        for (let i = 1; i <= 7; i++) {
            const collisionSound = new Audio(`./ASSETS/Sounds/collision/collision${i}.mp3`);
            this.sounds.collision.push(collisionSound);
        }

        // Initialize groined sounds
        for (let i = 1; i <= 9; i++) {
            const groinedSound = new Audio(`./ASSETS/Sounds/groined/groined${i}.mp3`);
            this.sounds.groined.push(groinedSound);
        }
        
        // Set background music to loop and adjust volume
        this.sounds.background.loop = false;  // Changed to false since we'll handle looping manually
        this.sounds.background.volume = 0.15; // Reduced from 0.25 to 0.15 for background music
        
        // Add ended event handler to restart the track
        this.sounds.background.addEventListener('ended', () => {
            if (this.musicEnabled && this.gameStarted && !this.gameOver) {
                this.sounds.background.currentTime = 0;
                this.sounds.background.play();
            }
        });
        
        // Set volumes for different sound types
        Object.values(this.sounds).forEach(sound => {
            if (Array.isArray(sound)) {
                // For collision and groined sounds
                sound.forEach(s => s.volume = 0.275); // Reduced from 0.55 to 0.275
            } else if (sound !== this.sounds.background) {
                // For other sounds (jump, gameOver, spark)
                if (sound === this.sounds.spark) {
                    sound.volume = 0.12; // Reduced from 0.20 to 0.12 (40% lower)
                } else if (sound === this.sounds.gameOver) {
                    sound.volume = 0.098; // Reduced from 0.14 to 0.098 (30% lower)
                } else {
                    sound.volume = 0.20; // Reduced from 0.25 to 0.20 for jump sound
                }
            }
        });
        
        // Initialize sound states
        this.soundEnabled = true;
        this.musicEnabled = true;
        
        // Setup sound toggles
        this.setupSoundToggles();
        
        // Load all images
        this.images = {
            hamster: {
                riding1: new Image(),
                riding2: new Image(),
                jumping: new Image(),
                hurt: new Image()
            },
            background: new Image(),  // Single background image
            obstacles: {
                low: [],  // Changed to array to store multiple low obstacle images
                high: []  // Changed from single image to array for multiple high obstacles
            },
            rail: new Image(),
            gap: new Image(),
            spark: {
                frame1: new Image(),
                frame2: new Image()
            }
        };

        // Set image sources
        this.images.hamster.riding1.src = './ASSETS/Hamster/Riding1.png';
        this.images.hamster.riding2.src = './ASSETS/Hamster/Riding2.png';
        this.images.hamster.jumping.src = './ASSETS/Hamster/Jumping.png';
        this.images.hamster.hurt.src = './ASSETS/Hamster/Hurt.png';
        this.images.background.src = './ASSETS/Background/BackgroundWide.png';
        
        // Initialize low obstacle images
        for (let i = 1; i <= 11; i++) {  // Changed from 7 to 11
            const img = new Image();
            img.src = `./ASSETS/Low Obstacles/Obstacle${i}.png`;
            this.images.obstacles.low.push(img);
        }
        
        // Initialize high obstacle images
        for (let i = 1; i <= 3; i++) {
            const img = new Image();
            img.src = `./ASSETS/High Obstacles/Obstacle${i}.png`;
            this.images.obstacles.high.push(img);
        }
        
        this.images.rail.src = './ASSETS/Railing/Rail.png';
        this.images.gap.src = './ASSETS/Railing/Gap.png';
        this.images.spark.frame1.src = './ASSETS/Effects/Spark1.png';
        this.images.spark.frame2.src = './ASSETS/Effects/Spark2.png';

        // Initialize game state
        this.gameStarted = false;
        this.gameOver = false;
        this.imagesLoaded = false;
        this.score = 0;
        this.gameSpeed = 6;
        this.obstacles = [];
        this.startTime = 0;
        this.lastScoreUpdate = 0;
        this.pointsSinceLastObstacle = 0;
        this.wagerPlaced = false;
        this.currentWager = 0;
        this.spacePressed = false;
        this.showingPayout = false;
        this.sMinSoundPlayed = false;  // Added flag to track if s-min sound was played
        
        // Background scrolling properties
        this.background = {
            x: 0,
            width: 4200,
            image: this.images.background,
            speed: 4  // Base speed for background
        };
        
        this.backgroundSpeed = 2;

        // Update background position based on game speed
        this.background.x -= this.gameSpeed;
        
        // Reset background position when it moves off screen
        if (this.background.x <= -this.background.width) {
            this.background.x = 0;
        }
        
        // Update rail position to match background speed
        this.rail = {
            height: 60,
            y: this.canvas.height - 100,
            segmentWidth: 120,
            x: 0
        };

        this.rail.x -= this.gameSpeed;
        
        // Reset rail position when it moves off screen
        if (this.rail.x <= -this.rail.segmentWidth) {
            this.rail.x = 0;
        }
        
        // Draw background with scrolling
        this.ctx.drawImage(
            this.background.image,
            this.background.x,
            10,
            this.background.width,
            this.canvas.height
        );
        
        // Draw second part of background if first is partially off screen
        if (this.background.x + this.background.width < this.canvas.width) {
            this.ctx.drawImage(
                this.background.image,
                this.background.x + this.background.width,
                10,
                this.background.width,
                this.canvas.height
            );
        }
        
        this.hamster = {
            x: 50,
            y: this.canvas.height - 140,
            width: 100,
            height: 100,
            jumping: false,
            velocityY: 0,
            gravity: 0.5,
            jumpDeceleration: 0.2,
            initialJumpSpeed: 20,
            maxJumpForce: 100,
            groundY: this.canvas.height - 140,
            maxJumpHeight: (this.canvas.height * 1.25) - 140,
            maxJumpTime: 300,
            jumpSpeed: 30,
            isHurt: false,
            currentRidingSprite: 'riding1',
            hasFirstJumped: false,
            alternateLanding: true,
            currentSparkFrame: 'frame1',
            lastSparkFrameChange: 0,
            hasReleasedSpace: false,
            obstaclesJumped: 0,
            hasBeenJumped: false,
            isLanding: false,  // Add landing state
            landingStartTime: 0,  // Add landing start time
            landingDuration: 100  // Add landing duration in ms
        };
        
        this.jumpStartTime = 0;
        
        // Add collision animation state
        this.collisionAnimation = {
            isActive: false,
            startTime: 0,
            duration: 1000, // 1 second for the animation
            zoomLevel: 1,
            targetZoom: 8, // Increased from 5 to 8 for more dramatic zoom
            zoomSpeed: 0.03 // Increased from 0.01 to 0.03 for faster zoom
        };
        
        // Initialize high score
        this.highScore = localStorage.getItem('hamsterHighScore') || 420;
        document.getElementById('highScore').textContent = `HI: ${this.highScore}`;
        
        // Add game over message state
        this.gameOverMessages = ['GROINED!', 'IN THE GROIN!'];
        this.currentGameOverMessageIndex = 0;
        this.lastMessageChange = 0;
        this.messageChangeInterval = 1000; // Change message every second
        
        // Add jump words properties
        this.jumpWords = ['wow', 'nice', 'ok!', 'cool', 'good', 'grind!', 'mmm hmm', 'yes', '$', 'full send', 'cook', 'LFG!', 'eat', 'yussss'];
        this.superJumpWords = ['EPIC!', 'INSANE!', 'LEGEND!', 'BEAST!', 'SICK!', 'FIRE!', 'GOD MODE!', 'WILD!', 'BROKEN!', 'NUTS!'];
        this.currentJumpWord = null;
        this.jumpWordStartTime = 0;
        this.jumpWordDuration = 1000; // 1 second duration
        this.jumpWordOpacity = 1;
        this.jumpWordY = this.canvas.height / 2; // Initial Y position
        this.jumpWordX = this.canvas.width / 2; // Initial X position
        this.isSuperJump = false; // Flag to track if it's a super jump
        
        // Start loading images
        this.loadImages().then(() => {
            this.imagesLoaded = true;
            this.setupEventListeners();
            this.animate();
        }).catch(error => {
            console.error('Error loading images:', error);
            // Show error message on canvas
            this.ctx.fillStyle = '#000';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Error loading images. Please refresh.', this.canvas.width/2 - 100, this.canvas.height/2);
        });
    }
    
    setupEventListeners() {
        let spaceKeyDown = false;
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !spaceKeyDown) {
                spaceKeyDown = true;
                if (!this.gameStarted && !this.spacePressed && this.wagerPlaced && !this.showingPayout) {
                    if (this.gameOver) {
                        this.resetGame();
                        this.startGame();
                    } else {
                        this.startGame();
                    }
                } else if (!this.hamster.jumping && !this.gameOver && this.gameStarted) {
                    this.jumpStartTime = Date.now();
                    this.spacePressed = true;
                    this.hamster.jumping = true;
                    this.hamster.hasReleasedSpace = false;
                    this.hamster.velocityY = -this.hamster.initialJumpSpeed;
                    // Stop spark sound if it's playing
                    if (this.sounds.spark) {
                        this.sounds.spark.pause();
                        this.sounds.spark.currentTime = 0;
                    }
                    // Play jump sound
                    this.playSound('jump');
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                spaceKeyDown = false;
                this.spacePressed = false;
                if (this.hamster.jumping && !this.hamster.hasReleasedSpace) {
                    this.hamster.velocityY = 0;
                    this.hamster.hasReleasedSpace = true;
                }
            }
        });

        // Add wager event listeners for both start and game over screens
        const wagerAmount = document.getElementById('wagerAmount');
        const wagerAmountGameOver = document.getElementById('wagerAmountGameOver');
        const placeWager = document.getElementById('placeWager');
        const placeWagerGameOver = document.getElementById('placeWagerGameOver');
        const startInstruction = document.querySelector('.start-instruction');

        const updateWagerInfo = (selectElement, minScoreElement, maxMultiplierElement) => {
            const stake = parseInt(selectElement.value);
            const tier = this.payoutSystem.tiers.find(t => t.stake === stake);
            if (tier) {
                minScoreElement.textContent = tier.s_min;
                maxMultiplierElement.textContent = tier.max_multiplier;
            }
        };

        const handleWagerPlacement = (selectElement, buttonElement, instructionElement) => {
            const stake = parseInt(selectElement.value);
            if (stake > this.walletBalance) {
                alert('Insufficient balance!');
                selectElement.value = this.walletBalance;
                updateWagerInfo(selectElement, 
                    selectElement.id === 'wagerAmount' ? document.getElementById('minScore') : document.getElementById('minScoreGameOver'),
                    selectElement.id === 'wagerAmount' ? document.getElementById('maxMultiplier') : document.getElementById('maxMultiplierGameOver')
                );
                return;
            }
            this.currentWager = stake;
            this.wagerPlaced = true;
            this.showingPayout = false;
            document.getElementById('currentWager').textContent = `Wager: ${stake} $GRIND`;
            if (instructionElement) {
                // Show all instruction elements
                const instructionElements = document.querySelectorAll('.start-instruction');
                instructionElements.forEach(el => el.classList.remove('hidden'));
                // Remove flashing class from subtitle when start instruction becomes visible
                const subtitle = document.querySelector('#gameOverScreen .subtitle');
                if (subtitle) {
                    subtitle.classList.remove('flashing');
                }
            }
            buttonElement.disabled = true;
            selectElement.disabled = true;
        };

        // Start screen wager handling
        wagerAmount.addEventListener('change', () => {
            const stake = parseInt(wagerAmount.value);
            if (stake > this.walletBalance) {
                alert('Insufficient balance!');
                wagerAmount.value = this.walletBalance;
            }
            updateWagerInfo(wagerAmount, document.getElementById('minScore'), document.getElementById('maxMultiplier'));
        });

        placeWager.addEventListener('click', () => {
            handleWagerPlacement(wagerAmount, placeWager, document.querySelector('#startScreen .start-instruction'));
        });

        // Game over screen wager handling
        wagerAmountGameOver.addEventListener('change', () => {
            const stake = parseInt(wagerAmountGameOver.value);
            if (stake > this.walletBalance) {
                alert('Insufficient balance!');
                wagerAmountGameOver.value = this.walletBalance;
            }
            updateWagerInfo(wagerAmountGameOver, document.getElementById('minScoreGameOver'), document.getElementById('maxMultiplierGameOver'));
        });

        placeWagerGameOver.addEventListener('click', () => {
            handleWagerPlacement(wagerAmountGameOver, placeWagerGameOver, document.querySelector('#gameOverScreen .start-instruction'));
        });
    }
    
    resetGame() {
        this.gameOver = false;
        this.gameStarted = false;
        this.score = 0;
        this.obstacles = [];
        this.spacePressed = false;
        this.wagerPlaced = false;
        this.showingPayout = false;
        this.hamster.jumping = false;
        this.hamster.isHurt = false;
        this.hamster.y = this.hamster.groundY;
        this.hamster.velocityY = 0;
        this.hamster.hasFirstJumped = false;
        this.hamster.hasReleasedSpace = false;
        this.collisionAnimation.isActive = false;
        this.collisionAnimation.zoomLevel = 1;
        this.sMinSoundPlayed = false;
        
        // Reset score counter color
        document.getElementById('currentScore').style.color = '';
        
        // Reset wager UI elements
        const wagerAmount = document.getElementById('wagerAmount');
        const wagerAmountGameOver = document.getElementById('wagerAmountGameOver');
        const placeWager = document.getElementById('placeWager');
        const placeWagerGameOver = document.getElementById('placeWagerGameOver');
        
        wagerAmount.disabled = false;
        wagerAmountGameOver.disabled = false;
        placeWager.disabled = false;
        placeWagerGameOver.disabled = false;
        
        // Hide game over screen
        document.getElementById('gameOverScreen').classList.add('hidden');
        
        // Restore background music
        if (this.musicEnabled) {
            console.log('Restoring music position:', this.backgroundMusicPosition);
            this.sounds.background.currentTime = this.backgroundMusicPosition;
            this.sounds.background.volume = 0.15;
            this.sounds.background.play();
        }
    }
    
    startGame() {
        this.gameStarted = true;
        this.startTime = Date.now();
        this.lastScoreUpdate = this.startTime;
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        this.score = 0;
        this.gameSpeed = 4;
        this.obstacles = [];
        this.hamster.currentRidingSprite = 'riding1';
        
        // Start background music if enabled
        if (this.musicEnabled) {
            // Only reset position if this is a fresh start (not after collision)
            if (!this.backgroundMusicPosition) {
                this.sounds.background.currentTime = 0;
            } else {
                this.sounds.background.currentTime = this.backgroundMusicPosition;
            }
            this.sounds.background.volume = 0.15;
            this.sounds.background.play();
        }
        
        // Deduct wager amount from wallet balance when game starts
        this.walletBalance -= this.currentWager;
        document.getElementById('walletBalance').textContent = `Balance: ${this.formatBalance(this.walletBalance)} $GRIND`;
    }
    
    createObstacle() {
        // Check if we should create a new obstacle
        if (Math.random() < 0.01 || this.pointsSinceLastObstacle >= 25) {
            const baseWidth = 60;
            const baseHeight = 70;
            
            // Randomly choose obstacle type
            const obstacleType = Math.random();
            
            // Calculate initial position relative to background
            const initialX = this.canvas.width + this.background.x;
            
            if (obstacleType < 0.2) { // 20% chance for a rail gap
                this.obstacles.push({
                    initialX: initialX,  // Store initial position
                    x: this.canvas.width,  // Current position
                    y: this.canvas.height - 160 - this.rail.height + 120,
                    width: 100,
                    height: this.rail.height,
                    isGap: true,
                    isSpecial: false
                });
            } else if (obstacleType < 0.5) { // 30% chance for high obstacle
                let availableIndices = [0];
                if (this.score > 350) {
                    availableIndices.push(1);
                }
                if (this.score > 700) {
                    availableIndices.push(2);
                }
                
                const selectedIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                
                this.obstacles.push({
                    initialX: initialX,  // Store initial position
                    x: this.canvas.width,  // Current position
                    y: this.canvas.height - 160 - (baseHeight * 2) + 120,
                    width: baseWidth * 1.3,
                    height: baseHeight * 2,
                    isSpecial: true,
                    isGap: false,
                    imageIndex: selectedIndex
                });
            } else { // 50% chance for normal obstacle
                this.obstacles.push({
                    initialX: initialX,  // Store initial position
                    x: this.canvas.width,  // Current position
                    y: this.canvas.height - 160 - (baseHeight * 1.2) + 120,
                    width: baseWidth,
                    height: baseHeight * 1.2,
                    isSpecial: false,
                    isGap: false
                });
            }
            this.pointsSinceLastObstacle = 0;
        }
    }
    
    update() {
        if (!this.gameStarted) return;
        
        // Calculate delta time using performance.now() for more precise timing
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 0.1);
        
        // Update game state with fixed time step
        this.accumulator += this.deltaTime;
        while (this.accumulator >= this.fixedTimeStep) {
            this.fixedUpdate();
            this.accumulator -= this.fixedTimeStep;
        }
    }
    
    fixedUpdate() {
        if (this.collisionAnimation.isActive) {
            // Handle collision animation
            const elapsed = Date.now() - this.collisionAnimation.startTime;
            
            if (elapsed < this.collisionAnimation.duration) {
                // Gradually increase zoom level
                this.collisionAnimation.zoomLevel = Math.min(
                    this.collisionAnimation.targetZoom,
                    this.collisionAnimation.zoomLevel + this.collisionAnimation.zoomSpeed
                );
            } else {
                // Animation complete, show game over
                this.endGame();
            }
            return;
        }
        
        if (this.gameOver) {
            // Update game over message if enough time has passed
            const currentTime = Date.now();
            if (currentTime - this.lastMessageChange >= this.messageChangeInterval) {
                this.currentGameOverMessageIndex = (this.currentGameOverMessageIndex + 1) % this.gameOverMessages.length;
                const titleElement = document.querySelector('#gameOverScreen .pixel-title');
                if (titleElement) {
                    titleElement.textContent = this.gameOverMessages[this.currentGameOverMessageIndex];
                }
                this.lastMessageChange = currentTime;
            }
            return;
        }
        
        // Update score based on time elapsed
        const timeElapsed = Date.now() - this.startTime;
        const scoreUpdateInterval = 100;
        
        if (Date.now() - this.lastScoreUpdate >= scoreUpdateInterval) {
            this.score = Math.floor(timeElapsed / 100); // 1 point per 100ms
            this.lastScoreUpdate = Date.now();
            this.pointsSinceLastObstacle++;  // Increment points since last obstacle
            
            // Check if we've reached the minimum score for the current wager
            if (!this.sMinSoundPlayed && this.currentWager > 0) {
                const tier = this.payoutSystem.tiers.find(t => t.stake === this.currentWager);
                if (tier && this.score >= tier.s_min) {
                    this.playSound('sMin');
                    this.sMinSoundPlayed = true;
                    // Change score counter color to light blue
                    document.getElementById('currentScore').style.color = '#00FFFF';
                }
            }
            
            // Increase game speed smoothly based on score
            this.gameSpeed = 4 + (this.score * 0.015); // Start at 4 and increase by 0.015 per point
        }
        
        // Update background position with fixed time step
        this.background.x -= this.gameSpeed * this.fixedTimeStep;
        
        // Reset background position when it moves off screen
        if (this.background.x <= -this.background.width) {
            this.background.x = 0;
        }
        
        // Update rail position to match background exactly
        this.rail.x = this.background.x;
        
        // Create and update obstacles
        this.createObstacle();
        this.obstacles.forEach((obstacle, index) => {
            // Calculate obstacle position relative to background
            const relativeX = obstacle.initialX - this.background.x;
            obstacle.x = relativeX;
            
            // If obstacle is off screen to the left, remove it
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(index, 1);
                if (!this.gameOver) {
                    this.score++;
                }
            }
            
            // Check if hamster jumped over this obstacle
            if (this.hamster.jumping && !obstacle.isGap && 
                this.hamster.x + this.hamster.width > obstacle.x + obstacle.width &&
                this.hamster.x < obstacle.x + obstacle.width &&
                this.hamster.y + this.hamster.height < obstacle.y &&
                !obstacle.hasBeenJumped) {
                this.hamster.obstaclesJumped++;
                obstacle.hasBeenJumped = true;
            }
            
            // Check for collision
            if (!obstacle.isGap && this.checkCollision(this.hamster, obstacle)) {
                this.hamster.isHurt = true;
                this.collisionAnimation.isActive = true;
                this.collisionAnimation.startTime = Date.now();
                this.spacePressed = false;
                this.hamster.jumping = false;
                this.hamster.isLanding = false;
                this.hamster.velocityY = 0;
                
                // Store current position before fading out
                this.backgroundMusicPosition = this.sounds.background.currentTime;
                console.log('Storing music position:', this.backgroundMusicPosition);
                
                // Fade out background music quickly
                const fadeOutInterval = setInterval(() => {
                    if (this.sounds.background.volume > 0) {
                        this.sounds.background.volume = Math.max(0, this.sounds.background.volume - 0.1);
                    } else {
                        clearInterval(fadeOutInterval);
                        this.sounds.background.pause();
                    }
                }, 50);
                
                // Play collision sound
                this.playSound('collision');
            }
        });
    }
    
    checkCollision(hamster, obstacle) {
        // More precise collision detection with debug information
        const hamsterRight = hamster.x + hamster.width;
        const hamsterBottom = hamster.y + hamster.height;
        const obstacleRight = obstacle.x + obstacle.width;
        const obstacleBottom = obstacle.y + obstacle.height;
        
        // Adjust collision box for riding1 sprite
        const rightOffset = (this.hamster.currentRidingSprite === 'riding1') ? 40 : 0;
        
        // Use smaller overlap allowance during landing
        const landingOverlap = this.hamster.isLanding ? 10 : 20;
        
        // Add 5-pixel buffer to collision detection and dynamic overlap allowance
        const collision = hamster.x + 5 < obstacleRight - 5 &&
                         hamsterRight - 5 - rightOffset > obstacle.x + 5 &&
                         hamster.y + 5 < obstacleBottom - 5 + landingOverlap &&
                         hamsterBottom - 5 > obstacle.y + 5;
        
        if (collision) {
            console.log('Collision details:');
            console.log('Hamster:', {
                x: hamster.x,
                y: hamster.y,
                width: hamster.width - rightOffset,
                height: hamster.height,
                right: hamsterRight - rightOffset,
                bottom: hamsterBottom,
                isLanding: this.hamster.isLanding
            });
            console.log('Obstacle:', {
                x: obstacle.x,
                y: obstacle.y,
                width: obstacle.width,
                height: obstacle.height,
                right: obstacleRight,
                bottom: obstacleBottom
            });
        }
        
        return collision;
    }
    
    draw() {
        if (!this.imagesLoaded) {
            // Show loading screen
            this.ctx.fillStyle = '#000';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Loading...', this.canvas.width/2 - 40, this.canvas.height/2);
            return;
        }

        // Clear canvas with a solid color for better performance
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for zooming
        this.ctx.save();
        
        if (this.collisionAnimation.isActive) {
            // Apply zoom transformation
            const zoom = this.collisionAnimation.zoomLevel;
            
            // Calculate the hamster's center
            const hamsterCenterX = this.hamster.x + this.hamster.width/2;
            const hamsterCenterY = this.hamster.y + this.hamster.height/2;
            
            // Calculate how much to shift the hamster towards center
            const targetCenterX = this.canvas.width / 2;
            const targetCenterY = this.canvas.height / 2;
            const shiftX = (targetCenterX - hamsterCenterX) * (1 - 1/zoom);
            const shiftY = (targetCenterY - hamsterCenterY) * (1 - 1/zoom);
            
            // First translate to hamster's center
            this.ctx.translate(hamsterCenterX, hamsterCenterY);
            // Apply the zoom
            this.ctx.scale(zoom, zoom);
            // Apply the shift to move towards center
            this.ctx.translate(shiftX/zoom, shiftY/zoom);
            // Translate back
            this.ctx.translate(-hamsterCenterX, -hamsterCenterY);
        }
        
        // Draw backgrounds with scrolling
        this.ctx.drawImage(
            this.background.image,
            Math.floor(this.background.x),  // Round to prevent sub-pixel rendering
            10,
            this.background.width,
            this.canvas.height
        );
        
        // Draw second part of background if first is partially off screen
        if (this.background.x + this.background.width < this.canvas.width) {
            this.ctx.drawImage(
                this.background.image,
                Math.floor(this.background.x + this.background.width),  // Round to prevent sub-pixel rendering
                10,
                this.background.width,
                this.canvas.height
            );
        }
        
        // Draw rail (except where there are gaps)
        this.drawRail();
        
        // Draw hamster
        let hamsterSprite;
        if (this.hamster.isHurt) {
            hamsterSprite = this.images.hamster.hurt;
        } else {
            hamsterSprite = this.hamster.jumping ? 
                this.images.hamster.jumping : 
                this.images.hamster[this.hamster.currentRidingSprite];
        }
        
        // Save the current context state
        this.ctx.save();
        
        // Move to the hamster's position
        this.ctx.translate(
            Math.floor(this.hamster.x + this.hamster.width/2),  // Round to prevent sub-pixel rendering
            Math.floor(this.hamster.y + this.hamster.height/2)   // Round to prevent sub-pixel rendering
        );
        
        // If hurt, add rotation
        if (this.hamster.isHurt) {
            const rotation = (Math.PI / 18) * (1 - 1/this.collisionAnimation.zoomLevel);
            this.ctx.rotate(rotation);
        } else if (this.hamster.jumping && !this.hamster.isHurt) {
            const rotation = (this.hamster.velocityY / this.hamster.initialJumpSpeed) * Math.PI/6;
            this.ctx.rotate(rotation);
        }
        
        // Draw the hamster centered at its position
        this.ctx.drawImage(
            hamsterSprite,
            -this.hamster.width/2,
            -this.hamster.height/2,
            this.hamster.width,
            this.hamster.height
        );
        
        // Draw spark effect when in lower position
        if (!this.hamster.jumping && !this.hamster.isHurt && this.hamster.y === this.canvas.height - 200) {
            // Update spark frame every 100ms
            const currentTime = Date.now();
            if (currentTime - this.hamster.lastSparkFrameChange > 100) {
                this.hamster.currentSparkFrame = this.hamster.currentSparkFrame === 'frame1' ? 'frame2' : 'frame1';
                this.hamster.lastSparkFrameChange = currentTime;
            }
            
            this.ctx.drawImage(
                this.images.spark[this.hamster.currentSparkFrame],
                -this.hamster.width/2,
                -this.hamster.height/2,
                this.hamster.width,
                this.hamster.height
            );
        }
        
        // Restore the context state
        this.ctx.restore();
        
        // Draw obstacles with debug outlines
        this.obstacles.forEach(obstacle => {
            if (obstacle.isGap) {
                // Don't draw anything for gaps
                return;
            }
            
            if (obstacle.isSpecial) {
                this.ctx.drawImage(
                    this.images.obstacles.high[obstacle.imageIndex],
                    Math.floor(obstacle.x),  // Round to prevent sub-pixel rendering
                    Math.floor(obstacle.y),  // Round to prevent sub-pixel rendering
                    obstacle.width,
                    obstacle.height
                );
            } else {
                // Randomly select a low obstacle image if not already assigned
                if (!obstacle.imageIndex) {
                    obstacle.imageIndex = Math.floor(Math.random() * this.images.obstacles.low.length);
                }
                this.ctx.drawImage(
                    this.images.obstacles.low[obstacle.imageIndex],
                    Math.floor(obstacle.x),  // Round to prevent sub-pixel rendering
                    Math.floor(obstacle.y),  // Round to prevent sub-pixel rendering
                    obstacle.width,
                    obstacle.height
                );
            }
        });
        
        // Update score in the score bar
        if (this.gameStarted && !this.gameOver) {
            document.getElementById('currentScore').textContent = this.score;
        }
        
        // Draw jump word if active
        if (this.currentJumpWord) {
            const elapsed = Date.now() - this.jumpWordStartTime;
            if (elapsed < this.jumpWordDuration) {
                // Calculate opacity based on elapsed time
                this.jumpWordOpacity = 1 - (elapsed / this.jumpWordDuration);
                
                // Calculate new position - move up and left
                this.jumpWordY = this.canvas.height / 2 - (elapsed / this.jumpWordDuration) * 200;
                this.jumpWordX = this.canvas.width / 2 - 200;
                
                // Set up the text style
                this.ctx.font = '48px "Press Start 2P"';
                this.ctx.fillStyle = this.isSuperJump ? 
                    `rgba(255, 0, 255, ${this.jumpWordOpacity})` :
                    `rgba(255, 215, 0, ${this.jumpWordOpacity})`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                // Draw the text at the new position
                this.ctx.fillText(this.currentJumpWord, this.jumpWordX, this.jumpWordY);
            } else {
                // Clear the word when animation is complete
                this.currentJumpWord = null;
                this.isSuperJump = false;
            }
        }
        
        // Restore context after drawing
        this.ctx.restore();
    }
    
    drawRail() {
        // Draw continuous rail
        let currentX = Math.floor(this.rail.x);
        
        // Draw rail segments until we cover the entire screen width
        while (currentX < this.canvas.width + this.rail.segmentWidth) {
            this.ctx.drawImage(
                this.images.rail,
                currentX,
                this.rail.y,
                this.rail.segmentWidth,
                this.rail.height
            );
            currentX += this.rail.segmentWidth;
        }
    }
    
    animate() {
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastRenderTime;
        
        // Only render if enough time has passed
        if (elapsed >= this.renderInterval) {
            this.update();
            this.draw();
            this.lastRenderTime = currentTime;
        }
        
        requestAnimationFrame(() => this.animate());
    }

    // Separate method for loading images
    loadImages() {
        return new Promise((resolve, reject) => {
            let loadedImages = 0;
            let totalImages = 0;
            
            // Count total images to load
            totalImages += Object.keys(this.images.hamster).length; // 4 hamster images
            totalImages += 1; // background
            totalImages += this.images.obstacles.low.length; // low obstacles
            totalImages += this.images.obstacles.high.length; // high obstacles
            totalImages += 1; // rail
            totalImages += 1; // gap
            totalImages += Object.keys(this.images.spark).length; // spark frames
            
            const checkLoading = () => {
                loadedImages++;
                if (loadedImages === totalImages) {
                    resolve();
                }
            };

            // Set up onload handlers for all images
            Object.values(this.images.hamster).forEach(img => {
                img.onload = checkLoading;
                img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
            });

            this.images.background.onload = checkLoading;
            this.images.background.onerror = () => reject(new Error(`Failed to load image: ${this.images.background.src}`));

            // Load low obstacles
            this.images.obstacles.low.forEach(img => {
                img.onload = checkLoading;
                img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
            });

            // Load high obstacles
            this.images.obstacles.high.forEach(img => {
                img.onload = checkLoading;
                img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
            });

            this.images.rail.onload = checkLoading;
            this.images.rail.onerror = () => reject(new Error(`Failed to load image: ${this.images.rail.src}`));

            this.images.gap.onload = checkLoading;
            this.images.gap.onerror = () => reject(new Error(`Failed to load image: ${this.images.gap.src}`));

            Object.values(this.images.spark).forEach(img => {
                img.onload = checkLoading;
                img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
            });
        });
    }

    showHigherWagerPopup(score) {
        const higherWagerInfo = document.getElementById('higherWagerInfo');
        let popupContent = '';
        
        // Check if score qualifies for higher stakes
        const tier50 = this.payoutSystem.tiers.find(t => t.stake === 50);
        const tier100 = this.payoutSystem.tiers.find(t => t.stake === 100);
        
        // Check each tier separately
        let hasQualifyingTier = false;
        
        if (score >= tier50.s_min && this.currentWager < 50) {
            hasQualifyingTier = true;
            const payout50 = this.payoutSystem.calculatePayout(score, 50);
            popupContent += `
                <div class="wager-row">
                    <span class="payout-amount">${Math.round(payout50.totalPayout)} $GRIND</span>
                    <span class="wager-detail">wagering 50</span>
                </div>`;
        }
        
        if (score >= tier100.s_min && this.currentWager < 100) {
            hasQualifyingTier = true;
            const payout100 = this.payoutSystem.calculatePayout(score, 100);
            popupContent += `
                <div class="wager-row">
                    <span class="payout-amount">${Math.round(payout100.totalPayout)} $GRIND</span>
                    <span class="wager-detail">wagering 100</span>
                </div>`;
        }
        
        if (hasQualifyingTier) {
            popupContent = '<div class="wager-header">You could have won:</div>' + popupContent;
            higherWagerInfo.innerHTML = popupContent;
            document.getElementById('higherWagerPopup').classList.remove('hidden');
        }
    }

    endGame() {
        this.gameOver = true;
        this.gameStarted = false;
        this.showingPayout = true;
        this.wagerPlaced = false;
        this.currentGameOverMessageIndex = 0;
        this.lastMessageChange = Date.now();
        
        // Store the current position before stopping
        this.backgroundMusicPosition = this.sounds.background.currentTime;
        
        // Stop background music
        this.sounds.background.pause();
        
        // Only play game over sound if player reached s-min
        if (this.sMinSoundPlayed) {
            this.playSound('gameOver');
        }
        
        // Calculate and display payout
        const payout = this.payoutSystem.calculatePayout(this.score, this.currentWager);
        
        // Log the score
        scoreLogger.logScore(this.score, this.currentWager, payout.totalPayout);
        
        // Update payout information
        document.getElementById('payoutScore').textContent = this.score;
        document.getElementById('payoutBase').textContent = payout.basePayout;
        document.getElementById('payoutBonus').textContent = payout.milestoneBonus;
        document.getElementById('payoutTotal').textContent = payout.totalPayout;
        
        // Only add winnings to wallet balance (wager was already deducted at start)
        if (payout.totalPayout > 0) {
            this.walletBalance += payout.totalPayout;
        }
        
        // Update balance displays
        document.getElementById('walletBalance').textContent = `Balance: ${this.formatBalance(this.walletBalance)} $GRIND`;
        document.getElementById('payoutBalance').textContent = this.formatBalance(this.walletBalance);
        
        // Update high score if current score is higher
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('hamsterHighScore', this.highScore);
            document.getElementById('highScore').textContent = `HI: ${this.highScore}`;
        }
        
        // Show the game over screen
        const gameOverScreen = document.getElementById('gameOverScreen');
        gameOverScreen.classList.remove('hidden');
        
        // Update the initial game over message
        const titleElement = gameOverScreen.querySelector('.pixel-title');
        titleElement.textContent = this.gameOverMessages[this.currentGameOverMessageIndex];
        
        // Hide the start instruction until a new wager is placed
        document.querySelector('#gameOverScreen .start-instruction').classList.add('hidden');
        
        // Add flashing class to subtitle when game ends
        const subtitle = document.querySelector('#gameOverScreen .subtitle');
        if (subtitle) {
            subtitle.classList.add('flashing');
            // Update subtitle text based on payout
            if (payout.totalPayout > 0) {
                subtitle.innerHTML = `You Win <span id="payoutTotal" class="payout-amount">${payout.totalPayout}</span> $GRIND`;
            } else {
                subtitle.innerHTML = `You Win <span id="payoutTotal" class="payout-amount">${this.score}</span> XP`;
            }
        }

        // Show higher wager popup after 3 seconds
        setTimeout(() => {
            this.showHigherWagerPopup(this.score);
        }, 3000);
    }

    // Add helper function to format balance
    formatBalance(value) {
        // Convert to number if it's a string
        const num = typeof value === 'string' ? parseFloat(value) : value;
        // Check if the number has decimal places
        return num % 1 === 0 ? num : num.toFixed(1);
    }

    setupSoundToggles() {
        const musicToggle = document.getElementById('musicToggle');
        const sfxToggle = document.getElementById('sfxToggle');

        // Load saved sound preferences
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        this.musicEnabled = localStorage.getItem('musicEnabled') !== 'false';

        // Set initial toggle states
        if (!this.soundEnabled) {
            sfxToggle.classList.add('muted');
        }
        if (!this.musicEnabled) {
            musicToggle.classList.add('muted');
            this.sounds.background.pause();
        }

        // Music toggle
        musicToggle.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default button behavior
            this.musicEnabled = !this.musicEnabled;
            musicToggle.classList.toggle('muted');
            localStorage.setItem('musicEnabled', this.musicEnabled);
            
            if (this.musicEnabled && this.gameStarted && !this.gameOver) {
                this.sounds.background.currentTime = 0;
                this.sounds.background.volume = 0.15;
                this.sounds.background.play();
            } else {
                this.sounds.background.pause();
            }
        });

        // Sound effects toggle
        sfxToggle.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default button behavior
            this.soundEnabled = !this.soundEnabled;
            sfxToggle.classList.toggle('muted');
            localStorage.setItem('soundEnabled', this.soundEnabled);
        });

        // Prevent space bar from focusing the buttons
        musicToggle.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
            }
        });

        sfxToggle.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
            }
        });
    }

    playSound(soundName) {
        if (this.soundEnabled) {
            try {
                if (soundName === 'collision') {
                    // If a collision sound is already playing, don't play another one
                    if (this.isCollisionSoundPlaying) {
                        return;
                    }
                    
                    // Randomly select a collision sound
                    const randomIndex = Math.floor(Math.random() * this.sounds.collision.length);
                    const sound = this.sounds.collision[randomIndex];
                    if (!sound) {
                        console.warn('Collision sound not found at index:', randomIndex);
                        return;
                    }
                    
                    // Set flag to indicate collision sound is playing
                    this.isCollisionSoundPlaying = true;
                    sound.currentTime = 0;
                    
                    // Set up the groined sound to play after collision sound ends
                    sound.onended = () => {
                        const groinedIndex = Math.floor(Math.random() * this.sounds.groined.length);
                        const groinedSound = this.sounds.groined[groinedIndex];
                        if (!groinedSound) {
                            console.warn('Groined sound not found at index:', groinedIndex);
                            return;
                        }
                        groinedSound.currentTime = 0;
                        groinedSound.play().catch(error => {
                            console.warn('Error playing groined sound:', error);
                        });
                        
                        // Reset the flag when the groined sound ends
                        groinedSound.onended = () => {
                            this.isCollisionSoundPlaying = false;
                        };
                    };
                    
                    sound.play().catch(error => {
                        console.warn('Error playing collision sound:', error);
                        this.isCollisionSoundPlaying = false;
                    });
                } else {
                    const sound = this.sounds[soundName];
                    if (!sound) {
                        console.warn('Sound not found:', soundName);
                        return;
                    }
                    sound.currentTime = 0;
                    sound.play().catch(error => {
                        console.warn('Error playing sound:', soundName, error);
                    });
                }
            } catch (error) {
                console.warn('Error in playSound:', error);
                this.isCollisionSoundPlaying = false;
            }
        }
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
}; 