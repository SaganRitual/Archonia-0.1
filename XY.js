/* jshint forin:false, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, loopfunc:true,
	undef:true, unused:true, curly:true, browser:true, indent:false, maxerr:50, jquery:true, node:true */

/* global Rob */

"use strict";

Rob.XY = function(sourceOrMaybeX, maybeY) {
  var self = {
    x: 0, y: 0,

    add: function(addend) {
      self.x += addend.x;
      self.y += addend.y;
      return self;
    },

    dividedByScalar: function(dividedBy) {
      var scratch = Rob.XY(self);
      scratch.scalarDivide(dividedBy);
      return scratch;
    },

    isEqualTo: function(rhs) {
      if(isNaN(rhs)) {
        // The normal case, checking myself against a vector
        return self.x === rhs.x && self.y === rhs.y;
      } else {
        // But you can also specify a scalar and we'll
        // test both x and y against it
        return self.x === rhs && self.y === rhs;
      }
    },

    getAngle: function() {
      return Math.atan2(self.y, self.x);
    },

    getAngleTo: function(sourceXY) {
      return Math.atan2(sourceXY.y - self.y, sourceXY.x - self.x);
    },

    getDistanceTo: function(sourceXY) {
      return Rob.XY(sourceXY).minus(self).getMagnitude();
    },

    getMagnitude: function() {
      return Math.sqrt(Math.pow(self.x, 2) + Math.pow(self.y, 2));
    },

    makeFromAngle: function(angle, magnitude) {
      if(magnitude === undefined) { magnitude = 1; }
      self.x = Math.cos(angle) * magnitude;
      self.y = Math.sin(angle) * magnitude;
      return self;
    },

    makeFromXY: function(sourceXY) {
      self.x = sourceXY.x;
      self.y = sourceXY.y;
      return self;
    },

    makeFromCoordinates: function(x, y) {
      self.x = x;
      self.y = y;
      return self;
    },

    minus: function(subtrahend) {
      var scratch = Rob.XY(self);
      scratch.subtract(subtrahend);
      return scratch;
    },

    normalize: function() {
      var m = self.getMagnitude();
      self.scalarDivide(m);
      return self;
    },

    normalized: function() {
      var scratch = Rob.XY(self);
      scratch.normalize();
      return scratch;
    },

    normalizeWithSign: function() {
      var sign = Math.sign(self.x) * Math.sign(self.y);
      self.normalize();
      self.scalarMultiply(sign);
      return self;
    },

    polar: function(r, theta) {
      self.x = Math.cos(theta) * r;
      self.y = Math.sin(theta) * r;
      return self;
    },

    plus: function(addend) {
      var scratch = Rob.XY(self);
      scratch.add(addend);
      return scratch;
    },

    reset: function() {
      self.set(0, 0);
    },

    scalarDivide: function(divisor) {
      self.x /= divisor;
      self.y /= divisor;
      return self;
    },

    scalarMultiply: function(multiplicand) {
      self.x *= multiplicand;
      self.y *= multiplicand;
      return self;
    },

    set: function(sourceOrMaybeX, maybeY) {
      if(sourceOrMaybeX === undefined) {
        self.x = 0; self.y = 0;
      } else {
        if(sourceOrMaybeX.x === undefined) {
          if(maybeY === undefined) {
            // sourceOrMaybeX appears to be a number, an x-coordinate, but
            // maybeY has nothing in it. Tell the caller we hate him
            throw "Bad argument(s) to Rob.XY()";
          } else {
            // Looks like an x/y pair
            self.x = sourceOrMaybeX;
            self.y = maybeY;
          }
        } else {
          // sourceOrMaybeX must be an object with x/y values
          self.x = sourceOrMaybeX.x;
          self.y = sourceOrMaybeX.y;
        }
      }

      return self;
    },

    subtract: function(subtrahend) {
      self.x -= subtrahend.x;
      self.y -= subtrahend.y;
      return self;
    },

    timesScalar: function(multiplicand) {
      var scratch = Rob.XY(self);
      scratch.scalarMultiply(multiplicand);
      return scratch;
    },

    X: function(decimals) {
      return self.x.toFixed(decimals);
    },

    Y: function(decimals) {
      return self.y.toFixed(decimals);
    },

    zero: function() {
      self.set(0, 0);
    }
  };

  self.set(sourceOrMaybeX, maybeY);

  return self;

};
