import { NPC, randomWalkPolicy, followPlayerPolicy } from './npc.js';


const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WORLD_WIDTH = canvas.width * 4;
const WORLD_HEIGHT = canvas.height * 4;

const keys = {};
const prevKeys = {};

let damageCooldown = 0;
const DAMAGE_COOLDOWN_TIME = 60; // frames (~1 second at 60fps)

// Input handling
document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (!player.alive && e.key === "r") {
    restartGame();
  }
});
document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Player and Car definitions
const player = {
  x: 100,
  y: 100,
  w: 20,
  h: 20,
  speed: 2,
  inCar: false,
  health: 100,  // starting health
  alive: true,
};

const car = {
  x: 200,
  y: 200,
  w: 40,
  h: 20,
  speed: 0,
  angle: 0,
  maxSpeed: 4,
  get radius() {
    // radius for collision approx (hypotenuse of w and h)
    return Math.hypot(this.w, this.h) / 2;
  },
};

const camera = {
  x: 0,
  y: 0,
  width: canvas.width,
  height: canvas.height,
};

const minimap = {
  width: 150,
  height: 150,
  padding: 10,
  get x() {
    return canvas.width - this.width - this.padding;
  },
  y: 10,
  scaleX: 150 / camera.width,
  scaleY: 150 / camera.height,
};

const NUM_OBSTACLES = 200;
// const NUM_NPC = 50;
const obstacles = [];

// Generate obstacles randomly inside world bounds
function generateObstacles() {
  for (let i = 0; i < NUM_OBSTACLES; i++) {
    const w = 30 + Math.random() * 50;
    const h = 30 + Math.random() * 50;
    const x = Math.random() * (WORLD_WIDTH - w);
    const y = Math.random() * (WORLD_HEIGHT - h);
    obstacles.push({ x, y, w, h });
  }
}


// Create NPCs
let npcs = [];
let running = false;
export function startGame(numNPC) {
    npcs = [];
    for (let i = 0; i < numNPC; i++) {
      const w = 30 + Math.random() * 50;
      const h = 30 + Math.random() * 50;
      const x = Math.random() * (WORLD_WIDTH - w);
      const y = Math.random() * (WORLD_HEIGHT - h);
      npcs.push(new NPC(x, y, followPlayerPolicy));
    }
  
    // Show the canvas and hide the landing page
    document.getElementById("landing").style.display = "none";
    canvas.style.display = "block";
    generateObstacles();
    running = true;  
    loop(); // start the game loop
  }

// Utility functions
function rectsOverlap(r1, r2) {
  return !(
    r1.x + r1.w <= r2.x ||
    r1.x >= r2.x + r2.w ||
    r1.y + r1.h <= r2.y ||
    r1.y >= r2.y + r2.h
  );
}

function checkPlayerNpcCollision() {
    for (const npc of npcs) {
      if (rectsOverlap(player, npc)) {
        return npc;
      }
    }
    return null;
  }

function clampToWorld(obj) {
  obj.x = Math.max(0, Math.min(WORLD_WIDTH - obj.w, obj.x));
  obj.y = Math.max(0, Math.min(WORLD_HEIGHT - obj.h, obj.y));
}

function nearCar() {
  return Math.hypot(player.x - car.x, player.y - car.y) < 30;
}

function keyJustPressed(k) {
  return keys[k] && !prevKeys[k];
}

function restartGame() {
    player.x = 100;
    player.y = 100;
    player.health = 100;
    player.alive = true;
    player.inCar = false;
    car.x = 150;
    car.y = 150;
    damageCooldown = 0;
  
    // Optionally respawn/re-randomize NPCs too
  }

function insideCameraView(obj) {
  return !(
    obj.x + obj.w < camera.x ||
    obj.x > camera.x + camera.width ||
    obj.y + obj.h < camera.y ||
    obj.y > camera.y + camera.height
  );
} 

