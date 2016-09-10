/* jshint forin:false, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, loopfunc:true,
	undef:true, unused:true, curly:true, browser:true, indent:false, maxerr:50, jquery:true, node:true */

/* global game, Phaser, Rob, roblog */

"use strict";

Rob.Motioner = function() {
  this.frameCount = 0;

  this.vectors = {
    avoidance: Rob.XY(),
    motion: Rob.XY(),
    smell: Rob.XY(),
    taste: Rob.XY(),
    temp: Rob.XY()
  };

  this.senseCounts = { avoidance: 0, smell: 0, taste: 0 };
};

Rob.Motioner.prototype.avoid = function(him) {
  this.senseCompetitor(him);
};

Rob.Motioner.prototype.getAvoidanceVector = function() {
  this.getSenseVector('avoidance');
};

Rob.Motioner.prototype.init = function(archon) {
  this.archon = archon;
  this.sprite = archon.sprite;
  this.body = archon.sprite.body;
  this.mover = archon.mover;
  this.lizer = archon.lizer;
  this.sensor = archon.sensor;
  this.dna = archon.dna;
  this.reach = this.sprite.width * 2;

  this.currentFoodTargets = [];
  this.zapThreshold = 20;

  this.motionIndicator = Rob.XY();
  this.previousStartingPoint = Rob.XY();;
};

Rob.Motioner.prototype.ensoul = function() {
  this.accel = new Rob.Accel(this.sprite);
  this.zeroToOneRange = Rob.globals.zeroToOneRange;

  var radius = this.sensor.width / 2;

  this.senseRange = Rob.Range(-radius, radius);
  this.hungerRange = Rob.Range(0, this.dna.embryoThreshold);
  this.speedRange = Rob.Range(-Rob.globals.maxSpeed, Rob.globals.maxSpeed);
  this.centeredZeroToOneRange = Rob.Range(-0.5, 0.5);
};

Rob.Motioner.prototype.eat = function(foodParticle) {
  this.lizer.eat();
  foodParticle.kill();
};

Rob.Motioner.prototype.getTempVector = function() {
  var testPoints = [];

  var addCandidate = function(_this, where) {
    if(where.y > 0 && where.y < game.height && where.x > 0 && where.x < game.width) {
      var p = where;
      var t = Rob.getTemperature.call(_this, where);
      var d = t - _this.dna.optimalTemp;
      var a = Math.abs(d);

      testPoints.push({ p: p, t: t, d: d, a: a});
    }
  };

  addCandidate(this, Rob.XY(this.sensor.x, this.sensor.y - this.sensor.width / 2));
  addCandidate(this, Rob.XY(this.sensor));
  addCandidate(this, Rob.XY(this.sensor.x, this.sensor.y + this.sensor.width / 2));

  if(testPoints.length === 0) {
    this.vectors.temp.set(0, 0);
  } else {
    var bestDelta = testPoints[0].a;
    var bestIndex = 0;
    for(var i = 0; i < testPoints.length; i++) {
      if(testPoints[i].a < bestDelta) {
        bestIndex = i;
        bestDelta = testPoints[i].a;
      }
    }

    var bestD = testPoints[bestIndex].d;

    var myPointOnTheNormalScale = this.centeredZeroToOneRange.convertPoint(
      bestD, Rob.globals.temperatureRange
    );

    var randomX = game.rnd.realInRange(-myPointOnTheNormalScale, myPointOnTheNormalScale);

    this.vectors.temp.set(randomX, myPointOnTheNormalScale);
  }
};

