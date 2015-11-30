// jshint globalstrict: true
// TODO write tests
"use strict";

// Canvas objects
var canvas;
var context;

// Constants
// Keyboard codes
var LEFT = 37;
var RIGHT = 39;
var DOWN = 40;
var UP = 38;
var SPACE = 32;
var SHOOT = 65;

// Sprite attributes
var DEFAULT_BLOCK_WIDTH = 50;
var DEFAULT_BLOCK_HEIGHT = 50;
var PLAYER_SPRITE_WIDTH = 30;
var PLAYER_SPRITE_HEIGHT = 30;
var BULLET_SPRITE_WIDTH = 5;
var BULLET_SPRITE_HEIGHT = 5;
var PLAYER_COLOR = "blue";
var BULLET_COLOR = "green";

// Sprite enums
// For drawing maps
var NULL = 0;
var BLOCK = 1;

// Roughly corresponds to a delay allowing for 60fps action 
var DEFAULT_DRAW_DELAY = 16;

// Physics
var MAX_X_VELOCITY = 5;
var MAX_Y_VELOCITY = 10;
var GRAVITY_ACCELERATION = 1;

// The y-coordinate of the horizontal line on which sprites stand
// TODO delete
var SPRITE_FLOOR = 900;

// Game variables
var player, blocks, sprites, keysPressed, map;

// Initialization logic
function init() {
    canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    context = canvas.getContext("2d");

    player = new Player(10, 270, PLAYER_SPRITE_WIDTH, PLAYER_SPRITE_HEIGHT, PLAYER_COLOR);
    sprites = [player];
    blocks = [];
    keysPressed = {};

    // The player map, represented as a grid of blocks
    map = [
        [NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL],
        [NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL],
        [NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL],
        [NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL],
        [NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, BLOCK, NULL, NULL, NULL, NULL, NULL, NULL, NULL],
        [NULL, NULL, NULL, NULL, NULL, BLOCK, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, BLOCK],
        [BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK, BLOCK]
    ];
    // Add a new block sprite for each item in map
    for (var i = 0; i < map.length; i++) {
        for (var j = 0; j < map[i].length; j++) {
            var item = map[i][j];
            if (item === BLOCK) {
                var x = j * DEFAULT_BLOCK_WIDTH;
                var y = i * DEFAULT_BLOCK_HEIGHT;
                var block = new Block(x, y, DEFAULT_BLOCK_WIDTH, DEFAULT_BLOCK_HEIGHT, "green");
                sprites.push(block);
                blocks.push(block);
            }
        }
    }
}

// Classes
// Sprite class, should be used like an abstract class
var Sprite = function(x, y, w, h, color) {
    // Position and visual attributes
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;

    // Physics
    this.velocityX = 0;
    this.velocityY = 0;

    // Color for drawing
    this.color = color;
};

// Drawing logic for sprites
Sprite.prototype.draw = function() {
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
};

// Update logic for sprites
Sprite.prototype.updateVelocity = function(newVelocityX, newVelocityY) {
    this.velocityX = newVelocityX;
    this.velocityY = newVelocityY;
};

Sprite.prototype.updatePosition = function() {
    this.x += this.velocityX;
    this.y += this.velocityY;
};

Sprite.prototype.update = function() {
    // Should be implemented by classes inheriting Sprite
};

// Player class
var Player = function(x, y, w, h, color) {
    Sprite.call(this, x, y, w, h, color);
    this.falling = false;
    this.direction = RIGHT;
    this.shooting = false;
    this.dead = false;
};

// Player inherits from Sprite
Player.prototype = Object.create(Sprite.prototype);
Player.prototype.constructor = Sprite;

Player.prototype.calculateNewVelocityX = function() {
    // Update X velocity
    var newVelocityX = 0;
    if (keysPressed.LEFT) {
        newVelocityX -= MAX_X_VELOCITY;
    }
    if (keysPressed.RIGHT) {
        newVelocityX += MAX_X_VELOCITY;
    }

    // Update direction
    if (newVelocityX > 0) {
        this.direction = RIGHT;
    } else if (newVelocityX < 0) {
        this.direction = LEFT;
    }
    return newVelocityX;
};

Player.prototype.calculateNewVelocityY = function() {
    var newVelocityY = 0;
    if (this.falling) {
        // Counteract player velocity with gravity acceleration
        newVelocityY = this.velocityY + GRAVITY_ACCELERATION;
    } else {
        if (keysPressed.SPACE) {
            // Only allow one jump per keypress
            // Held down space key won't trigger multiple jumps
            if (!this.jumped) {
                // Space was just pressed and sprite is not jumping
                // "Up" in the y-direction is negative
                this.jumped = true;
                this.falling = true;
                newVelocityY = -MAX_Y_VELOCITY;
            }
        } else {
            // Reset jumping flag
            this.jumped = false;
        }
    }
    if (newVelocityY > MAX_Y_VELOCITY) {
        // Anchor y-velocity to MAX_VELOCITY
        newVelocityY = MAX_Y_VELOCITY;
    }
    return newVelocityY;
};

