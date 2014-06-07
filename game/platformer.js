// # Quintus platformer example
//
// [Run the example](../quintus/examples/platformer/index.html)
// WARNING: this game must be run from a non-file:// url
// as it loads a level json file.
//
// This is the example from the website homepage, it consists
// a simple, non-animated platformer with some enemies and a 
// target for the player.
window.addEventListener("load",function() {

// Set up an instance of the Quintus engine  and include
// the Sprites, Scenes, Input and 2D module. The 2D module
// includes the `TileLayer` class as well as the `2d` componet.
var Q = window.Q =
  Quintus({
    audioSupported: [ 'mp3','ogg' ],
    development: true
  })
    .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio")
    // Maximize this game to whatever the size of the browser is
    .setup({ maximize: true })
    // And turn on default input controls and touch input (for UI)
    .controls(true).touch()
    // Enable sounds.
    .enableSound();

// Load and init audio files.

// the names of colour tile layers to start invisible / control under stage
var COLOR_LAYERS = ['green', 'purple', 'red'];

Q.SPRITE_PLAYER = 1;
Q.SPRITE_COLLECTABLE = 2;
Q.SPRITE_ENEMY = 4;
Q.SPRITE_DOOR = 8;
Q.SPRITE_INVISIBLE = 32;  // for hidden colour layers

Q.Sprite.extend("Player",{

  init: function(p) {

    this._super(p, {
      sheet: "player",  // Setting a sprite sheet sets sprite width and height
      sprite: "player",
      direction: "right",
      standingPoints: [ [ -12, 31 ], [ -6, -31 ], [ 6, -31 ], [ 12, 31 ] ],
      duckingPoints : [ [ -12, 31 ], [ -14, -21 ], [ 14, -21 ], [ 12, 31 ] ],
      jumpSpeed: -400,
      speed: 300,
      strength: 100,
      score: 0,
      type: Q.SPRITE_PLAYER,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_DOOR | Q.SPRITE_COLLECTABLE
    });

    this.p.points = this.p.standingPoints;

    this.add('2d, platformerControls, animation, tween');

    this.on("bump.top","breakTile");

    this.on("sensor.tile","checkLadder");
    this.on("enemy.hit","enemyHit");
    this.on("jump");
    this.on("jumped");

    Q.input.on("down",this,"checkDoor");
  },

  jump: function(obj) {
    // Only play sound once.
    if (!obj.p.playedJump) {
      Q.audio.play('jump.mp3');
      obj.p.playedJump = true;
    }
  },

  jumped: function(obj) {
    obj.p.playedJump = false;
  },

  checkLadder: function(colObj) {
    if(colObj.p.ladder) { 
      this.p.onLadder = true;
      this.p.ladderX = colObj.p.x;
    }
  },

  checkDoor: function() {
    this.p.checkDoor = true;
  },

  enemyHit: function(data) {
    var col = data.col;
    var enemy = data.enemy;
    this.p.vy = -150;
    if (col.normalX == 1) {
      // Hit from left.
      this.p.x -=15;
      this.p.y -=15;
    }
    else {
      // Hit from right;
      this.p.x +=15;
      this.p.y -=15;
    }
    this.p.immune = true;
    this.p.immuneTimer = 0;
    this.p.immuneOpacity = 1;
    this.p.strength -= 25;
    Q.stageScene('hud', 3, this.p);
    if (this.p.strength == 0) {
      this.stage.resetLevel();
    }
  },

  continueOverSensor: function() {
    this.p.vy = 0;
    if(this.p.vx != 0) {
      this.play("walk_" + this.p.direction);
    } else {
      this.play("stand_" + this.p.direction);
    }
  },

  breakTile: function(col) {
    if(col.obj.isA("TileLayer")) {
      if(col.tile == 24) { col.obj.setTile(col.tileX,col.tileY, 36); }
      else if(col.tile == 36) { col.obj.setTile(col.tileX,col.tileY, 24); }
    }
    Q.audio.play('coin.mp3');
  },

  step: function(dt) {
    var processed = false;
    if (this.p.immune) {
      // Swing the sprite opacity between 50 and 100% percent when immune.
      if ((this.p.immuneTimer % 12) == 0) {
        var opacity = (this.p.immuneOpacity == 1 ? 0 : 1);
        this.animate({"opacity":opacity}, 0);
        this.p.immuneOpacity = opacity;
      }
      this.p.immuneTimer++;
      if (this.p.immuneTimer > 144) {
        // 3 seconds expired, remove immunity.
        this.p.immune = false;
        this.animate({"opacity": 1}, 1);
      }
    }

    if(this.p.onLadder) {
      this.p.gravity = 0;

      if(Q.inputs['up']) {
        this.p.vy = -this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("climb");
      } else if(Q.inputs['down']) {
        this.p.vy = this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("climb");
      } else {
        this.continueOverSensor();
      }
      processed = true;
    } 
      
    if(!processed && this.p.door) {
      this.p.gravity = 1;
      if(this.p.checkDoor && this.p.landed > 0) {
        // Enter door.
        this.p.y = this.p.door.p.y;
        this.p.x = this.p.door.p.x;
        this.play('climb');
        this.p.toDoor = this.p.door.findLinkedDoor();
        processed = true;
      }
      else if (this.p.toDoor) {
        // Transport to matching door.
        this.p.y = this.p.toDoor.p.y;
        this.p.x = this.p.toDoor.p.x;
        this.stage.centerOn(this.p.x, this.p.y);
        this.p.toDoor = false;
        this.stage.follow(this);
        processed = true;
      }
    } 
      
    if(!processed) { 
      this.p.gravity = 1;

      if(Q.inputs['down'] && !this.p.door) {
        this.p.ignoreControls = true;
        this.play("duck_" + this.p.direction);
        if(this.p.landed > 0) {
          this.p.vx = this.p.vx * (1 - dt*2);
        }
        this.p.points = this.p.duckingPoints;
      } else {
        this.p.ignoreControls = false;
        this.p.points = this.p.standingPoints;

        if(this.p.vx > 0) {
          if(this.p.landed > 0) {
            this.play("walk_right");
          } else {
            this.play("jump_right");
          }
          this.p.direction = "right";
        } else if(this.p.vx < 0) {
          if(this.p.landed > 0) {
            this.play("walk_left");
          } else {
            this.play("jump_left");
          }
          this.p.direction = "left";
        } else {
          this.play("stand_" + this.p.direction);
        }
           
      }
    }

    this.p.onLadder = false;
    this.p.door = false;
    this.p.checkDoor = false;


    if(this.p.y > 1000) {
      this.stage.unfollow();
    }

    if(this.p.y > 2000) {
      this.stage.resetLevel();
    }
  }
});

Q.Sprite.extend("Enemy", {
  init: function(p,defaults) {

    this._super(p,Q._defaults(defaults||{},{
      sheet: p.sprite,
      vx: 50,
      defaultDirection: 'left',
      type: Q.SPRITE_ENEMY,
      collisionMask: Q.SPRITE_DEFAULT
    }));

    this.add("2d, aiBounce, animation");
    this.on("bump.top",this,"die");
    this.on("hit.sprite",this,"hit");
  },

  step: function(dt) {
    if(this.p.dead) {
      this.del('2d, aiBounce');
      this.p.deadTimer++;
      if (this.p.deadTimer > 24) {
        // Dead for 24 frames, remove it.
        this.destroy();
      }
      return;
    }
    var p = this.p;

    p.vx += p.ax * dt;
    p.vy += p.ay * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    this.play('walk');
  },

  hit: function(col) {
    if(col.obj.isA("Player") && !col.obj.p.immune && !this.p.dead) {
      col.obj.trigger('enemy.hit', {"enemy":this,"col":col});
      Q.audio.play('hit.mp3');
    }
  },

  die: function(col) {
    if(col.obj.isA("Player")) {
      Q.audio.play('coin.mp3');
      this.p.vx=this.p.vy=0;
      this.play('dead');
      this.p.dead = true;
      var that = this;
      col.obj.p.vy = -300;
      this.p.deadTimer = 0;
    }
  }
});

Q.Enemy.extend("grey_slime", {
    init: function (p) {
        this._super(p, {
            w: 60,
            h: 35
        });
    }
});

Q.Enemy.extend("Slime", {
  init: function(p) {
    this._super(p,{
      w: 60,
      h: 35
    });
  }
});

Q.Enemy.extend("Snail", {
  init: function(p) {
    this._super(p,{
      w: 60,
      h: 35
    });
  }

});

Q.Sprite.extend("Collectable", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_COLLECTABLE,
      collisionMask: Q.SPRITE_PLAYER,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },

  // When a Collectable is hit.
  sensor: function(colObj) {
    // Increment the score.
    if (this.p.amount) {
      colObj.p.score += this.p.amount;
      Q.stageScene('hud', 3, colObj.p);
      if (colObj.p.score >= 150) {
        Q.clearStages();
        Q.stageScene('introduction2');
      }
    }
    Q.audio.play('coin.mp3');
    this.destroy();
  }
});