Rob.Motioner.prototype.getSenseVector = function(sense) {
  if(this.senseCounts[sense] !== 0) {
    var debugText = "";

    //Rob.debugText += "sv0 (" + this.vectors.smell.x + ", " + this.vectors.smell.y + ")\n"
    debugText += (
      'Summary ' + sense + ': ' +
      ' count ' + this.senseCounts[sense] +
      ' vector before (' + this.vectors[sense].X() + ', ' + this.vectors[sense].Y() + ')'
    );

    roblog('senses', debugText); debugText = "";

    this.vectors[sense].scalarDivide(this.senseCounts[sense]);

    //Rob.debugText += "sv1 (" + this.vectors.smell.x + ", " + this.vectors.smell.y + ")\n"

    var m = this.vectors[sense].getMagnitude();
    var c = this.centeredZeroToOneRange.convertPoint(m, this.senseRange);

    if(m < c) {
      this.vectors[sense].set(0, 0);
    } else {
      this.vectors[sense].scalarMultiply(Math.abs(c / m));
      //Rob.debugText += "sv2 (" + this.vectors.smell.x + ", " + this.vectors.smell.y + ")\n"
    }

    debugText += (
      ' vector after (' + this.vectors[sense].X() + ', ' + this.vectors[sense].Y() + ')' +
      ' m = ' + m + ', c = ' + c + ', new m = ' + (c / m).toFixed(4)
    );

    roblog('senses', debugText); debugText = "";
  }
};

Rob.Motioner.prototype.getSmellVector = function() {
  this.getSenseVector('smell');
};

Rob.Motioner.prototype.getTasteVector = function() {
  this.getSenseVector('taste');
};

Rob.Motioner.prototype.purgeFoodTargets = function() {
  var retain = [];

  for(var i = 0; i < this.currentFoodTargets.length; i++) {
    var e = this.currentFoodTargets[i];

    // If frame count increases more than one tick
    // past our current timestamp, then we have
    // lost track of the candidate; forget about it
    if(this.frameCount === e.timestamp + e.zapCount + 1) {
      retain.push(e);
    }
  }

  this.currentFoodTargets = retain.slice(); // A surprising way to clone an array
};

Rob.Motioner.prototype.sense = function(sense, sensee) {
  var radius = this.sensor.width / 2;
  var relativePosition = Rob.XY(sensee).minus(this.sensor);

  var distance = relativePosition.getMagnitude();
  distance = Rob.clamp(distance, 0, radius);

  var eaten = false;
  if(sense === 'taste') {
    if(distance <= this.reach) {
      var senseeLocation = Rob.XY( Math.floor(sensee.x), Math.floor(sensee.y));

      var f = this.currentFoodTargets.findIndex(function(testSensee) {
        return testSensee.location.isEqualTo(senseeLocation);
      }, this);

      if(f === -1) {
        this.currentFoodTargets.push({ location: senseeLocation, zapCount: 0, timestamp: this.frameCount });
      } else {
        this.currentFoodTargets[f].zapCount++;
        if(this.currentFoodTargets[f].zapCount > this.zapThreshold) {
          this.currentFoodTargets.splice(f, 1);
          this.eat(sensee);
          eaten = true;
        }
      }
    }
  }

  if(!eaten) {
    var value = radius - distance;

    relativePosition.scalarMultiply(value);
    this.vectors[sense].add(relativePosition);
    this.senseCounts[sense]++;
  }

  var drawDebugLines = false;
  if(drawDebugLines) {
    var color = null;
    switch(sense) {
      case 'smell': color = 'yellow'; break;
      case 'taste': color = 'cyan'; break;
      default: throw "Bad sense '" + sense + "'";
    }

    if(sense !== 'smell') {
      Rob.db.draw(this.sprite, sensee, color);
    }
  }
};

Rob.Motioner.prototype.shootFoodTargets = function() {
  for(var i = 0; i < this.currentFoodTargets.length; i++) {
    var loc = this.currentFoodTargets[i].location;

    Rob.db.draw(this.sprite, loc, 'Chartreuse');
  }
};

