/* jshint forin:false, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, loopfunc:true,
	undef:true, unused:true, curly:true, browser:true, indent:false, maxerr:50, jquery:true, node:true */

/* global Rob */

"use strict";

Rob.Mover = function(sprite) {
  this.sprite = sprite;
  this.archon = sprite.archon;
  this.body = sprite.body;
  this.sensor = sprite.archon.sensor;
  this.dna = this.archon.dna;

  this.motioner = new Rob.Motioner(this);
};

Rob.Mover.prototype.ensoul = function() {
  this.dna = this.archon.dna;
  this.frameCount = 0;

  this.sprite.tint = this.dna.getTint();
  this.tasteCount = 0;
  this.smellCount = 0;
};

Rob.Mover.prototype.eat = function(foodParticle) {
  this.motioner.eat();

  foodParticle.kill();
};

Rob.Mover.prototype.smell = function(smellyParticle) {
  this.motioner.smell(smellyParticle);
};

Rob.Mover.prototype.taste = function(tastyParticle) {
  this.motioner.taste(tastyParticle);
};

Rob.Mover.prototype.update = function() {
  this.frameCount++;
  this.motioner.update();
};
