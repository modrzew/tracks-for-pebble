/*
  * P - A library to work easily with Promise pattern
  * http://github.com/evandrolg/p
  * author: Evandro Leopoldino Goncalves <evandrolgoncalves@gmail.com>
  * http://github.com/evandrolg
  * License: MIT
*/
(function(){"use strict";var a=this,b=function(b){var c=[],d=function(a,b,d){var e=c.length;e&&(c[0][a].apply(b,d),c.shift())};return{context:b||a,resolve:function(){d("fulfilled",this.context,arguments)},reject:function(){d("rejected",this.context,arguments)},then:function(a,b){return c.push({fulfilled:a,rejected:b}),this}}};a.P={init:function(a){return new b(a)}}}).call(this);
module.exports = this.P;