Rob.Motioner.prototype.senseCompetitor = function(sensee) {
  if(this.archon.uniqueID !== sensee.archon.uniqueID) {
    var relativePosition = Rob.XY(sensee).minus(this.sensor);
    var distance = relativePosition.getMagnitude();

    // Value falls off like gravity
    var value = 1 / Math.pow(distance, 2);
    value *= this.lizer.getMass() / sensee.archon.lizer.getMass();
    Rob.clamp(value, 0, 1);

    relativePosition.scalarMultiply(value);
    this.vectors.avoidance.add(relativePosition);
    this.senseCounts.avoidance++;
  }

  var drawDebugLines = false;
  if(drawDebugLines) {
    Rob.db.draw(this.sprite, sensee, 'blue');
  }
};

Rob.Motioner.prototype.smell = function(smellyParticle) {
  this.sense('smell', smellyParticle);
  this.smellCount++;
};

Rob.Motioner.prototype.taste = function(tastyParticle) {
  this.sense('taste', tastyParticle);
  this.tasteCount++;
};

Rob.Motioner.prototype.update = function() {
  this.frameCount++;

  var i = null;           // One of the few things I hate about javascript
  var scratch = Rob.XY();

  this.purgeFoodTargets();  // Forget any food we can no longer reach
  this.shootFoodTargets();  // Show the little guy reaching to those within range

  this.accel.tick();
  if(this.accel.maneuverComplete) {
    this.getTempVector();
    this.getSmellVector();
    this.getTasteVector();
    this.getAvoidanceVector();

    if(this.senseCounts.taste > 0) {
      // If there's food in our sense range rather than
      // just the smell of food, then let's add a lot
      // more weight to the actual food. Heavily weight
      // the food and add only a fraction of the smell.
      // Note that the taste vector has all the info now,
      // so we zero out the smell vector
      var foodFactor = 5;

      this.vectors.taste.scalarMultiply(foodFactor);
      this.vectors.taste.add(this.vectors.smell);
      this.vectors.taste.scalarDivide(foodFactor + 1);
      this.vectors.smell.set(0, 0);
    }

    var debugVectors = false;

    if(this.frameCount % 10 === 0) {
      this.vectors.motion.reset();

      var m = null; var a = 0;

      m = this.vectors.temp.getMagnitude();
      if(m > 0) {
        this.vectors.temp.normalize();
        this.vectors.temp.scalarMultiply(this.sensor.width / 2);

        a++;
        this.vectors.temp.scalarMultiply(this.dna.tempFactor);

        scratch.add(this.vectors.temp);

        if(this.archon.uniqueID === 0 && debugVectors) {
          console.log("temp vector (" + this.vectors.temp.X(2) + ", " + this.vectors.temp.Y(2) + ")");
        }
      }

      m = this.vectors.smell.getMagnitude();
      if(m > 0) {
        this.vectors.smell.normalize();
        this.vectors.smell.scalarMultiply(this.sensor.width / 2);

        a++;
        this.vectors.smell.scalarMultiply(this.dna.smellFactor);

        scratch.add(this.vectors.smell);

        if(this.archon.uniqueID === 0 && debugVectors) {
          console.log("smell vector (" + this.vectors.smell.X(2) + ", " + this.vectors.smell.Y(2) + ")");
        }
      }

      m = this.vectors.taste.getMagnitude();
      if(m > 0) {
        this.vectors.taste.normalize();
        this.vectors.taste.scalarMultiply(this.sensor.width / 2);

        a++;
        this.vectors.taste.scalarMultiply(this.dna.tasteFactor);

        scratch.add(this.vectors.taste);

        if(this.archon.uniqueID === 0 && debugVectors) {
          console.log("taste vector (" + this.vectors.taste.X(2) + ", " + this.vectors.taste.Y(2) + ")");
        }
      }

      m = this.vectors.avoidance.getMagnitude();
      if(m > 0) {
        this.vectors.avoidance.normalize();
        this.vectors.avoidance.scalarMultiply(this.sensor.width / 2);

        a++;
        this.vectors.avoidance.scalarMultiply(this.dna.avoidanceFactor);

        scratch.add(this.vectors.avoidance);

        if(this.archon.uniqueID === 0 && debugVectors) {
          console.log("avoidance vector (" + this.vectors.avoidance.X(2) + ", " + this.vectors.avoidance.Y(2) + ")");
        }
      }

      // Give the temp vector an average of the other vectors
      // available, so we don't end up forcing them to go straight
      // up, in which case they have trouble getting away from
      // each other for avoidance purposes
      /*for(i in this.vectors) {
        if(i !== 'motion' && i !== 'temp') {
          var v = this.vectors[i];

          this.vectors.temp.x += v.x / a;
        }
      }

      if(Math.abs(scratch.x) < 10) {
        var y = Math.abs(scratch.y);
        this.vectors.temp.x = game.rnd.integerInRange(-y, y);
      }*/

      this.vectors.motion.add(this.vectors.temp).dividedByScalar(a);
      this.vectors.motion.add(this.vectors.smell).dividedByScalar(a);
      this.vectors.motion.add(this.vectors.taste).dividedByScalar(a);
      this.vectors.motion.add(this.vectors.avoidance).dividedByScalar(a);

      if(this.archon.stopped) {
        this.body.velocity.setTo(0, 0);
      } else {
        scratch = this.vectors.motion.plus(this.sprite);
        scratch.x = Rob.clamp(scratch.x, 0, game.width);
        scratch.y = Rob.clamp(scratch.y, 0, game.height);

        var speed = Rob.globals.maxSpeed;
        if(this.archon.justBorn) {
          this.archon.justBorn = false;
          var nx = game.rnd.integerInRange(-this.sprite.width * 4, this.sprite.width * 4);
          var ny = game.rnd.integerInRange(-this.sprite.height * 4, this.sprite.height * 4);

          this.accel.setTarget(nx, ny);
        } else {
          this.accel.setTarget(scratch.x, scratch.y);
        }
      }

      // Tell the lizer about the the energy we're spending to move around
      if(this.previousStartingPoint.isEqualTo(0)) {
        this.previousStartingPoint.set(this.sprite); // No cost for the first movement in life
      }

      var c = this.previousStartingPoint.getDistanceTo(this.sprite);
      this.lizer.accumulatedMetabolismCost += c / 10;

      this.previousStartingPoint.set(this.sprite);

      this.motionIndicator.set(this.vectors.motion);
      this.motionIndicator.normalize();
      this.motionIndicator.scalarMultiply(this.sensor.width / 2);
      this.motionIndicator.add(this.sprite);
    }
  }

  var drawDebugLine = false;
  if(drawDebugLine && !this.motionIndicator.isEqualTo(0, 0)) {
    Rob.db.draw(this.sprite, this.motionIndicator, 'green', 1);
  }

  this.sensor.x = this.sprite.x; this.sensor.y = this.sprite.y;

  for(i in this.vectors) { this.vectors[i].reset(); }
  for(i in this.senseCounts) { this.senseCounts[i] = 0; }
};