Q.Sprite.extend("PaintCan", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_COLLECTABLE,
      collisionMask: Q.SPRITE_PLAYER,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },

  // When a Collectable is hit.
  sensor: function(colObj) {
    // Increment the score.
    if (this.p.Color) {
      this.stage.setColorVisible(this.p.Color, true);
    }
    Q.audio.play('coin.mp3');
    this.destroy();
  }
});


Q.Sprite.extend("Door", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_DOOR,
      collisionMask: Q.SPRITE_NONE,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },
  findLinkedDoor: function() {
    var linkId = this.p.link;
    return _.find(this.stage.items, function(i){return i.p.id === linkId;});
  },
  // When the player is in the door.
  sensor: function(colObj) {
    // Mark the door object on the player.
    colObj.p.door = this;
  }
});

Q.Collectable.extend("Heart", {
  // When a Heart is hit.
  sensor: function(colObj) {
    // Increment the strength.
    if (this.p.amount) {
      colObj.p.strength = Math.max(colObj.p.strength + 25, 100);
      Q.stageScene('hud', 3, colObj.p);
      Q.audio.play('heart.mp3');
    }
    this.destroy();
  }
});

var makeLevel = function(filename, levelName, music){
  return function(stage) {
    Q.stageTMX(filename, stage);

    stage.add("viewport").follow(Q("Player").first());

    // LAYER EXISTENCE MAGIC:
    //
    var greenSlimeRestores = [];
    stage.colorLayers = {};

    stage.setColorVisible = function(layerName, shouldShow){
      var l = stage.colorLayers[layerName];
      l.p.opacity = shouldShow ? 1 : 0;
      l.p.type = shouldShow ? Q.SPRITE_DEFAULT : Q.SPRITE_INVISIBLE;
      if (shouldShow && layerName==='green') {
        _.forEach(greenSlimeRestores, function(r){r();});
      }
    }
    stage.isColorVisible = function(layerName){
      return stage.colorLayers[layerName].opacity > 0.1;
    }

    stage.resetLevel = function(){
      Q.audio.stop();
      Q.clearStages();
      Q.stageScene(levelName);
    }


    _.forEach(stage.items, function(i, idx){
      var sheetName = (i.p || {}).sheet;
      if (sheetName && _.contains(COLOR_LAYERS, sheetName)){
        stage.colorLayers[sheetName] = i;
      } else if (sheetName && sheetName === 'slime'){  // green slimez
        var orig = i.update;
        i.p.opacity = 0;
        i.update = function(dt){};
        (function(i){
          greenSlimeRestores.push(function(){
            i.p.opacity = 1;
            i.update = orig;
          });
        })(i);
        console.warn('disabled slime', i);
      } else {
        console.log("leaving alone sheet:", sheetName, i);
      }
    });

    // start them all hidden:
    _.forEach(stage.colorLayers, function(l, name){
      stage.setColorVisible(name, false);
    });
    
    Q.audio.play(music+'.mp3',{ loop: true });
    Q.stageScene('hud', 3, Q('Player').first().p);
  }
}
Q.scene("level1", makeLevel("composablez.tmx", 'level1', 'lovely'));
Q.scene("level2", makeLevel("level2.tmx", 'level2', 'sky'));