// Game update logic
function update() {
  if (!player.inCar) {
    movePlayer();
    handleCarEntryExit();
    clampToWorld(player);
  } else {
    driveCar();
    clampToWorld(car);
    handleCarExit();
  }

  for (const npc of npcs) {
    // Provide a "player" object for NPC to follow that is either the player or the car
    const trackedPosition = player.inCar 
      ? { x: car.x, y: car.y }  // track car position if player in car
      : { x: player.x, y: player.y };
  
    npc.update({
      player: trackedPosition,
      obstacles,
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
    });
  }
  if (!player.inCar) {
    if (damageCooldown > 0) damageCooldown--;

    const collidedNpc = checkPlayerNpcCollision();
    if (collidedNpc && damageCooldown === 0 && player.alive) {
      player.health -= 10;
      player.health = Math.max(0, player.health);
      damageCooldown = DAMAGE_COOLDOWN_TIME;

      if (player.health === 0) {
        player.alive = false;
        console.log("Player has died!");
        // Optional: trigger any death animation or game over logic here
      }

      console.log(`Player hit by NPC! Health: ${player.health}`);
    }
  }
}

function movePlayer() {
  if (!player.alive) return;
  let newX = player.x;
  let newY = player.y;

  if (keys["arrowup"]) newY -= player.speed;
  if (keys["arrowdown"]) newY += player.speed;
  if (keys["arrowleft"]) newX -= player.speed;
  if (keys["arrowright"]) newX += player.speed;

  const newPlayerRect = { x: newX, y: newY, w: player.w, h: player.h };
  const collision = obstacles.some((obs) => rectsOverlap(newPlayerRect, obs));
  if (!collision) {
    player.x = newX;
    player.y = newY;
  }
}

function handleCarEntryExit() {
  if (!player.alive) return;
  if (keyJustPressed("e") && nearCar()) {
    player.inCar = !player.inCar;
    if (player.inCar) {
      // Enter car: sync player position to car
      player.x = car.x;
      player.y = car.y;
    } else {
      // Exit car: position player beside car
      player.x = car.x + 30;
      player.y = car.y;
    }
  }
}

function driveCar() { 
  if (!player.alive) return;
  if (keys["arrowup"]) {
    car.speed = Math.min(car.speed + 0.1, car.maxSpeed);
  } else if (keys["arrowdown"]) {
    car.speed = Math.max(car.speed - 0.1, -car.maxSpeed / 2);
  } else {
    car.speed *= 0.95; // friction slows car down gradually
  }

  if (keys["arrowleft"]) car.angle -= 0.05;
  if (keys["arrowright"]) car.angle += 0.05;

  const newCarX = car.x + Math.cos(car.angle) * car.speed;
  const newCarY = car.y + Math.sin(car.angle) * car.speed;

  const collision = obstacles.some((obs) => {
    const obsCenterX = obs.x + obs.w / 2;
    const obsCenterY = obs.y + obs.h / 2;
    const obsRadius = Math.hypot(obs.w, obs.h) / 2;
    const dist = Math.hypot(newCarX - obsCenterX, newCarY - obsCenterY);
    return dist < car.radius + obsRadius;
  });

  if (!collision) {
    car.x = newCarX;
    car.y = newCarY;
  } else {
    car.speed = 0;
  }
}

function handleCarExit() {
  if (keyJustPressed("e")) {
    player.inCar = false;
    player.x = car.x + 30;
    player.y = car.y;
    clampToWorld(player);
  }
}

// Rendering logic
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  ctx.fillStyle = "#444";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawObstacles();
  drawCar();
  drawPlayer();
  drawMinimap();
  drawHealthBar();

  for (const npc of npcs) {
    const screenX = npc.x - camera.x;
    const screenY = npc.y - camera.y;
  
    if (
      screenX + npc.w >= 0 &&
      screenX <= canvas.width &&
      screenY + npc.h >= 0 &&
      screenY <= canvas.height
    ) {
      ctx.fillStyle = "green";
      ctx.fillRect(screenX, screenY, npc.w, npc.h);
    }
  }
  if (!player.alive) {
    drawGameOver();
  }
}