Rob.Accel = function(sprite, maxSpeed) {
  this.dna = sprite.archon.dna;
  this.frameCount = 0;
  this.maneuverStamp = 0;
  this.maneuverComplete = true;
  this.needUpdate = false;
  this.damper = 10;
  this.cancelAfter = 30; // Cancel maneuvers that take too long
  this.expiresAt = 0;

  this.sprite = sprite;
  this.body = sprite.body;

  this.maxSpeed = this.dna.maxVelocity;
  this.maxAcceleration = this.dna.maxAcceleration;

  this.currentSpeed = this.maxSpeed;
  this.currentAcceleration = this.maxAccleration;

  this.currentTargetX = this.sprite.x;
  this.currentTargetY = this.sprite.y;

  this.stuckCount = 0;
  this.previousX = sprite.x;
  this.previousY = sprite.y;
};

Rob.Accel.prototype.setTarget = function(hisX, hisY) {
  var speed = this.maxSpeed;
  var acceleration = this.maxAcceleration;

  this.currentSpeed = speed;
  this.currentAcceleration = acceleration;

  this.hisX = hisX;
  this.hisY = hisY;

  this.maneuverComplete = false;
  this.expiresAt = this.frameCount + this.cancelAfter;
  this.setNewVelocity();
};

Rob.Accel.prototype.setNewVelocity = function() {
  if(this.frameCount > this.expiresAt) {
    this.maneuverComplete = true;
    return;
  }

  this.maneuverStamp = this.frameCount;

  // Get his into the same frame of reference as the velocity vector
  var relX = this.hisX - this.sprite.x;
  var relY = this.hisY - this.sprite.y;

  var vX = this.body.velocity.x;
  var vY = this.body.velocity.y;

  // Get the angle between my velocity vector and
  // the distance vector from me to him.

  var deltaD = Math.sqrt(Math.pow(vX + relX, 2) + Math.pow(vY + relY, 2));
  var thetaToTarget = Math.atan2(vY + relY, vX + relX);

  this.needUpdate = (deltaD > this.currentSpeed);
  deltaD = Math.min(deltaD, this.currentSpeed);

  var vCurtailedX = Math.cos(thetaToTarget) * deltaD;
  var vCurtailedY = Math.sin(thetaToTarget) * deltaD;

  // Now we need to know how much change we intend to apply
  // to the current velocity vectors, so we can scale that
  // change back to limit the acceleration.
  var bestDeltaX = vCurtailedX - vX;
  var bestDeltaY = vCurtailedY - vY;

  var deltaV = Math.sqrt(Math.pow(bestDeltaX, 2) + Math.pow(bestDeltaY, 2));

  // These two are just so I can show debug info
  var aCurtailedX = vCurtailedX;
  var aCurtailedY = vCurtailedY;

  /*if(
    (Math.sign(relX) !== Math.sign(aCurtailedX)) ||
    (Math.sign(relY) !== Math.sign(aCurtailedY))
  ) {
    if(this.sprite.archon.uniqueID === 0) {
      console.log(
        "Rel (" + relX.toFixed(4) + " , " + relY.toFixed(4) + "), " +
        "new (" + aCurtailedX.toFixed(4) + ", " + aCurtailedY.toFixed(4) + ")"
      );
    }
  }*/

  if(deltaV > this.currentAcceleration) {
    this.needUpdate = true;

    bestDeltaX *= this.currentAcceleration / deltaV;
    bestDeltaY *= this.currentAcceleration / deltaV;

    aCurtailedX = bestDeltaX + this.body.velocity.x;
    aCurtailedY = bestDeltaY + this.body.velocity.y;
  }

  var finalX = bestDeltaX + this.body.velocity.x;
  var finalY = bestDeltaY + this.body.velocity.y;

  this.body.velocity.setTo(finalX, finalY);
};

Rob.Accel.prototype.tick = function() {
  this.frameCount++;

  if(
    !this.maneuverComplete && this.needUpdate &&
    this.frameCount > this.maneuverStamp + this.damper) {
    this.setNewVelocity();
  }

  if(this.maneuverComplete) {
    this.body.velocity.x *= 0.9; this.body.velocity.y *= 0.9;
  } else {
    if(this.previousX === Math.floor(this.sprite.x) &&
      this.previousY === Math.floor(this.sprite.y)) {
      this.stuckCount++;
    }

    var me = new Phaser.Point(this.hisX, this.hisY);
    me.floor();

    this.previousX = Math.floor(this.sprite.x); this.previousY = Math.floor(this.sprite.y);

    if(Phaser.Point.distance(me, this.sprite) < 20 || this.stuckCount > 30) {
      this.maneuverComplete = true;
      this.stuckCount = 0;
    }
  }
};
