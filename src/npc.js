function rectsOverlap(r1, r2) {
    return !(
      r1.x + r1.w <= r2.x ||
      r1.x >= r2.x + r2.w ||
      r1.y + r1.h <= r2.y ||
      r1.y >= r2.y + r2.h
    );
  }
  
  export class NPC {
    constructor(x, y, policy) {
      this.x = x;
      this.y = y;
      this.w = 20;
      this.h = 20;
      this.speed = 1;
      this.policy = policy; // function(npc, env) => {dx, dy}
    }
  
    update(env) {
      const action = this.policy(this, env);
  
      // Calculate tentative new position
      let newX = this.x + action.dx * this.speed;
      let newY = this.y + action.dy * this.speed;
  
      const newRect = { x: newX, y: newY, w: this.w, h: this.h };
  
      // Check collisions and world bounds
      let collision = env.obstacles.some(obs => rectsOverlap(newRect, obs)) ||
                      newX < 0 || newX + this.w > env.worldWidth ||
                      newY < 0 || newY + this.h > env.worldHeight;
  
      if (!collision) {
        this.x = newX;
        this.y = newY;
      }
    }
  }
  
  export function randomWalkPolicy(npc, env) {
    const angle = Math.random() * 2 * Math.PI;
    return { dx: Math.cos(angle), dy: Math.sin(angle) };
  }
  
  export function followPlayerPolicy(npc, env) {
    const dx = env.player.x - npc.x;
    const dy = env.player.y - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return { dx: 0, dy: 0 };
    return { dx: dx / dist, dy: dy / dist };
  }
  