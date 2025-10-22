/*
 * Kenny & Roommate – Bug Adventure
 *
 * This script implements a lightweight 2D adventure using Phaser 3.  The
 * player explores a single level starting at their apartment and heading
 * to a park.  Along the way they collect items (a stick and a bag) and
 * combine them into a bug catching net, avoid bugs that can bite them,
 * heal with a salve pickup, and ultimately capture three different bug
 * species.  When all bugs are captured the level is complete and a
 * scrapbook appears showing the specimens collected.  Art assets are
 * loaded from the `assets` folder.  See README for attribution.
 */

class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Core character sprites (idle/walk for Kenny and roommate)
    this.load.image('player1_idle', 'assets/player1_idle.png');
    this.load.image('player1_walk', 'assets/player1_walk.png');
    this.load.image('player2_idle', 'assets/player2_idle.png');
    this.load.image('player2_walk', 'assets/player2_walk.png');

    // Items and tools
    this.load.image('stick', 'assets/stick.png');
    this.load.image('bag', 'assets/bag.png');
    this.load.image('net', 'assets/net.png');
    this.load.image('jar', 'assets/jar.png');
    this.load.image('salve', 'assets/salve.png');

    // Bugs (three varieties)
    this.load.image('bug1', 'assets/bug1.png');
    this.load.image('bug2', 'assets/bug2.png');
    this.load.image('bug3', 'assets/bug3.png');

    // UI elements
    this.load.image('heart', 'assets/heart.png');

    // Background image
    this.load.image('background', 'assets/background.png');
  }

  create() {
    // Once assets are loaded, start the game
    this.scene.start('GameScene');
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Add static background
    this.add.image(400, 300, 'background');

    // Initialise inventory and bug scrapbook
    this.inventory = [];
    this.capturedBugs = new Set();

    // Health state
    this.maxHealth = 3;
    this.health = this.maxHealth;

    // Create the player character (use Kenny by default).  We scale the
    // sprite down further to fit the game world.  When idle or moving the
    // sprite will switch between the idle and walk textures.
    this.player = this.physics.add.sprite(100, 450, 'player1_idle');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(1);
    this.player.setScale(1);

    // Setup keyboard input (cursor keys + WASD for convenience)
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      craft: Phaser.Input.Keyboard.KeyCodes.C
    });

    // Create groups for items, bugs and salves
    this.items = this.physics.add.staticGroup();
    this.bugs = this.physics.add.group();
    this.salves = this.physics.add.staticGroup();

    // Spawn initial items (stick and bag) in the level
    this.spawnItem(200, 520, 'stick');
    this.spawnItem(300, 480, 'bag');

    // Spawn a jar for flavour (doesn't currently affect gameplay)
    this.spawnItem(600, 520, 'jar');

    // Spawn a salve (healing item)
    this.spawnSalve(450, 500);

    // Spawn three different bugs at distinct locations
    this.spawnBug(550, 300, 'bug1');
    this.spawnBug(400, 350, 'bug2');
    this.spawnBug(250, 250, 'bug3');

    // Display hearts representing player health
    this.hearts = [];
    for (let i = 0; i < this.maxHealth; i++) {
      const heart = this.add.image(770 - i * 30, 20, 'heart');
      heart.setScrollFactor(0);
      heart.setScale(1.2);
      this.hearts.push(heart);
    }

    // Inventory UI: show collected items as icons in bottom left.  We'll
    // reserve up to 4 slots for simplicity.
    this.inventorySlots = [];
    for (let i = 0; i < 4; i++) {
      const slot = this.add.image(20 + i * 40, 570, 'jar');
      slot.setScale(0.6);
      slot.setAlpha(0.2); // empty slots semi-transparent
      this.inventorySlots.push(slot);
    }

    // Bug scrapbook UI: show silhouettes of bug icons; fill in when caught
    this.scrapbookIcons = {};
    const bugKeys = ['bug1', 'bug2', 'bug3'];
    bugKeys.forEach((key, index) => {
      const icon = this.add.image(350 + index * 50, 20, key);
      icon.setScale(0.8);
      icon.setAlpha(0.3);
      this.scrapbookIcons[key] = icon;
    });

    // Crafting message
    this.messageText = null;

    // Listen for crafting key.  Player can press C (or craft) to combine
    // stick and bag into a net.  The `keydown` event ensures we only
    // trigger once per press.
    this.input.keyboard.on('keydown-C', () => {
      this.craftItems();
    });

    // Collider for picking up items
    this.physics.add.overlap(this.player, this.items, (player, item) => {
      this.collectItem(item);
    });

    // Collider for bugs: either bite or catch
    this.physics.add.overlap(this.player, this.bugs, (player, bug) => {
      this.handleBugCollision(bug);
    });

    // Collider for salves
    this.physics.add.overlap(this.player, this.salves, (player, salve) => {
      this.healPlayer(salve);
    });
  }

  /**
   * Spawn a static item the player can collect.  Items are static bodies
   * that don't move.  The type is stored in data for identification.
   */
  spawnItem(x, y, key) {
    const item = this.items.create(x, y, key);
    item.setData('type', key);
    item.setScale(1);
  }

  /**
   * Spawn a salve healing pickup.
   */
  spawnSalve(x, y) {
    const salve = this.salves.create(x, y, 'salve');
    salve.setData('type', 'salve');
    salve.setScale(1);
  }

  /**
   * Spawn a bug.  Bugs move randomly within the level and wrap around
   * screen edges for continuous movement.  Each bug has a `bugType` to
   * identify it in the scrapbook.
   */
  spawnBug(x, y, key) {
    const bug = this.bugs.create(x, y, key);
    bug.setData('bugType', key);
    bug.setScale(1);
    // Set random velocity
    const vx = Phaser.Math.Between(-50, 50);
    const vy = Phaser.Math.Between(-50, 50);
    bug.setVelocity(vx, vy);
    bug.setCollideWorldBounds(true);
    bug.setBounce(1);
  }

  /**
   * Pick up an item: add its type to the inventory and update the UI.
   */
  collectItem(item) {
    const type = item.getData('type');
    // Add to inventory array
    this.inventory.push(type);
    // Remove from world
    item.destroy();
    this.updateInventoryUI();
    this.showMessage('Picked up ' + type);
  }

  /**
   * Combine items in inventory into new tools.  Current recipe:
   * stick + bag → net.  Remove one of each from inventory and add a net.
   */
  craftItems() {
    const hasStick = this.inventory.includes('stick');
    const hasBag = this.inventory.includes('bag');
    if (hasStick && hasBag) {
      // Remove first occurrence of each
      this.inventory.splice(this.inventory.indexOf('stick'), 1);
      this.inventory.splice(this.inventory.indexOf('bag'), 1);
      this.inventory.push('net');
      this.updateInventoryUI();
      this.showMessage('Crafted a bug net!');
    }
  }

  /**
   * Update inventory UI icons to reflect collected items.  Items will be
   * represented by their corresponding sprite.  Empty slots are dimmed.
   */
  updateInventoryUI() {
    // Clear all slots first
    this.inventorySlots.forEach((slot) => {
      slot.setTexture('jar');
      slot.setAlpha(0.2);
    });
    // Fill in slots with inventory items (limit to available slots)
    for (let i = 0; i < this.inventory.length && i < this.inventorySlots.length; i++) {
      const type = this.inventory[i];
      const slot = this.inventorySlots[i];
      slot.setTexture(type);
      slot.setAlpha(1);
      slot.setScale(0.8);
    }
  }

  /**
   * Handle collision with a bug.  If the player has a net in inventory,
   * capture the bug instead of taking damage.  Otherwise lose one heart.
   */
  handleBugCollision(bug) {
    // Prevent repeated collisions while bug is deactivated
    if (bug.getData('inactive')) return;
    const bugType = bug.getData('bugType');
    if (this.inventory.includes('net')) {
      // Capture bug: remove from world and add to scrapbook
      this.capturedBugs.add(bugType);
      bug.destroy();
      this.updateScrapbookUI();
      this.showMessage('Caught a ' + bugType + '!');
      this.checkLevelComplete();
    } else {
      // Bug bite: reduce health
      bug.setData('inactive', true);
      this.takeDamage();
      // Reactivate bug after short delay
      this.time.delayedCall(1000, () => {
        bug.setData('inactive', false);
      });
    }
  }

  /**
   * Reduce player health and update heart display.  If health reaches zero
   * trigger game over.
   */
  takeDamage() {
    if (this.health <= 0) return;
    this.health -= 1;
    this.updateHeartsUI();
    this.showMessage('Ouch! A bug bit you.');
    if (this.health <= 0) {
      this.gameOver();
    }
  }

  /**
   * Heal the player by picking up a salve.  Health cannot exceed the
   * maximum.  The salve is removed from the scene.
   */
  healPlayer(salve) {
    if (this.health < this.maxHealth) {
      this.health += 1;
      if (this.health > this.maxHealth) this.health = this.maxHealth;
      this.updateHeartsUI();
      this.showMessage('Healed by salve.');
    }
    salve.destroy();
  }

  /**
   * Update heart icons to reflect current health.  Hearts beyond the
   * current health are hidden.
   */
  updateHeartsUI() {
    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setVisible(i < this.health);
    }
  }

  /**
   * Update the bug scrapbook icons.  Icons for caught bugs are opaque,
   * uncaught bugs remain translucent.
   */
  updateScrapbookUI() {
    Object.keys(this.scrapbookIcons).forEach((key) => {
      const icon = this.scrapbookIcons[key];
      if (this.capturedBugs.has(key)) {
        icon.setAlpha(1);
      } else {
        icon.setAlpha(0.3);
      }
    });
  }

  /**
   * Check if all bug species have been captured.  If so, display a
   * congratulatory message and restart the level after a delay.
   */
  checkLevelComplete() {
    if (
      this.capturedBugs.has('bug1') &&
      this.capturedBugs.has('bug2') &&
      this.capturedBugs.has('bug3')
    ) {
      this.showMessage('Level complete! You caught all bugs!');
      // Pause movement and disable collisions
      this.physics.pause();
      this.time.delayedCall(3000, () => {
        this.scene.restart();
      });
    }
  }

  /**
   * Display a temporary message at the center of the screen.  Old
   * messages are cleared before showing a new one.
   */
  showMessage(text) {
    if (this.messageText) this.messageText.destroy();
    this.messageText = this.add.text(400, 300, text, {
      fontSize: '18px',
      fill: '#ffeb3b',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: { x: 8, y: 4 },
      align: 'center',
    });
    this.messageText.setOrigin(0.5);
    this.time.delayedCall(2000, () => {
      if (this.messageText) this.messageText.destroy();
      this.messageText = null;
    });
  }

  /**
   * Handle game over: show message and restart level after delay.
   */
  gameOver() {
    this.showMessage('You fainted from bug bites!');
    this.player.setTint(0xff0000);
    this.player.setVelocity(0, 0);
    this.physics.pause();
    this.time.delayedCall(3000, () => {
      this.scene.restart();
    });
  }

  update() {
    // Movement logic: respond to arrow keys and WASD
    const speed = 120;
    const body = this.player.body;
    body.setVelocity(0);
    const moveLeft = this.cursors.left.isDown || this.cursors.a.isDown;
    const moveRight = this.cursors.right.isDown || this.cursors.d.isDown;
    const moveUp = this.cursors.up.isDown || this.cursors.w.isDown;
    const moveDown = this.cursors.down.isDown || this.cursors.s.isDown;
    if (moveLeft) {
      body.setVelocityX(-speed);
    } else if (moveRight) {
      body.setVelocityX(speed);
    }
    if (moveUp) {
      body.setVelocityY(-speed);
    } else if (moveDown) {
      body.setVelocityY(speed);
    }
    // Normalize diagonal movement
    body.velocity.normalize().scale(speed);
    // Change sprite depending on movement state
    if (body.velocity.x === 0 && body.velocity.y === 0) {
      this.player.setTexture('player1_idle');
    } else {
      this.player.setTexture('player1_walk');
    }
    // Wrap bugs around screen bounds so they don't get stuck
    this.bugs.children.iterate((bug) => {
      if (!bug) return;
      if (bug.x < 0) bug.x = 800;
      if (bug.x > 800) bug.x = 0;
      if (bug.y < 0) bug.y = 600;
      if (bug.y > 600) bug.y = 0;
    });
  }
}

// Configure Phaser game instance
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: null,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [PreloadScene, GameScene],
};

const game = new Phaser.Game(config);