// If there is a collision between the player and a block, this
// function will anchor the player's position to the colliding side of
// the block.
Player.prototype.checkForCollision = function(block) {
    var playerLeft = this.x;
    var playerRight = this.x + this.width;
    var playerTop = this.y;
    var playerBottom = this.y + this.height;

    var blockLeft = block.x;
    var blockRight = block.x + block.width;
    var blockTop = block.y;
    var blockBottom = block.y + block.height;

    // If player is falling down and its bottom is touching the top of a block
    if (this.velocityY >= 0 && Math.abs(playerBottom - blockTop) <= MAX_Y_VELOCITY) {
        // If the player is horizontally aligned with the block, given some wiggle room
        if (Math.abs(playerLeft - blockLeft) < this.width ||
            Math.abs(playerRight - blockRight) < this.width) {
            // Set falling to false and anchor player's y
            this.falling = false;
            this.y = block.y - this.height;
        }
    }

    // If player is jumping up and its top is touching the bottom of a block
    if (this.velocityY < 0 && Math.abs(playerTop - blockBottom) <= MAX_Y_VELOCITY) {
        // If the player is horizontally aligned with the block, given some wiggle room
        if (Math.abs(playerLeft - blockLeft) < this.width ||
            Math.abs(playerRight - blockRight) < this.width) {
            // Reduce player velocity and anchor player's y
            // or maybe not?
            this.velocityY = 0;
            this.y = blockBottom;
        }
    }

    // If player is moving to the right and its right is touching the side of a block
    if (this.velocityX > 0 && Math.abs(playerRight - blockLeft) <= MAX_X_VELOCITY) {
        // If the player is vertically aligned with the block, given some wiggle room
        if (Math.abs(playerTop - blockTop) < this.height ||
            Math.abs(playerBottom - blockBottom) < this.height) {
            // Anchor player's x
            this.x = block.x - this.width;
        }
    }

    // If player is moving to the left and its left is touching the side of a block
    if (this.velocityX < 0 && Math.abs(playerLeft - blockRight) <= MAX_X_VELOCITY) {
        // If the player is vertically aligned with the block, given some wiggle room
        if (Math.abs(playerTop - blockTop) < this.height ||
            Math.abs(playerBottom - blockBottom) < this.height) {
            // Anchor player's x
            this.x = blockRight;
        }
    }
};

// Player specific update function
// Includes logic for running, jumping, and shooting
Player.prototype.update = function() {
    // Update position
    var newVelocityX = this.calculateNewVelocityX();
    var newVelocityY = this.calculateNewVelocityY();
    this.updateVelocity(newVelocityX, newVelocityY);
    this.updatePosition();

    // TOOD figure out how to make player only jump once when space bar is held down

    // If the player falls through the screen then it dies
    if (!this.dead && this.y + this.height > canvas.height) {
        console.log("I'M DEAD");
        this.dead = true;
    }

    // Player is always falling unless a collision occurs.
    this.falling = true;
};

Player.prototype.draw = function() {
    Sprite.prototype.draw.call(this);
};

// Bullet class
var Bullet = function(x, y, w, h, color, direction) {
    Sprite.call(this, x, y, w, h, color);
    if (direction === LEFT) {
        // Should be twice the velocity of the player, so that the player doesn't follow it
        this.velocityX = -MAX_X_VELOCITY * 2;
    } else {
        this.velocityX = MAX_X_VELOCITY * 2;
    }
    this.dead = false;
};

// Bullet inherits from Sprite
Bullet.prototype = Object.create(Sprite.prototype);
Bullet.prototype.constructor = Sprite;

Bullet.prototype.update = function() {
    this.updatePosition();
    if (this.x < 0 || this.x > canvas.width) {
        this.dead = true;
    }
};

Bullet.prototype.draw = function() {
    Sprite.prototype.draw.call(this);
};

function shootBullet(player) {
    // Should probably not pass in the entire player object but oh well
    var bullet;
    if (player.direction === LEFT) {
        bullet = new Bullet(player.x, player.y + player.height / 3,
            BULLET_SPRITE_WIDTH, BULLET_SPRITE_HEIGHT,
            BULLET_COLOR, player.direction
        );
    } else {
        bullet = new Bullet(player.x + player.width, player.y + player.height / 3,
            BULLET_SPRITE_WIDTH, BULLET_SPRITE_HEIGHT, BULLET_COLOR,
            player.direction
        );
    }
    sprites.push(bullet);
};

// Block class - these form platforms
// Inherits from Sprite but has no special update logic
var Block = function(x, y, w, h, color) {
    Sprite.call(this, x, y, w, h, color);
};
Block.prototype = Object.create(Sprite.prototype);
Block.prototype.constructor = Sprite;

Block.prototype.draw = function() {
    Sprite.prototype.draw.call(this);
};

// Start game
init();

// Input functions
function onKeyDown(event) {
    onKeyEvent(event, true);
}

function onKeyUp(event) {
    onKeyEvent(event, false);
}

function onKeyEvent(event, pressed) {
    event.preventDefault();
    switch (event.keyCode) {
        case LEFT:
            keysPressed.LEFT = pressed;
            break;
        case RIGHT:
            keysPressed.RIGHT = pressed;
            break;
        case DOWN:
            keysPressed.DOWN = pressed;
            break;
        case UP:
            keysPressed.UP = pressed;
            break;
        case SPACE:
            keysPressed.SPACE = pressed;
            break;
        case SHOOT:
            keysPressed.SHOOT = pressed;
            break;
        default:
            console.log("Unknown key " + event.keyCode);
            break;
    }
}

// Game loop functions
function gameLoop() {
    updateSprites();
    drawSprites();
}

function updateSprites() {
    // Update player state, then check for player collisions
    player.update();
    blocks.forEach(function(block) {
        player.checkForCollision(block);
    });
    // Clean up any dead sprites
    for (var i = 0; i < sprites.length; i++) {
        var sprite = sprites[i];
        if (sprite.dead) {
            sprites.splice(i, 1);
        }
    }
}

function drawSprites() {
    // Clear screen first
    context.clearRect(0, 0, canvas.width, canvas.height);
    sprites.forEach(function(sprite) {
        sprite.draw();
    });
}

window.addEventListener("keydown", onKeyDown, false);
window.addEventListener("keyup", onKeyUp, false);
window.setInterval(gameLoop, DEFAULT_DRAW_DELAY);