Q.scene('hud',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: 50, y: 0
  }));

  var strength = container.insert(new Q.UI.Text({
    x:50, y: 20,
    label: 'Health: ' + stage.options.strength + '%   Score: ' + stage.options.score,
    color: "#609",
    family: 'Zapfino, "Curlz MT"' }));

  container.fit(12);
  container.p.x = container.p.w/2 + 6;
});

Q.scene('introduction',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: Q.height/2, fill: "rgba(255,255,255,1)"
  }));

  var button = container.insert(new Q.UI.Button({
    x: 0, y: 0, fill: "#CCCCCC",
    label: "O NOOO!"
  }));
  var label = container.insert(new Q.UI.Text({
    x:10, y: -10 - button.p.h,
    label: 'O NOOO! Someone has stolen ze reality paint!\nI must collect one hundred and fifty of ze american dollars to buy moar!'
  }));
  var man = container.insert(new Q.UI.HTMLElement({
    x:10, y: -30 - button.p.h, w: 200, h: 200,
    html: '<img style="z-index:9001; position:absolute; right: 8px; bottom: 8px" src="./images/displeasedman-in-beret.png">'
  }));
  
  Q.audio.play('pigeon.mp3',{ loop: true });

  // When the button is clicked, clear all the stages
  // and restart the game.
  button.on("click",function() {
    Q.audio.stop();
    Q.clearStages();
    Q.stageScene('level1');
  });

  // Expand the container to visibily fit it's contents
  container.fit(20);
});
Q.scene('introduction2',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: Q.height/2, fill: "rgba(255,255,255,1)"
  }));

  var button = container.insert(new Q.UI.Button({
    x: 0, y: 0, fill: "#CCCCCC",
    label: "La deuxième étage!"
  }));
  var label = container.insert(new Q.UI.Text({
    x:10, y: -10 - button.p.h,
    label: 'Oooh-la-la monsieur! Fantastique! Allons-y!'
  }));
  var man = container.insert(new Q.UI.HTMLElement({
    x:10, y: -30 - button.p.h, w: 200, h: 200,
    html: '<img style="z-index:9001; position:absolute; right: 8px; bottom: 8px" src="./images/man-in-beret.png">'
  }));
  
  button.on("click",function() {
    Q.audio.stop();
    Q.clearStages();
    Q.stageScene('level2');
  });

  // Expand the container to visibily fit it's contents
  container.fit(20);
});