function drawObstacles() {
  ctx.fillStyle = "gray";
  for (const obs of obstacles) {
    const screenX = obs.x - camera.x;
    const screenY = obs.y - camera.y;
    if (
      screenX + obs.w >= 0 &&
      screenX <= canvas.width &&
      screenY + obs.h >= 0 &&
      screenY <= canvas.height
    ) {
      ctx.fillRect(screenX, screenY, obs.w, obs.h);
    }
  }
}

function drawCar() {
  ctx.save();
  ctx.translate(car.x - camera.x, car.y - camera.y);
  ctx.rotate(car.angle);

  ctx.fillStyle = "red";
  ctx.fillRect(-car.w / 2, -car.h / 2, car.w, car.h);

  // Draw headlights
  ctx.fillStyle = "white";
  const headlightOffsetY = car.h / 4;
  const headlightOffsetX = car.w / 2 + 2;

  [ -headlightOffsetY, headlightOffsetY ].forEach(offsetY => {
    ctx.beginPath();
    ctx.arc(headlightOffsetX, offsetY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawPlayer() {
  if (!player.inCar) {
    ctx.fillStyle = "blue";
    ctx.fillRect(player.x - camera.x, player.y - camera.y, player.w, player.h);
  }
}

function drawMinimap() {
  // Background and border
  ctx.fillStyle = "#222";
  ctx.fillRect(minimap.x, minimap.y, minimap.width, minimap.height);
  ctx.strokeStyle = "#888";
  ctx.strokeRect(minimap.x, minimap.y, minimap.width, minimap.height);

  // Obstacles on minimap inside camera view
  ctx.fillStyle = "gray";
  for (const obs of obstacles) {
    if (insideCameraView(obs)) {
      ctx.fillRect(
        minimap.x + (obs.x - camera.x) * minimap.scaleX,
        minimap.y + (obs.y - camera.y) * minimap.scaleY,
        obs.w * minimap.scaleX,
        obs.h * minimap.scaleY
      );
    }
  }

  // Player dot
  if (
    player.x + player.w > camera.x &&
    player.x < camera.x + camera.width &&
    player.y + player.h > camera.y &&
    player.y < camera.y + camera.height &&
    (!player.inCar)
  ) {
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(
      minimap.x + (player.x - camera.x) * minimap.scaleX,
      minimap.y + (player.y - camera.y) * minimap.scaleY,
      5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Car dot
  if (
    car.x + car.w > camera.x &&
    car.x < camera.x + camera.width &&
    car.y + car.h > camera.y &&
    car.y < camera.y + camera.height
  ) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(
      minimap.x + (car.x - camera.x) * minimap.scaleX,
      minimap.y + (car.y - camera.y) * minimap.scaleY,
      7,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

function drawHealthBar() {
    const barWidth = 200;
    const barHeight = 20;
    const x = 20;
    const y = 20;
  
    ctx.fillStyle = "#444";
    ctx.fillRect(x, y, barWidth, barHeight);
  
    const healthWidth = (player.health / 100) * barWidth;
    ctx.fillStyle = "limegreen";
    ctx.fillRect(x, y, healthWidth, barHeight);
  
    ctx.strokeStyle = "black";
    ctx.strokeRect(x, y, barWidth, barHeight);
  
    ctx.fillStyle = "white";
    ctx.font = "16px sans-serif";
    ctx.fillText(`Health: ${player.health}`, x + 10, y + 16);
  }

  function drawGameOver() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    ctx.fillStyle = "white";
    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
  }

// Main loop
function loop() {

  if (!running) return;
  update();

  // Update camera position based on player or car
  const target = player.inCar ? car : player;
  camera.x = target.x - canvas.width / 2;
  camera.y = target.y - canvas.height / 2;

  // Clamp camera within world bounds
  camera.x = Math.max(0, Math.min(WORLD_WIDTH - camera.width, camera.x));
  camera.y = Math.max(0, Math.min(WORLD_HEIGHT - camera.height, camera.y));

  draw();

  // Update prevKeys for keyJustPressed detection
  Object.assign(prevKeys, keys);

  requestAnimationFrame(loop);
}