Q.loadTMX("composablez.tmx, level2.tmx, collectables.json, paintcans.json, doors.json, enemies.json, slime_blue.json, slime_grey.json, slime_green.json, coin.json, fire.mp3, jump.mp3, heart.mp3, hit.mp3, coin.mp3, player.json, player_template.png, lovely.mp3, pigeon.mp3, sky.mp3", function() {
    Q.compileSheets("player_template.png","player.json");
    Q.compileSheets("collectables.png","collectables.json");
    Q.compileSheets("paintcans.png", "paintcans.json");
    Q.compileSheets("coin.png", "coin.json");
    Q.compileSheets("slime_green.png", "slime_green.json");
    Q.compileSheets("slime_blue.png", "slime_blue.json");
    Q.compileSheets("slime_grey.png", "slime_grey.json");
    Q.compileSheets("enemies.png","enemies.json");
    Q.compileSheets("doors.png","doors.json");
    Q.animations("player", {
      walk_right: { frames: [0,1,2,3,4,5,6,7,8,9,10], rate: 1/15, flip: false, loop: true },
      walk_left: { frames:  [0,1,2,3,4,5,6,7,8,9,10], rate: 1/15, flip:"x", loop: true },
      jump_right: { frames: [12], rate: 1/10, flip: false },
      jump_left: { frames:  [12], rate: 1/10, flip: "x" },
      stand_right: { frames:[14], rate: 1/10, flip: false },
      stand_left: { frames: [14], rate: 1/10, flip:"x" },
      duck_right: { frames: [15], rate: 1/10, flip: false },
      duck_left: { frames:  [15], rate: 1/10, flip: "x" },
      climb: { frames:  [16, 17], rate: 1/3, flip: false }
    });
    var EnemyAnimations = {
      walk: { frames: [0,1], rate: 1/3, loop: true },
      dead: { frames: [2], rate: 1/10 }
    };
    Q.animations("grey_slime", EnemyAnimations);
    Q.animations("slime", EnemyAnimations);
    Q.animations("snail", EnemyAnimations);
    Q.stageScene("introduction2");
}, {
  progressCallback: function(loaded,total) {
    var element = document.getElementById("loading_progress");
    element.style.width = Math.floor(loaded/total*100) + "%";
    if (loaded == total) {
      document.getElementById("loading").remove();
    }
  }
});

// ## Possible Experimentations:
// 
// The are lots of things to try out here.
// 
// 1. Modify level.json to change the level around and add in some more enemies.
// 2. Add in a second level by creating a level2.json and a level2 scene that gets
//    loaded after level 1 is complete.
// 3. Add in a title screen
// 4. Add in a hud and points for jumping on enemies.
// 5. Add in a `Repeater` behind the TileLayer to create a paralax scrolling effect.

});
