(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require("./index.js");

},{"./index.js":2}],2:[function(require,module,exports){
// if (typeof bubblesView === "undefined") {
//     module.exports = bubblesView = {}
// }
// bubblesView.bubblesView = require("./src/bubblesView.js");
module.exports = geneAssociationsTree = require("./src/geneAssociationsTree.js");

},{"./src/geneAssociationsTree.js":25}],3:[function(require,module,exports){
module.exports = tooltip = require("./src/tooltip.js");

},{"./src/tooltip.js":6}],4:[function(require,module,exports){
module.exports = require("./src/api.js");

},{"./src/api.js":5}],5:[function(require,module,exports){
var api = function (who) {

    var _methods = function () {
	var m = [];

	m.add_batch = function (obj) {
	    m.unshift(obj);
	};

	m.update = function (method, value) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			m[i][p] = value;
			return true;
		    }
		}
	    }
	    return false;
	};

	m.add = function (method, value) {
	    if (m.update (method, value) ) {
	    } else {
		var reg = {};
		reg[method] = value;
		m.add_batch (reg);
	    }
	};

	m.get = function (method) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			return m[i][p];
		    }
		}
	    }
	};

	return m;
    };

    var methods    = _methods();
    var api = function () {};

    api.check = function (method, check, msg) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.check(method[i], check, msg);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.check(check, msg);
	} else {
	    who[method].check(check, msg);
	}
	return api;
    };

    api.transform = function (method, cbak) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.transform (method[i], cbak);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.transform (cbak);
	} else {
	    who[method].transform(cbak);
	}
	return api;
    };

    var attach_method = function (method, opts) {
	var checks = [];
	var transforms = [];

	var getter = opts.on_getter || function () {
	    return methods.get(method);
	};

	var setter = opts.on_setter || function (x) {
	    for (var i=0; i<transforms.length; i++) {
		x = transforms[i](x);
	    }

	    for (var j=0; j<checks.length; j++) {
		if (!checks[j].check(x)) {
		    var msg = checks[j].msg || 
			("Value " + x + " doesn't seem to be valid for this method");
		    throw (msg);
		}
	    }
	    methods.add(method, x);
	};

	var new_method = function (new_val) {
	    if (!arguments.length) {
		return getter();
	    }
	    setter(new_val);
	    return who; // Return this?
	};
	new_method.check = function (cbak, msg) {
	    if (!arguments.length) {
		return checks;
	    }
	    checks.push ({check : cbak,
			  msg   : msg});
	    return this;
	};
	new_method.transform = function (cbak) {
	    if (!arguments.length) {
		return transforms;
	    }
	    transforms.push(cbak);
	    return this;
	};

	who[method] = new_method;
    };

    var getset = function (param, opts) {
	if (typeof (param) === 'object') {
	    methods.add_batch (param);
	    for (var p in param) {
		attach_method (p, opts);
	    }
	} else {
	    methods.add (param, opts.default_value);
	    attach_method (param, opts);
	}
    };

    api.getset = function (param, def) {
	getset(param, {default_value : def});

	return api;
    };

    api.get = function (param, def) {
	var on_setter = function () {
	    throw ("Method defined only as a getter (you are trying to use it as a setter");
	};

	getset(param, {default_value : def,
		       on_setter : on_setter}
	      );

	return api;
    };

    api.set = function (param, def) {
	var on_getter = function () {
	    throw ("Method defined only as a setter (you are trying to use it as a getter");
	};

	getset(param, {default_value : def,
		       on_getter : on_getter}
	      );

	return api;
    };

    api.method = function (name, cbak) {
	if (typeof (name) === 'object') {
	    for (var p in name) {
		who[p] = name[p];
	    }
	} else {
	    who[name] = cbak;
	}
	return api;
    };

    return api;
    
};

module.exports = exports = api;
},{}],6:[function(require,module,exports){
var apijs = require("tnt.api");

var tooltip = function () {
    "use strict";

    var drag = d3.behavior.drag();
    var tooltip_div;

    var conf = {
	background_color : "white",
	foreground_color : "black",
	position : "right",
	allow_drag : true,
	show_closer : true,
	fill : function () { throw "fill is not defined in the base object"; },
	width : 180,
	id : 1
    };

    var t = function (data, event) {
	drag
	    .origin(function(){
		return {x:parseInt(d3.select(this).style("left")),
			y:parseInt(d3.select(this).style("top"))
		       };
	    })
	    .on("drag", function() {
		if (conf.allow_drag) {
		    d3.select(this)
			.style("left", d3.event.x + "px")
			.style("top", d3.event.y + "px");
		}
	    });

	// TODO: Why do we need the div element?
	// It looks like if we anchor the tooltip in the "body"
	// The tooltip is not located in the right place (appears at the bottom)
	// See clients/tooltips_test.html for an example
	var containerElem = selectAncestor (this, "div");
	if (containerElem === undefined) {
	    // We require a div element at some point to anchor the tooltip
	    return;
	}

	// Container element position (needed for "relative" positioned parents)
	// ie has scrollTop and scrollLeft on documentElement instead of body
	// var scrollTop = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;
	// var scrollLeft = (document.documentElement && document.documentElement.scrollLeft) || document.body.scrollLeft;
	// var elemPos = containerElem.getBoundingClientRect();
	// var elemTop = elemPos.top + scrollTop;
	// var elemLeft = elemPos.left + scrollLeft;
	
	tooltip_div = d3.select(containerElem)
	    .append("div")
	    .attr("class", "tnt_tooltip")
	    .classed("tnt_tooltip_active", true)  // TODO: Is this needed/used???
	    .call(drag);

	// prev tooltips with the same header
	d3.select("#tnt_tooltip_" + conf.id).remove();

	if ((d3.event === null) && (event)) {
	    d3.event = event;
	}
	var d3mouse = d3.mouse(containerElem);
	// var mouse = [d3.event.pageX, d3.event.pageY];
	d3.event = null;

	var offset = 0;
	if (conf.position === "left") {
	    offset = conf.width;
	}
	
	tooltip_div.attr("id", "tnt_tooltip_" + conf.id);
	
	// We place the tooltip
	tooltip_div
	// .style("left", (mouse[0] - offset - elemLeft) + "px")
	// .style("top", mouse[1] - elemTop + "px");
	    .style("left", (d3mouse[0]) + "px")
	    .style("top", (d3mouse[1]) + "px");

	// Close
	if (conf.show_closer) {
	    tooltip_div.append("span")
		.style("position", "absolute")
		.style("right", "-10px")
		.style("top", "-10px")
		.append("img")
		.attr("src", tooltip.images.close)
		.attr("width", "20px")
		.attr("height", "20px")
		.on("click", function () {
		    t.close();
		});
	}

	conf.fill.call(tooltip_div, data);

	// return this here?
	return t;
    };

    // gets the first ancestor of elem having tagname "type"
    // example : var mydiv = selectAncestor(myelem, "div");
    function selectAncestor (elem, type) {
	type = type.toLowerCase();
	if (elem.parentNode === null) {
	    console.log("No more parents");
	    return undefined;
	}
	var tagName = elem.parentNode.tagName;

	if ((tagName !== undefined) && (tagName.toLowerCase() === type)) {
	    return elem.parentNode;
	} else {
	    return selectAncestor (elem.parentNode, type);
	}
    }
    
    var api = apijs(t)
	.getset(conf);
    api.check('position', function (val) {
	return (val === 'left') || (val === 'right');
    }, "Only 'left' or 'right' values are allowed for position");

    api.method('close', function () {
	tooltip_div.remove();
    });

    return t;
};

tooltip.list = function () {
    // list tooltip is based on general tooltips
    var t = tooltip();
    var width = 180;

    t.fill (function (obj) {
	var tooltip_div = this;
	var obj_info_list = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

	// Tooltip header
	obj_info_list
	    .append("tr")
	    .attr("class", "tnt_zmenu_header")
	    .append("th")
	    .text(obj.header);

	// Tooltip rows
	var table_rows = obj_info_list.selectAll(".tnt_zmenu_row")
	    .data(obj.rows)
	    .enter()
	    .append("tr")
	    .attr("class", "tnt_zmenu_row");

	table_rows
	    .append("td")
	    .style("text-align", "center")
	    .html(function(d,i) {
		return obj.rows[i].value;
	    })
	    .each(function (d) {
		if (d.link === undefined) {
		    return;
		}
		d3.select(this)
		    .classed("link", 1)
		    .on('click', function (d) {
			d.link(d.obj);
			t.close.call(this);
		    });
	    });
    });
    return t;
};

tooltip.table = function () {
    // table tooltips are based on general tooltips
    var t = tooltip();
    
    var width = 180;

    t.fill (function (obj) {
	var tooltip_div = this;

	var obj_info_table = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

	// Tooltip header
	obj_info_table
	    .append("tr")
	    .attr("class", "tnt_zmenu_header")
	    .append("th")
	    .attr("colspan", 2)
	    .text(obj.header);

	// Tooltip rows
	var table_rows = obj_info_table.selectAll(".tnt_zmenu_row")
	    .data(obj.rows)
	    .enter()
	    .append("tr")
	    .attr("class", "tnt_zmenu_row");

	table_rows
	    .append("th")
	    .html(function(d,i) {
		return obj.rows[i].label;
	    });

	table_rows
	    .append("td")
	    .html(function(d,i) {
		if (typeof obj.rows[i].value === 'function') {
		    obj.rows[i].value.call(this, d);
		} else {
		    return obj.rows[i].value;
		}
	    })
	    .each(function (d) {
		if (d.link === undefined) {
		    return;
		}
		d3.select(this)
		    .classed("link", 1)
		    .on('click', function (d) {
			d.link(d.obj);
			t.close.call(this);
		    });
	    });
    });

    return t;
};

tooltip.plain = function () {
    // plain tooltips are based on general tooltips
    var t = tooltip();

    t.fill (function (obj) {
	var tooltip_div = this;

	var obj_info_table = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

	obj_info_table
	    .append("tr")
	    .attr("class", "tnt_zmenu_header")
	    .append("th")
	    .text(obj.header);

	obj_info_table
	    .append("tr")
	    .attr("class", "tnt_zmenu_row")
	    .append("td")
	    .style("text-align", "center")
	    .html(obj.body);

    });

    return t;
};

// TODO: This shouldn't be exposed in the API. It would be better to have as a local variable
// or alternatively have the images somewhere else (although the number of hardcoded images should be left at a minimum)
tooltip.images = {};
tooltip.images.close = 'data:image/png;base64,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';

module.exports = exports = tooltip;

},{"tnt.api":4}],7:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
module.exports = tree = require("./src/index.js");
var eventsystem = require("biojs-events");
eventsystem.mixin(tree);
//tnt.utils = require("tnt.utils");
//tnt.tooltip = require("tnt.tooltip");
//tnt.tree = require("./src/index.js");


},{"./src/index.js":20,"biojs-events":8}],8:[function(require,module,exports){
var events = require("backbone-events-standalone");

events.onAll = function(callback,context){
  this.on("all", callback,context);
  return this;
};

// Mixin utility
events.oldMixin = events.mixin;
events.mixin = function(proto) {
  events.oldMixin(proto);
  // add custom onAll
  var exports = ['onAll'];
  for(var i=0; i < exports.length;i++){
    var name = exports[i];
    proto[name] = this[name];
  }
  return proto;
};

module.exports = events;

},{"backbone-events-standalone":10}],9:[function(require,module,exports){
/**
 * Standalone extraction of Backbone.Events, no external dependency required.
 * Degrades nicely when Backone/underscore are already available in the current
 * global context.
 *
 * Note that docs suggest to use underscore's `_.extend()` method to add Events
 * support to some given object. A `mixin()` method has been added to the Events
 * prototype to avoid using underscore for that sole purpose:
 *
 *     var myEventEmitter = BackboneEvents.mixin({});
 *
 * Or for a function constructor:
 *
 *     function MyConstructor(){}
 *     MyConstructor.prototype.foo = function(){}
 *     BackboneEvents.mixin(MyConstructor.prototype);
 *
 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
 * (c) 2013 Nicolas Perriault
 */
/* global exports:true, define, module */
(function() {
  var root = this,
      nativeForEach = Array.prototype.forEach,
      hasOwnProperty = Object.prototype.hasOwnProperty,
      slice = Array.prototype.slice,
      idCounter = 0;

  // Returns a partial implementation matching the minimal API subset required
  // by Backbone.Events
  function miniscore() {
    return {
      keys: Object.keys || function (obj) {
        if (typeof obj !== "object" && typeof obj !== "function" || obj === null) {
          throw new TypeError("keys() called on a non-object");
        }
        var key, keys = [];
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            keys[keys.length] = key;
          }
        }
        return keys;
      },

      uniqueId: function(prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
      },

      has: function(obj, key) {
        return hasOwnProperty.call(obj, key);
      },

      each: function(obj, iterator, context) {
        if (obj == null) return;
        if (nativeForEach && obj.forEach === nativeForEach) {
          obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
          for (var i = 0, l = obj.length; i < l; i++) {
            iterator.call(context, obj[i], i, obj);
          }
        } else {
          for (var key in obj) {
            if (this.has(obj, key)) {
              iterator.call(context, obj[key], key, obj);
            }
          }
        }
      },

      once: function(func) {
        var ran = false, memo;
        return function() {
          if (ran) return memo;
          ran = true;
          memo = func.apply(this, arguments);
          func = null;
          return memo;
        };
      }
    };
  }

  var _ = miniscore(), Events;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Mixin utility
  Events.mixin = function(proto) {
    var exports = ['on', 'once', 'off', 'trigger', 'stopListening', 'listenTo',
                   'listenToOnce', 'bind', 'unbind'];
    _.each(exports, function(name) {
      proto[name] = this[name];
    }, this);
    return proto;
  };

  // Export Events as BackboneEvents depending on current context
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Events;
    }
    exports.BackboneEvents = Events;
  }else if (typeof define === "function") {
    define(function() {
      return Events;
    });
  } else {
    root.BackboneEvents = Events;
  }
})(this);

},{}],10:[function(require,module,exports){
module.exports = require('./backbone-events-standalone');

},{"./backbone-events-standalone":9}],11:[function(require,module,exports){
module.exports=require(4)
},{"./src/api.js":12}],12:[function(require,module,exports){
module.exports=require(5)
},{}],13:[function(require,module,exports){
var node = require("./src/node.js");
module.exports = exports = node;

},{"./src/node.js":18}],14:[function(require,module,exports){
module.exports = require("./src/index.js");

},{"./src/index.js":15}],15:[function(require,module,exports){
// require('fs').readdirSync(__dirname + '/').forEach(function(file) {
//     if (file.match(/.+\.js/g) !== null && file !== __filename) {
// 	var name = file.replace('.js', '');
// 	module.exports[name] = require('./' + file);
//     }
// });

// Same as
var utils = require("./utils.js");
utils.reduce = require("./reduce.js");
module.exports = exports = utils;

},{"./reduce.js":16,"./utils.js":17}],16:[function(require,module,exports){
var reduce = function () {
    var smooth = 5;
    var value = 'val';
    var redundant = function (a, b) {
	if (a < b) {
	    return ((b-a) <= (b * 0.2));
	}
	return ((a-b) <= (a * 0.2));
    };
    var perform_reduce = function (arr) {return arr;};

    var reduce = function (arr) {
	if (!arr.length) {
	    return arr;
	}
	var smoothed = perform_smooth(arr);
	var reduced  = perform_reduce(smoothed);
	return reduced;
    };

    var median = function (v, arr) {
	arr.sort(function (a, b) {
	    return a[value] - b[value];
	});
	if (arr.length % 2) {
	    v[value] = arr[~~(arr.length / 2)][value];	    
	} else {
	    var n = ~~(arr.length / 2) - 1;
	    v[value] = (arr[n][value] + arr[n+1][value]) / 2;
	}

	return v;
    };

    var clone = function (source) {
	var target = {};
	for (var prop in source) {
	    if (source.hasOwnProperty(prop)) {
		target[prop] = source[prop];
	    }
	}
	return target;
    };

    var perform_smooth = function (arr) {
	if (smooth === 0) { // no smooth
	    return arr;
	}
	var smooth_arr = [];
	for (var i=0; i<arr.length; i++) {
	    var low = (i < smooth) ? 0 : (i - smooth);
	    var high = (i > (arr.length - smooth)) ? arr.length : (i + smooth);
	    smooth_arr[i] = median(clone(arr[i]), arr.slice(low,high+1));
	}
	return smooth_arr;
    };

    reduce.reducer = function (cbak) {
	if (!arguments.length) {
	    return perform_reduce;
	}
	perform_reduce = cbak;
	return reduce;
    };

    reduce.redundant = function (cbak) {
	if (!arguments.length) {
	    return redundant;
	}
	redundant = cbak;
	return reduce;
    };

    reduce.value = function (val) {
	if (!arguments.length) {
	    return value;
	}
	value = val;
	return reduce;
    };

    reduce.smooth = function (val) {
	if (!arguments.length) {
	    return smooth;
	}
	smooth = val;
	return reduce;
    };

    return reduce;
};

var block = function () {
    var red = reduce()
	.value('start');

    var value2 = 'end';

    var join = function (obj1, obj2) {
        return {
            'object' : {
                'start' : obj1.object[red.value()],
                'end'   : obj2[value2]
            },
            'value'  : obj2[value2]
        };
    };

    // var join = function (obj1, obj2) { return obj1 };

    red.reducer( function (arr) {
	var value = red.value();
	var redundant = red.redundant();
	var reduced_arr = [];
	var curr = {
	    'object' : arr[0],
	    'value'  : arr[0][value2]
	};
	for (var i=1; i<arr.length; i++) {
	    if (redundant (arr[i][value], curr.value)) {
		curr = join(curr, arr[i]);
		continue;
	    }
	    reduced_arr.push (curr.object);
	    curr.object = arr[i];
	    curr.value = arr[i].end;
	}
	reduced_arr.push(curr.object);

	// reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    reduce.join = function (cbak) {
	if (!arguments.length) {
	    return join;
	}
	join = cbak;
	return red;
    };

    reduce.value2 = function (field) {
	if (!arguments.length) {
	    return value2;
	}
	value2 = field;
	return red;
    };

    return red;
};

var line = function () {
    var red = reduce();

    red.reducer ( function (arr) {
	var redundant = red.redundant();
	var value = red.value();
	var reduced_arr = [];
	var curr = arr[0];
	for (var i=1; i<arr.length-1; i++) {
	    if (redundant (arr[i][value], curr[value])) {
		continue;
	    }
	    reduced_arr.push (curr);
	    curr = arr[i];
	}
	reduced_arr.push(curr);
	reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    return red;

};

module.exports = reduce;
module.exports.line = line;
module.exports.block = block;


},{}],17:[function(require,module,exports){

module.exports = {
    iterator : function(init_val) {
	var i = init_val || 0;
	var iter = function () {
	    return i++;
	};
	return iter;
    },

    script_path : function (script_name) { // script_name is the filename
	var script_scaped = script_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	var script_re = new RegExp(script_scaped + '$');
	var script_re_sub = new RegExp('(.*)' + script_scaped + '$');

	// TODO: This requires phantom.js or a similar headless webkit to work (document)
	var scripts = document.getElementsByTagName('script');
	var path = "";  // Default to current path
	if(scripts !== undefined) {
            for(var i in scripts) {
		if(scripts[i].src && scripts[i].src.match(script_re)) {
                    return scripts[i].src.replace(script_re_sub, '$1');
		}
            }
	}
	return path;
    },

    defer_cancel : function (cbak, time) {
	var tick;

	var defer_cancel = function () {
	    clearTimeout(tick);
	    tick = setTimeout(cbak, time);
	};

	return defer_cancel;
    }
};

},{}],18:[function(require,module,exports){
var apijs = require("tnt.api");
var iterator = require("tnt.utils").iterator;

var tnt_node = function (data) {
//tnt.tree.node = function (data) {
    "use strict";

    var node = function () {
    };

    var api = apijs (node);

    // API
//     node.nodes = function() {
// 	if (cluster === undefined) {
// 	    cluster = d3.layout.cluster()
// 	    // TODO: length and children should be exposed in the API
// 	    // i.e. the user should be able to change this defaults via the API
// 	    // children is the defaults for parse_newick, but maybe we should change that
// 	    // or at least not assume this is always the case for the data provided
// 		.value(function(d) {return d.length})
// 		.children(function(d) {return d.children});
// 	}
// 	nodes = cluster.nodes(data);
// 	return nodes;
//     };

    var apply_to_data = function (data, cbak) {
	cbak(data);
	if (data.children !== undefined) {
	    for (var i=0; i<data.children.length; i++) {
		apply_to_data(data.children[i], cbak);
	    }
	}
    };

    var create_ids = function () {
	var i = iterator(1);
	// We can't use apply because apply creates new trees on every node
	// We should use the direct data instead
	apply_to_data (data, function (d) {
	    if (d._id === undefined) {
		d._id = i();
		// TODO: Not sure _inSubTree is strictly necessary
		// d._inSubTree = {prev:true, curr:true};
	    }
	});
    };

    var link_parents = function (data) {
	if (data === undefined) {
	    return;
	}
	if (data.children === undefined) {
	    return;
	}
	for (var i=0; i<data.children.length; i++) {
	    // _parent?
	    data.children[i]._parent = data;
	    link_parents(data.children[i]);
	}
    };

    var compute_root_dists = function (data) {
	// console.log(data);
	apply_to_data (data, function (d) {
	    var l;
	    if (d._parent === undefined) {
		d._root_dist = 0;
	    } else {
		var l = 0;
		if (d.branch_length) {
		    l = d.branch_length
		}
		d._root_dist = l + d._parent._root_dist;
	    }
	});
    };

    // TODO: data can't be rewritten used the api yet. We need finalizers
    node.data = function(new_data) {
	if (!arguments.length) {
	    return data
	}
	data = new_data;
	create_ids();
	link_parents(data);
	compute_root_dists(data);
	return node;
    };
    // We bind the data that has been passed
    node.data(data);

    api.method ('find_all', function (cbak, deep) {
	var nodes = [];
	node.apply (function (n) {
	    if (cbak(n)) {
		nodes.push (n);
	    }
	});
	return nodes;
    });
    
    api.method ('find_node', function (cbak, deep) {
	if (cbak(node)) {
	    return node;
	}

	if (data.children !== undefined) {
	    for (var j=0; j<data.children.length; j++) {
		var found = tnt_node(data.children[j]).find_node(cbak);
		if (found) {
		    return found;
		}
	    }
	}

	if (deep && (data._children !== undefined)) {
	    for (var i=0; i<data._children.length; i++) {
		tnt_node(data._children[i]).find_node(cbak)
		var found = tnt_node(data.children[j]).find_node(cbak);
		if (found) {
		    return found;
		}
	    }
	}
    });

    api.method ('find_node_by_name', function(name) {
	return node.find_node (function (node) {
	    return node.node_name() === name
	});
    });

    api.method ('toggle', function() {
	if (data) {
	    if (data.children) { // Uncollapsed -> collapse
		var hidden = 0;
		node.apply (function (n) {
		    var hidden_here = n.n_hidden() || 0;
		    hidden += (n.n_hidden() || 0) + 1;
		});
		node.n_hidden (hidden-1);
		data._children = data.children;
		data.children = undefined;
	    } else {             // Collapsed -> uncollapse
		node.n_hidden(0);
		data.children = data._children;
		data._children = undefined;
	    }
	}
    });

    api.method ('is_collapsed', function () {
	return (data._children !== undefined && data.children === undefined);
    });

    var has_ancestor = function(n, ancestor) {
	// It is better to work at the data level
	n = n.data();
	ancestor = ancestor.data();
	if (n._parent === undefined) {
	    return false
	}
	n = n._parent
	for (;;) {
	    if (n === undefined) {
		return false;
	    }
	    if (n === ancestor) {
		return true;
	    }
	    n = n._parent;
	}
    };

    // This is the easiest way to calculate the LCA I can think of. But it is very inefficient too.
    // It is working fine by now, but in case it needs to be more performant we can implement the LCA
    // algorithm explained here:
    // http://community.topcoder.com/tc?module=Static&d1=tutorials&d2=lowestCommonAncestor
    api.method ('lca', function (nodes) {
	if (nodes.length === 1) {
	    return nodes[0];
	}
	var lca_node = nodes[0];
	for (var i = 1; i<nodes.length; i++) {
	    lca_node = _lca(lca_node, nodes[i]);
	}
	return lca_node;
	// return tnt_node(lca_node);
    });

    var _lca = function(node1, node2) {
	if (node1.data() === node2.data()) {
	    return node1;
	}
	if (has_ancestor(node1, node2)) {
	    return node2;
	}
	return _lca(node1, node2.parent());
    };

    api.method('n_hidden', function (val) {
	if (!arguments.length) {
	    return node.property('_hidden');
	}
	node.property('_hidden', val);
	return node
    });

    api.method ('get_all_nodes', function () {
	var nodes = [];
	node.apply(function (n) {
	    nodes.push(n);
	});
	return nodes;
    });

    api.method ('get_all_leaves', function () {
	var leaves = [];
	node.apply(function (n) {
	    if (n.is_leaf()) {
		leaves.push(n);
	    }
	});
	return leaves;
    });

    api.method ('upstream', function(cbak) {
	cbak(node);
	var parent = node.parent();
	if (parent !== undefined) {
	    parent.upstream(cbak);
	}
//	tnt_node(parent).upstream(cbak);
// 	node.upstream(node._parent, cbak);
    });

    api.method ('subtree', function(nodes) {
    	var node_counts = {};
    	for (var i=0; i<nodes.length; i++) {
	    var n = nodes[i];
	    if (n !== undefined) {
		n.upstream (function (this_node){
		    var id = this_node.id();
		    if (node_counts[id] === undefined) {
			node_counts[id] = 0;
		    }
		    node_counts[id]++
    		});
	    }
    	}
    

	var is_singleton = function (node_data) {
	    var n_children = 0;
	    if (node_data.children === undefined) {
		return false;
	    }
	    for (var i=0; i<node_data.children.length; i++) {
		var id = node_data.children[i]._id;
		if (node_counts[id] > 0) {
		    n_children++;
		}
	    }
	    return n_children === 1;
	};

	var subtree = {};
	copy_data (data, subtree, function (node_data) {
	    var node_id = node_data._id;
	    var counts = node_counts[node_id];

	    if (counts === undefined) {
	    	return false;
	    }
// 	    if ((node.children !== undefined) && (node.children.length < 2)) {
// 		return false;
// 	    }
	    if ((counts > 1) && (!is_singleton(node_data))) {
		return true;
	    }
	    if ((counts > 0) && (node_data.children === undefined)) {
		return true;
	    }
	    return false;
	});

	return tnt_node(subtree.children[0]);
    });

    var copy_data = function (orig_data, subtree, condition) {
        if (orig_data === undefined) {
	    return;
        }

        if (condition(orig_data)) {
	    var copy = copy_node(orig_data);
	    if (subtree.children === undefined) {
                subtree.children = [];
	    }
	    subtree.children.push(copy);
	    if (orig_data.children === undefined) {
                return;
	    }
	    for (var i = 0; i < orig_data.children.length; i++) {
                copy_data (orig_data.children[i], copy, condition);
	    }
        } else {
	    if (orig_data.children === undefined) {
                return;
	    }
	    for (var i = 0; i < orig_data.children.length; i++) {
                copy_data(orig_data.children[i], subtree, condition);
	    }
        }
    };

    var copy_node = function (node_data) {
	var copy = {};
	// copy all the own properties excepts links to other nodes or depth
	for (var param in node_data) {
	    if ((param === "children") ||
		(param === "_children") ||
		(param === "_parent") ||
		(param === "depth")) {
		continue;
	    }
	    if (node_data.hasOwnProperty(param)) {
		copy[param] = node_data[param];
	    }
	}
	return copy;
    };

    
    // TODO: This method visits all the nodes
    // a more performant version should return true
    // the first time cbak(node) is true
    api.method ('present', function (cbak) {
	// cbak should return true/false
	var is_true = false;
	node.apply (function (n) {
	    if (cbak(n) === true) {
		is_true = true;
	    }
	});
	return is_true;
    });

    // cbak is called with two nodes
    // and should return a negative number, 0 or a positive number
    api.method ('sort', function (cbak) {
	if (data.children === undefined) {
	    return;
	}

	var new_children = [];
	for (var i=0; i<data.children.length; i++) {
	    new_children.push(tnt_node(data.children[i]));
	}

	new_children.sort(cbak);

	data.children = [];
	for (var i=0; i<new_children.length; i++) {
	    data.children.push(new_children[i].data());
	}

	for (var i=0; i<data.children.length; i++) {
	    tnt_node(data.children[i]).sort(cbak);
	}
    });

    api.method ('flatten', function () {
	if (node.is_leaf()) {
	    return node;
	}
	var data = node.data();
	var newroot = copy_node(data);
	var leaves = node.get_all_leaves();
	newroot.children = [];
	for (var i=0; i<leaves.length; i++) {
	    newroot.children.push(copy_node(leaves[i].data()));
	}

	return tnt_node(newroot);
    });

    
    // TODO: This method only 'apply's to non collapsed nodes (ie ._children is not visited)
    // Would it be better to have an extra flag (true/false) to visit also collapsed nodes?
    api.method ('apply', function(cbak) {
	cbak(node);
	if (data.children !== undefined) {
	    for (var i=0; i<data.children.length; i++) {
		var n = tnt_node(data.children[i])
		n.apply(cbak);
	    }
	}
    });

    // TODO: Not sure if it makes sense to set via a callback:
    // root.property (function (node, val) {
    //    node.deeper.field = val
    // }, 'new_value')
    api.method ('property', function(prop, value) {
	if (arguments.length === 1) {
	    if ((typeof prop) === 'function') {
		return prop(data)	
	    }
	    return data[prop]
	}
	if ((typeof prop) === 'function') {
	    prop(data, value);   
	}
	data[prop] = value;
	return node;
    });

    api.method ('is_leaf', function() {
	return data.children === undefined;
    });

    // It looks like the cluster can't be used for anything useful here
    // It is now included as an optional parameter to the tnt.tree() method call
    // so I'm commenting the getter
    // node.cluster = function() {
    // 	return cluster;
    // };

    // node.depth = function (node) {
    //     return node.depth;
    // };

//     node.name = function (node) {
//         return node.name;
//     };

    api.method ('id', function () {
	return node.property('_id');
    });

    api.method ('node_name', function () {
	return node.property('name');
    });

    api.method ('branch_length', function () {
	return node.property('branch_length');
    });

    api.method ('root_dist', function () {
	return node.property('_root_dist');
    });

    api.method ('children', function () {
	if (data.children === undefined) {
	    return;
	}
	var children = [];
	for (var i=0; i<data.children.length; i++) {
	    children.push(tnt_node(data.children[i]));
	}
	return children;
    });

    api.method ('parent', function () {
	if (data._parent === undefined) {
	    return undefined;
	}
	return tnt_node(data._parent);
    });

    return node;

};

module.exports = exports = tnt_node;


},{"tnt.api":11,"tnt.utils":14}],19:[function(require,module,exports){
var apijs = require('tnt.api');
var tree = {};

tree.diagonal = function () {
    var d = function (diagonalPath) {
	var source = diagonalPath.source;
        var target = diagonalPath.target;
        var midpointX = (source.x + target.x) / 2;
        var midpointY = (source.y + target.y) / 2;
        var pathData = [source, {x: target.x, y: source.y}, target];
	pathData = pathData.map(d.projection());
	return d.path()(pathData, radial_calc.call(this,pathData))
    };

    var api = apijs (d)
	.getset ('projection')
	.getset ('path')
    
    var coordinateToAngle = function (coord, radius) {
      	var wholeAngle = 2 * Math.PI,
        quarterAngle = wholeAngle / 4
	
      	var coordQuad = coord[0] >= 0 ? (coord[1] >= 0 ? 1 : 2) : (coord[1] >= 0 ? 4 : 3),
        coordBaseAngle = Math.abs(Math.asin(coord[1] / radius))
	
      	// Since this is just based on the angle of the right triangle formed
      	// by the coordinate and the origin, each quad will have different 
      	// offsets
      	var coordAngle;
      	switch (coordQuad) {
      	case 1:
      	    coordAngle = quarterAngle - coordBaseAngle
      	    break
      	case 2:
      	    coordAngle = quarterAngle + coordBaseAngle
      	    break
      	case 3:
      	    coordAngle = 2*quarterAngle + quarterAngle - coordBaseAngle
      	    break
      	case 4:
      	    coordAngle = 3*quarterAngle + coordBaseAngle
      	}
      	return coordAngle
    };

    var radial_calc = function (pathData) {
	var src = pathData[0];
	var mid = pathData[1];
	var dst = pathData[2];
	var radius = Math.sqrt(src[0]*src[0] + src[1]*src[1]);
	var srcAngle = coordinateToAngle(src, radius);
	var midAngle = coordinateToAngle(mid, radius);
	var clockwise = Math.abs(midAngle - srcAngle) > Math.PI ? midAngle <= srcAngle : midAngle > srcAngle;
	return {
	    radius   : radius,
	    clockwise : clockwise
	};
    };

    return d;
};

// vertical diagonal for rect branches
tree.diagonal.vertical = function () {
    var path = function(pathData, obj) {
	var src = pathData[0];
	var mid = pathData[1];
	var dst = pathData[2];
	var radius = 200000; // Number long enough

	return "M" + src + " A" + [radius,radius] + " 0 0,0 " + mid + "M" + mid + "L" + dst; 
	
    };

    var projection = function(d) { 
	return [d.y, d.x];
    }

    return tree.diagonal()
      	.path(path)
      	.projection(projection);
};

tree.diagonal.radial = function () {
    var path = function(pathData, obj) {
      	var src = pathData[0];
      	var mid = pathData[1];
      	var dst = pathData[2];
	var radius = obj.radius;
	var clockwise = obj.clockwise;

	if (clockwise) {
	    return "M" + src + " A" + [radius,radius] + " 0 0,0 " + mid + "M" + mid + "L" + dst; 
	} else {
	    return "M" + mid + " A" + [radius,radius] + " 0 0,0 " + src + "M" + mid + "L" + dst;
	}

    };

    var projection = function(d) {
      	var r = d.y, a = (d.x - 90) / 180 * Math.PI;
      	return [r * Math.cos(a), r * Math.sin(a)];
    };

    return tree.diagonal()
      	.path(path)
      	.projection(projection)
};

module.exports = exports = tree.diagonal;

},{"tnt.api":11}],20:[function(require,module,exports){
var tree = require ("./tree.js");
tree.label = require("./label.js");
tree.diagonal = require("./diagonal.js");
tree.layout = require("./layout.js");
tree.node_display = require("./node_display.js");
// tree.node = require("tnt.tree.node");
// tree.parse_newick = require("tnt.newick").parse_newick;
// tree.parse_nhx = require("tnt.newick").parse_nhx;

module.exports = exports = tree;


},{"./diagonal.js":19,"./label.js":21,"./layout.js":22,"./node_display.js":23,"./tree.js":24}],21:[function(require,module,exports){
var apijs = require("tnt.api");
var tree = {};

tree.label = function () {
"use strict";

    // TODO: Not sure if we should be removing by default prev labels
    // or it would be better to have a separate remove method called by the vis
    // on update
    // We also have the problem that we may be transitioning from
    // text to img labels and we need to remove the label of a different type
    var label = function (node, layout_type, node_size) {
	if (typeof (node) !== 'function') {
            throw(node);
        }

	label.display().call(this, node, layout_type)
	    .attr("class", "tnt_tree_label")
	    .attr("transform", function (d) {
		var t = label.transform()(node, layout_type);
		return "translate (" + (t.translate[0] + node_size) + " " + t.translate[1] + ")rotate(" + t.rotate + ")";
	    })
	// TODO: this click event is probably never fired since there is an onclick event in the node g element?
	    .on("click", function(){
		if (label.on_click() !== undefined) {
		    d3.event.stopPropagation();
		    label.on_click().call(this, node);
		}
	    });
    };

    var api = apijs (label)
	.getset ('width', function () { throw "Need a width callback" })
	.getset ('height', function () { throw "Need a height callback" })
	.getset ('display', function () { throw "Need a display callback" })
	.getset ('transform', function () { throw "Need a transform callback" })
	.getset ('on_click');

    return label;
};

// Text based labels
tree.label.text = function () {
    var label = tree.label();

    var api = apijs (label)
	.getset ('fontsize', 10)
	.getset ('color', "#000")
	.getset ('text', function (d) {
	    return d.data().name;
	})

    label.display (function (node, layout_type) {
	var l = d3.select(this)
	    .append("text")
	    .attr("text-anchor", function (d) {
		if (layout_type === "radial") {
		    return (d.x%360 < 180) ? "start" : "end";
		}
		return "start";
	    })
	    .text(function(){
		return label.text()(node)
	    })
	    .style('font-size', label.fontsize() + "px")
	    .style('fill', d3.functor(label.color())(node));

	return l;
    });

    label.transform (function (node, layout_type) {
	var d = node.data();
	var t = {
	    translate : [5, 5],
	    rotate : 0
	};
	if (layout_type === "radial") {
	    t.translate[1] = t.translate[1] - (d.x%360 < 180 ? 0 : label.fontsize())
	    t.rotate = (d.x%360 < 180 ? 0 : 180)
	}
	return t;
    });


    // label.transform (function (node) {
    // 	var d = node.data();
    // 	return "translate(10 5)rotate(" + (d.x%360 < 180 ? 0 : 180) + ")";
    // });

    label.width (function (node) {
	var svg = d3.select("body")
	    .append("svg")
	    .attr("height", 0)
	    .style('visibility', 'hidden');

	var text = svg
	    .append("text")
	    .style('font-size', label.fontsize() + "px")
	    .text(label.text()(node));

	var width = text.node().getBBox().width;
	svg.remove();

	return width;
    });

    label.height (function (node) {
	return label.fontsize();
    });

    return label;
};

// Image based labels
tree.label.img = function () {
    var label = tree.label();

    var api = apijs (label)
	.getset ('src', function () {})

    label.display (function (node, layout_type) {
	if (label.src()(node)) {
	    var l = d3.select(this)
		.append("image")
		.attr("width", label.width()())
		.attr("height", label.height()())
		.attr("xlink:href", label.src()(node));
	    return l;
	}
	// fallback text in case the img is not found?
	return d3.select(this)
	    .append("text")
	    .text("");
    });

    label.transform (function (node, layout_type) {
	var d = node.data();
	var t = {
	    translate : [10, (-label.height()() / 2)],
	    rotate : 0
	};
	if (layout_type === 'radial') {
	    t.translate[0] = t.translate[0] + (d.x%360 < 180 ? 0 : label.width()()),
	    t.translate[1] = t.translate[1] + (d.x%360 < 180 ? 0 : label.height()()),
	    t.rotate = (d.x%360 < 180 ? 0 : 180)
	}

	return t;
    });

    return label;
};

// Labels made of 2+ simple labels
tree.label.composite = function () {
    var labels = [];

    var label = function (node, layout_type) {
	var curr_xoffset = 0;

	for (var i=0; i<labels.length; i++) {
	    var display = labels[i];

	    (function (offset) {
		display.transform (function (node, layout_type) {
		    var tsuper = display._super_.transform()(node, layout_type);
		    var t = {
			translate : [offset + tsuper.translate[0], tsuper.translate[1]],
			rotate : tsuper.rotate
		    };
		    return t;
		})
	    })(curr_xoffset);

	    curr_xoffset += 10;
	    curr_xoffset += display.width()(node);

	    display.call(this, node, layout_type);
	}
    };

    var api = apijs (label)

    api.method ('add_label', function (display, node) {
	display._super_ = {};
	apijs (display._super_)
	    .get ('transform', display.transform());

	labels.push(display);
	return label;
    });
    
    api.method ('width', function () {
	return function (node) {
	    var tot_width = 0;
	    for (var i=0; i<labels.length; i++) {
		tot_width += parseInt(labels[i].width()(node));
		tot_width += parseInt(labels[i]._super_.transform()(node).translate[0]);
	    }

	    return tot_width;
	}
    });

    api.method ('height', function () {
	return function (node) {
	    var max_height = 0;
	    for (var i=0; i<labels.length; i++) {
		var curr_height = labels[i].height()(node);
		if ( curr_height > max_height) {
		    max_height = curr_height;
		}
	    }
	    return max_height;
	}
    });

    return label;
};

module.exports = exports = tree.label;



},{"tnt.api":11}],22:[function(require,module,exports){
// Based on the code by Ken-ichi Ueda in http://bl.ocks.org/kueda/1036776#d3.phylogram.js

var apijs = require("tnt.api");
var diagonal = require("./diagonal.js");
var tree = {};

tree.layout = function () {

    var l = function () {
    };

    var cluster = d3.layout.cluster()
	.sort(null)
	.value(function (d) {return d.length} )
	.separation(function () {return 1});
    
    var api = apijs (l)
	.getset ('scale', true)
	.getset ('max_leaf_label_width', 0)
	.method ("cluster", cluster)
	.method('yscale', function () {throw "yscale is not defined in the base object"})
	.method('adjust_cluster_size', function () {throw "adjust_cluster_size is not defined in the base object" })
	.method('width', function () {throw "width is not defined in the base object"})
	.method('height', function () {throw "height is not defined in the base object"});

    api.method('scale_branch_lengths', function (curr) {
	if (l.scale() === false) {
	    return
	}

	var nodes = curr.nodes;
	var tree = curr.tree;

	var root_dists = nodes.map (function (d) {
	    return d._root_dist;
	});

	var yscale = l.yscale(root_dists);
	tree.apply (function (node) {
	    node.property("y", yscale(node.root_dist()));
	});
    });

    return l;
};

tree.layout.vertical = function () {
    var layout = tree.layout();
    // Elements like 'labels' depend on the layout type. This exposes a way of identifying the layout type
    layout.type = "vertical";

    var api = apijs (layout)
	.getset ('width', 360)
	.get ('translate_vis', [20,20])
	.method ('diagonal', diagonal.vertical)
	.method ('transform_node', function (d) {
    	    return "translate(" + d.y + "," + d.x + ")";
	});

    api.method('height', function (params) {
    	return (params.n_leaves * params.label_height);
    }); 

    api.method('yscale', function (dists) {
    	return d3.scale.linear()
    	    .domain([0, d3.max(dists)])
    	    .range([0, layout.width() - 20 - layout.max_leaf_label_width()]);
    });

    api.method('adjust_cluster_size', function (params) {
    	var h = layout.height(params);
    	var w = layout.width() - layout.max_leaf_label_width() - layout.translate_vis()[0] - params.label_padding;
    	layout.cluster.size ([h,w]);
    	return layout;
    });

    return layout;
};

tree.layout.radial = function () {
    var layout = tree.layout();
    // Elements like 'labels' depend on the layout type. This exposes a way of identifying the layout type
    layout.type = 'radial';

    var default_width = 360;
    var r = default_width / 2;

    var conf = {
    	width : 360
    };

    var api = apijs (layout)
	.getset (conf)
	.getset ('translate_vis', [r, r]) // TODO: 1.3 should be replaced by a sensible value
	.method ('transform_node', function (d) {
	    return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
	})
	.method ('diagonal', diagonal.radial)
	.method ('height', function () { return conf.width });

    // Changes in width affect changes in r
    layout.width.transform (function (val) {
    	r = val / 2;
    	layout.cluster.size([360, r])
    	layout.translate_vis([r, r]);
    	return val;
    });

    api.method ("yscale",  function (dists) {
	return d3.scale.linear()
	    .domain([0,d3.max(dists)])
	    .range([0, r]);
    });

    api.method ("adjust_cluster_size", function (params) {
	r = (layout.width()/2) - layout.max_leaf_label_width() - 20;
	layout.cluster.size([360, r]);
	return layout;
    });

    return layout;
};

module.exports = exports = tree.layout;

},{"./diagonal.js":19,"tnt.api":11}],23:[function(require,module,exports){
var apijs = require("tnt.api");
var tree = {};

tree.node_display = function () {
    "use strict";

    var n = function (node) {
	n.display().call(this, node)
    };

    var api = apijs (n)
	.getset("size", 4.5)
	.getset("fill", "black")
	.getset("stroke", "black")
	.getset("stroke_width", "1px")
	.getset("display", function () {throw "display is not defined in the base object"});

    return n;
};

tree.node_display.circle = function () {
    var n = tree.node_display();

    n.display (function (node) {
	d3.select(this)
	    .append("circle")
	    .attr("r", function (d) {
		return d3.functor(n.size())(node);
	    })
	    .attr("fill", function (d) {
		return d3.functor(n.fill())(node);
	    })
	    .attr("stroke", function (d) {
		return d3.functor(n.stroke())(node);
	    })
	    .attr("stroke-width", function (d) {
		return d3.functor(n.stroke_width())(node);
	    })
    });

    return n;
};

tree.node_display.square = function () {
    var n = tree.node_display();

    n.display (function (node) {
	var s = d3.functor(n.size())(node);
	d3.select(this)
	    .append("rect")
	    .attr("x", function (d) {
		return -s
	    })
	    .attr("y", function (d) {
		return -s;
	    })
	    .attr("width", function (d) {
		return s*2;
	    })
	    .attr("height", function (d) {
		return s*2;
	    })
	    .attr("fill", function (d) {
		return d3.functor(n.fill())(node);
	    })
	    .attr("stroke", function (d) {
		return d3.functor(n.stroke())(node);
	    })
	    .attr("stroke-width", function (d) {
		return d3.functor(n.stroke_width())(node);
	    })
    });

    return n;
};

tree.node_display.triangle = function () {
    var n = tree.node_display();

    n.display (function (node) {
	var s = d3.functor(n.size())(node);
	d3.select(this)
	    .append("polygon")
	    .attr("points", (-s) + ",0 " + s + "," + (-s) + " " + s + "," + s)
	    .attr("fill", function (d) {
		return d3.functor(n.fill())(node);
	    })
	    .attr("stroke", function (d) {
		return d3.functor(n.stroke())(node);
	    })
	    .attr("stroke-width", function (d) {
		return d3.functor(n.stroke_width())(node);
	    })
    });

    return n;
};

tree.node_display.cond = function () {
    var n = tree.node_display();

    // conditions are objects with
    // name : a name for this display
    // callback: the condition to apply (receives a tnt.node)
    // display: a node_display
    var conds = [];

    n.display (function (node) {
	var s = d3.functor(n.size())(node);
	for (var i=0; i<conds.length; i++) {
	    var cond = conds[i];
	    // For each node, the first condition met is used
	    if (cond.callback.call(this, node) === true) {
		cond.display.call(this, node)
		break;
	    }
	}
    })

    var api = apijs(n);

    api.method("add", function (name, cbak, node_display) {
	conds.push({ name : name,
		     callback : cbak,
		     display : node_display
		   });
	return n;
    });

    api.method("reset", function () {
	conds = [];
	return n;
    });

    api.method("update", function (name, cbak, new_display) {
	for (var i=0; i<conds.length; i++) {
	    if (conds[i].name === name) {
		conds[i].callback = cbak;
		conds[i].display = new_display;
	    }
	}
	return n;
    });

    return n;

};

module.exports = exports = tree.node_display;

},{"tnt.api":11}],24:[function(require,module,exports){
var apijs = require("tnt.api");
var tnt_tree_node = require("tnt.tree.node");

var tree = function () {
    "use strict";

    var conf = {
	duration         : 500,      // Duration of the transitions
	node_display     : tree.node_display.circle(),
	label            : tree.label.text(),
	layout           : tree.layout.vertical(),
	on_click         : function () {},
	on_dbl_click     : function () {},
	on_mouseover     : function () {},
	link_color       : 'black',
	id               : "_id"
    };

    // Keep track of the focused node
    // TODO: Would it be better to have multiple focused nodes? (ie use an array)
    var focused_node;

    // Extra delay in the transitions (TODO: Needed?)
    var delay = 0;

    // Ease of the transitions
    var ease = "cubic-in-out";

    // By node data
    var sp_counts = {};
 
    var scale = false;

    // The id of the tree container
    var div_id;

    // The tree visualization (svg)
    var svg;
    var vis;

    // TODO: For now, counts are given only for leaves
    // but it may be good to allow counts for internal nodes
    var counts = {};

    // The full tree
    var base = {
	tree : undefined,
	data : undefined,	
	nodes : undefined,
	links : undefined
    };

    // The curr tree. Needed to re-compute the links / nodes positions of subtrees
    var curr = {
	tree : undefined,
	data : undefined,
	nodes : undefined,
	links : undefined
    };

    // The cbak returned
    var t = function (div) {
	div_id = d3.select(div).attr("id");

        var tree_div = d3.select(div)
            .append("div")
	    .style("width", (conf.layout.width() +  "px"))
	    .attr("class", "tnt_groupDiv");

	var cluster = conf.layout.cluster;

	var n_leaves = curr.tree.get_all_leaves().length;

	var max_leaf_label_length = function (tree) {
	    var max = 0;
	    var leaves = tree.get_all_leaves();
	    for (var i=0; i<leaves.length; i++) {
		var label_width = conf.label.width()(leaves[i]) + d3.functor(conf.node_display.size())(leaves[i]);
		if (label_width > max) {
		    max = label_width;
		}
	    }
	    return max;
	};

	var max_leaf_node_height = function (tree) {
	    var max = 0;
	    var leaves = tree.get_all_leaves();
	    for (var i=0; i<leaves.length; i++) {
		var node_size = d3.functor(conf.node_display.size())(leaves[i]);
		if (node_size > max) {
		    max = node_size;
		}
	    }
	    return max * 2;
	};

	var max_label_length = max_leaf_label_length(curr.tree);
	conf.layout.max_leaf_label_width(max_label_length);

	var max_node_height = max_leaf_node_height(curr.tree);

	// Cluster size is the result of...
	// total width of the vis - transform for the tree - max_leaf_label_width - horizontal transform of the label
	// TODO: Substitute 15 by the horizontal transform of the nodes
	var cluster_size_params = {
	    n_leaves : n_leaves,
	    label_height : d3.max([d3.functor(conf.label.height())(), max_node_height]),
	    label_padding : 15
	};

	conf.layout.adjust_cluster_size(cluster_size_params);

	var diagonal = conf.layout.diagonal();
	var transform = conf.layout.transform_node;

	svg = tree_div
	    .append("svg")
	    .attr("width", conf.layout.width())
	    .attr("height", conf.layout.height(cluster_size_params) + 30)
	    .attr("fill", "none");

	vis = svg
	    .append("g")
	    .attr("id", "tnt_st_" + div_id)
	    .attr("transform",
		  "translate(" +
		  conf.layout.translate_vis()[0] +
		  "," +
		  conf.layout.translate_vis()[1] +
		  ")");

	curr.nodes = cluster.nodes(curr.data);
	conf.layout.scale_branch_lengths(curr);
	curr.links = cluster.links(curr.nodes);

	// LINKS
	var link = vis.selectAll("path.tnt_tree_link")
	    .data(curr.links, function(d){return d.target[conf.id]});
	
	link
	    .enter()
	    .append("path")
	    .attr("class", "tnt_tree_link")
	    .attr("id", function(d) {
	    	return "tnt_tree_link_" + div_id + "_" + d.target._id;
	    })
	    .style("stroke", function (d) {
		return d3.functor(conf.link_color)(tnt_tree_node(d.source), tnt_tree_node(d.target));
	    })
	    .attr("d", diagonal);	    

	// NODES
	var node = vis.selectAll("g.tnt_tree_node")
	    .data(curr.nodes, function(d) {return d[conf.id]});

	var new_node = node
	    .enter().append("g")
	    .attr("class", function(n) {
		if (n.children) {
		    if (n.depth == 0) {
			return "root tnt_tree_node"
		    } else {
			return "inner tnt_tree_node"
		    }
		} else {
		    return "leaf tnt_tree_node"
		}
	    })
	    .attr("id", function(d) {
		return "tnt_tree_node_" + div_id + "_" + d._id
	    })
	    .attr("transform", transform);

	// display node shape
	new_node
	    .each (function (d) {
		conf.node_display.call(this, tnt_tree_node(d))
	    });

	// display node label
	new_node
	    .each (function (d) {
	    	conf.label.call(this, tnt_tree_node(d), conf.layout.type, d3.functor(conf.node_display.size())(tnt_tree_node(d)));
	    });

	new_node.on("click", function (node) {
	    conf.on_click.call(this, tnt_tree_node(node));

	    tree.trigger("node:click", tnt_tree_node(node));
	});

	new_node.on("mouseenter", function (node) {
	    conf.on_mouseover.call(this, tnt_tree_node(node));

	    tree.trigger("node:hover", tnt_tree_node(node));
	});

	new_node.on("dblclick", function (node) {
	    conf.on_dbl_click.call(this, tnt_tree_node(node));

	    tree.trigger("node:dblclick", tnt_tree_node(node));
	});


	// Update plots an updated tree
	api.method ('update', function() {
	    tree_div
		.style("width", (conf.layout.width() + "px"));
	    svg.attr("width", conf.layout.width());

	    var cluster = conf.layout.cluster;
	    var diagonal = conf.layout.diagonal();
	    var transform = conf.layout.transform_node;

	    var max_label_length = max_leaf_label_length(curr.tree);
	    conf.layout.max_leaf_label_width(max_label_length);

	    var max_node_height = max_leaf_node_height(curr.tree);

	    // Cluster size is the result of...
	    // total width of the vis - transform for the tree - max_leaf_label_width - horizontal transform of the label
	// TODO: Substitute 15 by the transform of the nodes (probably by selecting one node assuming all the nodes have the same transform
	    var n_leaves = curr.tree.get_all_leaves().length;
	    var cluster_size_params = {
		n_leaves : n_leaves,
		label_height : d3.max([d3.functor(conf.label.height())()]),
		label_padding : 15
	    };
	    conf.layout.adjust_cluster_size(cluster_size_params);

	    svg
		.transition()
		.duration(conf.duration)
		.ease(ease)
		.attr("height", conf.layout.height(cluster_size_params) + 30); // height is in the layout

	    vis
		.transition()
		.duration(conf.duration)
		.attr("transform",
		      "translate(" +
		      conf.layout.translate_vis()[0] +
		      "," +
		      conf.layout.translate_vis()[1] +
		      ")");
	    
	    curr.nodes = cluster.nodes(curr.data);
	    conf.layout.scale_branch_lengths(curr);
	    curr.links = cluster.links(curr.nodes);

	    // LINKS
	    var link = vis.selectAll("path.tnt_tree_link")
		.data(curr.links, function(d){return d.target[conf.id]});

            // NODES
	    var node = vis.selectAll("g.tnt_tree_node")
		.data(curr.nodes, function(d) {return d[conf.id]});

	    var exit_link = link
		.exit()
		.remove();

	    link
		.enter()
		.append("path")
		.attr("class", "tnt_tree_link")
		.attr("id", function (d) {
		    return "tnt_tree_link_" + div_id + "_" + d.target._id;
		})
		.attr("stroke", function (d) {
		    return d3.functor(conf.link_color)(tnt_tree_node(d.source), tnt_tree_node(d.target));
		})
		.attr("d", diagonal);

	    link
	    	.transition()
		.ease(ease)
	    	.duration(conf.duration)
	    	.attr("d", diagonal);


	    // Nodes
	    var new_node = node
		.enter()
		.append("g")
		.attr("class", function(n) {
		    if (n.children) {
			if (n.depth == 0) {
			    return "root tnt_tree_node"
			} else {
			    return "inner tnt_tree_node"
			}
		    } else {
			return "leaf tnt_tree_node"
		    }
		})
		.attr("id", function (d) {
		    return "tnt_tree_node_" + div_id + "_" + d._id;
		})
		.attr("transform", transform);
   
	    // Exiting nodes are just removed
	    node
		.exit()
		.remove();

	    new_node.on("click", function (node) {
		conf.on_click.call(this, tnt_tree_node(node));

		tree.trigger("node:click", tnt_tree_node(node));
	    });

	    new_node.on("mouseenter", function (node) {
		conf.on_mouseover.call(this, tnt_tree_node(node));

		tree.trigger("node:hover", tnt_tree_node(node));
	    });

	    new_node.on("dblclick", function (node) {
		conf.on_dbl_click.call(this, tnt_tree_node(node));

		tree.trigger("node:dblclick", tnt_tree_node(node));
	    });


	    // We need to re-create all the nodes again in case they have changed lively (or the layout)
	    node.selectAll("*").remove();
	    node
		    .each(function (d) {
			conf.node_display.call(this, tnt_tree_node(d))
		    });

	    // We need to re-create all the labels again in case they have changed lively (or the layout)
	    node
		    .each (function (d) {
			conf.label.call(this, tnt_tree_node(d), conf.layout.type, d3.functor(conf.node_display.size())(tnt_tree_node(d)));
		    });

	    node
		.transition()
		.ease(ease)
		.duration(conf.duration)
		.attr("transform", transform);

	});
    };

    // API
    var api = apijs (t)
	.getset (conf)

    // TODO: Rewrite data using getset / finalizers & transforms
    api.method ('data', function (d) {
	if (!arguments.length) {
	    return base.data;
	}

	// The original data is stored as the base and curr data
	base.data = d;
	curr.data = d;

	// Set up a new tree based on the data
	var newtree = tnt_tree_node(base.data);

	t.root(newtree);

	tree.trigger("data:hasChanged", base.data);

	return this;
    });

    // TODO: Rewrite tree using getset / finalizers & transforms
    api.method ('root', function (myTree) {
    	if (!arguments.length) {
    	    return curr.tree;
    	}

	// The original tree is stored as the base, prev and curr tree
    	base.tree = myTree;
	curr.tree = base.tree;
//	prev.tree = base.tree;
    	return this;
    });

    api.method ('subtree', function (curr_nodes) {
	var subtree = base.tree.subtree(curr_nodes);
	curr.data = subtree.data();
	curr.tree = subtree;

	return this;
    });

    api.method ('focus_node', function (node) {
	// find 
	var found_node = t.root().find_node(function (n) {
	    return node.id() === n.id();
	});
	focused_node = found_node;
	t.subtree(found_node.get_all_leaves());

	return this;
    });

    api.method ('has_focus', function (node) {
	return ((focused_node !== undefined) && (focused_node.id() === node.id()));
    });

    api.method ('release_focus', function () {
	t.data (base.data);
	focused_node = undefined;
	return this;
    });

    return t;
};

module.exports = exports = tree;

},{"tnt.api":11,"tnt.tree.node":13}],25:[function(require,module,exports){
var tnt_tree = require("tnt.tree");
var tnt_tooltip = require("tnt.tooltip");

var geneAssociationsTree = function () {
    "use strict";

    var config = {
	data : undefined,
	diameter : 1000,
	cttvApi : undefined
    };
    
    var scale = d3.scale.quantize()
	.domain([-3,3])
	.range(["#b2182b", "#ef8a62", "#fddbc7", "#f7f7f7", "#d1e5f0", "#67a9cf", "#2166ac"]);

    function lookDatasource (arr, dsName) {
	for (var i=0; i<arr.length; i++) {
	    var ds = arr[i];
	    if (ds.datatype === dsName) {
		return {
		    "count": ds.evidence_count,
		    "score": ds.association_score
		};
	    }
	}
	return {
	    "count": 0,
	    "score": 0
	};
    }
    

    function render (flowerView, div) {
	var data = config.data;
	var treeVis = tnt_tree();
    
	// tooltips
	var nodeTooltip = function (node) {
	    var obj = {};
	    var score = node.property("association_score");
	    obj.header = node.property("label") + " (Association score: " + score + ")";
	    var loc = "#/gene-disease?t=" + config.target + "&d=" + node.property("efo_code");
	    //obj.body="<div></div><a href=" + loc + ">View evidence details</a><br/><a href=''>Zoom on node</a>";
	    obj.rows = [];
	    obj.rows.push({
		value : "<div></div>"
	    });
	    obj.rows.push({
		value: "<a href=" + loc + ">View evidence details</a>"
	    });
	    obj.rows.push({
		value : node.is_collapsed() ? "Uncollapse children" : "Collapse children",
		link : function (n) {
		    n.toggle();
		    treeVis.update();
		},
		obj: node
	    });

	    if (treeVis.has_focus(node)) {
		obj.rows.push({
		    value : "Release focus",
		    link : function (n) {
			treeVis.release_focus(n)
			    .update();
		    },
		    obj : node
		});
	    } else {
		obj.rows.push({
		    value:"Set focus on node",
		    link : function (n) {
			treeVis.focus_node(n)
			    .update();
		    },
		    obj: node
		});
	    }

	    var t = tnt_tooltip.list()
		.id(1)
		.width(180);
	    // Hijack tooltip's fill callback
	    var origFill = t.fill();

	    // Pass a new fill callback that calls the original one and decorates with flowers
	    t.fill (function (data) {
		origFill.call(this, data);
		var datatypes = node.property("datatypes");
		var flowerData = [
		    {"value":lookDatasource(datatypes, "genetic_association").score,  "label":"Genetics"},
		    {"value":lookDatasource(datatypes, "somatic_mutation").score,  "label":"Somatic"},
		    {"value":lookDatasource(datatypes, "known_drug").score,  "label":"Drugs"},
		    {"value":lookDatasource(datatypes, "rna_expression").score,  "label":"RNA"},
		    {"value":lookDatasource(datatypes, "affected_pathway").score,  "label":"Pathways"},
		    {"value":lookDatasource(datatypes, "animal_model").score,  "label":"Models"}
		]
		flowerView
		    .diagonal(150)
		    .values(flowerData)(this.select("div").node());
	    });

	    t.call(this, obj);
	}

	treeVis
	    .data(config.data)
	    .node_display(tnt_tree.node_display.circle()
	    		  .size(8)
	    		  .fill(function (node) {
	    		      return scale(node.property("association_score"));
	    		  })
	    		 )
	    .on_click(nodeTooltip)
	    .label(tnt_tree.label.text()
	    	   .text(function (node) {
	    	       if (node.is_leaf()) {
	    		   var diseaseName = node.property("label");
	    		   if (diseaseName.length > 30) {
	    		       diseaseName = diseaseName.substring(0,30) + "...";
	    		   }
	    		   return diseaseName
	    	       }
	    	       return "";
	    	   })
	    	   .fontsize(14)
	    	  )
	    .layout(tnt_tree.layout.radial()
	    	    .width(config.diameter)
	    	    .scale(false)
	    	   );

	treeVis(div.node());
	d3.selectAll(".tnt_tree_node")
	    .append("title")
	    .text(function (d) {
		return d.label;
	    });

    }
    
    // deps: tree_vis, flower
    var theme = function (flowerView, div) {
	var vis = d3.select(div)
	    .append("div")
	    .style("position", "relative");

	if ((config.data === undefined) && (config.target !== undefined) && (config.cttvApi !== undefined)) {
	    var api = config.cttvApi;
	    var url = api.url.associations({
		gene : config.target,
		datastructure : "tree"
	    });
	    api.call(url)
		.then (function (resp) {
		    config.data = resp.body.data;
		    render(flowerView, vis);
		});
	} else {
	    render(flowerView, vis);
	}
    };

    // size of the tree
    theme.diameter = function (d) {
	if (!arguments.length) {
	    return config.diameter;
	}
	config.diameter = d;
	return this;
    }
    
    //
    theme.target = function (t) {
	if (!arguments.length) {
	    return config.target;
	}
	config.target = t;
	return this;
    };

    theme.cttvApi = function (api) {
	if (!arguments.length) {
	    return config.cttvApi;
	}
	config.cttvApi = api;
	return this;
    };
    
    // data is object
    theme.data = function (d) {
	if (!arguments.length) {
	    return config.data;
	}
	config.data = d;
	return this;
    };

    return theme;
};

module.exports = exports = geneAssociationsTree;

},{"tnt.tooltip":3,"tnt.tree":7}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy93ZWJhcHAvY29tcG9uZW50cy9nZW5lQXNzb2NpYXRpb25zVHJlZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3Mvd2ViYXBwL2NvbXBvbmVudHMvZ2VuZUFzc29jaWF0aW9uc1RyZWUvZmFrZV85ZWYyNGFiYy5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy93ZWJhcHAvY29tcG9uZW50cy9nZW5lQXNzb2NpYXRpb25zVHJlZS9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy93ZWJhcHAvY29tcG9uZW50cy9nZW5lQXNzb2NpYXRpb25zVHJlZS9ub2RlX21vZHVsZXMvdG50LnRvb2x0aXAvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3Mvd2ViYXBwL2NvbXBvbmVudHMvZ2VuZUFzc29jaWF0aW9uc1RyZWUvbm9kZV9tb2R1bGVzL3RudC50b29sdGlwL25vZGVfbW9kdWxlcy90bnQuYXBpL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3dlYmFwcC9jb21wb25lbnRzL2dlbmVBc3NvY2lhdGlvbnNUcmVlL25vZGVfbW9kdWxlcy90bnQudG9vbHRpcC9ub2RlX21vZHVsZXMvdG50LmFwaS9zcmMvYXBpLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3dlYmFwcC9jb21wb25lbnRzL2dlbmVBc3NvY2lhdGlvbnNUcmVlL25vZGVfbW9kdWxlcy90bnQudG9vbHRpcC9zcmMvdG9vbHRpcC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy93ZWJhcHAvY29tcG9uZW50cy9nZW5lQXNzb2NpYXRpb25zVHJlZS9ub2RlX21vZHVsZXMvdG50LnRyZWUvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3Mvd2ViYXBwL2NvbXBvbmVudHMvZ2VuZUFzc29jaWF0aW9uc1RyZWUvbm9kZV9tb2R1bGVzL3RudC50cmVlL25vZGVfbW9kdWxlcy9iaW9qcy1ldmVudHMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3Mvd2ViYXBwL2NvbXBvbmVudHMvZ2VuZUFzc29jaWF0aW9uc1RyZWUvbm9kZV9tb2R1bGVzL3RudC50cmVlL25vZGVfbW9kdWxlcy9iaW9qcy1ldmVudHMvbm9kZV9tb2R1bGVzL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3dlYmFwcC9jb21wb25lbnRzL2dlbmVBc3NvY2lhdGlvbnNUcmVlL25vZGVfbW9kdWxlcy90bnQudHJlZS9ub2RlX21vZHVsZXMvYmlvanMtZXZlbnRzL25vZGVfbW9kdWxlcy9iYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZS9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy93ZWJhcHAvY29tcG9uZW50cy9nZW5lQXNzb2NpYXRpb25zVHJlZS9ub2RlX21vZHVsZXMvdG50LnRyZWUvbm9kZV9tb2R1bGVzL3RudC50cmVlLm5vZGUvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3Mvd2ViYXBwL2NvbXBvbmVudHMvZ2VuZUFzc29jaWF0aW9uc1RyZWUvbm9kZV9tb2R1bGVzL3RudC50cmVlL25vZGVfbW9kdWxlcy90bnQudHJlZS5ub2RlL25vZGVfbW9kdWxlcy90bnQudXRpbHMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3Mvd2ViYXBwL2NvbXBvbmVudHMvZ2VuZUFzc29jaWF0aW9uc1RyZWUvbm9kZV9tb2R1bGVzL3RudC50cmVlL25vZGVfbW9kdWxlcy90bnQudHJlZS5ub2RlL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3dlYmFwcC9jb21wb25lbnRzL2dlbmVBc3NvY2lhdGlvbnNUcmVlL25vZGVfbW9kdWxlcy90bnQudHJlZS9ub2RlX21vZHVsZXMvdG50LnRyZWUubm9kZS9ub2RlX21vZHVsZXMvdG50LnV0aWxzL3NyYy9yZWR1Y2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3Mvd2ViYXBwL2NvbXBvbmVudHMvZ2VuZUFzc29jaWF0aW9uc1RyZWUvbm9kZV9tb2R1bGVzL3RudC50cmVlL25vZGVfbW9kdWxlcy90bnQudHJlZS5ub2RlL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL3V0aWxzLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3dlYmFwcC9jb21wb25lbnRzL2dlbmVBc3NvY2lhdGlvbnNUcmVlL25vZGVfbW9kdWxlcy90bnQudHJlZS9ub2RlX21vZHVsZXMvdG50LnRyZWUubm9kZS9zcmMvbm9kZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy93ZWJhcHAvY29tcG9uZW50cy9nZW5lQXNzb2NpYXRpb25zVHJlZS9ub2RlX21vZHVsZXMvdG50LnRyZWUvc3JjL2RpYWdvbmFsLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3dlYmFwcC9jb21wb25lbnRzL2dlbmVBc3NvY2lhdGlvbnNUcmVlL25vZGVfbW9kdWxlcy90bnQudHJlZS9zcmMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3Mvd2ViYXBwL2NvbXBvbmVudHMvZ2VuZUFzc29jaWF0aW9uc1RyZWUvbm9kZV9tb2R1bGVzL3RudC50cmVlL3NyYy9sYWJlbC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy93ZWJhcHAvY29tcG9uZW50cy9nZW5lQXNzb2NpYXRpb25zVHJlZS9ub2RlX21vZHVsZXMvdG50LnRyZWUvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy93ZWJhcHAvY29tcG9uZW50cy9nZW5lQXNzb2NpYXRpb25zVHJlZS9ub2RlX21vZHVsZXMvdG50LnRyZWUvc3JjL25vZGVfZGlzcGxheS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy93ZWJhcHAvY29tcG9uZW50cy9nZW5lQXNzb2NpYXRpb25zVHJlZS9ub2RlX21vZHVsZXMvdG50LnRyZWUvc3JjL3RyZWUuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3Mvd2ViYXBwL2NvbXBvbmVudHMvZ2VuZUFzc29jaWF0aW9uc1RyZWUvc3JjL2dlbmVBc3NvY2lhdGlvbnNUcmVlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUkE7QUFDQTs7Ozs7O0FDREE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9kQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9OQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbGFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xuIiwiLy8gaWYgKHR5cGVvZiBidWJibGVzVmlldyA9PT0gXCJ1bmRlZmluZWRcIikge1xuLy8gICAgIG1vZHVsZS5leHBvcnRzID0gYnViYmxlc1ZpZXcgPSB7fVxuLy8gfVxuLy8gYnViYmxlc1ZpZXcuYnViYmxlc1ZpZXcgPSByZXF1aXJlKFwiLi9zcmMvYnViYmxlc1ZpZXcuanNcIik7XG5tb2R1bGUuZXhwb3J0cyA9IGdlbmVBc3NvY2lhdGlvbnNUcmVlID0gcmVxdWlyZShcIi4vc3JjL2dlbmVBc3NvY2lhdGlvbnNUcmVlLmpzXCIpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB0b29sdGlwID0gcmVxdWlyZShcIi4vc3JjL3Rvb2x0aXAuanNcIik7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9hcGkuanNcIik7XG4iLCJ2YXIgYXBpID0gZnVuY3Rpb24gKHdobykge1xuXG4gICAgdmFyIF9tZXRob2RzID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgbSA9IFtdO1xuXG5cdG0uYWRkX2JhdGNoID0gZnVuY3Rpb24gKG9iaikge1xuXHQgICAgbS51bnNoaWZ0KG9iaik7XG5cdH07XG5cblx0bS51cGRhdGUgPSBmdW5jdGlvbiAobWV0aG9kLCB2YWx1ZSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG0ubGVuZ3RoOyBpKyspIHtcblx0XHRmb3IgKHZhciBwIGluIG1baV0pIHtcblx0XHQgICAgaWYgKHAgPT09IG1ldGhvZCkge1xuXHRcdFx0bVtpXVtwXSA9IHZhbHVlO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0ICAgIH1cblx0XHR9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gZmFsc2U7XG5cdH07XG5cblx0bS5hZGQgPSBmdW5jdGlvbiAobWV0aG9kLCB2YWx1ZSkge1xuXHQgICAgaWYgKG0udXBkYXRlIChtZXRob2QsIHZhbHVlKSApIHtcblx0ICAgIH0gZWxzZSB7XG5cdFx0dmFyIHJlZyA9IHt9O1xuXHRcdHJlZ1ttZXRob2RdID0gdmFsdWU7XG5cdFx0bS5hZGRfYmF0Y2ggKHJlZyk7XG5cdCAgICB9XG5cdH07XG5cblx0bS5nZXQgPSBmdW5jdGlvbiAobWV0aG9kKSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bS5sZW5ndGg7IGkrKykge1xuXHRcdGZvciAodmFyIHAgaW4gbVtpXSkge1xuXHRcdCAgICBpZiAocCA9PT0gbWV0aG9kKSB7XG5cdFx0XHRyZXR1cm4gbVtpXVtwXTtcblx0XHQgICAgfVxuXHRcdH1cblx0ICAgIH1cblx0fTtcblxuXHRyZXR1cm4gbTtcbiAgICB9O1xuXG4gICAgdmFyIG1ldGhvZHMgICAgPSBfbWV0aG9kcygpO1xuICAgIHZhciBhcGkgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIGFwaS5jaGVjayA9IGZ1bmN0aW9uIChtZXRob2QsIGNoZWNrLCBtc2cpIHtcblx0aWYgKG1ldGhvZCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bWV0aG9kLmxlbmd0aDsgaSsrKSB7XG5cdFx0YXBpLmNoZWNrKG1ldGhvZFtpXSwgY2hlY2ssIG1zZyk7XG5cdCAgICB9XG5cdCAgICByZXR1cm47XG5cdH1cblxuXHRpZiAodHlwZW9mIChtZXRob2QpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBtZXRob2QuY2hlY2soY2hlY2ssIG1zZyk7XG5cdH0gZWxzZSB7XG5cdCAgICB3aG9bbWV0aG9kXS5jaGVjayhjaGVjaywgbXNnKTtcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkudHJhbnNmb3JtID0gZnVuY3Rpb24gKG1ldGhvZCwgY2Jhaykge1xuXHRpZiAobWV0aG9kIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtZXRob2QubGVuZ3RoOyBpKyspIHtcblx0XHRhcGkudHJhbnNmb3JtIChtZXRob2RbaV0sIGNiYWspO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuO1xuXHR9XG5cblx0aWYgKHR5cGVvZiAobWV0aG9kKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgbWV0aG9kLnRyYW5zZm9ybSAoY2Jhayk7XG5cdH0gZWxzZSB7XG5cdCAgICB3aG9bbWV0aG9kXS50cmFuc2Zvcm0oY2Jhayk7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgdmFyIGF0dGFjaF9tZXRob2QgPSBmdW5jdGlvbiAobWV0aG9kLCBvcHRzKSB7XG5cdHZhciBjaGVja3MgPSBbXTtcblx0dmFyIHRyYW5zZm9ybXMgPSBbXTtcblxuXHR2YXIgZ2V0dGVyID0gb3B0cy5vbl9nZXR0ZXIgfHwgZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIG1ldGhvZHMuZ2V0KG1ldGhvZCk7XG5cdH07XG5cblx0dmFyIHNldHRlciA9IG9wdHMub25fc2V0dGVyIHx8IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhbnNmb3Jtcy5sZW5ndGg7IGkrKykge1xuXHRcdHggPSB0cmFuc2Zvcm1zW2ldKHgpO1xuXHQgICAgfVxuXG5cdCAgICBmb3IgKHZhciBqPTA7IGo8Y2hlY2tzLmxlbmd0aDsgaisrKSB7XG5cdFx0aWYgKCFjaGVja3Nbal0uY2hlY2soeCkpIHtcblx0XHQgICAgdmFyIG1zZyA9IGNoZWNrc1tqXS5tc2cgfHwgXG5cdFx0XHQoXCJWYWx1ZSBcIiArIHggKyBcIiBkb2Vzbid0IHNlZW0gdG8gYmUgdmFsaWQgZm9yIHRoaXMgbWV0aG9kXCIpO1xuXHRcdCAgICB0aHJvdyAobXNnKTtcblx0XHR9XG5cdCAgICB9XG5cdCAgICBtZXRob2RzLmFkZChtZXRob2QsIHgpO1xuXHR9O1xuXG5cdHZhciBuZXdfbWV0aG9kID0gZnVuY3Rpb24gKG5ld192YWwpIHtcblx0ICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdHJldHVybiBnZXR0ZXIoKTtcblx0ICAgIH1cblx0ICAgIHNldHRlcihuZXdfdmFsKTtcblx0ICAgIHJldHVybiB3aG87IC8vIFJldHVybiB0aGlzP1xuXHR9O1xuXHRuZXdfbWV0aG9kLmNoZWNrID0gZnVuY3Rpb24gKGNiYWssIG1zZykge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGNoZWNrcztcblx0ICAgIH1cblx0ICAgIGNoZWNrcy5wdXNoICh7Y2hlY2sgOiBjYmFrLFxuXHRcdFx0ICBtc2cgICA6IG1zZ30pO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdH07XG5cdG5ld19tZXRob2QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGNiYWspIHtcblx0ICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdHJldHVybiB0cmFuc2Zvcm1zO1xuXHQgICAgfVxuXHQgICAgdHJhbnNmb3Jtcy5wdXNoKGNiYWspO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdH07XG5cblx0d2hvW21ldGhvZF0gPSBuZXdfbWV0aG9kO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0c2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBvcHRzKSB7XG5cdGlmICh0eXBlb2YgKHBhcmFtKSA9PT0gJ29iamVjdCcpIHtcblx0ICAgIG1ldGhvZHMuYWRkX2JhdGNoIChwYXJhbSk7XG5cdCAgICBmb3IgKHZhciBwIGluIHBhcmFtKSB7XG5cdFx0YXR0YWNoX21ldGhvZCAocCwgb3B0cyk7XG5cdCAgICB9XG5cdH0gZWxzZSB7XG5cdCAgICBtZXRob2RzLmFkZCAocGFyYW0sIG9wdHMuZGVmYXVsdF92YWx1ZSk7XG5cdCAgICBhdHRhY2hfbWV0aG9kIChwYXJhbSwgb3B0cyk7XG5cdH1cbiAgICB9O1xuXG4gICAgYXBpLmdldHNldCA9IGZ1bmN0aW9uIChwYXJhbSwgZGVmKSB7XG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWZ9KTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkuZ2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0dmFyIG9uX3NldHRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRocm93IChcIk1ldGhvZCBkZWZpbmVkIG9ubHkgYXMgYSBnZXR0ZXIgKHlvdSBhcmUgdHJ5aW5nIHRvIHVzZSBpdCBhcyBhIHNldHRlclwiKTtcblx0fTtcblxuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmLFxuXHRcdCAgICAgICBvbl9zZXR0ZXIgOiBvbl9zZXR0ZXJ9XG5cdCAgICAgICk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLnNldCA9IGZ1bmN0aW9uIChwYXJhbSwgZGVmKSB7XG5cdHZhciBvbl9nZXR0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aHJvdyAoXCJNZXRob2QgZGVmaW5lZCBvbmx5IGFzIGEgc2V0dGVyICh5b3UgYXJlIHRyeWluZyB0byB1c2UgaXQgYXMgYSBnZXR0ZXJcIik7XG5cdH07XG5cblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZixcblx0XHQgICAgICAgb25fZ2V0dGVyIDogb25fZ2V0dGVyfVxuXHQgICAgICApO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5tZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgY2Jhaykge1xuXHRpZiAodHlwZW9mIChuYW1lKSA9PT0gJ29iamVjdCcpIHtcblx0ICAgIGZvciAodmFyIHAgaW4gbmFtZSkge1xuXHRcdHdob1twXSA9IG5hbWVbcF07XG5cdCAgICB9XG5cdH0gZWxzZSB7XG5cdCAgICB3aG9bbmFtZV0gPSBjYmFrO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIHJldHVybiBhcGk7XG4gICAgXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBhcGk7IiwidmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG5cbnZhciB0b29sdGlwID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKCk7XG4gICAgdmFyIHRvb2x0aXBfZGl2O1xuXG4gICAgdmFyIGNvbmYgPSB7XG5cdGJhY2tncm91bmRfY29sb3IgOiBcIndoaXRlXCIsXG5cdGZvcmVncm91bmRfY29sb3IgOiBcImJsYWNrXCIsXG5cdHBvc2l0aW9uIDogXCJyaWdodFwiLFxuXHRhbGxvd19kcmFnIDogdHJ1ZSxcblx0c2hvd19jbG9zZXIgOiB0cnVlLFxuXHRmaWxsIDogZnVuY3Rpb24gKCkgeyB0aHJvdyBcImZpbGwgaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2Ugb2JqZWN0XCI7IH0sXG5cdHdpZHRoIDogMTgwLFxuXHRpZCA6IDFcbiAgICB9O1xuXG4gICAgdmFyIHQgPSBmdW5jdGlvbiAoZGF0YSwgZXZlbnQpIHtcblx0ZHJhZ1xuXHQgICAgLm9yaWdpbihmdW5jdGlvbigpe1xuXHRcdHJldHVybiB7eDpwYXJzZUludChkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJsZWZ0XCIpKSxcblx0XHRcdHk6cGFyc2VJbnQoZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwidG9wXCIpKVxuXHRcdCAgICAgICB9O1xuXHQgICAgfSlcblx0ICAgIC5vbihcImRyYWdcIiwgZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGNvbmYuYWxsb3dfZHJhZykge1xuXHRcdCAgICBkMy5zZWxlY3QodGhpcylcblx0XHRcdC5zdHlsZShcImxlZnRcIiwgZDMuZXZlbnQueCArIFwicHhcIilcblx0XHRcdC5zdHlsZShcInRvcFwiLCBkMy5ldmVudC55ICsgXCJweFwiKTtcblx0XHR9XG5cdCAgICB9KTtcblxuXHQvLyBUT0RPOiBXaHkgZG8gd2UgbmVlZCB0aGUgZGl2IGVsZW1lbnQ/XG5cdC8vIEl0IGxvb2tzIGxpa2UgaWYgd2UgYW5jaG9yIHRoZSB0b29sdGlwIGluIHRoZSBcImJvZHlcIlxuXHQvLyBUaGUgdG9vbHRpcCBpcyBub3QgbG9jYXRlZCBpbiB0aGUgcmlnaHQgcGxhY2UgKGFwcGVhcnMgYXQgdGhlIGJvdHRvbSlcblx0Ly8gU2VlIGNsaWVudHMvdG9vbHRpcHNfdGVzdC5odG1sIGZvciBhbiBleGFtcGxlXG5cdHZhciBjb250YWluZXJFbGVtID0gc2VsZWN0QW5jZXN0b3IgKHRoaXMsIFwiZGl2XCIpO1xuXHRpZiAoY29udGFpbmVyRWxlbSA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICAvLyBXZSByZXF1aXJlIGEgZGl2IGVsZW1lbnQgYXQgc29tZSBwb2ludCB0byBhbmNob3IgdGhlIHRvb2x0aXBcblx0ICAgIHJldHVybjtcblx0fVxuXG5cdC8vIENvbnRhaW5lciBlbGVtZW50IHBvc2l0aW9uIChuZWVkZWQgZm9yIFwicmVsYXRpdmVcIiBwb3NpdGlvbmVkIHBhcmVudHMpXG5cdC8vIGllIGhhcyBzY3JvbGxUb3AgYW5kIHNjcm9sbExlZnQgb24gZG9jdW1lbnRFbGVtZW50IGluc3RlYWQgb2YgYm9keVxuXHQvLyB2YXIgc2Nyb2xsVG9wID0gKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wKSB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcDtcblx0Ly8gdmFyIHNjcm9sbExlZnQgPSAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0KSB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQ7XG5cdC8vIHZhciBlbGVtUG9zID0gY29udGFpbmVyRWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0Ly8gdmFyIGVsZW1Ub3AgPSBlbGVtUG9zLnRvcCArIHNjcm9sbFRvcDtcblx0Ly8gdmFyIGVsZW1MZWZ0ID0gZWxlbVBvcy5sZWZ0ICsgc2Nyb2xsTGVmdDtcblx0XG5cdHRvb2x0aXBfZGl2ID0gZDMuc2VsZWN0KGNvbnRhaW5lckVsZW0pXG5cdCAgICAuYXBwZW5kKFwiZGl2XCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3Rvb2x0aXBcIilcblx0ICAgIC5jbGFzc2VkKFwidG50X3Rvb2x0aXBfYWN0aXZlXCIsIHRydWUpICAvLyBUT0RPOiBJcyB0aGlzIG5lZWRlZC91c2VkPz8/XG5cdCAgICAuY2FsbChkcmFnKTtcblxuXHQvLyBwcmV2IHRvb2x0aXBzIHdpdGggdGhlIHNhbWUgaGVhZGVyXG5cdGQzLnNlbGVjdChcIiN0bnRfdG9vbHRpcF9cIiArIGNvbmYuaWQpLnJlbW92ZSgpO1xuXG5cdGlmICgoZDMuZXZlbnQgPT09IG51bGwpICYmIChldmVudCkpIHtcblx0ICAgIGQzLmV2ZW50ID0gZXZlbnQ7XG5cdH1cblx0dmFyIGQzbW91c2UgPSBkMy5tb3VzZShjb250YWluZXJFbGVtKTtcblx0Ly8gdmFyIG1vdXNlID0gW2QzLmV2ZW50LnBhZ2VYLCBkMy5ldmVudC5wYWdlWV07XG5cdGQzLmV2ZW50ID0gbnVsbDtcblxuXHR2YXIgb2Zmc2V0ID0gMDtcblx0aWYgKGNvbmYucG9zaXRpb24gPT09IFwibGVmdFwiKSB7XG5cdCAgICBvZmZzZXQgPSBjb25mLndpZHRoO1xuXHR9XG5cdFxuXHR0b29sdGlwX2Rpdi5hdHRyKFwiaWRcIiwgXCJ0bnRfdG9vbHRpcF9cIiArIGNvbmYuaWQpO1xuXHRcblx0Ly8gV2UgcGxhY2UgdGhlIHRvb2x0aXBcblx0dG9vbHRpcF9kaXZcblx0Ly8gLnN0eWxlKFwibGVmdFwiLCAobW91c2VbMF0gLSBvZmZzZXQgLSBlbGVtTGVmdCkgKyBcInB4XCIpXG5cdC8vIC5zdHlsZShcInRvcFwiLCBtb3VzZVsxXSAtIGVsZW1Ub3AgKyBcInB4XCIpO1xuXHQgICAgLnN0eWxlKFwibGVmdFwiLCAoZDNtb3VzZVswXSkgKyBcInB4XCIpXG5cdCAgICAuc3R5bGUoXCJ0b3BcIiwgKGQzbW91c2VbMV0pICsgXCJweFwiKTtcblxuXHQvLyBDbG9zZVxuXHRpZiAoY29uZi5zaG93X2Nsb3Nlcikge1xuXHQgICAgdG9vbHRpcF9kaXYuYXBwZW5kKFwic3BhblwiKVxuXHRcdC5zdHlsZShcInBvc2l0aW9uXCIsIFwiYWJzb2x1dGVcIilcblx0XHQuc3R5bGUoXCJyaWdodFwiLCBcIi0xMHB4XCIpXG5cdFx0LnN0eWxlKFwidG9wXCIsIFwiLTEwcHhcIilcblx0XHQuYXBwZW5kKFwiaW1nXCIpXG5cdFx0LmF0dHIoXCJzcmNcIiwgdG9vbHRpcC5pbWFnZXMuY2xvc2UpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBcIjIwcHhcIilcblx0XHQuYXR0cihcImhlaWdodFwiLCBcIjIwcHhcIilcblx0XHQub24oXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XG5cdFx0ICAgIHQuY2xvc2UoKTtcblx0XHR9KTtcblx0fVxuXG5cdGNvbmYuZmlsbC5jYWxsKHRvb2x0aXBfZGl2LCBkYXRhKTtcblxuXHQvLyByZXR1cm4gdGhpcyBoZXJlP1xuXHRyZXR1cm4gdDtcbiAgICB9O1xuXG4gICAgLy8gZ2V0cyB0aGUgZmlyc3QgYW5jZXN0b3Igb2YgZWxlbSBoYXZpbmcgdGFnbmFtZSBcInR5cGVcIlxuICAgIC8vIGV4YW1wbGUgOiB2YXIgbXlkaXYgPSBzZWxlY3RBbmNlc3RvcihteWVsZW0sIFwiZGl2XCIpO1xuICAgIGZ1bmN0aW9uIHNlbGVjdEFuY2VzdG9yIChlbGVtLCB0eXBlKSB7XG5cdHR5cGUgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XG5cdGlmIChlbGVtLnBhcmVudE5vZGUgPT09IG51bGwpIHtcblx0ICAgIGNvbnNvbGUubG9nKFwiTm8gbW9yZSBwYXJlbnRzXCIpO1xuXHQgICAgcmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXHR2YXIgdGFnTmFtZSA9IGVsZW0ucGFyZW50Tm9kZS50YWdOYW1lO1xuXG5cdGlmICgodGFnTmFtZSAhPT0gdW5kZWZpbmVkKSAmJiAodGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSB0eXBlKSkge1xuXHQgICAgcmV0dXJuIGVsZW0ucGFyZW50Tm9kZTtcblx0fSBlbHNlIHtcblx0ICAgIHJldHVybiBzZWxlY3RBbmNlc3RvciAoZWxlbS5wYXJlbnROb2RlLCB0eXBlKTtcblx0fVxuICAgIH1cbiAgICBcbiAgICB2YXIgYXBpID0gYXBpanModClcblx0LmdldHNldChjb25mKTtcbiAgICBhcGkuY2hlY2soJ3Bvc2l0aW9uJywgZnVuY3Rpb24gKHZhbCkge1xuXHRyZXR1cm4gKHZhbCA9PT0gJ2xlZnQnKSB8fCAodmFsID09PSAncmlnaHQnKTtcbiAgICB9LCBcIk9ubHkgJ2xlZnQnIG9yICdyaWdodCcgdmFsdWVzIGFyZSBhbGxvd2VkIGZvciBwb3NpdGlvblwiKTtcblxuICAgIGFwaS5tZXRob2QoJ2Nsb3NlJywgZnVuY3Rpb24gKCkge1xuXHR0b29sdGlwX2Rpdi5yZW1vdmUoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0O1xufTtcblxudG9vbHRpcC5saXN0ID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGxpc3QgdG9vbHRpcCBpcyBiYXNlZCBvbiBnZW5lcmFsIHRvb2x0aXBzXG4gICAgdmFyIHQgPSB0b29sdGlwKCk7XG4gICAgdmFyIHdpZHRoID0gMTgwO1xuXG4gICAgdC5maWxsIChmdW5jdGlvbiAob2JqKSB7XG5cdHZhciB0b29sdGlwX2RpdiA9IHRoaXM7XG5cdHZhciBvYmpfaW5mb19saXN0ID0gdG9vbHRpcF9kaXZcblx0ICAgIC5hcHBlbmQoXCJ0YWJsZVwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudVwiKVxuXHQgICAgLmF0dHIoXCJib3JkZXJcIiwgXCJzb2xpZFwiKVxuXHQgICAgLnN0eWxlKFwid2lkdGhcIiwgdC53aWR0aCgpICsgXCJweFwiKTtcblxuXHQvLyBUb29sdGlwIGhlYWRlclxuXHRvYmpfaW5mb19saXN0XG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfaGVhZGVyXCIpXG5cdCAgICAuYXBwZW5kKFwidGhcIilcblx0ICAgIC50ZXh0KG9iai5oZWFkZXIpO1xuXG5cdC8vIFRvb2x0aXAgcm93c1xuXHR2YXIgdGFibGVfcm93cyA9IG9ial9pbmZvX2xpc3Quc2VsZWN0QWxsKFwiLnRudF96bWVudV9yb3dcIilcblx0ICAgIC5kYXRhKG9iai5yb3dzKVxuXHQgICAgLmVudGVyKClcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9yb3dcIik7XG5cblx0dGFibGVfcm93c1xuXHQgICAgLmFwcGVuZChcInRkXCIpXG5cdCAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsIFwiY2VudGVyXCIpXG5cdCAgICAuaHRtbChmdW5jdGlvbihkLGkpIHtcblx0XHRyZXR1cm4gb2JqLnJvd3NbaV0udmFsdWU7XG5cdCAgICB9KVxuXHQgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcblx0XHRpZiAoZC5saW5rID09PSB1bmRlZmluZWQpIHtcblx0XHQgICAgcmV0dXJuO1xuXHRcdH1cblx0XHRkMy5zZWxlY3QodGhpcylcblx0XHQgICAgLmNsYXNzZWQoXCJsaW5rXCIsIDEpXG5cdFx0ICAgIC5vbignY2xpY2snLCBmdW5jdGlvbiAoZCkge1xuXHRcdFx0ZC5saW5rKGQub2JqKTtcblx0XHRcdHQuY2xvc2UuY2FsbCh0aGlzKTtcblx0XHQgICAgfSk7XG5cdCAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gdDtcbn07XG5cbnRvb2x0aXAudGFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gdGFibGUgdG9vbHRpcHMgYXJlIGJhc2VkIG9uIGdlbmVyYWwgdG9vbHRpcHNcbiAgICB2YXIgdCA9IHRvb2x0aXAoKTtcbiAgICBcbiAgICB2YXIgd2lkdGggPSAxODA7XG5cbiAgICB0LmZpbGwgKGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIHRvb2x0aXBfZGl2ID0gdGhpcztcblxuXHR2YXIgb2JqX2luZm9fdGFibGUgPSB0b29sdGlwX2RpdlxuXHQgICAgLmFwcGVuZChcInRhYmxlXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51XCIpXG5cdCAgICAuYXR0cihcImJvcmRlclwiLCBcInNvbGlkXCIpXG5cdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCB0LndpZHRoKCkgKyBcInB4XCIpO1xuXG5cdC8vIFRvb2x0aXAgaGVhZGVyXG5cdG9ial9pbmZvX3RhYmxlXG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfaGVhZGVyXCIpXG5cdCAgICAuYXBwZW5kKFwidGhcIilcblx0ICAgIC5hdHRyKFwiY29sc3BhblwiLCAyKVxuXHQgICAgLnRleHQob2JqLmhlYWRlcik7XG5cblx0Ly8gVG9vbHRpcCByb3dzXG5cdHZhciB0YWJsZV9yb3dzID0gb2JqX2luZm9fdGFibGUuc2VsZWN0QWxsKFwiLnRudF96bWVudV9yb3dcIilcblx0ICAgIC5kYXRhKG9iai5yb3dzKVxuXHQgICAgLmVudGVyKClcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9yb3dcIik7XG5cblx0dGFibGVfcm93c1xuXHQgICAgLmFwcGVuZChcInRoXCIpXG5cdCAgICAuaHRtbChmdW5jdGlvbihkLGkpIHtcblx0XHRyZXR1cm4gb2JqLnJvd3NbaV0ubGFiZWw7XG5cdCAgICB9KTtcblxuXHR0YWJsZV9yb3dzXG5cdCAgICAuYXBwZW5kKFwidGRcIilcblx0ICAgIC5odG1sKGZ1bmN0aW9uKGQsaSkge1xuXHRcdGlmICh0eXBlb2Ygb2JqLnJvd3NbaV0udmFsdWUgPT09ICdmdW5jdGlvbicpIHtcblx0XHQgICAgb2JqLnJvd3NbaV0udmFsdWUuY2FsbCh0aGlzLCBkKTtcblx0XHR9IGVsc2Uge1xuXHRcdCAgICByZXR1cm4gb2JqLnJvd3NbaV0udmFsdWU7XG5cdFx0fVxuXHQgICAgfSlcblx0ICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGQubGluayA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0ICAgIHJldHVybjtcblx0XHR9XG5cdFx0ZDMuc2VsZWN0KHRoaXMpXG5cdFx0ICAgIC5jbGFzc2VkKFwibGlua1wiLCAxKVxuXHRcdCAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24gKGQpIHtcblx0XHRcdGQubGluayhkLm9iaik7XG5cdFx0XHR0LmNsb3NlLmNhbGwodGhpcyk7XG5cdFx0ICAgIH0pO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdDtcbn07XG5cbnRvb2x0aXAucGxhaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gcGxhaW4gdG9vbHRpcHMgYXJlIGJhc2VkIG9uIGdlbmVyYWwgdG9vbHRpcHNcbiAgICB2YXIgdCA9IHRvb2x0aXAoKTtcblxuICAgIHQuZmlsbCAoZnVuY3Rpb24gKG9iaikge1xuXHR2YXIgdG9vbHRpcF9kaXYgPSB0aGlzO1xuXG5cdHZhciBvYmpfaW5mb190YWJsZSA9IHRvb2x0aXBfZGl2XG5cdCAgICAuYXBwZW5kKFwidGFibGVcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVcIilcblx0ICAgIC5hdHRyKFwiYm9yZGVyXCIsIFwic29saWRcIilcblx0ICAgIC5zdHlsZShcIndpZHRoXCIsIHQud2lkdGgoKSArIFwicHhcIik7XG5cblx0b2JqX2luZm9fdGFibGVcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9oZWFkZXJcIilcblx0ICAgIC5hcHBlbmQoXCJ0aFwiKVxuXHQgICAgLnRleHQob2JqLmhlYWRlcik7XG5cblx0b2JqX2luZm9fdGFibGVcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9yb3dcIilcblx0ICAgIC5hcHBlbmQoXCJ0ZFwiKVxuXHQgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLCBcImNlbnRlclwiKVxuXHQgICAgLmh0bWwob2JqLmJvZHkpO1xuXG4gICAgfSk7XG5cbiAgICByZXR1cm4gdDtcbn07XG5cbi8vIFRPRE86IFRoaXMgc2hvdWxkbid0IGJlIGV4cG9zZWQgaW4gdGhlIEFQSS4gSXQgd291bGQgYmUgYmV0dGVyIHRvIGhhdmUgYXMgYSBsb2NhbCB2YXJpYWJsZVxuLy8gb3IgYWx0ZXJuYXRpdmVseSBoYXZlIHRoZSBpbWFnZXMgc29tZXdoZXJlIGVsc2UgKGFsdGhvdWdoIHRoZSBudW1iZXIgb2YgaGFyZGNvZGVkIGltYWdlcyBzaG91bGQgYmUgbGVmdCBhdCBhIG1pbmltdW0pXG50b29sdGlwLmltYWdlcyA9IHt9O1xudG9vbHRpcC5pbWFnZXMuY2xvc2UgPSAnZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFRQUFBQUVBQ0FZQUFBQmNjcWhtQUFBS1EybERRMUJKUTBNZ2NISnZabWxzWlFBQWVOcWRVM2RZay9jV1B0LzNaUTlXUXRqd3NaZHNnUUFpSTZ3SXlCQlpvaENTQUdHRUVCSkF4WVdJQ2xZVUZSR2NTRlhFZ3RVS1NKMkk0cUFvdUdkQmlvaGFpMVZjT080ZjNLZTFmWHJ2N2UzNzEvdTg1NXpuL001NXp3K0FFUklta2VhaWFnQTVVb1U4T3RnZmowOUl4TW05Z0FJVlNPQUVJQkRteThKbkJjVUFBUEFEZVhoK2RMQS8vQUd2YndBQ0FIRFZMaVFTeCtIL2c3cFFKbGNBSUpFQTRDSVM1d3NCa0ZJQXlDNVV5QlFBeUJnQXNGT3paQW9BbEFBQWJIbDhRaUlBcWcwQTdQUkpQZ1VBMkttVDNCY0EyS0ljcVFnQWpRRUFtU2hISkFKQXV3QmdWWUZTTEFMQXdnQ2dyRUFpTGdUQXJnR0FXYll5UndLQXZRVUFkbzVZa0E5QVlBQ0FtVUlzekFBZ09BSUFReDRUelFNZ1RBT2dNTksvNEtsZmNJVzRTQUVBd011VnpaZEwwak1VdUpYUUduZnk4T0RpSWVMQ2JMRkNZUmNwRUdZSjVDS2NsNXNqRTBqbkEwek9EQUFBR3ZuUndmNDRQNURuNXVUaDVtYm5iTy8weGFMK2EvQnZJajRoOGQvK3ZJd0NCQUFRVHMvdjJsL2w1ZFlEY01jQnNIVy9hNmxiQU5wV0FHamYrVjB6MndtZ1dnclFldm1MZVRqOFFCNmVvVkRJUEIwY0Nnc0w3U1Zpb2IwdzQ0cysvelBoYitDTGZ2YjhRQjcrMjNyd0FIR2FRSm10d0tPRC9YRmhibmF1VW83bnl3UkNNVzczNXlQK3g0Vi8vWTRwMGVJMHNWd3NGWXJ4V0ltNFVDSk54M201VXBGRUljbVY0aExwZnpMeEg1YjlDWk4zRFFDc2hrL0FUcllIdGN0c3dIN3VBUUtMRGxqU2RnQkFmdk10akJvTGtRQVFaelF5ZWZjQUFKTy8rWTlBS3dFQXpaZWs0d0FBdk9nWVhLaVVGMHpHQ0FBQVJLQ0JLckJCQnd6QkZLekFEcHpCSGJ6QUZ3SmhCa1JBRENUQVBCQkNCdVNBSEFxaEdKWkJHVlRBT3RnRXRiQURHcUFSbXVFUXRNRXhPQTNuNEJKY2dldHdGd1pnR0o3Q0dMeUdDUVJCeUFnVFlTRTZpQkZpanRnaXpnZ1htWTRFSW1GSU5KS0FwQ0RwaUJSUklzWEljcVFDcVVKcWtWMUlJL0l0Y2hRNWpWeEErcERieUNBeWl2eUt2RWN4bElHeVVRUFVBblZBdWFnZkdvckdvSFBSZERRUFhZQ1dvbXZSR3JRZVBZQzJvcWZSUytoMWRBQjlpbzVqZ05FeERtYU0yV0ZjaklkRllJbFlHaWJIRm1QbFdEVldqelZqSFZnM2RoVWJ3SjVoN3dna0FvdUFFK3dJWG9RUXdteUNrSkJIV0V4WVE2Z2w3Q08wRXJvSVZ3bURoREhDSnlLVHFFKzBKWG9TK2NSNFlqcXhrRmhHckNidUlSNGhuaVZlSnc0VFg1TklKQTdKa3VST0NpRWxrREpKQzBsclNOdElMYVJUcEQ3U0VHbWNUQ2Jya0czSjN1UUlzb0NzSUplUnQ1QVBrRStTKzhuRDVMY1VPc1dJNGt3Sm9pUlNwSlFTU2pWbFArVUVwWjh5UXBtZ3FsSE5xWjdVQ0txSU9wOWFTVzJnZGxBdlU0ZXBFelIxbWlYTm14WkR5NlF0bzlYUW1tbG5hZmRvTCtsMHVnbmRneDVGbDlDWDBtdm9CK25uNllQMGR3d05oZzJEeDBoaUtCbHJHWHNacHhpM0dTK1pUS1lGMDVlWnlGUXcxeklibVdlWUQ1aHZWVmdxOWlwOEZaSEtFcFU2bFZhVmZwWG5xbFJWYzFVLzFYbXFDMVNyVlErclhsWjlwa1pWczFEanFRblVGcXZWcVIxVnU2azJyczVTZDFLUFVNOVJYNk8rWC8yQyttTU5zb2FGUnFDR1NLTlVZN2ZHR1kwaEZzWXlaZkZZUXRaeVZnUHJMR3VZVFdKYnN2bnNUSFlGK3h0MkwzdE1VME56cW1hc1pwRm1uZVp4elFFT3hySGc4RG5abkVyT0ljNE56bnN0QXkwL0xiSFdhcTFtclg2dE45cDYycjdhWXUxeTdSYnQ2OXJ2ZFhDZFFKMHNuZlU2YlRyM2RRbTZOcnBSdW9XNjIzWFA2ajdUWSt0NTZRbjF5dlVPNmQzUlIvVnQ5S1AxRitydjF1L1JIemN3TkFnMmtCbHNNVGhqOE15UVkraHJtR200MGZDRTRhZ1J5Mmk2a2NSb285RkpveWU0SnU2SForTTFlQmMrWnF4dkhHS3NOTjVsM0dzOFlXSnBNdHVreEtURjVMNHB6WlJybW1hNjBiVFRkTXpNeUN6Y3JOaXN5ZXlPT2RXY2E1NWh2dG04Mi95TmhhVkZuTVZLaXphTHg1YmFsbnpMQlpaTmx2ZXNtRlkrVm5sVzlWYlhyRW5XWE9zczYyM1dWMnhRRzFlYkRKczZtOHUycUsyYnJjUjJtMjNmRk9JVWp5blNLZlZUYnRveDdQenNDdXlhN0FidE9mWmg5aVgyYmZiUEhjd2NFaDNXTzNRN2ZISjBkY3gyYkhDODY2VGhOTU9weEtuRDZWZG5HMmVoYzUzek5SZW1TNURMRXBkMmx4ZFRiYWVLcDI2ZmVzdVY1UnJ1dXRLMTAvV2ptN3ViM0szWmJkVGR6RDNGZmF2N1RTNmJHOGxkd3ozdlFmVHc5MWppY2N6am5hZWJwOEx6a09jdlhuWmVXVjc3dlI1UHM1d21udFl3YmNqYnhGdmd2Y3Q3WURvK1BXWDZ6dWtEUHNZK0FwOTZuNGUrcHI0aTN6MitJMzdXZnBsK0IveWUrenY2eS8yUCtML2hlZklXOFU0RllBSEJBZVVCdllFYWdiTURhd01mQkprRXBRYzFCWTBGdXdZdkRENFZRZ3dKRFZrZmNwTnZ3QmZ5Ry9sak05eG5MSnJSRmNvSW5SVmFHL293ekNaTUh0WVJqb2JQQ044UWZtK20rVXpwekxZSWlPQkhiSWk0SDJrWm1SZjVmUlFwS2pLcUx1cFJ0Rk4wY1hUM0xOYXM1Rm43WjcyTzhZK3BqTGs3MjJxMmNuWm5yR3BzVW14ajdKdTRnTGlxdUlGNGgvaEY4WmNTZEJNa0NlMko1TVRZeEQySjQzTUM1MnlhTTV6a21sU1dkR091NWR5aXVSZm02YzdMbm5jOFdUVlprSHc0aFpnU2w3SS81WU1nUWxBdkdFL2xwMjVOSFJQeWhKdUZUMFcrb28yaVViRzN1RW84a3VhZFZwWDJPTjA3ZlVQNmFJWlBSblhHTXdsUFVpdDVrUm1TdVNQelRWWkUxdDZzejlseDJTMDVsSnlVbktOU0RXbVd0Q3ZYTUxjb3QwOW1LeXVURGVSNTVtM0tHNU9IeXZma0kvbHo4OXNWYklWTTBhTzBVcTVRRGhaTUw2Z3JlRnNZVzNpNFNMMUlXdFF6MzJiKzZ2a2pDNElXZkwyUXNGQzRzTFBZdUhoWjhlQWl2MFc3RmlPTFV4ZDNMakZkVXJwa2VHbncwbjNMYU11eWx2MVE0bGhTVmZKcWVkenlqbEtEMHFXbFF5dUNWelNWcVpUSnkyNnU5RnE1WXhWaGxXUlY3MnFYMVZ0V2Z5b1hsVitzY0t5b3J2aXdScmptNGxkT1g5Vjg5WGx0MnRyZVNyZks3ZXRJNjZUcmJxejNXYit2U3IxcVFkWFFodkFOclJ2eGplVWJYMjFLM25TaGVtcjFqczIwemNyTkF6VmhOZTFiekxhczIvS2hOcVAyZXAxL1hjdFcvYTJydDc3Wkp0cld2OTEzZS9NT2d4MFZPOTd2bE95OHRTdDRWMnU5UlgzMWJ0THVndDJQR21JYnVyL21mdDI0UjNkUHhaNlBlNlY3Qi9aRjcrdHFkRzlzM0srL3Y3SUpiVkkyalI1SU9uRGxtNEJ2MnB2dG1uZTFjRm9xRHNKQjVjRW4zNlo4ZStOUTZLSE93OXpEemQrWmY3ZjFDT3RJZVN2U09yOTFyQzJqYmFBOW9iM3Y2SXlqblIxZUhVZSt0LzkrN3pIalkzWEhOWTlYbnFDZEtEM3grZVNDaytPblpLZWVuVTQvUGRTWjNIbjNUUHlaYTExUlhiMW5ROCtlUHhkMDdreTNYL2ZKODk3bmoxM3d2SEQwSXZkaTJ5VzNTNjA5cmoxSGZuRDk0VWl2VzIvclpmZkw3VmM4cm5UMFRlczcwZS9UZi9wcXdOVnoxL2pYTGwyZmViM3Z4dXdidDI0bTNSeTRKYnIxK0hiMjdSZDNDdTVNM0YxNmozaXYvTDdhL2VvSCtnL3FmN1Qrc1dYQWJlRDRZTUJnejhOWkQrOE9DWWVlL3BULzA0Zmgwa2ZNUjlValJpT05qNTBmSHhzTkdyM3laTTZUNGFleXB4UFB5bjVXLzNucmM2dm4zLzNpKzB2UFdQelk4QXY1aTgrL3JubXA4M0x2cTZtdk9zY2p4eCs4em5rOThhYjhyYzdiZmUrNDc3cmZ4NzBmbVNqOFFQNVE4OUg2WThlbjBFLzNQdWQ4L3Z3djk0VHorNEE1SlJFQUFBQUdZa3RIUkFEL0FQOEEvNkM5cDVNQUFBQUpjRWhaY3dBQUN4TUFBQXNUQVFDYW5CZ0FBQUFIZEVsTlJRZmRDd01VRWdhTnFlWGtBQUFnQUVsRVFWUjQydTE5ZVZpVVpmZi9tUTBRbFdGbjJBVmN3SVVkQWRkY0VEUk56U1ZSTXkyVnlyYzBVM3ZUTWxPenNzVTFCZHozRlFRR21JMkJBZlNIU201Wldmb20rcGJpdm1VS2dwemZIOS9PYzgwOGdrdXZPdk1NOTdrdXJuTlpMUE9jKzN3KzkrYys5N252QjRBWk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqWm40VHNSQ1kyaGRmZkNGQ1JGRmRYWjJvb3FJQ0tpb3FSQUFBaUNoQ1JCWWdJU1czU0lRaWtRaGF0R2lCQVFFQjlHK2NPWE1tRzhqR1RnRHo1ODhYVlZSVWlDc3FLaVFBSUQxOStyVDB6Smt6TWdDd0JRQVpBRWdCUUFJQTRyKy9HRmtLenhBQTZ2Nyt1ZzhBdFFCUUF3RFZMVnEwcUFrSUNLZ0ZnRnAvZi8vN2dZR0JkYk5uejBaR0FGWnFjK2ZPRlowNWMwWlNVVkVoUFgzNnRPM1pzMmZ0QWFDcHA2ZW5jMXhjWEV1RlFoSG82ZW5wMzZWTGwwQTNOemVGcmExdE14c2JtMllTaWNSV0xCWTNaVmdTSVBvUm9hYW01aThBcUs2cXFycGRWVlYxKzlLbFN4ZiszLy83ZjZjckt5dlBYcmh3NFhSNWVmbC9LaXNycndIQVgzNStmbmNDQWdLcS9mMzlhLzM5L2UvUG16Y1BHUUVJMk9iTW1TTTZjK2FNOU15Wk03WUdnNkVwQURUdjJMRmpZRXhNVEh4aVltTEgwTkRRU0JzYkcwVk5UUTFVVjFmRHZYdjNvS2FtQnVycTZxQ3VyZzRRa2Z0aUpsd1RpOFVnRW9sQUpCS0JXQ3dHaVVRQ01wa01iR3hzUUNxVnd0MjdkeThjUDM3OGlFNm5PM0Q0OE9HeVE0Y09uUWFBUDd0Mjdmb1hBRlIzN2RxMWRzR0NCY2dJUUNBMlpzd1l5ZG16WisyS2k0dWIyZG5aT1E4Wk1xUmIvLzc5RXp0MjdCaHRaMmZuZStmT0hiaHo1dzdVMU5SQWJXMHQ5M08xdGJWdzd0dzV1SDM3TmxSV1ZvSlVLb1hLeWtwbzBxUUpYTDU4R2R6ZDNlSFNwVXZNQzhTN3VibkIzYnQzd2RQVEUycHJhOEhUMHhPYU5Xc0czdDdlSUpWS1RRaENLcFdDcmEwdDJOblp3WjA3ZC80b0x5OHZWNmxVMnB5Y25KTHE2dXFyWGJwMHVlM241MWUxZGV2Vys0eFNMZEErL1BCRDBhdXZ2aXJ6OS9kM0JJQ0FYcjE2RFZtMWF0WDIzMy8vL2VxWk0yZncrUEhqV0Y1ZWp2djM3OGV5c2pKVXFWVDQ2YWVmNHRTcFU3Rjc5KzdZdTNkdnRMT3p3N0N3TUpSS3BSZ1JFWUZTcVJRakl5TlJKcE5oVkZUVVEzMTBkRFR6WnZDUEdwZkl5RWlUOFF3TEMwTTdPenZzM2JzM2R1L2VIYWRPbllwejVzeEJsVXFGWldWbFdGWldoZ2NQSHNURGh3L2p6ei8vakNkT25MaStaTW1TSGQyNmRSc0NBQUcrdnI2T3ljbkpzdW5UcDdPYWtDWFlCeDk4SUJvMWFwU05uNStmczUyZFhmRDQ4ZU9uLy9EREQ4Zk9uVHVIUC8zMEU1YVhsMk5aV1JrV0ZoYmlpaFVyY09qUW9aaVFrSUJTcVJURHc4TlJLcFZ5eVJRYkc0c3ltUXpqNCtOUkpwTmhwMDZkVUNhVFllZk9uZEhHeHFaQjM2VkxGK2JONkI4MlBzYmpTT05LNHh3ZEhXMlNCd2tKQ1Roa3lCQmNzV0lGRmhZV1lsbFpHZTdmdng4UEh6Nk1KMDZjd0pLU2toOUdqUm8xM2RiV050algxOWQ1eElnUk51Ky8vejRqQW5OWmNuS3l6TmZYMThuZTNqNWt4b3daY3lzcUt2NDRjK1lNSGpseWhKdnAwOUxTTUNrcENXTmlZa3htZEVxQ1RwMDZvWTJORFhidDJoVnRiR3p3aFJkZVFCc2JHK3pSb3dmYTJ0cGl6NTQ5Ni9XOWV2VmkzZ0o5UStQVm8wY1BrL0dsOFNaeW9IeUlpb3BDcVZTS01URXgyS2RQSDB4TlRlV1VRWGw1T1I0L2Zod1BIVHIweDZSSmsrWTJhZElreE1mSHgybllzR0V5aHNibmFNT0hENWY0K1BnNEFFRFFPKys4TS9QMDZkTy9uejU5R2c4ZE9vUmxaV1dvMFdod3dvUUoyTFZyVjVSS3Bad2NqSXVMUTVsTVpnSjI0K1JKU0VoQVcxdGJURXhNUkZ0YlcweEtTbUxlaWp5Tks0MHpqVHVmRkNoUGlBeTZkdTJLNDhlUFI0MUdnMlZsWlhqZ3dBRThkdXdZbHBlWC96NSsvUGlaQUJEazdlM3Q4UExMTDBzWU9wK2hUWjA2VlJRZkgyOEhBRjVKU1VuSlI0NGNPWHJtekJrOGZQZ3dscFdWWVhaMk5rNmFOQW50N2UyNW1UNHVMczVrY0dsbTU0TzliOSsrYUd0cml5KysrS0tKNzkrL1ArZnQ3T3lZRjVBM0hqLyt1Tko0ODBtQmxBS2ZEQ0lqSTlIZTNoNG5UWnFFMmRuWlhLM2doeDkrUUkxR2M3Ujc5KzdKQU9EVnNXTkh1MG1USnJGbHdkTzJvVU9IU3J5OXZSMFZDa1hrdW5YcnRwOC9mNzcyMkxGanVILy9mbFNwVkRoa3lCQ01pSWhBbVV5R0hUdDJSSmxNeHEwUithQ25HYUZmdjM0bTRCNHdZQURhMmRuaFN5KzlaT0lIRGh6SXZJQTlmenhwbklrY0tBOG9ML2hrMEtWTEY1Tzhpb2lJd0NGRGhuQ0Z3L0x5Y3Z6aGh4OXF2Lzc2NisxdWJtNlJYbDVlam9NR0RaSXkxRDRGbXpKbGltam8wS0cyQU9EVnYzLy9jV2ZPbkRsLzh1UkpQSGp3SUJvTUJwdzVjeVkyYmRxVW0vRnBUVS95bmdiVGVJYXZEK3dOSmMrZ1FZT1l0d0wvS0hLZ2ZPQXJCTW9mV2laUXpTQXlNaEtiTm0yS00yZk9SSVBCd0JVTHk4ckt6aWNrSkl3REFLK0JBd2ZhdnZYV1cwd04vQS9nRjN0N2V6ZTFzN05ydldMRml0WG56cDJyUFhMa0NPN2J0dytYTFZ1R3ZYcjFRcGxNaGpFeE1TYXlqZFoyeE9pUEF2M2pKdEhnd1lPWkY1Qi9VbkpvaUF3b2ozcjE2bVdTWnpFeE1TaVR5YkJYcjE2NGRPbFMzTGR2SCs3ZnZ4K1BIRGxTTzIvZXZEVzJ0cmF0UFQwOW03NzExbHRpaHVaL0JuN0hvS0NnenZ2MjdUdncyMisvNFlFREIxQ3YxK09JRVNNd0xDeU0yOXA1Mkl4UDhyNmhtWjdOa013L1RCblFNcUVoUlVCYmkyRmhZVGhpeEFqVTYvVllWbGFHaHc0ZHdsMjdkaDMwOC9QcjdPbnA2ZmptbTI4eUVuaUM5YjRVQUZ6ajQrT0hWbFJVVlA3MDAwOVlWbGFHMjdkdng0Q0FBRzZ0VC91OXROWERabnptbjZjaTZObXpwMG0vUVVSRUJMWm8wUUszYmR1RysvYnR3NE1IRDJKSlNVbGxlSGo0VUFCd2ZlbWxsMWhkNERIQUx3TUF4V3V2dlRicGp6Lyt1SDMwNkZIY3QyOGZmdjMxMXlpWHl6RXFLb3FUWWJhMnR0aTdkKy9IbXZFWnlKbi9KK1R3S0VWQStVZkxncWlvS0pUTDVmajExMTl6UzRJREJ3N2NIang0OEw4QVFERmd3QURXTS9BSThIdE5telp0NXJsejUrNGRPblFJOSszYmgrKysrNjdKV3I5NzkrNG1jcXhmdjM0bVRNMUF6L3l6SkFQS005bzlvRHpzM3IyN1NXM2czWGZmNVVpZ3ZMejgzcmh4NDJZQ2dCY2pnWWVBLytPUFA1NzcrKysvM3o5NDhDQVdGQlRnMkxGanVTMFlZL0QzNmRQSEJQeHNyYy84ODY0TkdKTUE1U09SQUcwWmpoMDdGZ3NLQ21oSmNQL05OOStjKy9lT0ZpTUJzaUZEaGtnQndQUEREei84aE1DdjFXcHgrUERoWEp1bWNhR1BtamY0YTMyMmxjZjg4OXhDNU5jR0tDK3BRRWp0eGNPSEQwZXRWa3RxNFA3NDhlTS9BUURQL3YzN3M1ckEwS0ZESlFEZy9zNDc3MHovL2ZmZmF3ajhnd2NQTnVua28yWWVLc0N3R1o5NVM5d3RvUHlrSmlMcUpCdzhlTEF4Q2RRa0p5ZFBCd0QzL3YzN045NzI0Y21USjR1OXZiMmRrNUtTeHZ6KysrOVZCdzhlUkoxT2gwT0hEaldaK2ZuZ3A1bWZkZXd4YjBrZGh2eGRBaUlCVWdKRGh3NUZuVTZIKy9idHc5TFMwcW91WGJxOHBsQW9uQ2RPbk5qNHRnamZmZmRka2JlM3QwT0hEaDM2bmoxNzl2cWhRNGV3c0xBUWs1T1Q2d1YvUTdLZmdaOTVTeUNCaHBZRGZCSklUazdHd3NKQzNMZHZIK3IxK3VzdFc3YnNxMUFvSENaTW1OQzRPZ1pqWTJPYnVMbTVoUjg3ZHV6azBhTkhzYlMwRkZOU1V0ak16N3pWSzRHVWxCUXNMUzNGdlh2MzR1N2R1MCs2dUxpRVIwWkdObWxNUlQ4WkFQaG5aR1NvZnY3NVp5d3RMY1c1YytlYVZQc2Z0ZVpuNEdmZWtrbWdvWm9BN1E3TW5Uc1hTMHRMY2QrK2ZmalZWMStwQU1DL1Vld01USjQ4V1F3QWJ0T25UNTk5K3ZScDNMdDNMNjVhdFFwdGJXMjVmZjVIVmZzYk9yWEhQUFBtOVB6OGJHaDNJQ1ltQm0xdGJYSFZxbFZZV2xxS3BhV2xPSHIwNkU4QXdHM0NoQW5XWFEvdzl2WnVGaG9hMnZmTW1UTzNEeHc0Z0VxbEVsMWNYREE2T3ByYjU3ZXhzWG5rbXA5NTVvVkFCc1lrWUp6ZjBkSFI2T0xpZ2prNU9WaGFXb282bmU3MjMvV0FadGJlN0JOb01CZ09IajE2RkV0S1NqQW1Kb1k3eXR1dFd6ZTBzYkhobWlyWXpNKzhOU21CUG4zNm9JMk5EWGJyMW8wN1Vod2RIWTBsSlNWWVVsS0M2ZW5wQndFZzBDbzdCZitXL3E3VHAwLy85TlNwVTFoYVdvcFRwMDdsVHZYUjVSMzg5bDcrWlIzTU15OGt6KzhZVEVoSU1MbGtKQ3dzREtkT25Zb2xKU1ZvTUJodzlPalJjd0hBMWVxMkJ1UGo0NXY0K2ZuRi9mYmJiOWYzNzkrUG1abVozRzI4ZElrSEhheGc0R2ZlbWttZ2QrL2VKcGVMUkVkSFkyWm1KcGFVbEdCdWJ1NTFEdytQdU9qb2FPdlpGWGovL2ZmRkFPQ1ZucDYrL2ZqeDQxaGNYSXl2dlBLS1NhY2ZYZUxSdDI5ZlRqWXhFbURlV3NCUCtVeW5DT2x5RWVvVWZPV1ZWN0M0dUJnTkJnUCsrOS8vM2c0QVhsWnprVWluVHAyYVJrZEh2M2o2OU9sN2UvZnV4UlVyVm5CWEwvTzMvSXlEeFNjQjVwa1hvdWZuTTM5cmtLNnMvKzY3NzdDNHVCalZhdlc5NE9EZ0YyTmlZb1QvVHNycDA2ZExBTUJuKy9idCtVZU9ITUhpNG1KczJiSWxSa1pHbXB6dVMweE01R1FTQXovejFrb0NsTisweTBXN0FwR1JrZGl5WlV0T0JjeWJOeThmQUh3bVRab2s3TE1DblR0M2Job2ZILy9TYjcvOVZsdGFXb3FmZnZvcGhvYUcxbHY0YTBqK004KzhOWkdBOGZWaXhnWEIwTkJRL1BUVFQwa0YxTFpyMSs0bFFhdUFHVE5taUFIQWEvMzY5Vm1IRHg5R2c4R0FQWHYyTkxuTHovZ0N6L29VQVBQTVc1T24vT1pmTkVwM0MvYnMyUk1OQmdNV0ZoYmlyRm16c2dEQWE5S2tTV0toenY1MnJWcTE2bmJxMUttN3BhV2x1SGp4WXBSS3BmVzIrekx3TTk5WVNjQzRUVmdxbGVMaXhZdlJZRENnVXFtODYrUGoweTBtSnNaT2NPQ2ZObTJhQ0FCYzU4eVpzK0xZc1dOb01CZ3dORFFVSXlJaVRPNzA2OU9uRHllTGpJUERQUFBXN0NuZnFlbU43aFNNaUlqQTBOQlFOQmdNV0ZCUWdPUEdqVnNCQUs2Q2U5dlF5SkVqWlJLSnBQVVBQL3p3eDk2OWUzSDkrdlhZdm4xN2s5dDg2WlhjZkFYQVBQT053VlBlVTE4QTNTN2N2bjE3WEw5K1BSWVZGZUhtelp2L0VJdkZyUWNQSGl5czdrQmZYOTltUTRZTW1YRGl4QWtzS2lwNjRLaXY4VlhlVEFFdzMxZ1ZBUCtLY2VNancwVkZSYWhTcWJCcjE2NFR2THk4aEhORzRJTVBQaEFCZ0dMVnFsVlo1ZVhscU5WcVVTNlhjejMvdFBWQjhvZUNRTlZSNXBsdkRKN3luczRJZE8vZW5Uc2o0T0RnZ0ZxdEZnc0tDbkQ2OU9sWkFLRDQxNy8rSll4bHdLaFJvMlMydHJadGYvcnBwMnNsSlNVNGI5NDg3TkNod3dQeW40R2ZlVVlDU1NidHdiUU02TkNoQTg2Yk53OExDd3R4MjdadDEyUXlXVnZCTEFPNmR1M2FkT0RBZ2VOKy9QRkhMQ3dzeERGanhxQlVLbTN3bWkraGs4QS9mVjg5QTBIamppTjkvdnF1RDVOS3BUaG16QmdzTEN6RTNOeGM3TlNwMDdpT0hUczJGWXI4ZDF1d1lNSDY4dkp5MU9sMEp2Sy9XN2R1Smk5VDRKT0FVRHg5YnZLMG5DRlB6MGVlLy8vNVB5KzA1MmR4ZkxyUFQ4OW5mRlJZTHBlalRxZERyVmFMNDhlUFh3OEFidSs4ODQ1bEx3Tm16Wm9sQVlDQUF3Y09uQ3d0TGNWdnYvMldxLzdUcVQ5cS9oSGFvRFdVckxTY29lZWlBaWZmMC8rbjcyK3NaTURpV0g4OHFDbUlUZ20yYjk4ZXYvMzJXOVRyOVppZW5uNFNBQUxlZmZkZHkyNE43dGF0bTQyM3QzZnNUei85VkZOWVdJaVRKMDgyT2ZqRGY0c3ZmOUFzMWZObkpFcENXczVRWVpQMmM2bk5tVHo5ZHpyN1FEOUh2NGMvd3drbExpeU9UOGZ6M3pwTUI0UW1UNTZNZXIwZWQrM2FWZVBpNGhJYkd4dHJZK2tFMEd6WXNHRnZIVHQyRFBWNlBZYUhoNXRjK21ITTNFSlBWcnJCaUFxYmRMU1pPaDM1bnY0L2ZUOHRoNnlkREZnY0g4OFRMb3d2Q3drUEQwZTlYbzg1T1RuWXRXdlh0enAyN0dqeDI0RXU3Ny8vL3NxREJ3K2lYcS9ud005L3c0K2xEd3BmbHBMOHBCbUtsalAwSXNqSXlFaHMwcVFKSmlRa1lIeDhQTDcyMm1zNGFOQWdIRHQyTEhicTFBa1RFaExRM3Q2ZWU3VTVLU0w2UFRTajBkOTVsTHdWR3ZpZk5JNTkrdlRCK1BoNEhEVnFGQTRhTkFoSGpScUZjWEZ4bUpDUWdIWjJkbHhOeVZyaVNKK1AvMGFoME5CUTFHcTFxRmFyY2VqUW9Tc0J3TVZpa1Q5ejVrd1JBSGhsWldVWlNrcEtjUFBtelNpVlNybkI0ci9TbTEvUXNSVFBuNmxJbHRHTVExYzdSMFJFWUhSME5INzQ0WWU0ZE9sU1ZLdlZXRkJRME9DWFJxUEI1Y3VYNDh5Wk16RTJOcGFMQzgxczlQdHBtZFRRVENZVS95Ung3Tml4NDJQSFVhVlM0YUpGaTNENjlPa1lFUkhCa2FyUTQyajhxbkVpUTZsVWlwczNiMGFOUm9QejVzMHpBSURYNU1tVExiTVErUEhISDBzQUlHai8vdjFuaTRxS2NQYnMyVndCTUQ0KzNvU1poWkswTkZQUjZjV29xQ2gwZDNmSGp6NzZDSGZ2M3MxVmFmUHk4bkRQbmoyNGRldFdYTDkrUGE1ZXZSclQwOU54N2RxMXVISGpSdHk1Y3lkbVoyZWpTcVZDblU2SEJRVUZtSm1aaWJObnowWi9mMy91ZmdUNk8veVpUR2drUUorWFArUFQ4MFZHUm1KQVFBRE9uajBiTXpJeTZvM2poZzBiY00yYU5iaHExU3BjdDI0ZEY4ZWNuQnhVcTlWY0hIZnUzSWtmZnZnaHVybTVZVlJVVkwxeEZBb0pVTHpvZEdENzl1MXg5dXpacU5QcE1DMHQ3U3dBQkUyWk1rVmlxZXQvbVZnc2JudnMyTEVxdlY2UE0yYk1RS2xVYW5MbHR6SFQ4YmQ0ek8zcGM5RXloUXBPTkZQRng4Zmo5T25UVWFQUm9GYXJSYVZTaVJzM2JzU2xTNWRXZi9qaGgwZGZldW1sOVowN2QvNDRQRHo4OWJadDJ3NXQwYUpGWWtoSXlOQ3dzTEJ4blRwMStuakFnQUZyUC9yb284T3BxYWxWTzNmdXhQejhmTlRwZEtqVDZYRG16SmxjRXdqTlpLU1k2UE5ZYXR5ZU5JNmRPM2ZHRHovOGtBTjlUazRPeGJHSzR0aXBVNmVQd3NQRDMralFvY1BJRmkxYUpJYUdobzZLaUlnWTM2bFRwNDlmZnZubFRYUG56djFwMWFwVjkzYnYzczJScWxxdHh2ZmVlNDlycDZXK0U0b2pmMWxncVhFenZqcGNLcFhpakJrenNLQ2dBRGR2M2x3bEZvdmJ4c1hGeVN5VkFHd2pJeU43SHpseUJIVTZIUTRZTUlDNy9LTno1ODcxTXJHbEppMVZuV2x0T243OGVNekl5RUN0Vm90Nzl1ekIxTlJVbkRadFdubW5UcDArZG5CdzZBZ0Eva1ZGUmIzeElWWlVWTlFiQVB5Yk4yOGUzYmx6NTVtelpzM2F2M256NXJyYzNGelU2WFNZbFpXRmI3Lzl0c25hbGdxbkRSVzRMTTN6QzN6OE9MNzk5dHU0Wjg4ZTFHcTFtSm1aaVN0V3JMZy9kZXJVL2ZIeDhSODFiOTQ4NW5IaU9IWHExTllBME1MSnlhbFQxNjVkNTN6NjZhZEh0bXpaZ25sNWVhalQ2WEQzN3QwNGR1eFlremdLaFV3cGZqUVpoSWFHNG9BQkExQ24wK0dPSFR1d1pjdVd2ZVBpNG13dGxRQ2FEaGd3WU56MzMzK1BPcDBPQncwYVpMSUZ5SmRqTkFqbTlzWkphN3lHakk2T1JpY25KMXk0Y0NFMzQ2ZW5wK003Nzd5ek56ZzRlQ1FBQk5UVzFsYmdQN0RhMnRvS0FHZ1JIQnc4Yk5xMGFVWGJ0MjlIbFVxRldxMFdseXhaZ2k0dUxweWNwUUlYcmFINU01bWxlRHJRUXArVFBuZFVWQlE2T3p2amtpVkx1RGltcGFYaFcyKzlaUWdLQ2hvS0FDMythUnlycXFvTUFCQVlHaHI2NnNjZmYzeGc1ODZkM1BKZ3dZSUZLSmZMT1FWSzQ4b25VMHZMUTFJQXRCVTRhTkFnanRoaVkyUEh4Y2JHV21aSFlOZXVYWnNuSnlkUHA5ZDh0MnJWaXRzRm9PQmJXdkkyQlA2b3FDaDBjM1BEVFpzMm9VYWp3UjA3ZHVCbm4zMTJNU29xYWpJQUJPQlROQUR3ajQ2T2Z2Tzc3NzQ3cDFRcVVhdlY0dWJObTlIVDA1TXJGRm82Q2RRSGZpcGtLUlFLcnBDMWZmdDJuRGR2M3Ztd3NMQzNBYURGVTQ1allQZnUzYWVscDZkZnljM05SYTFXaXhzMmJEQWhVMHNuQVlvaktZQ3dzREJzMWFvVjZuUTYzTE5uRDNidjNuMTZ4NDRkbTFza0FmajUrVG1PSFR0MmZsbFpHZXAwT295TGk3Tm9CZEJRZFRvcUtnb1ZDZ1Z1MjdZTjFXbzFidGl3QVNkTm1sVHE0dUxTK2ZidDIrdnhHVmhWVlpYQjJkbTU0d2NmZkZDUWxaV0ZXcTBXZCszYWhYNStmbHlWMjdpd1pVd0M1b3FuY2NlZThlZWlBbFpFUkFUNit2cmlybDI3VUsxVzQ3cDE2ekFsSlVYdjVPUVVXMVZWWlhnV2NieHk1Y3FuN3U3dTNlYk9uYnMvT3p1YkkxUGpBbUZEdXdTV3FnRGk0dUpRcDlOaFRrNE9KaVFrelBmeThuSzAxSjFBcC9Ianh5OHFMUzNsamdEekZRQ2ZlYzNsQ1R6MWdkL0Z4UVUzYmRxRUtwVUtWNjllamNuSnlic2tFa2xyZkE0bUZvdGJUcHc0Y1dObVppYXExV3JjdVhNbit2bjVZWGg0ZUwwa1lPNTRrbkxpZ3o4OFBCeDlmWDF4eDQ0ZG1KK2ZqNnRXcmNMaHc0ZHZFb2xFTFo5SEhHVXlXZkRreVpPejl1elpneHFOQmpkdTNGaXZFaUFTNEpPcHVlTnByQURrY2psWExFMU1URndFQUU2V1NnRE9FeWRPWEZsU1VvSmFyUmJidDI5dmNnY2dYd0ZZU3JDcFVCVWRIWTFObWpUQjlQUjBWS2xVdUhidFdodytmUGltcHkzNUgwUEsrcjMyMm12TExKMEVIaGY4NmVucE9IRGd3T1VBNFArYzR4ajR6anZ2N016T3prYU5Sb09wcWFuWXBFa1RyaVpBNDI0cGt4SmZBZEFkZ2UzYnQrZHFKMGxKU1NzQXdObGlDU0FsSldXMXdXQkFyVmFMVXFtMFFRWFEwRUdQNStYNTRLY3E5ZXpaczFHajBlQ1dMVnR3M0xoeHVRQVFpR1l3QVBDdGp3VDRuWlhVUnN1ZnlaNjFKK1ZFZjU4NjE4TEN3aG9DdjY4NTRpaVZTbHZObWpWTGs1dWJpeHFOQnFkUG4vN0E3b0FsNXFXeEFwQktwYWpWYWpFM054Zjc5ZXUzMnBJSndDVWxKV1YxVVZFUmFqUWFEQTRPTmxFQTFMTnRDVUUyN2tHbi9lbkV4RVJVcTlXWWtaR0JIMzc0NFMvMjl2YWhhRVlqRXNqSXlFQ1ZTb1U3ZHV4QVgxOWZzNVBBbzhDL2ZmdDJ6TXZMdzdTME5IenBwWmZNQm42eTVzMmJoNldtcHY2YW41K1BhclVhRXhNVFRmb3QrR2NKekoyZnhua3BsVW94T0RnWU5Sb05LcFZLN051MzcycExiZ2MySVFCakJXQmN4VFlPdHJrOEJabWFSa0pEUTNISmtpV1lsNWVIUzVjdXJmTHg4Um1JRm1DUElnSGpacGY2VHNrOWJjOC9yVWZ4czFUd2s3VnUzWHBRVmxaV2xWcXR4a1dMRm5FM1ZGSDgrQ1JnTHMvZlJTRUZJRWdDSUFWQWNzdFNnc3h2U3cwUEQrZG0veTFidHVETEw3KzhCZ0E4MFVMTVVraEFxT0QvTzRhZTc3enp6cnI4L0h6VWFEVFl1M2R2N29wNmZ0dXdwVXhPdEFzZ0tBVXdjZUxFMVlXRmhhaFdxemtGWUJ4a2N5dUErcXIrTXBrTU4yN2NpTG01dWZqbGwxOWVzYmUzajBBTE16NEpiTisrSFgxOWZibE9TNUt6Vk5ONDJzbE00S2ZmVDh1bTBOQlFFL0NucHFaYUhQakpuSnljb3ZmczJYTmRyVlpqZW5vNnltU3lCbmNGekoyZmhCZFNBR3ExR25OeWNvUkZBRzNhdERFNUMwRHRtQlJrYzNtYXdhandOMkRBQUZTcFZMaDE2MVo4OGNVWGx6K3FGZFdjSkRCbXpKaGx1M2Z2eHZ6OC9NY21nZjgxWG84Qy83WnQyekEzTnhkVFUxTnh3SUFCRmdsK2FpR2VOR2xTbWtxbFFyVmFqVWxKU2ZXMkMxdEtmdEpaZ0RadDJnaVRBS1JTS1lhR2h0WXJzOHdWWEg3aHFrT0hEamg1OG1UTXo4L0haY3VXVlRrNU9YVkdDN2JuVFFMV0FuNHlYMS9mN21xMXVrYWxVdUhiYjcvTnhjMjRvR3JPL09RdlQwTkRRNjFIQVZBU2tjeDUzdDc0RWdycVZKTktwYmhqeHc3TXlzckM5OTU3cjlqU0UvaGhKRUNGTFQ0SkdPOFNQSW1ubitPRHYwT0hEb0lFUC9WWXJGcTFhcjlhcmNhdFc3ZWEzRmRoZkttSU9mUFV1QzlGa0FwQXI5ZWpTcVZDaVVUQ01TeS9lY1hjd1NYNTM3MTdkMVNwVkxobHl4YnMwcVhMcC8vMFVJcTVTR0RYcmwyWWw1ZUgyN1p0ZTZvazhEamdWeXFWdUhMbFNzR0FIeEd4dXJyYU1HellzTTgwR2cycVZDcnUraTErdk13OVNWRlRWV2hvS0Vva0VsU3BWSmlkblkxSlNVbkNJWURXclZ1alZDcDlvTkJDRC9tOFBhMnRqT1YvVWxJUzV1Zm40NW8xYXpBd01MQWZDc2dlUlFLMHRxVzRHKzhTUEU2YzZPZUlMQnNBL3pLaGdKOHNKaVptSUwxMnEzZnYzbHk4K0gwVjVzcFQ0d0sxVkNyRjFxMWJDNU1BSkJLSnhRYVhybHVhT1hNbTV1WGw0YkpseTI0Q1FEQUt6SjQyQ1ZnNytQOCtiOUcyc0xEd2prcWw0aTZ0b1J1WnpEMUoxVmVqRXFRQ3lNL1A1eFFBQlpmV1dQU1F6OXZ6NVd5N2R1MXcvdno1cUZRcThiUFBQanZ4dkh2K255WUp2UHJxcXh3SmJOMjZGWDE5ZmJucjJLZ0dRL0huTHd2NDhhSHZpNDZPNXE2bDh2WDF4YTFidHdvZS9IUkdJRGMzOXplMVdvMmZmUElKdG12WDdxSExwdWZ0S2Y0MFNiVnUzUnJ6OC9NeEt5dExHQVJRVUZDQStmbjVKZ3FBMzZ4aXJ1QWFIMWlSU3FXNGF0VXF6TTdPeGxtelp1MERBQjhVcUJFSjdOeTVFM056Y3grYkJQajM3ejhNL0RrNU9iaGl4UXJzMzcrL1lNRlBzZHErZmZ0K2pVYURhV2xwS0pWS0h6aG9aYTc4NURkWmtRSVFKQUcwYXRVS3BWTHBBeDFYOUpEUDJ4dmY5Q09UeVRBa0pBVFhybDJMMmRuWk9HM2FOQjBBZUtHQXJTRVNvQm1PZjJFbXhZTzg4Y1ducEpDc0RmeC94OGw3NDhhTmVxMVdpNnRYcjhhUWtCQVRrdVF2bDU2M3AzR2dYYXBXclZvSlZ3SFFETVNYVitZS3J2SEJGYWxVaWhzMmJNRHM3R3o4OTcvL3JSYzZBVHdKQ1ZCTmhtWjgrcmUxZzU4SVlOdTJiUWFkVG9mcjFxMHpPYk5DY1RCWGZ2S1hxZTNidHhlV0FwZ3dZY0pxblU2SGVYbDVEU29BL3V1ZW5wYzN2cU9PRk1DeVpjc3dPenNiNTh5WlUyWU55VzFNQWp0MjdFQ2xVb2xidG13eElRR3F5ZEN5akR6dGh4UDR0MnpaZ3RuWjJmamRkOS9oaXkrK3VNeWE0ck5uejU2REdvMEdGeTllL0lBQzRDK1RucmV2VHdIUWRlbUNJZ0NKUk1JbEhiOGFiYTdnR2g5Z2tVcWwrTTAzMzZCU3FjU3Z2LzVhc0VYQUp5R0J0bTNiY2sxUXBBaU0vOTIyYlZ1ckJqOFZBUXNMQzA5cU5CcGN1SENoaVFJZ01qUlhmdkozWDlxMWE0Y1NpVVNZQk5DeVpVdXV3RkxmTzkyZXQrZXZjVU5DUXZEdHQ5L0czTnhjWEwxNjlRMGhiZ00rS1FuNCtQaHdNeDQxYVpFUENRbEJIeDhmcXdiLzMzRnBlK2pRb2RzcWxRb25UcHo0Z0FKb3FFYnl2RHpoaEFyVkxWdTJGQjRCNU9ibW9rUWk0V1ljS3J5UnZESlhjUGtLWVBUbzBkeGF1V1hMbG4zUnlveFBBcHMzYjBZZkh4OXVpellrSklUYmF2THg4Y0hObXpkYk5mZ1JFVHQzN2p6dzBLRkRtSnViaThuSnlmVXFBSFBsSjdXcEUxN2F0bTJMRW9rRWMzTnpNVE16RXhNVEV5MmZBT2o2SW1NRllCeGNJb0huN1drTDBEaTR2cjYrbUp1Yml4a1pHZGk3ZCs4NVFta0ZmbElTR0QxNjlMTHQyN2RqVGs0T2J0cTBDWDE4ZkRBd01CQ2xVaWtHQmdhaWo0OFBidHEwQ2JPeXNuRDU4dVZXQy83cTZtckQ2NisvUHIrc3JBeHpjM05Sb1ZCd3kxVEtDMUlBNXNwVG1xU01GWUFnQ2NCWUFaRHN0clRndG1yVkNqZHUzSWc1T1RuNHlTZWZHS3d4NlJzaUFXOXZiL1R4OFVGdmIrOUdBWDZLUTA1T3psNjlYbzlyMTY3bEN0V1dOa2tSWGdTdEFJS0Nna3prRlcwRkVnazhiMDlySzJMNkRoMDZvRlFxeFZtelp0RXlvTXJGeFNVZXJkVDRKTEJ4NDBhTWpvN0dqUnMzTmdyd0l5TDYrdnAyT1g3OGVIVitmcDdhQUNrQUFDQUFTVVJCVkQ1KzhNRUhLSlZLdVdZMXFnRlFucGdyVDJrTGtKYXBRVUZCd2lNQXBWS0pFb21FSzdBUW8xbEtjR21MSlRnNEdFTkRRMUdwVkdKV1ZoWU9IejU4MFcrLy9mWjZZeUVCZXU3R0FQNmlvcUxlczJmUFhuN2d3QUZVS3BYWXJsMDdyZ2JDZjhXNE9TY3BZN3lFaElTZ1JDSkJwVktKR1JrWndpSUFVZ0JVWmFhdFFITUZsenh0c1JERHRtclZDdFBUMDFHcFZPS0dEUnN1Tm0vZVBCeXQySWdFdG0zYmhwbVptYmhzMlRLckJ6OGlvck96YzhUeDQ4ZXYwRHNDU1A2VFFyVzAvS1RMUUlLQ2dvUkpBTVlLZ0pwTWFJMUZTdUI1ZTJKNFlsaDZlY21vVWFOUXFWUmlkblkyamg4L1BoVUFQQm9CQ1N4WnRHZ1I5dS9mZjRtMWd4OEFGRjk4OFVWYWVYazVLcFZLSERGaUJQZlNEZU1PU2NvUGMrVW4xYWdJTDRKV0FGUmxibWlOWlM1UERFdkxnTFp0MjZKVUtzWGx5NWVqVXFuRTNidDMzd2tJQ09pUFZtNEE0QkVWRmRYUDJza09FVEVzTEd6QXI3Lytla2VsVXVIeTVjdE54cDNrUHlrQWMrY252MFlWR0Jnb1hBVVFIQnhzMG1sR0RNdHZRMzFlbnY0K0JabGtWdXZXcmJGTm16YW9WQ294TnpjWDA5TFNmbXJhdEdsN1pDWjRrOHZsSFE0ZVBQaExTVWtKS3BWS2JOT21EZGNIUWZLZkppZEx5RTlqdkFRSEJ3dExBWXdmUDM2MVJxUEJuSndjVGdId1paYTVna3VlbUo1a0ZqRnR5NVl0TVNVbEJYTnljakEzTnhjLyt1aWpIR3RxRDI2TUJnQUJtelp0eXY3KysrOVJxVlJpU2tvSzE1OUN5cFRPUmxCZW1Ecy8rY3ZUd01CQXpNbkp3ZDI3ZDJPZlBuMkVRd0FTaVlTN0dKVDJXVWwrRTlPWnk1TUNvR1VBOVZ5M2J0MGF2L3JxSzh6SnljSDgvSHg4NzczMzFzSnpmcWtsczZjR2Z2L2x5NWV2TzM3OE9PYmw1ZUhDaFF1eFZhdFczQmtWWS9sUCtXRHV2Q1I4VUo5S216WnRVQ0tSQ0pNQUFnSUNIbEFBbGhCazh2UjVLTmpVZE5HaFF3ZGN1WElsS3BWS1ZLbFVPR1hLbEZRQThHT1FFaFQ0L1JZdlhwejY4ODgvWTM1K1BxNWN1Wks3WElQVy9qUXBXV3Bla2dJSUNBZ1FyZ0tvYjYxbHpIVG04dlE1YUJsQXRRQmFjMFZHUnVLcVZhdFFxVlNpV3ExbUpDQkE4Sjg0Y1FMejgvTngxYXBWR0JFUndkV2tqUE9SeHQvUzhwSzJxRnUzYmkxY0JkQ2lSUXRPWGhzSDI5eEJKazlNeXljQmtsMFJFUkdNQkt3SS9MUWNwYjRVR25mS0EwdkpTK043R2FSU0tiWm8wVUpZQktCV3F6RTdPL3VoQ3NCU1BQODhQTWt1WXQ2SWlBaE1UMC9Ibkp3Y1ZLbFVPSG55WkVZQ0FwRDllWGw1bUo2ZXpvR2Y4cEFLZi96N0VDd3RML2tLSURzN0czZnQyaVVzQWlBRndMK0V3dEtDVFl4TGEwSStDWVNIaHpNU0VDRDR3OFBEVGNCUHRTZ2FaNzc4dHhSdmZEa0xLUUJCRW9CRUl1SGFMVWwyRWVOYW1xZWdFL09TL0tLcU1TTUJZWUtmOG8vR2s1UW9Yd0ZZbXFmbEtPV2ZWU2dBZnRYVlVqek5CSThpZ2JDd01FWUNBZ0IvV0ZqWVk0R2ZYd093RkU4NHNRb0ZVRi9UaFNWN0NqNHhNQTBDSXdGaGdwL0dqeFFvWC81YnFqZHVUaE9jQWxDcFZKaVZsWVgrL3Y3Y3RWTTBzMXB5MEdsbWFJZ0VhRENJQkxLenN6RS9QNStSZ0lXQm55YWRoc0RQVndDVzVna25kRlRaMzk4ZnM3S3ljT2ZPbmNJaUFPUEJvQUtNcFFlZmtZQ3d3SitibTJ0VjRPZnZSbEcrQ1pJQS9Qejg2bTIrb0llMFZFL0pRcCtYNUJnZHphUkJDUTBOWlNSZ0FlQ25WMmpUdU5ETVNjdE9Ha2MrQ1ZpcXB4b1VOYVg1K2ZrSlZ3SFFwU0RVRENTVVFYZ1VDUVFGQlRFU3NDRHcwM2dJSGZ6ME9hbHdTYzhsYUFYQTc4Q2loN1IwVDhsRG41dGtHVEV6SXdITEFqOHBUVnB1MHJqeFNjRFNQYjhqMVNvVkFDTUJaZ3o4RFh1clVBQyt2cjRtQ29Bdnk0VGlLWm5vODlQZ0VFTUhCZ1p5cHdnWkNUeDc4Tk9wUG9vNzVSZE5NalJPZkJJUWlxZmxKdVdYcjYrdmNCVUFYUXBDelVCQ0d3eEdBZ3o4NXZDMGkwSFBLUmdDZU9PTk4xYm41K2ZqbmoxN09BWEE3OFhtdjVOT0tKNlNpNTZEQm9uT0RBUUVCSEFra0phV2hsbFpXWmlYbDhkSTRDbUFQeTB0alFNL3habnlpaVlYR2hjK0NRak44OCtpK1ByNjRwNDllM0RIamgyWWtKQWdIQUtnd1RKdUJoTHFvRHdwQ2JSdjM5NkVCTjU5OTExR0FrOEkvcDkrK2dtVlNpV21wYVZoKy9idEd3WDRqVi9VU3BlQlNDUVNZUktBajQvUEF6M1p4b01rVkUvSlJzOWovSUpOUmdMUEQvdzBxZEE0OEVsQXFKNS9Cc1hIeDBmNENvQnVCeGI2NERBU1lPQi9IcDUyTmF4S0FaQmNzM1lTSU9adTBhSUZJNEduQUg2S0krV1J0WU9mZndCTjBBcUFqZ1JUdFpZS0hOYmlTYTdSb0JGekc1T0FXQ3htSlBBUHdDOFdpeDhBUDhXWDRrM3h0N2E4SXJ6UTh3dVNBTHk5dlUwT2FOQU0yZGhJd04vZkg4VmlNYlpyMTQ2UndHT0F2MTI3ZGlnV2k5SGYzNzlSZ3A5d1FtY2J2TDI5aGFzQTZFZ3dyZDFvMEt6TlUxTFM0Rkd5MGlENitmbWhXQ3pHa0pBUVJnSVBBWDlJU0FpS3hXS3VqWndtRDRvbnhaZFBBdGJtQ1M5RWdvSWtBQzh2TDVOMllCckV4a0lDSk9Pb25kUEh4d2ZGWWpHMmFkT21QaEx3YldUZzkrV0R2MDJiTmlnV2k3bmFFZVVOeGJHeGdKOXdRbm5qNWVVbFhBWGc1K2Rud21nMGVOYnVhUkRwdWFtYTYrbnBpV0t4R0lPQ2dqZ1N5TXJLd29rVEp5NXBUQVR3elRmZkxQbnh4eDg1OEFjRkJhRllMRVpQVDArVDNTT0tIMS8rVzd1bjV5WWxaRlVLb0xHUkFIOFo0T2JtaHA2ZW5yaG16UnJjdlhzM0xsbXlCQWNOR3ZSVll5S0FOOTk4ODZ1dFc3ZGlSa1lHcmxtekJqMDlQZEhOemUyaDhyK3g1WTFWS0FCZlgxK3VJR1lzNDZ6ZEd4Y0NqYXU1Q29VQ3ZieThPUEF2WHJ3WSsvWHJ0eFFBZkJyWkVzQm41TWlSU3pkdjNzeVJnSmVYRnlvVUNwUGRJMzRCc0xIa0R6MDN0ZE1Ma2dCSXp0R0JJUDVhcnJHQW53NTBlSGw1b1plWEY2NWR1NVlEZjkrK2ZaYzF0dlcvY1IwZ09UbDVHWkhBMnJWcnVSZ1o1MDFqSXdIQ0NlV05wNmVuOEJVQVg4NVpxNmZCbzZTbHRiK1BqdzhEL3hPUUFCVUNxUlpBOGFUNFduc2VFVjZzUWdFMFZOQmg0Ry9jNEdja1VMK3ZyM0FzV0FYZzQrUERGVFNzZWZBWStCa0pQTTA4SXJ6UTh3dVNBSXdMT3NZZFhmU1ExdUtKc2Fuemo4RHY3ZTNOd1A4VVNJQTZTaW11bEVjVWQydkxKLzVaRW9WQ0lVd0NlRmhUQndNL00wWUNEWHQrODVnZ0NjRER3NE5yQnpiZTE2VkJFN3FuSktSOWZnYis1MHNDbEU5OE1oQzZwM3dpM0hoNGVBaFhBZENnMFpZT0F6OHpSZ0tQOXJRRjZPM3RMWHdGUUoxZHRBeWd3UktxcDZRam1VWnJOYmJQLzN6N0JDanVsRmQ4TWhDcXA3d2kzQWhLQVJqZkNteXNBUGhWWEdzRi83cDE2ekFqSXdPWExGbUMvZnIxWStCL0NpUXdjdVRJWlZ1MmJNSE16RXhjdDI1ZG95QUJZMFVwRm91RmVTMjR1N3U3VlNrQVNpNlNaN1JHWStBM0x3blFPTkF5VStna3dGY0E3dTd1d2lRQXNWaHN3dFRHZ3lNMFQrVEZCNytucHljRHZ4bEpnSnJOK0NUQVZ3UkM4OGJLMG1vVUFKK2hHZmlaTVJKNDBGT2VXWVVDTUI0YzQwRVJpcWRrb2pVWkRRcWQ2bVBndHd3U29LWXpHaCtxT2ZISlFDamVlSklSckFKd2MzUGpEZ1FaRHdvRFB6TkdBZzE3eWpmQ2padWJHMU1BRFB6TUdoTUpXSTBDTUc0SEpqQlJsZE5TUGEzQnFCRERCLy9hdFdzWitDMlFCS2hQZ0U4Q05JNDBycGFlZjhZSHllZ0dLVUVSZ0ZxdHh1enM3QWNVZ0JBRzRWSGdYN2R1SFdabVp1TFNwVXNaK0MyRUJFYU5HclZzNjlhdHVHZlBuZ2FWZ0ZCSW9MNUNzMWdzeHV6c2JOeTFhNWV3Q01EVjFkV2tHWWcvQ0pibWlYa3ArTFFHWStBWE5nblFPTks0MGpoYmFoNFNUcWdKeU5YVlZaZ0VZS3dBak5ka0RQek1HQWs4UEE4SkwxYWxBUGpCdHhSUGpNdkFiNTBrUUdkUytDUkE0MjVwK1VpZnp5b1VBSitCTFMzb2ZQQlR3ZExEdzRPQjN3cEpnTWJYVWttQVBvL3hKTVFVZ0JsbWZrOVBUd1orS3lJQlQwL1BCcGNEbGtZQ2dsY0FHbzBHYzNKeVVDd1dQNUo1emUxcHJVV2ZUNkZRb0xPek02NVpzd2IzN05tRHk1WXRZK0FYTUFsczI3WU5zN0t5Y00yYU5lanM3TXlSQUkwM2Y1ZkEzTDQrSlNvV2l6RW5Kd2QzNzk0dExBSndjWEV4T1JCazZjRldLQlJvWjJlSFM1WXN3VDE3OXVDS0ZTdndwWmRlU2dmMkdtK2hrb0RmMkxGajAzYnMySUhaMmRtNFpNa1N0TE96ZTRBRUxIVlNvb05BTGk0dXdpUUFTMVlBZk5sUDFkWXBVNlpnZG5ZMnJsNjlHcE9Ua3pNQklJQkJTZEFrRVBEdXUrOW03TjY5RzdPenMzSEtsQ2ttdTFNTkxRZVlBbmlLQ3FDaFlKdkxFOFB5d1I4VEU0UFoyZG00ZGV0V2ZPKzk5NDdiMk5pMFpSQVN2dG5aMmJWZHRHalI4VDE3OW1CT1RnN0d4TVNZS0ZQS0E4b0xjK2NuUHk4RnJRRG9TREFWQWkwdHlKUUU3dTd1dUdUSkVzek16TVN2dnZycWprS2g2TmNJWmtkRmNuTHlZQUJRV1B1enRtalJvdC8yN2R2dlpHZG40N2ZmZnNzZFZPT1RnS1ZNVG9RWGQzZDNZU21BQ1JNbXJOWnF0YWhVS2h0VUFQU1E1dkwwT1l5RDNMZHZYOHpKeWNHMWE5ZGkvLzc5VndLQWg3V3ZqNWN1WGJyeTExOS94ZmZmZjMrbHRkYzVBTUJqNHNTSnFWbFpXWmlUazRNSkNRa1BURTZXbHAvR0NrQ3BWR0pHUmdZbUppWStWUUtRUGtzMnVINzlPcmk0dU1ERml4ZEJvVkRBK2ZQbndjdkxDODZkT3dmZTN0NW04VjVlWG5EKy9IbFFLQlJRV1ZrSnJxNnVjT1hLRlJnMmJCalUxdGJDSDMvOGNWR24wNjFBeEF0Z3BTWVNpZndYTDE0OE15RWhJYVdpb2dJU0VoTGV2SC8vdmtna0V2a2o0bGxyZkdaRXZPRGc0QkRSbzBlUGw1czJiZXIyeWl1dmdGNnZCemMzTjZpc3JBUlBUMCtMeWs4UER3KzRjT0VDdUxpNHdOV3JWNTlaWE1UUE11aE9UazV3OWVwVmNIZDNod3NYTG5CQk5sZHd2YjI5NGZ6NTgrRHA2UW1WbFpYZzd1NE9WNjVjZ2M2ZE80T3JxeXZjdW5VTGlvdUxOLy84ODg4eDFnNyt4TVRFbERObnprQk5UUTNVMXRaQ1VsSlN5cFFwVTJhS1JDSi9hMzMybkp3Y1Y2MVd1eDBBd01QREErTGk0dUR5NWN2Zzd1NXVRZ0tXa0o4WExsd0FkM2QzdUhyMUtqZzVPUW1UQUVnQlhMcDBpWnR4aVdITjVRbjhDb1VDTGwyNkJNN096aEFSRVFHSUNOZXVYYnQ3Nk5DaDNZR0JnV3NhQS9qUG5Uc0hjK2JNZ1FzWExqUUtFbmpoaFJkMGVYbDUyd0hnSGlKQ2VIZzRPRHM3bStTbnA2ZW5XZlBUeTh2TEpEOWRYRnpnK3ZYcndpTUFrVWpFS1FBM056Y1RCVUF5eHh5K3NyS1NrMWV1cnE1dzdkbzFpSTJOaFpxYUd2alBmLzZ6LzhhTkczOVlLL2lYTEZreU15a3BLZVhzMmJOdy92eDVtRDkvUGh3K2ZCam16NThQRnk5ZWhQdjM3MFBmdm4xVDNudnZQYXNsZ1V1WEx2MyszLy8rOTRCWUxJYlkyRmk0ZHUwYXVMcTZ3b1VMRjhERHc0T2JwTXlacDZRQTNOemNPQVVnRW9sQUpCSUpVd0Zjdm56WklvTjc1Y29WYU51Mkxjamxjcmh6NXc0Y1BYcTB1TGEydHRSYXdXODg4My8yMldkdzl1eFpjSEJ3Z0xObno4Sm5uMzFtb2dTc2xRU3FxNnMzR1F5R0VvbEVBaTR1THRDNmRXdTRjdVdLUlU1U2x5OWZGcTRDTUs0QnVMbTVtUlFDS2NqbThNYkJkWFoyQm05dmIwQkVxS3FxZ25QbnpoMlFTQ1F0ckIzOEN4WXNnSXFLQ25CeWNvSmJ0MjZCazVNVFZGUlV3SUlGQzZ5ZUJHeHNiTHFmUG4zNm9Fd21Bd0FBYjI5dmNIWjJoc3VYTDVzc0E4eVpwd3FGQWk1ZXZHaWlBQVJiQTZEZ0doY0NLY2ptOEI0ZUhuRHg0a1ZPL29lRWhBQWl3cDA3ZDI2ZVBYdjJUR01BLytuVHA4SFoyUmx1M0xnQkxpNHVjT1BHRFhCMmRvYlRwMDgzQ2hJNGZQandmeER4THdDQWtKQ1FlcGNCNXN4VEtnRFNKQ1U0QlVCckZVZEhSeTY0L0VLTE9id3hzMTY1Y2dXY25KekExZFVWRUJIKy9QUFA4d0JRYlkzZ1AzdjJMSnc3ZHc0Ky8veHpxS2lvNEpLS1NORFYxWlVqNjRxS0N2ajg4ODg1RXJEU21rRFZuVHQzem92RlluQnhjUUVuSnlkdUdVQksxZHg1ZXVuU0pXNThIQjBkbjFrZ3BNOHdBYm1aNWNxVkt4YWxBSXozVjUyY25HZ0pjQk1BYXF3Wi9EVHpFK2dwNlM5ZnZzejltNVRBNTU5L0RqTm56Z1NGUWdGOSsvWk4rYnNJWlMxOUFqWFYxZFUzYkcxdE9mS2pXcFZDb2JDSVBIVjNkK2QycWE1ZHU4WVZBWjkySWZDWk5nTEo1Zko2RllDNXZMSDhKd1ZnYTJ0THhhRy9BS0RPR3NGUHN0L0p5Y2tFL0NRektkbU00MExMQVNLQnBLU2tGUHI5VmtBQ2RmZnUzYnNqRW9sQUpwTnh0U3BYVjFlNGVQRWl0d3d3WjU3U0x0V1ZLMWRBTHBjTFR3RUFBTnk4ZWJOZWVYWGh3Z1d6ZVhkM2Q3aDQ4U0xIckJLSmhJQ0QxZzUra3YzVW5HVU1mdnAzWXlFQmlVUWlFb2xFSUJhTHVlWFBsU3RYdUVuQzNIbEt5b3pHVFRBMUFHT3BJcGZMdWFTanJVQnpCdFhEdzhOa2JlWGs1QVIzN3R3QnNWZ005dmIyOXMrNktQbzh3SitVbEpUeTMvLytGODZmUC8vRTRLZk9NNUxGeGlSZzNDY3dkZXBVb2RjRUpIK1BOOXk1YzhkRUdWMjZkTWtpOHBUSStQcjE2eUNYeTU5Wkg4QnpWd0FVWEhONEtnQWFyNjF1M2JvRllyRVk1SEs1Q3dESWhBNSttdmsvKyt5emVzRlB6MjhNZm1QUHJ3a1FDWHoyMldjd2E5WXNyaVlnY0NVZ2xjdmx6dFhWMVhEcjFpMFRCVUFLMFJMeVZKQUtnRjhETUM2d0dBZlhITjVZNXBJQ09IdjJMSWhFSW5CMGRQUUNBRHRyQVAvOCtmTk53RThGVDBxcWhzQlA4YUg5WjJwQ0lSS1lQMysreWU2QVVKV0FXQ3h1MHJ4NWMwOUVoUC8rOTc4bUNzQ1M4cFRpTC9nYUFNbEtrbGZtREM3TmdBU0s4K2ZQZzBna2dpWk5talFQRGc0T3NnYndVNU1QZ2YvYXRXc1BnUDloeVdlc0JJeDNTeW9xS21EKy9QbncwVWNmQ1ZvSmRPdldMVmdrRWpXcHE2dURjK2ZPY1hFaUJXQUplV3Fzd0FUWkIyQmNBekFPcnFVb0FFcnE3Ny8vSGtRaUVkamIyNE9mbjEvSGUvZnVGUXQxemYrL2dwOXFKTVpLNE5xMWF5WktnRWlBYWdMOSt2VkxlZi85OXdXakJHN2Z2cjBoT0RpNDQ3MTc5MEFrRWtGNWVibkpKRVcxS25QbjZaVXJWMHdVd0xPcUFUeHRjNWs0Y2VKcXZWNlBLcFVLUlNJUmR5a0kzV3hDbHh5WXk5TWRhM1JsdVpPVEUyN2F0QW56OC9OeHdZSUYrMEFBRjJNQWdOK1NKVXRTZi8zMVY5VHBkTGgrL1hvTUNnb3lpVGU5bUpXZWwrNlhmOXc0MGZmVHo5UHZjM0Z4UVpGSWhFRkJRYmgrL1hwVXE5VllVRkNBNzcvL2ZxcEFZdWV2MFdnT0ZCVVY0Wm8xYTlESnlja2tIK2g1eloybmhCZUt0MHFsd3V6c2JFeEtTckxzRzRHTUNjRFIwZEVrdUUrYWhNOGp1SFFScUVxbHdoMDdkdHhUS0JUZEdqdjRyWmtFV3JaczJlUG5uMyt1MFdnMCtLOS8vY3NrRHl4bGtxSzRFMjRjSFIyRlJRQ0ZoWVVXcXdBb3VNYkpIQklTZ2lxVkNuTnpjM0hzMkxFcnAwNmQydHFTd1gveTVNbG5EbjVySkFFQThQajg4ODlYSHp4NEVGVXFGYlp1M2ZxQnVGbmlKQ1U0QlZCWVdJaHF0ZHBpRlVCOXk0Qmx5NWFoV3EzR2JkdTJYWFYwZEl5eVpQQVhGQlRnaGcwYm5qbjRuNFFFTm16WWdCcU5CdlY2dmNXU2dKZVhWK3lKRXlldUZ4UVU0TGZmZm11eDhyOCtCYUJXcXpFbkp3Zjc5dTBySEFJUWlVVG83T3hjTDhPYTJ4c25zVmdzeHY3OSs2TmFyVWFWU29XVEprMWFCd0NlUWdBL3haZVNoV1lPUGduOHI1NStILzErK252T3pzNkNJQUVBOEZxMmJObVdRNGNPb1ZxdHhuNzkrcG1NdjZYbUo4VlhrQVFnbDh0Tmd2eTBrL0ovVFdaS1lwckpGaTFhUklHdWF0T216Y3NNL05aREF2SHg4Y05PblRwMVQ2ZlQ0VmRmZmZWWXlzbmMrVW1mVHk2WEM0Y0FVbEpTVmhjVkZhRkdvN0ZvQmNCUFlpY25Kd3dLQ2tLVlNvVmFyUlkzYmRyMEg3bGNIbTRKNEQ5MTZoVHE5WHF6Z3Y5SlNVQ3IxV0poWVNGT216Yk43Q1RnNGVFUjljTVBQMVRzMjdjUDgvUHpzVVdMRmcvSWYzb2VTMVVBOUs0TlN5Y0E1NGtUSjNJRVlLa0tvQ0VTY0hSMHhOR2pSNk5HbzBHZFRvZWZmLzY1Uml3V3Q3UWs4Rk5TbUFQOGowTUNZckhZb2toQUpwTzF6c25KS1R4eTVBaHFOQnBNVGs2MmVQRHpGWUNUa3hOcU5Cb3FBcVlCZ0xQRkVzRDQ4ZU5YRWdIWTJOZzBXR2l4Rk0rdkJUZzVPZUhYWDMvTnlkaVBQLzU0QndBRVBtZnd0MWk2ZEdtYU1mZ0RBd081ejFmZjJ0V1M0aWNXaXpFd01OQ0VCS1pQbjU0R0FDMmVaeHdsRWtuTFRaczJaZno0NDQ5RTZGeGgybExpMTVBM1ZxWjJkblljQVNRbUpuNW55UVRnTkc3Y3VFVUdnd0cxV2kzSGFQeXRRRXNKTW44R284L3A3ZTJONmVucHFOVnFzYWlvQ0QvLy9QTXNHeHViNE9lVXRLM1dyRm16N2VUSmsxaFlXSWdiTjI1OEpQak5GVmY2dXc4amdZMGJONkpPcDBPRHdZQno1c3paSmhhTFd6MlBPTnJiMjRmczJyVXI3OFNKRTFoUVVJRHA2ZWttYjl0OW1JS3lsTHlrejZsUUtGQ3IxV0pXVmhZbUpDUXNBZ0FuaTBTL3I2K3Y0NnV2dmpxL3VMZ1l0Vm90dXJtNVBaQzBscW9BK0RMVzE5Y1hWNjllalZxdEZnMEdBMjdZc0dHL241OWZ0NnRYcjM3NkxCTDJyNy8rV3QraVJZdE9HbzJtK01TSkU2alg2M0hqeG8yYzdMYzA4RDh1Q1FRRkJabVF3T3JWcTB1OHZiMDczNzU5ZS8yemlPTnZ2LzMyZXBzMmJYcVVscForLytPUFAzTGc5L0h4cVhmNVpLa0t3RGlPYm01dXFOVnFNU01qQTN2MjdEbmYwOVBUMFNJSm9FdVhMczJIRFJzMnZhU2tCTFZhTFhibzBNRWs2SmJHdEk4aUFSOGZIMHhOVGVXVVFGRlIwZVVSSTBaTWU5cExBZ0FJR0QxNjlMdi8rYzkvTGh3K2ZCaDFPaDJtcDZlam41K2ZSWVAvY1VuQXo4K1BVMVFHZ3dFTEN3c3ZEaG8wYURJODVWZXZBMERRdi83MXI1bG56cHk1OXYzMzM2Tk9wOE1WSzFhZ3Q3ZTNvTUJQOGFUUEd4b2FpbHF0Rm5mdTNJbGR1blNaSGhNVDA5eFNDYUJwMzc1OXgrM2R1eGUxV2kxR1IwYy9zT1lTR2dsNGVIamd0R25UVUt2Vm9sNnZ4LzM3OStPdVhic09KQ1FrakFHQXdPcnFhc00vU2RiYTJ0b0tBQWpvMjdmdnlNTEN3dExmZnZzTjkrN2RpenFkRGovNTVCT3VLY1RTd2YrNEpPRHA2WWt6Wjg3azRuamd3QUhjdm4zN3ZwNDllNDRHZ0lCL0dzZS8vdnByUFFBRURoa3k1STM5Ky9jZk9uWHFGTklFTkhueVpPN3pDUTM4RkQ5SFIwZU1qbzVHclZhTDI3WnR3K2pvNkhFZE8zWnNhcWtFWUJzYUd0cTdyS3dNZFRvZERoa3lwTjZ0UUVzTCtxTklRQzZYWTgrZVBYSDM3dDJjbEQxMDZCQnF0ZHBqNDhhTm0rdnQ3ZDBKQUZwTW5UcTFkVzF0YlVWRHlUcDE2dFRXQU5EQ3k4c3I5czAzMy96azRNR0QzNTg1Y3dZUEhqeUlCUVVGbUptWmlRTUdET0IyVCtqdld6cjRIMFVDeG5GTVRFekVqSXdNMU9sMFdGeGNqSDgzNWh3ZU4yN2NuTWVKNDkvRTZRRUFnUUVCQVYyblRKbXk0Tml4WXorZVBuMGE5Ky9mandVRkJUUlRQaEJIU3djL1B3OXBDM0RJa0NHbzFXcHg0OGFOR0JBUTBMdGp4NDYyVCsxVTZkTWtnTTZkTzhzT0hEalEybUF3SExwNzk2N3RqaDA3WVBmdTNkekxKK2htR3VQYmFDM04wL2wzdWpISTBkRVJidHk0QVE0T0RsQlRVd052dnZrbTlPclZDMlF5R1VpbFVtamF0Q25ZMjl2WDNMeDU4MVJwYWVteGlvcUtVOWV1WFR0WFUxTno1OGFORzM4Nk9UazFsOGxrZHM3T3pwNHRXN1pzblpDUUVPN282Tmo2OXUzYk5qZHUzSUM3ZCs5Q1RVME5HQXdHU0UxTkJaRklCTGR1M2VMK0xuME8rbHlXSGovNmZBK0xZMTFkSGFTa3BFRFBuajFCS3BXQ1RDWURlM3Q3a3ppZU9YUG10MnZYcnAyN2QrL2VYNGg0WHl3V1MrenM3SnE1dUxqNEJBY0h0K3pSbzBkNHMyYk5BbS9kdWlXOWVmTW1WRlZWd2QyN2R5RS9QeDgyYk5nQU5qWTJENDJqcGNlUDhPTGc0QUJEaHc2RjRjT0h3NWt6WjZwVFVsSWlPM2JzZU9yQWdRTlA1UVpyNlZNbWdMcDkrL1pWM2I1OSs2SlVLdlh6OWZXRm16ZHZncU9qbzhtOUFKWWEvSVpJZ0FaRExwZkRva1dMWU1lT0hkQ3JWeS9vMTY4Zk9Eczd3NjFidDJRU2lhUnRseTVkMnZidTNSdHNiVzFCS3BXQ1dDd0dSQVJFaEpxYUdxaXFxb0tiTjIvQ2xTdFhvSzZ1RG03Y3VBRWFqUWEwV2kzODhjY2Y0T0RnWUVLV1FnUC9vMGpBT0k3ZmZQTU43Tml4QXhJU0VpQXhNWkhlVXNURnNWZXZYdlhHOGQ2OWUxQlZWUVZYcmx5QnlzcEtRRVM0ZlBreTVPZm5RMUZSRVZSV1ZvSmNMdWN1bzZrdmprTEpQN2xjRGpkdTNBQmZYMStvcTZ1RFAvLzg4eUlpVnNmRXhOUWRPSERBOG00RXFxMnRyUU9BcWt1WExsWDQrUGo0K2ZqNGdJT0R3d00zQTFseThCK0hCTTZmUHc5WldWbXdjZU5HaUltSmdUWnQya0JrWkNTMGF0VUs3T3dhdmxXc3Vyb2FUcDA2QlljUEg0YVRKMC9Dd1lNSG9Ybno1dkRubjM4K01tbUZBdjRuSVlFLy92Z0RkdS9lRFd2WHJuMmlPTjY1Y3dkKytlVVhPSExrQ0p3OGVSSU9IejRNY3JrY2J0MjZKWGp3MTZjQWZIeDhvSzZ1RGk1ZnZsd0JBRlYxZFhVV2ZYMjl5MXR2dmJXeXNMQVF0Vm90MnRuWk5kaDVaYWxyc0lacUF2dzFMVDJYbzZNamlrUWlsTXZsNk9ucGlaMDdkOGE0dURnY01HQUF4c1hGWVpjdVhkREh4d2Vkbkp5NDd6UCtlZjVhbjc5V0ZVcThIbFVUZUpJNGVuaDRZS2RPblRBdUxnNTc5KzZOY1hGeEdCOGZqMjV1YmlpWHkxRWtFbkVGNXNlTm8xRGlWVjhUVUZaV0ZnNFlNQ0RWa3R1QWFSblFySC8vL204WEZ4ZGpRVUVCeHNiR21neU9VQWFEVHdKUGtzUVA4NCtickVLTEU0dmoweThBaXNWaWpJMk54WUtDQXR5MmJSdDI3Tmp4N2VqbzZHWVdUUUR4OGZFMkNvVWl0cVNrcExhZ29BQ1RrNU1mT0JNZ3RCbU5QNU05S29rZjVlbjcrZFY5b2MvNDVvcGpRNkFYYXA0Wm53Sk1UazVHblU2SHExZXZyblYyZG82TmlvcXlzV2dDbURKbGlnUUFBckt6czAvcTlYcGN2SGd4aWtRaWpyR0ZPclBSNER3cWlmbkp6RS9TUnlXcnRZS2Z4ZkhKRkFBdEZ4Y3ZYb3hxdFJvLy8venprd0FRTUhIaVJJbEZFOENrU1pORUFPQTJmZnIwRFZRSDRET2IwTmUwajByaXgvVU4vVDVyQlQrTDQ1TXBBSGQzZDlScXRaaWRuWTNEaHcvZkFBQnU0OGVQdC95cmdXTmpZNXYxNmRQbkRZUEJnSHE5SG52MTZ2WEE5V0JDVC9hR2t1NmZlbXNIUFl2amt4VUFIUjBkc1ZldlhsaFFVSUNiTjIvR2lJaUkxeU1qSTV1QkVLeGp4NDR5ZTN2N2RscXQ5cnBlcjhjRkN4YlV1d3l3bHVSbm9HZHhmSnExRVpML0N4WXNRSjFPaDB1WExyMXVZMlBUTmlJaVFoaXZybnZycmJkRUFPQzVZTUdDTExvZWpIL0t5ZHFxM013ei96VHZWZkR3OEVDMVdvMUtwUkxmZU9PTkxBRHdmUDMxMTBVZ0ZQUHk4bXFlbUpnNHNhaW9DUFY2UGZidjM5L3FsZ0hNTS8rczVILy8vdjFScjlmajVzMmJNU29xYXFKQ29XZ09RcktCQXdmS3hHSng2OXpjM01yQ3drSk1TMHN6V1FZd0VtQ2UrZnFiZjBRaUVhYWxwYUZXcThXdnYvNjZVaVFTdFU1S1NoTFdtNnNuVEpnZ0FnRFhkOTU1SjdXd3NCQ0xpb293SmlhR0xRT1laLzRSOGo4bUpnWUxDd3N4SXlNREJ3OGVuQW9Bcm1QR2pCR0IwQ3c2T3RyT3o4K3Z1MWFyclNvc0xNUjU4K1lKdmltSWVlYWZkZlBQdkhuenNLQ2dBRmV1WEZubDd1N2VQU3dzVEhDdnJRY0FnSWtUSjRvQndHdisvUGxaZXIwZWk0cUswTi9mbjlVQ21HZStnYlcvdjc4L0ZoVVZZWFoyTmhYL3ZNYU1HU01Hb1ZwVVZGVFRzTEN3Z1FVRkJiVkZSVVU0Zi83OHg3clhubm5tR3hQNGE2dXlRZ0FBQ210SlJFRlU2ZktQK2ZQbm8xNnZ4OVdyVjljR0JnWU9EQXNMYXdwQ3RuNzkra2tBd0dmaHdvV3F3c0pDTkJnTTNGMkJRcm5waG5ubW44Zk5TUjA2ZEVDRHdZQTVPVG40NXB0dnFnREFKeUVoUVFKQ3Q4akl5S1p0MjdidHI5Rm83aFVWRmVHWFgzNzVRQzJBRlFTWmI4eUZQN2xjamw5KytTWHE5WHBNUzB1NzUrL3YzejgwTkxRcFdJTzkvdnJyWWdEd21qVnIxazY5WG84R2d3SGo0K01GYzJFbzg4dy82NHMvNCtQajBXQXdZR1ptSm80Wk0yWW5BSGlOR2pWS0ROWmlFUkVSVFR3OFBPS1ZTdVYxZWxCN2UzdldGOEI4bzkvM3Q3ZTN4OHpNVE5UcGRMaDQ4ZUxyenM3TzhlM2J0MjhDMW1Sang0NFZBNERycUZHajVoWVVGS0RCWU1BWk0yYXdnaUR6amI3d04yUEdEQ3dxS3NJdFc3WmdRa0xDWEFCd0hURmloQmlzemY3dVpncE1UVTB0THl3c3hPTGlZdXpTcFFzckNETGZhQXQvWGJwMFFZUEJnRXFsRW1mTW1GRU9BSUU5ZS9hVWdiV2FoNGRIczZDZ29MNUtwZksyd1dEQWpJd003czB0akFTWWIwemc5L2IyeG95TURDd29LTURseTVmZjl2YjI3dXZtNXRZTXJObitYZ3E0alJneFlnNjlIR0x4NHNXQ2V3a0c4OHovcnk5TFdieDRNUm9NQnR5MGFSTW1KQ1RNQVFDM1YxNTVSUXpXYm9tSmlUSUE4Sjg3ZDY2cW9LQUFpNHVMY2NLRUNRMXVEVElTWU42YXdDK1h5M0hDaEFsWVhGeU1HUmtabUpLU29nSUEveDQ5ZXNpZ3NWaFlXRmdUSnllbjhQWHIxNThxTEN6RWtwSVNIREJnZ0dEZWhjYzg4Ly8wWFlrREJnekE0dUppek12THcwOC8vZlNVZzRORGVMdDI3WnBBWTdJeFk4YUlQRHc4SEFJQ0F2cGxaR1JjLy91dHNkaTVjMmRHQXN4YkxmZzdkKzZNZXIwZU5Sb05MbHEwNkxxWGwxYy9OemMzaCtIRGg0dWdzZGxycjcwbTl2RHdjSTZOalIyYm01dGJWVnhjakRxZERxT2pveGtKTUc5MTRLZTMvT3IxZWt4TlRhMXEzNzc5T0RjM04rZEdzZTUvU0QxQUFnRHVMNzMwMHZUYzNOeWE0dUppMUdnMEdCRVJ3VWlBZWFzQmYwUkVCR28wR3U2Z3p3c3Z2REFEQU54NzlPZ2hnY1p1aVltSlVnRHdIRDU4K0NkNWVYbjNpNHVMVWF2VllseGNIQ01CNWdVUC9yaTRPTlJxdFZoWVdJaHIxcXk1MzZkUG4wOEF3TE5Iang1U1lQWi8xcWRQSHhrQWVJMFlNV0t1VXFtOFQ2OFc2OTI3OXdObkJ2Z2RnNHdNbUxlRVc0ejVMek54ZEhURTNyMTdZMEZCQWVyMWVseXpaczM5cEtTa3VRRGcxYWdxL2s5S0FvTUhENTZabloxOXI3aTRHRXRMUzNINDhPR01CSmdYSFBpSER4K09wYVdsV0ZCUWdPbnA2ZmQ2OWVvMWs0SC84VWhBMGFOSGowbTdkKysrYlRBWXNMUzBGR2ZObW9VS2hjTGszWERXOGhaZDVxM2pyY2VVbHdxRkFtZk5tb1dscGFXbzBXaHcrZkxsdDJOalkvLzFkMTR6OEQ4R0NVZ0J3TFZObXpiRE5tN2NlRkd2MTJOcGFTbXVXN2NPUTBKQzZuMUJaR043eHg3emx2Rk9RLzRMVFVOQ1FuRGR1blZZVWxLQ09UazV1SERod29zQkFRSERBTUNWcmZtZndGNTk5Vld4dTd1N280ZUhSNWV2dnZxcVhLMVdZMGxKQ2VwME9od3pab3pKRmVNTnZTV1drUUR6ejNMR055NzBpVVFpSERObURPcDBPalFZRExoanh3Nzg0SU1QeWwxZFhidTR1Yms1TnVxdHZ2K1JCSnJLWkxMV0V5ZE9YTHRuejU1YVdoSjg5OTEzNk92ciswQnRnQ2tDNXAvSGpHKzgxdmYxOWNYdnZ2c09TMHRMVWF2VjR1clZxMnRIakJpeFZpcVZ0blp6YzJ2S3dQOC8yT2pSbzBWOSt2U3hCUUN2Nk9qbzE5ZXNXWE5lbzlGZ2FXa3BGaFVWNFJ0dnZNRU56cVBlRzgvSWdQbC9BbnIrakU5NTV1Ym1obSs4OFFZV0ZSVmhjWEV4Wm1abTRzS0ZDOCtIaG9hKy9uZXh6N1pSZHZnOXE3cUF1N3U3bzZPalkrUmJiNzIxUFRNejgzNVJVUkh1M2JzWGMzSnljT1RJa1NpVlNoOVlGand1R1RCU1lDOGlmUmpvamVXK1ZDckZrU05IWWs1T0R1N2R1eGMxR2cydVdiUG0vdWpSbzdjN09EaEV1cm01T2ZiczJaT3Q5NSsyalJvMVNoUWFHbW9IQUY2aG9hSEozM3p6elE5S3BSS0xpNHM1SW5qNTVaZE5ybHQ2SERKNEZDa3diNTJlUC80UEF6MzkvNWRmZnBrRHZsNnZ4eTFidHVEczJiT1BoNFNFakFRQTcvYnQyOXU5OHNvcmJOWi9scGFRa0NEeDhQQndBSUNnUG4zNnpFcE5UZjBqTHkrUEk0Szh2RHg4KysyMzBkWFZsYXNSOEpjSGZESm9pQlNZdDA3UEgzZCtYbEMrT0RvNm9xdXJLNzc5OXR1WWw1ZUhlL2Z1eGNMQ1F0eStmVHQrK2VXWGY3end3Z3V6QUNESTNkM2RvV2ZQbnF5dDkzbjNESGg0ZURqWjJkbTE3ZCsvLy95VksxZWV5OG5KUVlQQmdIdjM3c1Y5Ky9iaE45OThnd01IRGtSN2UzdU9ESWpSR3lLRmhzaUJlV0g3aHNhWjhvRHl3dEhSRWUzdDdYSGd3SUg0elRmZjRMNTkrN0MwdEJSMU9oMXUzYm9WRnk1Y2VLNVBuejd6YlcxdDIzcDRlRGoxN3QyYjdlMmJzMGlZbEpSa0F3RE9NcGtzdUZ1M2JoOHNYTGp3aDEyN2RxRk9wOFBTMGxKT3JuM3h4UmM0Yk5nd2RITno0eTRmb1VGL1hGSmdYdGllRDNieWNya2MzZHpjY05pd1lmakZGMStnWHEvSHZYdjNjdWYyMTY5ZmozUG16RG5lcVZPbkQyUXlXVEFBT1BmcDA4ZG01TWlSZ3BiN0ltc2lnaXRYcmtpUEhqM2E5TUtGQzA0aElTRlJuVHQzSGhZYkc5dkgxZFhWMGNIQkFXeHNiRUFzL3I4ZG1YUG56c0V2di93Q3YvNzZLMXk5ZWhWT25EZ0J0Mi9maG12WHJvRmNMb2RidDI2Qmc0TUQzTHAxQytSeU9keThlWk41Z1hvYVJ3Y0hCN2g1OHlZNE96dERzMmJOSUNRa0JGeGNYS0JObXpZUUhCd00zdDdlQUFCUVcxc0xkKy9laGF0WHI4TFZxMWR2bEplWGE4dkx5M2Y5OHNzdmh6dzhQSzZIaDRmLzVlcnFXcnRseXhZVU9tNnNzbGlSbEpRa3ZYanhvdTJSSTBlYTJkall1RVpFUkhTUGlvcnEwNzU5KzNoWFYxZjM1czJiZzUyZEhVaWxVaENMeFJ3cDFOYldRbVZsSlZ5NGNBSCsrdXN2dUhIakJsUlhWOFB0MjdmQnhzWUc3dDI3eDd6QWZMTm16Y0RXMWhZY0hSMmhhZE9tb0ZBb3dOUFRFNlRTL3l2UzE5WFZ3ZjM3OStIZXZYdncxMTkvd2MyYk4rSHExYXVYZnZycHA3SWZmdmhCZS9UbzBlSjc5KzVkallpSStOUGQzYjFhbzlIVVdoTldyTHBhT1hic1dOSFJvMGVsRnk5ZXRLdXNyR3dLQUE1dDI3YnQ0T25wR1JjVkZSWHA1K2ZYcm5uejVoNTJkblpnYjI4UHRyYTJJSlZLUVNLUmdGZ3NCcEZJQkNLUmlDTUlac0t5dXJvNlFFVHVpOEJlVTFNRGQrN2NnYnQzNzBKMWRUWGN1blhyNHRtelozODZkdXpZNGNyS3l2MG5UcHc0RGdDM0ZBckZYd3FGb2lvc0xLeDJ3NFlOYUkweGFqVGJGYSsvL3JybzBxVkxrZ3NYTHRpY1AzL2U5dno1ODAwQXdON1IwZEhaMzkrL3BWd3VENVRMNWY3QndjR0J6czdPaWlaTm1qUzNzYkZwYW1OajAxUWlrZGd5T0FuVGFtdHJxKy9kdS9kWGRYWDFYM2Z1M1BuejJyVnJGMDZkT25YNjVzMmJaMi9ldkhuNjdObXovN2x4NDhZMUFMamo1ZVYxMTh2THExcWhVTnh6ZDNlL3YzYnRXclQyK0RUYS9jcUpFeWVLTGx5NElLNnNySlNJUkNMcHVYUG5wT2ZPblpNQmdDMEF5QUJBQ2dDU3Y3OUVqVGxXQWpiOCsrdiszMSsxQUZBREFOWGUzdDQxUGo0K3RYVjFkYldlbnA3M1BUMDk2OUxTMHJDeEJZZ2xOYzlTVWxKRVlyRllKQktKUlB2Mzd4ZUpSQ0pBUkJZcjRSSUFBQURFeGNVaEltSmRYUjAyUnFBelk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekN6Wi9qL2V6djBFVnNFMGp3QUFBQUJKUlU1RXJrSmdnZz09JztcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdG9vbHRpcDtcbiIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fVxuLy8gfVxubW9kdWxlLmV4cG9ydHMgPSB0cmVlID0gcmVxdWlyZShcIi4vc3JjL2luZGV4LmpzXCIpO1xudmFyIGV2ZW50c3lzdGVtID0gcmVxdWlyZShcImJpb2pzLWV2ZW50c1wiKTtcbmV2ZW50c3lzdGVtLm1peGluKHRyZWUpO1xuLy90bnQudXRpbHMgPSByZXF1aXJlKFwidG50LnV0aWxzXCIpO1xuLy90bnQudG9vbHRpcCA9IHJlcXVpcmUoXCJ0bnQudG9vbHRpcFwiKTtcbi8vdG50LnRyZWUgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXguanNcIik7XG5cbiIsInZhciBldmVudHMgPSByZXF1aXJlKFwiYmFja2JvbmUtZXZlbnRzLXN0YW5kYWxvbmVcIik7XG5cbmV2ZW50cy5vbkFsbCA9IGZ1bmN0aW9uKGNhbGxiYWNrLGNvbnRleHQpe1xuICB0aGlzLm9uKFwiYWxsXCIsIGNhbGxiYWNrLGNvbnRleHQpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIE1peGluIHV0aWxpdHlcbmV2ZW50cy5vbGRNaXhpbiA9IGV2ZW50cy5taXhpbjtcbmV2ZW50cy5taXhpbiA9IGZ1bmN0aW9uKHByb3RvKSB7XG4gIGV2ZW50cy5vbGRNaXhpbihwcm90byk7XG4gIC8vIGFkZCBjdXN0b20gb25BbGxcbiAgdmFyIGV4cG9ydHMgPSBbJ29uQWxsJ107XG4gIGZvcih2YXIgaT0wOyBpIDwgZXhwb3J0cy5sZW5ndGg7aSsrKXtcbiAgICB2YXIgbmFtZSA9IGV4cG9ydHNbaV07XG4gICAgcHJvdG9bbmFtZV0gPSB0aGlzW25hbWVdO1xuICB9XG4gIHJldHVybiBwcm90bztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXZlbnRzO1xuIiwiLyoqXG4gKiBTdGFuZGFsb25lIGV4dHJhY3Rpb24gb2YgQmFja2JvbmUuRXZlbnRzLCBubyBleHRlcm5hbCBkZXBlbmRlbmN5IHJlcXVpcmVkLlxuICogRGVncmFkZXMgbmljZWx5IHdoZW4gQmFja29uZS91bmRlcnNjb3JlIGFyZSBhbHJlYWR5IGF2YWlsYWJsZSBpbiB0aGUgY3VycmVudFxuICogZ2xvYmFsIGNvbnRleHQuXG4gKlxuICogTm90ZSB0aGF0IGRvY3Mgc3VnZ2VzdCB0byB1c2UgdW5kZXJzY29yZSdzIGBfLmV4dGVuZCgpYCBtZXRob2QgdG8gYWRkIEV2ZW50c1xuICogc3VwcG9ydCB0byBzb21lIGdpdmVuIG9iamVjdC4gQSBgbWl4aW4oKWAgbWV0aG9kIGhhcyBiZWVuIGFkZGVkIHRvIHRoZSBFdmVudHNcbiAqIHByb3RvdHlwZSB0byBhdm9pZCB1c2luZyB1bmRlcnNjb3JlIGZvciB0aGF0IHNvbGUgcHVycG9zZTpcbiAqXG4gKiAgICAgdmFyIG15RXZlbnRFbWl0dGVyID0gQmFja2JvbmVFdmVudHMubWl4aW4oe30pO1xuICpcbiAqIE9yIGZvciBhIGZ1bmN0aW9uIGNvbnN0cnVjdG9yOlxuICpcbiAqICAgICBmdW5jdGlvbiBNeUNvbnN0cnVjdG9yKCl7fVxuICogICAgIE15Q29uc3RydWN0b3IucHJvdG90eXBlLmZvbyA9IGZ1bmN0aW9uKCl7fVxuICogICAgIEJhY2tib25lRXZlbnRzLm1peGluKE15Q29uc3RydWN0b3IucHJvdG90eXBlKTtcbiAqXG4gKiAoYykgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBJbmMuXG4gKiAoYykgMjAxMyBOaWNvbGFzIFBlcnJpYXVsdFxuICovXG4vKiBnbG9iYWwgZXhwb3J0czp0cnVlLCBkZWZpbmUsIG1vZHVsZSAqL1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgcm9vdCA9IHRoaXMsXG4gICAgICBuYXRpdmVGb3JFYWNoID0gQXJyYXkucHJvdG90eXBlLmZvckVhY2gsXG4gICAgICBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG4gICAgICBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZSxcbiAgICAgIGlkQ291bnRlciA9IDA7XG5cbiAgLy8gUmV0dXJucyBhIHBhcnRpYWwgaW1wbGVtZW50YXRpb24gbWF0Y2hpbmcgdGhlIG1pbmltYWwgQVBJIHN1YnNldCByZXF1aXJlZFxuICAvLyBieSBCYWNrYm9uZS5FdmVudHNcbiAgZnVuY3Rpb24gbWluaXNjb3JlKCkge1xuICAgIHJldHVybiB7XG4gICAgICBrZXlzOiBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBvYmogIT09IFwiZnVuY3Rpb25cIiB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwia2V5cygpIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGtleSwga2V5cyA9IFtdO1xuICAgICAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGtleXNba2V5cy5sZW5ndGhdID0ga2V5O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgIH0sXG5cbiAgICAgIHVuaXF1ZUlkOiBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICAgICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICAgICAgcmV0dXJuIHByZWZpeCA/IHByZWZpeCArIGlkIDogaWQ7XG4gICAgICB9LFxuXG4gICAgICBoYXM6IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgICAgIH0sXG5cbiAgICAgIGVhY2g6IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICAgICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm47XG4gICAgICAgIGlmIChuYXRpdmVGb3JFYWNoICYmIG9iai5mb3JFYWNoID09PSBuYXRpdmVGb3JFYWNoKSB7XG4gICAgICAgICAgb2JqLmZvckVhY2goaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgICAgaWYgKHRoaXMuaGFzKG9iaiwga2V5KSkge1xuICAgICAgICAgICAgICBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtrZXldLCBrZXksIG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBvbmNlOiBmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgIHZhciByYW4gPSBmYWxzZSwgbWVtbztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChyYW4pIHJldHVybiBtZW1vO1xuICAgICAgICAgIHJhbiA9IHRydWU7XG4gICAgICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICBmdW5jID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgdmFyIF8gPSBtaW5pc2NvcmUoKSwgRXZlbnRzO1xuXG4gIC8vIEJhY2tib25lLkV2ZW50c1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBBIG1vZHVsZSB0aGF0IGNhbiBiZSBtaXhlZCBpbiB0byAqYW55IG9iamVjdCogaW4gb3JkZXIgdG8gcHJvdmlkZSBpdCB3aXRoXG4gIC8vIGN1c3RvbSBldmVudHMuIFlvdSBtYXkgYmluZCB3aXRoIGBvbmAgb3IgcmVtb3ZlIHdpdGggYG9mZmAgY2FsbGJhY2tcbiAgLy8gZnVuY3Rpb25zIHRvIGFuIGV2ZW50OyBgdHJpZ2dlcmAtaW5nIGFuIGV2ZW50IGZpcmVzIGFsbCBjYWxsYmFja3MgaW5cbiAgLy8gc3VjY2Vzc2lvbi5cbiAgLy9cbiAgLy8gICAgIHZhciBvYmplY3QgPSB7fTtcbiAgLy8gICAgIF8uZXh0ZW5kKG9iamVjdCwgQmFja2JvbmUuRXZlbnRzKTtcbiAgLy8gICAgIG9iamVjdC5vbignZXhwYW5kJywgZnVuY3Rpb24oKXsgYWxlcnQoJ2V4cGFuZGVkJyk7IH0pO1xuICAvLyAgICAgb2JqZWN0LnRyaWdnZXIoJ2V4cGFuZCcpO1xuICAvL1xuICBFdmVudHMgPSB7XG5cbiAgICAvLyBCaW5kIGFuIGV2ZW50IHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi4gUGFzc2luZyBgXCJhbGxcImAgd2lsbCBiaW5kXG4gICAgLy8gdGhlIGNhbGxiYWNrIHRvIGFsbCBldmVudHMgZmlyZWQuXG4gICAgb246IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb24nLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgICAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdIHx8ICh0aGlzLl9ldmVudHNbbmFtZV0gPSBbXSk7XG4gICAgICBldmVudHMucHVzaCh7Y2FsbGJhY2s6IGNhbGxiYWNrLCBjb250ZXh0OiBjb250ZXh0LCBjdHg6IGNvbnRleHQgfHwgdGhpc30pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIEJpbmQgYW4gZXZlbnQgdG8gb25seSBiZSB0cmlnZ2VyZWQgYSBzaW5nbGUgdGltZS4gQWZ0ZXIgdGhlIGZpcnN0IHRpbWVcbiAgICAvLyB0aGUgY2FsbGJhY2sgaXMgaW52b2tlZCwgaXQgd2lsbCBiZSByZW1vdmVkLlxuICAgIG9uY2U6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb25jZScsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgb25jZSA9IF8ub25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5vZmYobmFtZSwgb25jZSk7XG4gICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9KTtcbiAgICAgIG9uY2UuX2NhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICByZXR1cm4gdGhpcy5vbihuYW1lLCBvbmNlLCBjb250ZXh0KTtcbiAgICB9LFxuXG4gICAgLy8gUmVtb3ZlIG9uZSBvciBtYW55IGNhbGxiYWNrcy4gSWYgYGNvbnRleHRgIGlzIG51bGwsIHJlbW92ZXMgYWxsXG4gICAgLy8gY2FsbGJhY2tzIHdpdGggdGhhdCBmdW5jdGlvbi4gSWYgYGNhbGxiYWNrYCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAgIC8vIGNhbGxiYWNrcyBmb3IgdGhlIGV2ZW50LiBJZiBgbmFtZWAgaXMgbnVsbCwgcmVtb3ZlcyBhbGwgYm91bmRcbiAgICAvLyBjYWxsYmFja3MgZm9yIGFsbCBldmVudHMuXG4gICAgb2ZmOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgdmFyIHJldGFpbiwgZXYsIGV2ZW50cywgbmFtZXMsIGksIGwsIGosIGs7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhZXZlbnRzQXBpKHRoaXMsICdvZmYnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSkgcmV0dXJuIHRoaXM7XG4gICAgICBpZiAoIW5hbWUgJiYgIWNhbGxiYWNrICYmICFjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgbmFtZXMgPSBuYW1lID8gW25hbWVdIDogXy5rZXlzKHRoaXMuX2V2ZW50cyk7XG4gICAgICBmb3IgKGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgICAgaWYgKGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSkge1xuICAgICAgICAgIHRoaXMuX2V2ZW50c1tuYW1lXSA9IHJldGFpbiA9IFtdO1xuICAgICAgICAgIGlmIChjYWxsYmFjayB8fCBjb250ZXh0KSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwLCBrID0gZXZlbnRzLmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICAgICAgICBldiA9IGV2ZW50c1tqXTtcbiAgICAgICAgICAgICAgaWYgKChjYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrLl9jYWxsYmFjaykgfHxcbiAgICAgICAgICAgICAgICAgIChjb250ZXh0ICYmIGNvbnRleHQgIT09IGV2LmNvbnRleHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0YWluLnB1c2goZXYpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghcmV0YWluLmxlbmd0aCkgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gVHJpZ2dlciBvbmUgb3IgbWFueSBldmVudHMsIGZpcmluZyBhbGwgYm91bmQgY2FsbGJhY2tzLiBDYWxsYmFja3MgYXJlXG4gICAgLy8gcGFzc2VkIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyBgdHJpZ2dlcmAgaXMsIGFwYXJ0IGZyb20gdGhlIGV2ZW50IG5hbWVcbiAgICAvLyAodW5sZXNzIHlvdSdyZSBsaXN0ZW5pbmcgb24gYFwiYWxsXCJgLCB3aGljaCB3aWxsIGNhdXNlIHlvdXIgY2FsbGJhY2sgdG9cbiAgICAvLyByZWNlaXZlIHRoZSB0cnVlIG5hbWUgb2YgdGhlIGV2ZW50IGFzIHRoZSBmaXJzdCBhcmd1bWVudCkuXG4gICAgdHJpZ2dlcjogZnVuY3Rpb24obmFtZSkge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAndHJpZ2dlcicsIG5hbWUsIGFyZ3MpKSByZXR1cm4gdGhpcztcbiAgICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgICB2YXIgYWxsRXZlbnRzID0gdGhpcy5fZXZlbnRzLmFsbDtcbiAgICAgIGlmIChldmVudHMpIHRyaWdnZXJFdmVudHMoZXZlbnRzLCBhcmdzKTtcbiAgICAgIGlmIChhbGxFdmVudHMpIHRyaWdnZXJFdmVudHMoYWxsRXZlbnRzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIFRlbGwgdGhpcyBvYmplY3QgdG8gc3RvcCBsaXN0ZW5pbmcgdG8gZWl0aGVyIHNwZWNpZmljIGV2ZW50cyAuLi4gb3JcbiAgICAvLyB0byBldmVyeSBvYmplY3QgaXQncyBjdXJyZW50bHkgbGlzdGVuaW5nIHRvLlxuICAgIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoIWxpc3RlbmVycykgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgZGVsZXRlTGlzdGVuZXIgPSAhbmFtZSAmJiAhY2FsbGJhY2s7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgICBpZiAob2JqKSAobGlzdGVuZXJzID0ge30pW29iai5fbGlzdGVuZXJJZF0gPSBvYmo7XG4gICAgICBmb3IgKHZhciBpZCBpbiBsaXN0ZW5lcnMpIHtcbiAgICAgICAgbGlzdGVuZXJzW2lkXS5vZmYobmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuICAgICAgICBpZiAoZGVsZXRlTGlzdGVuZXIpIGRlbGV0ZSB0aGlzLl9saXN0ZW5lcnNbaWRdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gIH07XG5cbiAgLy8gUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gc3BsaXQgZXZlbnQgc3RyaW5ncy5cbiAgdmFyIGV2ZW50U3BsaXR0ZXIgPSAvXFxzKy87XG5cbiAgLy8gSW1wbGVtZW50IGZhbmN5IGZlYXR1cmVzIG9mIHRoZSBFdmVudHMgQVBJIHN1Y2ggYXMgbXVsdGlwbGUgZXZlbnRcbiAgLy8gbmFtZXMgYFwiY2hhbmdlIGJsdXJcImAgYW5kIGpRdWVyeS1zdHlsZSBldmVudCBtYXBzIGB7Y2hhbmdlOiBhY3Rpb259YFxuICAvLyBpbiB0ZXJtcyBvZiB0aGUgZXhpc3RpbmcgQVBJLlxuICB2YXIgZXZlbnRzQXBpID0gZnVuY3Rpb24ob2JqLCBhY3Rpb24sIG5hbWUsIHJlc3QpIHtcbiAgICBpZiAoIW5hbWUpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gSGFuZGxlIGV2ZW50IG1hcHMuXG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcbiAgICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBba2V5LCBuYW1lW2tleV1dLmNvbmNhdChyZXN0KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHNwYWNlIHNlcGFyYXRlZCBldmVudCBuYW1lcy5cbiAgICBpZiAoZXZlbnRTcGxpdHRlci50ZXN0KG5hbWUpKSB7XG4gICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KGV2ZW50U3BsaXR0ZXIpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBbbmFtZXNbaV1dLmNvbmNhdChyZXN0KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gQSBkaWZmaWN1bHQtdG8tYmVsaWV2ZSwgYnV0IG9wdGltaXplZCBpbnRlcm5hbCBkaXNwYXRjaCBmdW5jdGlvbiBmb3JcbiAgLy8gdHJpZ2dlcmluZyBldmVudHMuIFRyaWVzIHRvIGtlZXAgdGhlIHVzdWFsIGNhc2VzIHNwZWVkeSAobW9zdCBpbnRlcm5hbFxuICAvLyBCYWNrYm9uZSBldmVudHMgaGF2ZSAzIGFyZ3VtZW50cykuXG4gIHZhciB0cmlnZ2VyRXZlbnRzID0gZnVuY3Rpb24oZXZlbnRzLCBhcmdzKSB7XG4gICAgdmFyIGV2LCBpID0gLTEsIGwgPSBldmVudHMubGVuZ3RoLCBhMSA9IGFyZ3NbMF0sIGEyID0gYXJnc1sxXSwgYTMgPSBhcmdzWzJdO1xuICAgIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICAgIGNhc2UgMDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgpOyByZXR1cm47XG4gICAgICBjYXNlIDE6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSk7IHJldHVybjtcbiAgICAgIGNhc2UgMjogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMik7IHJldHVybjtcbiAgICAgIGNhc2UgMzogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMiwgYTMpOyByZXR1cm47XG4gICAgICBkZWZhdWx0OiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5hcHBseShldi5jdHgsIGFyZ3MpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgbGlzdGVuTWV0aG9kcyA9IHtsaXN0ZW5UbzogJ29uJywgbGlzdGVuVG9PbmNlOiAnb25jZSd9O1xuXG4gIC8vIEludmVyc2lvbi1vZi1jb250cm9sIHZlcnNpb25zIG9mIGBvbmAgYW5kIGBvbmNlYC4gVGVsbCAqdGhpcyogb2JqZWN0IHRvXG4gIC8vIGxpc3RlbiB0byBhbiBldmVudCBpbiBhbm90aGVyIG9iamVjdCAuLi4ga2VlcGluZyB0cmFjayBvZiB3aGF0IGl0J3NcbiAgLy8gbGlzdGVuaW5nIHRvLlxuICBfLmVhY2gobGlzdGVuTWV0aG9kcywgZnVuY3Rpb24oaW1wbGVtZW50YXRpb24sIG1ldGhvZCkge1xuICAgIEV2ZW50c1ttZXRob2RdID0gZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xuICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCAodGhpcy5fbGlzdGVuZXJzID0ge30pO1xuICAgICAgdmFyIGlkID0gb2JqLl9saXN0ZW5lcklkIHx8IChvYmouX2xpc3RlbmVySWQgPSBfLnVuaXF1ZUlkKCdsJykpO1xuICAgICAgbGlzdGVuZXJzW2lkXSA9IG9iajtcbiAgICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcbiAgICAgIG9ialtpbXBsZW1lbnRhdGlvbl0obmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWxpYXNlcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gIEV2ZW50cy5iaW5kICAgPSBFdmVudHMub247XG4gIEV2ZW50cy51bmJpbmQgPSBFdmVudHMub2ZmO1xuXG4gIC8vIE1peGluIHV0aWxpdHlcbiAgRXZlbnRzLm1peGluID0gZnVuY3Rpb24ocHJvdG8pIHtcbiAgICB2YXIgZXhwb3J0cyA9IFsnb24nLCAnb25jZScsICdvZmYnLCAndHJpZ2dlcicsICdzdG9wTGlzdGVuaW5nJywgJ2xpc3RlblRvJyxcbiAgICAgICAgICAgICAgICAgICAnbGlzdGVuVG9PbmNlJywgJ2JpbmQnLCAndW5iaW5kJ107XG4gICAgXy5lYWNoKGV4cG9ydHMsIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHByb3RvW25hbWVdID0gdGhpc1tuYW1lXTtcbiAgICB9LCB0aGlzKTtcbiAgICByZXR1cm4gcHJvdG87XG4gIH07XG5cbiAgLy8gRXhwb3J0IEV2ZW50cyBhcyBCYWNrYm9uZUV2ZW50cyBkZXBlbmRpbmcgb24gY3VycmVudCBjb250ZXh0XG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50cztcbiAgICB9XG4gICAgZXhwb3J0cy5CYWNrYm9uZUV2ZW50cyA9IEV2ZW50cztcbiAgfWVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBFdmVudHM7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5CYWNrYm9uZUV2ZW50cyA9IEV2ZW50cztcbiAgfVxufSkodGhpcyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vYmFja2JvbmUtZXZlbnRzLXN0YW5kYWxvbmUnKTtcbiIsInZhciBub2RlID0gcmVxdWlyZShcIi4vc3JjL25vZGUuanNcIik7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBub2RlO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXguanNcIik7XG4iLCIvLyByZXF1aXJlKCdmcycpLnJlYWRkaXJTeW5jKF9fZGlybmFtZSArICcvJykuZm9yRWFjaChmdW5jdGlvbihmaWxlKSB7XG4vLyAgICAgaWYgKGZpbGUubWF0Y2goLy4rXFwuanMvZykgIT09IG51bGwgJiYgZmlsZSAhPT0gX19maWxlbmFtZSkge1xuLy8gXHR2YXIgbmFtZSA9IGZpbGUucmVwbGFjZSgnLmpzJywgJycpO1xuLy8gXHRtb2R1bGUuZXhwb3J0c1tuYW1lXSA9IHJlcXVpcmUoJy4vJyArIGZpbGUpO1xuLy8gICAgIH1cbi8vIH0pO1xuXG4vLyBTYW1lIGFzXG52YXIgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy5qc1wiKTtcbnV0aWxzLnJlZHVjZSA9IHJlcXVpcmUoXCIuL3JlZHVjZS5qc1wiKTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHV0aWxzO1xuIiwidmFyIHJlZHVjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc21vb3RoID0gNTtcbiAgICB2YXIgdmFsdWUgPSAndmFsJztcbiAgICB2YXIgcmVkdW5kYW50ID0gZnVuY3Rpb24gKGEsIGIpIHtcblx0aWYgKGEgPCBiKSB7XG5cdCAgICByZXR1cm4gKChiLWEpIDw9IChiICogMC4yKSk7XG5cdH1cblx0cmV0dXJuICgoYS1iKSA8PSAoYSAqIDAuMikpO1xuICAgIH07XG4gICAgdmFyIHBlcmZvcm1fcmVkdWNlID0gZnVuY3Rpb24gKGFycikge3JldHVybiBhcnI7fTtcblxuICAgIHZhciByZWR1Y2UgPSBmdW5jdGlvbiAoYXJyKSB7XG5cdGlmICghYXJyLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGFycjtcblx0fVxuXHR2YXIgc21vb3RoZWQgPSBwZXJmb3JtX3Ntb290aChhcnIpO1xuXHR2YXIgcmVkdWNlZCAgPSBwZXJmb3JtX3JlZHVjZShzbW9vdGhlZCk7XG5cdHJldHVybiByZWR1Y2VkO1xuICAgIH07XG5cbiAgICB2YXIgbWVkaWFuID0gZnVuY3Rpb24gKHYsIGFycikge1xuXHRhcnIuc29ydChmdW5jdGlvbiAoYSwgYikge1xuXHQgICAgcmV0dXJuIGFbdmFsdWVdIC0gYlt2YWx1ZV07XG5cdH0pO1xuXHRpZiAoYXJyLmxlbmd0aCAlIDIpIHtcblx0ICAgIHZbdmFsdWVdID0gYXJyW35+KGFyci5sZW5ndGggLyAyKV1bdmFsdWVdO1x0ICAgIFxuXHR9IGVsc2Uge1xuXHQgICAgdmFyIG4gPSB+fihhcnIubGVuZ3RoIC8gMikgLSAxO1xuXHQgICAgdlt2YWx1ZV0gPSAoYXJyW25dW3ZhbHVlXSArIGFycltuKzFdW3ZhbHVlXSkgLyAyO1xuXHR9XG5cblx0cmV0dXJuIHY7XG4gICAgfTtcblxuICAgIHZhciBjbG9uZSA9IGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0dmFyIHRhcmdldCA9IHt9O1xuXHRmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuXHQgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuXHRcdHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcblx0ICAgIH1cblx0fVxuXHRyZXR1cm4gdGFyZ2V0O1xuICAgIH07XG5cbiAgICB2YXIgcGVyZm9ybV9zbW9vdGggPSBmdW5jdGlvbiAoYXJyKSB7XG5cdGlmIChzbW9vdGggPT09IDApIHsgLy8gbm8gc21vb3RoXG5cdCAgICByZXR1cm4gYXJyO1xuXHR9XG5cdHZhciBzbW9vdGhfYXJyID0gW107XG5cdGZvciAodmFyIGk9MDsgaTxhcnIubGVuZ3RoOyBpKyspIHtcblx0ICAgIHZhciBsb3cgPSAoaSA8IHNtb290aCkgPyAwIDogKGkgLSBzbW9vdGgpO1xuXHQgICAgdmFyIGhpZ2ggPSAoaSA+IChhcnIubGVuZ3RoIC0gc21vb3RoKSkgPyBhcnIubGVuZ3RoIDogKGkgKyBzbW9vdGgpO1xuXHQgICAgc21vb3RoX2FycltpXSA9IG1lZGlhbihjbG9uZShhcnJbaV0pLCBhcnIuc2xpY2UobG93LGhpZ2grMSkpO1xuXHR9XG5cdHJldHVybiBzbW9vdGhfYXJyO1xuICAgIH07XG5cbiAgICByZWR1Y2UucmVkdWNlciA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHBlcmZvcm1fcmVkdWNlO1xuXHR9XG5cdHBlcmZvcm1fcmVkdWNlID0gY2Jhaztcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnJlZHVuZGFudCA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHJlZHVuZGFudDtcblx0fVxuXHRyZWR1bmRhbnQgPSBjYmFrO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZWR1Y2UudmFsdWUgPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHZhbHVlO1xuXHR9XG5cdHZhbHVlID0gdmFsO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZWR1Y2Uuc21vb3RoID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBzbW9vdGg7XG5cdH1cblx0c21vb3RoID0gdmFsO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZXR1cm4gcmVkdWNlO1xufTtcblxudmFyIGJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZWQgPSByZWR1Y2UoKVxuXHQudmFsdWUoJ3N0YXJ0Jyk7XG5cbiAgICB2YXIgdmFsdWUyID0gJ2VuZCc7XG5cbiAgICB2YXIgam9pbiA9IGZ1bmN0aW9uIChvYmoxLCBvYmoyKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnb2JqZWN0JyA6IHtcbiAgICAgICAgICAgICAgICAnc3RhcnQnIDogb2JqMS5vYmplY3RbcmVkLnZhbHVlKCldLFxuICAgICAgICAgICAgICAgICdlbmQnICAgOiBvYmoyW3ZhbHVlMl1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndmFsdWUnICA6IG9iajJbdmFsdWUyXVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICAvLyB2YXIgam9pbiA9IGZ1bmN0aW9uIChvYmoxLCBvYmoyKSB7IHJldHVybiBvYmoxIH07XG5cbiAgICByZWQucmVkdWNlciggZnVuY3Rpb24gKGFycikge1xuXHR2YXIgdmFsdWUgPSByZWQudmFsdWUoKTtcblx0dmFyIHJlZHVuZGFudCA9IHJlZC5yZWR1bmRhbnQoKTtcblx0dmFyIHJlZHVjZWRfYXJyID0gW107XG5cdHZhciBjdXJyID0ge1xuXHQgICAgJ29iamVjdCcgOiBhcnJbMF0sXG5cdCAgICAndmFsdWUnICA6IGFyclswXVt2YWx1ZTJdXG5cdH07XG5cdGZvciAodmFyIGk9MTsgaTxhcnIubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChyZWR1bmRhbnQgKGFycltpXVt2YWx1ZV0sIGN1cnIudmFsdWUpKSB7XG5cdFx0Y3VyciA9IGpvaW4oY3VyciwgYXJyW2ldKTtcblx0XHRjb250aW51ZTtcblx0ICAgIH1cblx0ICAgIHJlZHVjZWRfYXJyLnB1c2ggKGN1cnIub2JqZWN0KTtcblx0ICAgIGN1cnIub2JqZWN0ID0gYXJyW2ldO1xuXHQgICAgY3Vyci52YWx1ZSA9IGFycltpXS5lbmQ7XG5cdH1cblx0cmVkdWNlZF9hcnIucHVzaChjdXJyLm9iamVjdCk7XG5cblx0Ly8gcmVkdWNlZF9hcnIucHVzaChhcnJbYXJyLmxlbmd0aC0xXSk7XG5cdHJldHVybiByZWR1Y2VkX2FycjtcbiAgICB9KTtcblxuICAgIHJlZHVjZS5qb2luID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gam9pbjtcblx0fVxuXHRqb2luID0gY2Jhaztcblx0cmV0dXJuIHJlZDtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnZhbHVlMiA9IGZ1bmN0aW9uIChmaWVsZCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB2YWx1ZTI7XG5cdH1cblx0dmFsdWUyID0gZmllbGQ7XG5cdHJldHVybiByZWQ7XG4gICAgfTtcblxuICAgIHJldHVybiByZWQ7XG59O1xuXG52YXIgbGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVkID0gcmVkdWNlKCk7XG5cbiAgICByZWQucmVkdWNlciAoIGZ1bmN0aW9uIChhcnIpIHtcblx0dmFyIHJlZHVuZGFudCA9IHJlZC5yZWR1bmRhbnQoKTtcblx0dmFyIHZhbHVlID0gcmVkLnZhbHVlKCk7XG5cdHZhciByZWR1Y2VkX2FyciA9IFtdO1xuXHR2YXIgY3VyciA9IGFyclswXTtcblx0Zm9yICh2YXIgaT0xOyBpPGFyci5sZW5ndGgtMTsgaSsrKSB7XG5cdCAgICBpZiAocmVkdW5kYW50IChhcnJbaV1bdmFsdWVdLCBjdXJyW3ZhbHVlXSkpIHtcblx0XHRjb250aW51ZTtcblx0ICAgIH1cblx0ICAgIHJlZHVjZWRfYXJyLnB1c2ggKGN1cnIpO1xuXHQgICAgY3VyciA9IGFycltpXTtcblx0fVxuXHRyZWR1Y2VkX2Fyci5wdXNoKGN1cnIpO1xuXHRyZWR1Y2VkX2Fyci5wdXNoKGFyclthcnIubGVuZ3RoLTFdKTtcblx0cmV0dXJuIHJlZHVjZWRfYXJyO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlZDtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSByZWR1Y2U7XG5tb2R1bGUuZXhwb3J0cy5saW5lID0gbGluZTtcbm1vZHVsZS5leHBvcnRzLmJsb2NrID0gYmxvY2s7XG5cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgaXRlcmF0b3IgOiBmdW5jdGlvbihpbml0X3ZhbCkge1xuXHR2YXIgaSA9IGluaXRfdmFsIHx8IDA7XG5cdHZhciBpdGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIGkrKztcblx0fTtcblx0cmV0dXJuIGl0ZXI7XG4gICAgfSxcblxuICAgIHNjcmlwdF9wYXRoIDogZnVuY3Rpb24gKHNjcmlwdF9uYW1lKSB7IC8vIHNjcmlwdF9uYW1lIGlzIHRoZSBmaWxlbmFtZVxuXHR2YXIgc2NyaXB0X3NjYXBlZCA9IHNjcmlwdF9uYW1lLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xuXHR2YXIgc2NyaXB0X3JlID0gbmV3IFJlZ0V4cChzY3JpcHRfc2NhcGVkICsgJyQnKTtcblx0dmFyIHNjcmlwdF9yZV9zdWIgPSBuZXcgUmVnRXhwKCcoLiopJyArIHNjcmlwdF9zY2FwZWQgKyAnJCcpO1xuXG5cdC8vIFRPRE86IFRoaXMgcmVxdWlyZXMgcGhhbnRvbS5qcyBvciBhIHNpbWlsYXIgaGVhZGxlc3Mgd2Via2l0IHRvIHdvcmsgKGRvY3VtZW50KVxuXHR2YXIgc2NyaXB0cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKTtcblx0dmFyIHBhdGggPSBcIlwiOyAgLy8gRGVmYXVsdCB0byBjdXJyZW50IHBhdGhcblx0aWYoc2NyaXB0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBmb3IodmFyIGkgaW4gc2NyaXB0cykge1xuXHRcdGlmKHNjcmlwdHNbaV0uc3JjICYmIHNjcmlwdHNbaV0uc3JjLm1hdGNoKHNjcmlwdF9yZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjcmlwdHNbaV0uc3JjLnJlcGxhY2Uoc2NyaXB0X3JlX3N1YiwgJyQxJyk7XG5cdFx0fVxuICAgICAgICAgICAgfVxuXHR9XG5cdHJldHVybiBwYXRoO1xuICAgIH0sXG5cbiAgICBkZWZlcl9jYW5jZWwgOiBmdW5jdGlvbiAoY2JhaywgdGltZSkge1xuXHR2YXIgdGljaztcblxuXHR2YXIgZGVmZXJfY2FuY2VsID0gZnVuY3Rpb24gKCkge1xuXHQgICAgY2xlYXJUaW1lb3V0KHRpY2spO1xuXHQgICAgdGljayA9IHNldFRpbWVvdXQoY2JhaywgdGltZSk7XG5cdH07XG5cblx0cmV0dXJuIGRlZmVyX2NhbmNlbDtcbiAgICB9XG59O1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG52YXIgaXRlcmF0b3IgPSByZXF1aXJlKFwidG50LnV0aWxzXCIpLml0ZXJhdG9yO1xuXG52YXIgdG50X25vZGUgPSBmdW5jdGlvbiAoZGF0YSkge1xuLy90bnQudHJlZS5ub2RlID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBub2RlID0gZnVuY3Rpb24gKCkge1xuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKG5vZGUpO1xuXG4gICAgLy8gQVBJXG4vLyAgICAgbm9kZS5ub2RlcyA9IGZ1bmN0aW9uKCkge1xuLy8gXHRpZiAoY2x1c3RlciA9PT0gdW5kZWZpbmVkKSB7XG4vLyBcdCAgICBjbHVzdGVyID0gZDMubGF5b3V0LmNsdXN0ZXIoKVxuLy8gXHQgICAgLy8gVE9ETzogbGVuZ3RoIGFuZCBjaGlsZHJlbiBzaG91bGQgYmUgZXhwb3NlZCBpbiB0aGUgQVBJXG4vLyBcdCAgICAvLyBpLmUuIHRoZSB1c2VyIHNob3VsZCBiZSBhYmxlIHRvIGNoYW5nZSB0aGlzIGRlZmF1bHRzIHZpYSB0aGUgQVBJXG4vLyBcdCAgICAvLyBjaGlsZHJlbiBpcyB0aGUgZGVmYXVsdHMgZm9yIHBhcnNlX25ld2ljaywgYnV0IG1heWJlIHdlIHNob3VsZCBjaGFuZ2UgdGhhdFxuLy8gXHQgICAgLy8gb3IgYXQgbGVhc3Qgbm90IGFzc3VtZSB0aGlzIGlzIGFsd2F5cyB0aGUgY2FzZSBmb3IgdGhlIGRhdGEgcHJvdmlkZWRcbi8vIFx0XHQudmFsdWUoZnVuY3Rpb24oZCkge3JldHVybiBkLmxlbmd0aH0pXG4vLyBcdFx0LmNoaWxkcmVuKGZ1bmN0aW9uKGQpIHtyZXR1cm4gZC5jaGlsZHJlbn0pO1xuLy8gXHR9XG4vLyBcdG5vZGVzID0gY2x1c3Rlci5ub2RlcyhkYXRhKTtcbi8vIFx0cmV0dXJuIG5vZGVzO1xuLy8gICAgIH07XG5cbiAgICB2YXIgYXBwbHlfdG9fZGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYmFrKSB7XG5cdGNiYWsoZGF0YSk7XG5cdGlmIChkYXRhLmNoaWxkcmVuICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxkYXRhLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0YXBwbHlfdG9fZGF0YShkYXRhLmNoaWxkcmVuW2ldLCBjYmFrKTtcblx0ICAgIH1cblx0fVxuICAgIH07XG5cbiAgICB2YXIgY3JlYXRlX2lkcyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGkgPSBpdGVyYXRvcigxKTtcblx0Ly8gV2UgY2FuJ3QgdXNlIGFwcGx5IGJlY2F1c2UgYXBwbHkgY3JlYXRlcyBuZXcgdHJlZXMgb24gZXZlcnkgbm9kZVxuXHQvLyBXZSBzaG91bGQgdXNlIHRoZSBkaXJlY3QgZGF0YSBpbnN0ZWFkXG5cdGFwcGx5X3RvX2RhdGEgKGRhdGEsIGZ1bmN0aW9uIChkKSB7XG5cdCAgICBpZiAoZC5faWQgPT09IHVuZGVmaW5lZCkge1xuXHRcdGQuX2lkID0gaSgpO1xuXHRcdC8vIFRPRE86IE5vdCBzdXJlIF9pblN1YlRyZWUgaXMgc3RyaWN0bHkgbmVjZXNzYXJ5XG5cdFx0Ly8gZC5faW5TdWJUcmVlID0ge3ByZXY6dHJ1ZSwgY3Vycjp0cnVlfTtcblx0ICAgIH1cblx0fSk7XG4gICAgfTtcblxuICAgIHZhciBsaW5rX3BhcmVudHMgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRpZiAoZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICByZXR1cm47XG5cdH1cblx0aWYgKGRhdGEuY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuXHQgICAgcmV0dXJuO1xuXHR9XG5cdGZvciAodmFyIGk9MDsgaTxkYXRhLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAvLyBfcGFyZW50P1xuXHQgICAgZGF0YS5jaGlsZHJlbltpXS5fcGFyZW50ID0gZGF0YTtcblx0ICAgIGxpbmtfcGFyZW50cyhkYXRhLmNoaWxkcmVuW2ldKTtcblx0fVxuICAgIH07XG5cbiAgICB2YXIgY29tcHV0ZV9yb290X2Rpc3RzID0gZnVuY3Rpb24gKGRhdGEpIHtcblx0Ly8gY29uc29sZS5sb2coZGF0YSk7XG5cdGFwcGx5X3RvX2RhdGEgKGRhdGEsIGZ1bmN0aW9uIChkKSB7XG5cdCAgICB2YXIgbDtcblx0ICAgIGlmIChkLl9wYXJlbnQgPT09IHVuZGVmaW5lZCkge1xuXHRcdGQuX3Jvb3RfZGlzdCA9IDA7XG5cdCAgICB9IGVsc2Uge1xuXHRcdHZhciBsID0gMDtcblx0XHRpZiAoZC5icmFuY2hfbGVuZ3RoKSB7XG5cdFx0ICAgIGwgPSBkLmJyYW5jaF9sZW5ndGhcblx0XHR9XG5cdFx0ZC5fcm9vdF9kaXN0ID0gbCArIGQuX3BhcmVudC5fcm9vdF9kaXN0O1xuXHQgICAgfVxuXHR9KTtcbiAgICB9O1xuXG4gICAgLy8gVE9ETzogZGF0YSBjYW4ndCBiZSByZXdyaXR0ZW4gdXNlZCB0aGUgYXBpIHlldC4gV2UgbmVlZCBmaW5hbGl6ZXJzXG4gICAgbm9kZS5kYXRhID0gZnVuY3Rpb24obmV3X2RhdGEpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gZGF0YVxuXHR9XG5cdGRhdGEgPSBuZXdfZGF0YTtcblx0Y3JlYXRlX2lkcygpO1xuXHRsaW5rX3BhcmVudHMoZGF0YSk7XG5cdGNvbXB1dGVfcm9vdF9kaXN0cyhkYXRhKTtcblx0cmV0dXJuIG5vZGU7XG4gICAgfTtcbiAgICAvLyBXZSBiaW5kIHRoZSBkYXRhIHRoYXQgaGFzIGJlZW4gcGFzc2VkXG4gICAgbm9kZS5kYXRhKGRhdGEpO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2ZpbmRfYWxsJywgZnVuY3Rpb24gKGNiYWssIGRlZXApIHtcblx0dmFyIG5vZGVzID0gW107XG5cdG5vZGUuYXBwbHkgKGZ1bmN0aW9uIChuKSB7XG5cdCAgICBpZiAoY2JhayhuKSkge1xuXHRcdG5vZGVzLnB1c2ggKG4pO1xuXHQgICAgfVxuXHR9KTtcblx0cmV0dXJuIG5vZGVzO1xuICAgIH0pO1xuICAgIFxuICAgIGFwaS5tZXRob2QgKCdmaW5kX25vZGUnLCBmdW5jdGlvbiAoY2JhaywgZGVlcCkge1xuXHRpZiAoY2Jhayhub2RlKSkge1xuXHQgICAgcmV0dXJuIG5vZGU7XG5cdH1cblxuXHRpZiAoZGF0YS5jaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBmb3IgKHZhciBqPTA7IGo8ZGF0YS5jaGlsZHJlbi5sZW5ndGg7IGorKykge1xuXHRcdHZhciBmb3VuZCA9IHRudF9ub2RlKGRhdGEuY2hpbGRyZW5bal0pLmZpbmRfbm9kZShjYmFrKTtcblx0XHRpZiAoZm91bmQpIHtcblx0XHQgICAgcmV0dXJuIGZvdW5kO1xuXHRcdH1cblx0ICAgIH1cblx0fVxuXG5cdGlmIChkZWVwICYmIChkYXRhLl9jaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPGRhdGEuX2NoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0dG50X25vZGUoZGF0YS5fY2hpbGRyZW5baV0pLmZpbmRfbm9kZShjYmFrKVxuXHRcdHZhciBmb3VuZCA9IHRudF9ub2RlKGRhdGEuY2hpbGRyZW5bal0pLmZpbmRfbm9kZShjYmFrKTtcblx0XHRpZiAoZm91bmQpIHtcblx0XHQgICAgcmV0dXJuIGZvdW5kO1xuXHRcdH1cblx0ICAgIH1cblx0fVxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2ZpbmRfbm9kZV9ieV9uYW1lJywgZnVuY3Rpb24obmFtZSkge1xuXHRyZXR1cm4gbm9kZS5maW5kX25vZGUgKGZ1bmN0aW9uIChub2RlKSB7XG5cdCAgICByZXR1cm4gbm9kZS5ub2RlX25hbWUoKSA9PT0gbmFtZVxuXHR9KTtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCd0b2dnbGUnLCBmdW5jdGlvbigpIHtcblx0aWYgKGRhdGEpIHtcblx0ICAgIGlmIChkYXRhLmNoaWxkcmVuKSB7IC8vIFVuY29sbGFwc2VkIC0+IGNvbGxhcHNlXG5cdFx0dmFyIGhpZGRlbiA9IDA7XG5cdFx0bm9kZS5hcHBseSAoZnVuY3Rpb24gKG4pIHtcblx0XHQgICAgdmFyIGhpZGRlbl9oZXJlID0gbi5uX2hpZGRlbigpIHx8IDA7XG5cdFx0ICAgIGhpZGRlbiArPSAobi5uX2hpZGRlbigpIHx8IDApICsgMTtcblx0XHR9KTtcblx0XHRub2RlLm5faGlkZGVuIChoaWRkZW4tMSk7XG5cdFx0ZGF0YS5fY2hpbGRyZW4gPSBkYXRhLmNoaWxkcmVuO1xuXHRcdGRhdGEuY2hpbGRyZW4gPSB1bmRlZmluZWQ7XG5cdCAgICB9IGVsc2UgeyAgICAgICAgICAgICAvLyBDb2xsYXBzZWQgLT4gdW5jb2xsYXBzZVxuXHRcdG5vZGUubl9oaWRkZW4oMCk7XG5cdFx0ZGF0YS5jaGlsZHJlbiA9IGRhdGEuX2NoaWxkcmVuO1xuXHRcdGRhdGEuX2NoaWxkcmVuID0gdW5kZWZpbmVkO1xuXHQgICAgfVxuXHR9XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnaXNfY29sbGFwc2VkJywgZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gKGRhdGEuX2NoaWxkcmVuICE9PSB1bmRlZmluZWQgJiYgZGF0YS5jaGlsZHJlbiA9PT0gdW5kZWZpbmVkKTtcbiAgICB9KTtcblxuICAgIHZhciBoYXNfYW5jZXN0b3IgPSBmdW5jdGlvbihuLCBhbmNlc3Rvcikge1xuXHQvLyBJdCBpcyBiZXR0ZXIgdG8gd29yayBhdCB0aGUgZGF0YSBsZXZlbFxuXHRuID0gbi5kYXRhKCk7XG5cdGFuY2VzdG9yID0gYW5jZXN0b3IuZGF0YSgpO1xuXHRpZiAobi5fcGFyZW50ID09PSB1bmRlZmluZWQpIHtcblx0ICAgIHJldHVybiBmYWxzZVxuXHR9XG5cdG4gPSBuLl9wYXJlbnRcblx0Zm9yICg7Oykge1xuXHQgICAgaWYgKG4gPT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0ICAgIH1cblx0ICAgIGlmIChuID09PSBhbmNlc3Rvcikge1xuXHRcdHJldHVybiB0cnVlO1xuXHQgICAgfVxuXHQgICAgbiA9IG4uX3BhcmVudDtcblx0fVxuICAgIH07XG5cbiAgICAvLyBUaGlzIGlzIHRoZSBlYXNpZXN0IHdheSB0byBjYWxjdWxhdGUgdGhlIExDQSBJIGNhbiB0aGluayBvZi4gQnV0IGl0IGlzIHZlcnkgaW5lZmZpY2llbnQgdG9vLlxuICAgIC8vIEl0IGlzIHdvcmtpbmcgZmluZSBieSBub3csIGJ1dCBpbiBjYXNlIGl0IG5lZWRzIHRvIGJlIG1vcmUgcGVyZm9ybWFudCB3ZSBjYW4gaW1wbGVtZW50IHRoZSBMQ0FcbiAgICAvLyBhbGdvcml0aG0gZXhwbGFpbmVkIGhlcmU6XG4gICAgLy8gaHR0cDovL2NvbW11bml0eS50b3Bjb2Rlci5jb20vdGM/bW9kdWxlPVN0YXRpYyZkMT10dXRvcmlhbHMmZDI9bG93ZXN0Q29tbW9uQW5jZXN0b3JcbiAgICBhcGkubWV0aG9kICgnbGNhJywgZnVuY3Rpb24gKG5vZGVzKSB7XG5cdGlmIChub2Rlcy5sZW5ndGggPT09IDEpIHtcblx0ICAgIHJldHVybiBub2Rlc1swXTtcblx0fVxuXHR2YXIgbGNhX25vZGUgPSBub2Rlc1swXTtcblx0Zm9yICh2YXIgaSA9IDE7IGk8bm9kZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGxjYV9ub2RlID0gX2xjYShsY2Ffbm9kZSwgbm9kZXNbaV0pO1xuXHR9XG5cdHJldHVybiBsY2Ffbm9kZTtcblx0Ly8gcmV0dXJuIHRudF9ub2RlKGxjYV9ub2RlKTtcbiAgICB9KTtcblxuICAgIHZhciBfbGNhID0gZnVuY3Rpb24obm9kZTEsIG5vZGUyKSB7XG5cdGlmIChub2RlMS5kYXRhKCkgPT09IG5vZGUyLmRhdGEoKSkge1xuXHQgICAgcmV0dXJuIG5vZGUxO1xuXHR9XG5cdGlmIChoYXNfYW5jZXN0b3Iobm9kZTEsIG5vZGUyKSkge1xuXHQgICAgcmV0dXJuIG5vZGUyO1xuXHR9XG5cdHJldHVybiBfbGNhKG5vZGUxLCBub2RlMi5wYXJlbnQoKSk7XG4gICAgfTtcblxuICAgIGFwaS5tZXRob2QoJ25faGlkZGVuJywgZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBub2RlLnByb3BlcnR5KCdfaGlkZGVuJyk7XG5cdH1cblx0bm9kZS5wcm9wZXJ0eSgnX2hpZGRlbicsIHZhbCk7XG5cdHJldHVybiBub2RlXG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnZ2V0X2FsbF9ub2RlcycsIGZ1bmN0aW9uICgpIHtcblx0dmFyIG5vZGVzID0gW107XG5cdG5vZGUuYXBwbHkoZnVuY3Rpb24gKG4pIHtcblx0ICAgIG5vZGVzLnB1c2gobik7XG5cdH0pO1xuXHRyZXR1cm4gbm9kZXM7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnZ2V0X2FsbF9sZWF2ZXMnLCBmdW5jdGlvbiAoKSB7XG5cdHZhciBsZWF2ZXMgPSBbXTtcblx0bm9kZS5hcHBseShmdW5jdGlvbiAobikge1xuXHQgICAgaWYgKG4uaXNfbGVhZigpKSB7XG5cdFx0bGVhdmVzLnB1c2gobik7XG5cdCAgICB9XG5cdH0pO1xuXHRyZXR1cm4gbGVhdmVzO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3Vwc3RyZWFtJywgZnVuY3Rpb24oY2Jhaykge1xuXHRjYmFrKG5vZGUpO1xuXHR2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKTtcblx0aWYgKHBhcmVudCAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBwYXJlbnQudXBzdHJlYW0oY2Jhayk7XG5cdH1cbi8vXHR0bnRfbm9kZShwYXJlbnQpLnVwc3RyZWFtKGNiYWspO1xuLy8gXHRub2RlLnVwc3RyZWFtKG5vZGUuX3BhcmVudCwgY2Jhayk7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnc3VidHJlZScsIGZ1bmN0aW9uKG5vZGVzKSB7XG4gICAgXHR2YXIgbm9kZV9jb3VudHMgPSB7fTtcbiAgICBcdGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIG4gPSBub2Rlc1tpXTtcblx0ICAgIGlmIChuICE9PSB1bmRlZmluZWQpIHtcblx0XHRuLnVwc3RyZWFtIChmdW5jdGlvbiAodGhpc19ub2RlKXtcblx0XHQgICAgdmFyIGlkID0gdGhpc19ub2RlLmlkKCk7XG5cdFx0ICAgIGlmIChub2RlX2NvdW50c1tpZF0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bm9kZV9jb3VudHNbaWRdID0gMDtcblx0XHQgICAgfVxuXHRcdCAgICBub2RlX2NvdW50c1tpZF0rK1xuICAgIFx0XHR9KTtcblx0ICAgIH1cbiAgICBcdH1cbiAgICBcblxuXHR2YXIgaXNfc2luZ2xldG9uID0gZnVuY3Rpb24gKG5vZGVfZGF0YSkge1xuXHQgICAgdmFyIG5fY2hpbGRyZW4gPSAwO1xuXHQgICAgaWYgKG5vZGVfZGF0YS5jaGlsZHJlbiA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHQgICAgfVxuXHQgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVfZGF0YS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBpZCA9IG5vZGVfZGF0YS5jaGlsZHJlbltpXS5faWQ7XG5cdFx0aWYgKG5vZGVfY291bnRzW2lkXSA+IDApIHtcblx0XHQgICAgbl9jaGlsZHJlbisrO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBuX2NoaWxkcmVuID09PSAxO1xuXHR9O1xuXG5cdHZhciBzdWJ0cmVlID0ge307XG5cdGNvcHlfZGF0YSAoZGF0YSwgc3VidHJlZSwgZnVuY3Rpb24gKG5vZGVfZGF0YSkge1xuXHQgICAgdmFyIG5vZGVfaWQgPSBub2RlX2RhdGEuX2lkO1xuXHQgICAgdmFyIGNvdW50cyA9IG5vZGVfY291bnRzW25vZGVfaWRdO1xuXG5cdCAgICBpZiAoY291bnRzID09PSB1bmRlZmluZWQpIHtcblx0ICAgIFx0cmV0dXJuIGZhbHNlO1xuXHQgICAgfVxuLy8gXHQgICAgaWYgKChub2RlLmNoaWxkcmVuICE9PSB1bmRlZmluZWQpICYmIChub2RlLmNoaWxkcmVuLmxlbmd0aCA8IDIpKSB7XG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHQgICAgfVxuXHQgICAgaWYgKChjb3VudHMgPiAxKSAmJiAoIWlzX3NpbmdsZXRvbihub2RlX2RhdGEpKSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHQgICAgfVxuXHQgICAgaWYgKChjb3VudHMgPiAwKSAmJiAobm9kZV9kYXRhLmNoaWxkcmVuID09PSB1bmRlZmluZWQpKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gZmFsc2U7XG5cdH0pO1xuXG5cdHJldHVybiB0bnRfbm9kZShzdWJ0cmVlLmNoaWxkcmVuWzBdKTtcbiAgICB9KTtcblxuICAgIHZhciBjb3B5X2RhdGEgPSBmdW5jdGlvbiAob3JpZ19kYXRhLCBzdWJ0cmVlLCBjb25kaXRpb24pIHtcbiAgICAgICAgaWYgKG9yaWdfZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZGl0aW9uKG9yaWdfZGF0YSkpIHtcblx0ICAgIHZhciBjb3B5ID0gY29weV9ub2RlKG9yaWdfZGF0YSk7XG5cdCAgICBpZiAoc3VidHJlZS5jaGlsZHJlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgc3VidHJlZS5jaGlsZHJlbiA9IFtdO1xuXHQgICAgfVxuXHQgICAgc3VidHJlZS5jaGlsZHJlbi5wdXNoKGNvcHkpO1xuXHQgICAgaWYgKG9yaWdfZGF0YS5jaGlsZHJlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXHQgICAgfVxuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcmlnX2RhdGEuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb3B5X2RhdGEgKG9yaWdfZGF0YS5jaGlsZHJlbltpXSwgY29weSwgY29uZGl0aW9uKTtcblx0ICAgIH1cbiAgICAgICAgfSBlbHNlIHtcblx0ICAgIGlmIChvcmlnX2RhdGEuY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcblx0ICAgIH1cblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JpZ19kYXRhLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29weV9kYXRhKG9yaWdfZGF0YS5jaGlsZHJlbltpXSwgc3VidHJlZSwgY29uZGl0aW9uKTtcblx0ICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY29weV9ub2RlID0gZnVuY3Rpb24gKG5vZGVfZGF0YSkge1xuXHR2YXIgY29weSA9IHt9O1xuXHQvLyBjb3B5IGFsbCB0aGUgb3duIHByb3BlcnRpZXMgZXhjZXB0cyBsaW5rcyB0byBvdGhlciBub2RlcyBvciBkZXB0aFxuXHRmb3IgKHZhciBwYXJhbSBpbiBub2RlX2RhdGEpIHtcblx0ICAgIGlmICgocGFyYW0gPT09IFwiY2hpbGRyZW5cIikgfHxcblx0XHQocGFyYW0gPT09IFwiX2NoaWxkcmVuXCIpIHx8XG5cdFx0KHBhcmFtID09PSBcIl9wYXJlbnRcIikgfHxcblx0XHQocGFyYW0gPT09IFwiZGVwdGhcIikpIHtcblx0XHRjb250aW51ZTtcblx0ICAgIH1cblx0ICAgIGlmIChub2RlX2RhdGEuaGFzT3duUHJvcGVydHkocGFyYW0pKSB7XG5cdFx0Y29weVtwYXJhbV0gPSBub2RlX2RhdGFbcGFyYW1dO1xuXHQgICAgfVxuXHR9XG5cdHJldHVybiBjb3B5O1xuICAgIH07XG5cbiAgICBcbiAgICAvLyBUT0RPOiBUaGlzIG1ldGhvZCB2aXNpdHMgYWxsIHRoZSBub2Rlc1xuICAgIC8vIGEgbW9yZSBwZXJmb3JtYW50IHZlcnNpb24gc2hvdWxkIHJldHVybiB0cnVlXG4gICAgLy8gdGhlIGZpcnN0IHRpbWUgY2Jhayhub2RlKSBpcyB0cnVlXG4gICAgYXBpLm1ldGhvZCAoJ3ByZXNlbnQnLCBmdW5jdGlvbiAoY2Jhaykge1xuXHQvLyBjYmFrIHNob3VsZCByZXR1cm4gdHJ1ZS9mYWxzZVxuXHR2YXIgaXNfdHJ1ZSA9IGZhbHNlO1xuXHRub2RlLmFwcGx5IChmdW5jdGlvbiAobikge1xuXHQgICAgaWYgKGNiYWsobikgPT09IHRydWUpIHtcblx0XHRpc190cnVlID0gdHJ1ZTtcblx0ICAgIH1cblx0fSk7XG5cdHJldHVybiBpc190cnVlO1xuICAgIH0pO1xuXG4gICAgLy8gY2JhayBpcyBjYWxsZWQgd2l0aCB0d28gbm9kZXNcbiAgICAvLyBhbmQgc2hvdWxkIHJldHVybiBhIG5lZ2F0aXZlIG51bWJlciwgMCBvciBhIHBvc2l0aXZlIG51bWJlclxuICAgIGFwaS5tZXRob2QgKCdzb3J0JywgZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKGRhdGEuY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuXHQgICAgcmV0dXJuO1xuXHR9XG5cblx0dmFyIG5ld19jaGlsZHJlbiA9IFtdO1xuXHRmb3IgKHZhciBpPTA7IGk8ZGF0YS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHQgICAgbmV3X2NoaWxkcmVuLnB1c2godG50X25vZGUoZGF0YS5jaGlsZHJlbltpXSkpO1xuXHR9XG5cblx0bmV3X2NoaWxkcmVuLnNvcnQoY2Jhayk7XG5cblx0ZGF0YS5jaGlsZHJlbiA9IFtdO1xuXHRmb3IgKHZhciBpPTA7IGk8bmV3X2NoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBkYXRhLmNoaWxkcmVuLnB1c2gobmV3X2NoaWxkcmVuW2ldLmRhdGEoKSk7XG5cdH1cblxuXHRmb3IgKHZhciBpPTA7IGk8ZGF0YS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHQgICAgdG50X25vZGUoZGF0YS5jaGlsZHJlbltpXSkuc29ydChjYmFrKTtcblx0fVxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2ZsYXR0ZW4nLCBmdW5jdGlvbiAoKSB7XG5cdGlmIChub2RlLmlzX2xlYWYoKSkge1xuXHQgICAgcmV0dXJuIG5vZGU7XG5cdH1cblx0dmFyIGRhdGEgPSBub2RlLmRhdGEoKTtcblx0dmFyIG5ld3Jvb3QgPSBjb3B5X25vZGUoZGF0YSk7XG5cdHZhciBsZWF2ZXMgPSBub2RlLmdldF9hbGxfbGVhdmVzKCk7XG5cdG5ld3Jvb3QuY2hpbGRyZW4gPSBbXTtcblx0Zm9yICh2YXIgaT0wOyBpPGxlYXZlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgbmV3cm9vdC5jaGlsZHJlbi5wdXNoKGNvcHlfbm9kZShsZWF2ZXNbaV0uZGF0YSgpKSk7XG5cdH1cblxuXHRyZXR1cm4gdG50X25vZGUobmV3cm9vdCk7XG4gICAgfSk7XG5cbiAgICBcbiAgICAvLyBUT0RPOiBUaGlzIG1ldGhvZCBvbmx5ICdhcHBseSdzIHRvIG5vbiBjb2xsYXBzZWQgbm9kZXMgKGllIC5fY2hpbGRyZW4gaXMgbm90IHZpc2l0ZWQpXG4gICAgLy8gV291bGQgaXQgYmUgYmV0dGVyIHRvIGhhdmUgYW4gZXh0cmEgZmxhZyAodHJ1ZS9mYWxzZSkgdG8gdmlzaXQgYWxzbyBjb2xsYXBzZWQgbm9kZXM/XG4gICAgYXBpLm1ldGhvZCAoJ2FwcGx5JywgZnVuY3Rpb24oY2Jhaykge1xuXHRjYmFrKG5vZGUpO1xuXHRpZiAoZGF0YS5jaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8ZGF0YS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBuID0gdG50X25vZGUoZGF0YS5jaGlsZHJlbltpXSlcblx0XHRuLmFwcGx5KGNiYWspO1xuXHQgICAgfVxuXHR9XG4gICAgfSk7XG5cbiAgICAvLyBUT0RPOiBOb3Qgc3VyZSBpZiBpdCBtYWtlcyBzZW5zZSB0byBzZXQgdmlhIGEgY2FsbGJhY2s6XG4gICAgLy8gcm9vdC5wcm9wZXJ0eSAoZnVuY3Rpb24gKG5vZGUsIHZhbCkge1xuICAgIC8vICAgIG5vZGUuZGVlcGVyLmZpZWxkID0gdmFsXG4gICAgLy8gfSwgJ25ld192YWx1ZScpXG4gICAgYXBpLm1ldGhvZCAoJ3Byb3BlcnR5JywgZnVuY3Rpb24ocHJvcCwgdmFsdWUpIHtcblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcblx0ICAgIGlmICgodHlwZW9mIHByb3ApID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0cmV0dXJuIHByb3AoZGF0YSlcdFxuXHQgICAgfVxuXHQgICAgcmV0dXJuIGRhdGFbcHJvcF1cblx0fVxuXHRpZiAoKHR5cGVvZiBwcm9wKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgcHJvcChkYXRhLCB2YWx1ZSk7ICAgXG5cdH1cblx0ZGF0YVtwcm9wXSA9IHZhbHVlO1xuXHRyZXR1cm4gbm9kZTtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdpc19sZWFmJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBkYXRhLmNoaWxkcmVuID09PSB1bmRlZmluZWQ7XG4gICAgfSk7XG5cbiAgICAvLyBJdCBsb29rcyBsaWtlIHRoZSBjbHVzdGVyIGNhbid0IGJlIHVzZWQgZm9yIGFueXRoaW5nIHVzZWZ1bCBoZXJlXG4gICAgLy8gSXQgaXMgbm93IGluY2x1ZGVkIGFzIGFuIG9wdGlvbmFsIHBhcmFtZXRlciB0byB0aGUgdG50LnRyZWUoKSBtZXRob2QgY2FsbFxuICAgIC8vIHNvIEknbSBjb21tZW50aW5nIHRoZSBnZXR0ZXJcbiAgICAvLyBub2RlLmNsdXN0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBcdHJldHVybiBjbHVzdGVyO1xuICAgIC8vIH07XG5cbiAgICAvLyBub2RlLmRlcHRoID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAvLyAgICAgcmV0dXJuIG5vZGUuZGVwdGg7XG4gICAgLy8gfTtcblxuLy8gICAgIG5vZGUubmFtZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4vLyAgICAgICAgIHJldHVybiBub2RlLm5hbWU7XG4vLyAgICAgfTtcblxuICAgIGFwaS5tZXRob2QgKCdpZCcsIGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIG5vZGUucHJvcGVydHkoJ19pZCcpO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ25vZGVfbmFtZScsIGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIG5vZGUucHJvcGVydHkoJ25hbWUnKTtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdicmFuY2hfbGVuZ3RoJywgZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gbm9kZS5wcm9wZXJ0eSgnYnJhbmNoX2xlbmd0aCcpO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3Jvb3RfZGlzdCcsIGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIG5vZGUucHJvcGVydHkoJ19yb290X2Rpc3QnKTtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdjaGlsZHJlbicsIGZ1bmN0aW9uICgpIHtcblx0aWYgKGRhdGEuY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuXHQgICAgcmV0dXJuO1xuXHR9XG5cdHZhciBjaGlsZHJlbiA9IFtdO1xuXHRmb3IgKHZhciBpPTA7IGk8ZGF0YS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHQgICAgY2hpbGRyZW4ucHVzaCh0bnRfbm9kZShkYXRhLmNoaWxkcmVuW2ldKSk7XG5cdH1cblx0cmV0dXJuIGNoaWxkcmVuO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3BhcmVudCcsIGZ1bmN0aW9uICgpIHtcblx0aWYgKGRhdGEuX3BhcmVudCA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICByZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cdHJldHVybiB0bnRfbm9kZShkYXRhLl9wYXJlbnQpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGU7XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9ub2RlO1xuXG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlKCd0bnQuYXBpJyk7XG52YXIgdHJlZSA9IHt9O1xuXG50cmVlLmRpYWdvbmFsID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkID0gZnVuY3Rpb24gKGRpYWdvbmFsUGF0aCkge1xuXHR2YXIgc291cmNlID0gZGlhZ29uYWxQYXRoLnNvdXJjZTtcbiAgICAgICAgdmFyIHRhcmdldCA9IGRpYWdvbmFsUGF0aC50YXJnZXQ7XG4gICAgICAgIHZhciBtaWRwb2ludFggPSAoc291cmNlLnggKyB0YXJnZXQueCkgLyAyO1xuICAgICAgICB2YXIgbWlkcG9pbnRZID0gKHNvdXJjZS55ICsgdGFyZ2V0LnkpIC8gMjtcbiAgICAgICAgdmFyIHBhdGhEYXRhID0gW3NvdXJjZSwge3g6IHRhcmdldC54LCB5OiBzb3VyY2UueX0sIHRhcmdldF07XG5cdHBhdGhEYXRhID0gcGF0aERhdGEubWFwKGQucHJvamVjdGlvbigpKTtcblx0cmV0dXJuIGQucGF0aCgpKHBhdGhEYXRhLCByYWRpYWxfY2FsYy5jYWxsKHRoaXMscGF0aERhdGEpKVxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGQpXG5cdC5nZXRzZXQgKCdwcm9qZWN0aW9uJylcblx0LmdldHNldCAoJ3BhdGgnKVxuICAgIFxuICAgIHZhciBjb29yZGluYXRlVG9BbmdsZSA9IGZ1bmN0aW9uIChjb29yZCwgcmFkaXVzKSB7XG4gICAgICBcdHZhciB3aG9sZUFuZ2xlID0gMiAqIE1hdGguUEksXG4gICAgICAgIHF1YXJ0ZXJBbmdsZSA9IHdob2xlQW5nbGUgLyA0XG5cdFxuICAgICAgXHR2YXIgY29vcmRRdWFkID0gY29vcmRbMF0gPj0gMCA/IChjb29yZFsxXSA+PSAwID8gMSA6IDIpIDogKGNvb3JkWzFdID49IDAgPyA0IDogMyksXG4gICAgICAgIGNvb3JkQmFzZUFuZ2xlID0gTWF0aC5hYnMoTWF0aC5hc2luKGNvb3JkWzFdIC8gcmFkaXVzKSlcblx0XG4gICAgICBcdC8vIFNpbmNlIHRoaXMgaXMganVzdCBiYXNlZCBvbiB0aGUgYW5nbGUgb2YgdGhlIHJpZ2h0IHRyaWFuZ2xlIGZvcm1lZFxuICAgICAgXHQvLyBieSB0aGUgY29vcmRpbmF0ZSBhbmQgdGhlIG9yaWdpbiwgZWFjaCBxdWFkIHdpbGwgaGF2ZSBkaWZmZXJlbnQgXG4gICAgICBcdC8vIG9mZnNldHNcbiAgICAgIFx0dmFyIGNvb3JkQW5nbGU7XG4gICAgICBcdHN3aXRjaCAoY29vcmRRdWFkKSB7XG4gICAgICBcdGNhc2UgMTpcbiAgICAgIFx0ICAgIGNvb3JkQW5nbGUgPSBxdWFydGVyQW5nbGUgLSBjb29yZEJhc2VBbmdsZVxuICAgICAgXHQgICAgYnJlYWtcbiAgICAgIFx0Y2FzZSAyOlxuICAgICAgXHQgICAgY29vcmRBbmdsZSA9IHF1YXJ0ZXJBbmdsZSArIGNvb3JkQmFzZUFuZ2xlXG4gICAgICBcdCAgICBicmVha1xuICAgICAgXHRjYXNlIDM6XG4gICAgICBcdCAgICBjb29yZEFuZ2xlID0gMipxdWFydGVyQW5nbGUgKyBxdWFydGVyQW5nbGUgLSBjb29yZEJhc2VBbmdsZVxuICAgICAgXHQgICAgYnJlYWtcbiAgICAgIFx0Y2FzZSA0OlxuICAgICAgXHQgICAgY29vcmRBbmdsZSA9IDMqcXVhcnRlckFuZ2xlICsgY29vcmRCYXNlQW5nbGVcbiAgICAgIFx0fVxuICAgICAgXHRyZXR1cm4gY29vcmRBbmdsZVxuICAgIH07XG5cbiAgICB2YXIgcmFkaWFsX2NhbGMgPSBmdW5jdGlvbiAocGF0aERhdGEpIHtcblx0dmFyIHNyYyA9IHBhdGhEYXRhWzBdO1xuXHR2YXIgbWlkID0gcGF0aERhdGFbMV07XG5cdHZhciBkc3QgPSBwYXRoRGF0YVsyXTtcblx0dmFyIHJhZGl1cyA9IE1hdGguc3FydChzcmNbMF0qc3JjWzBdICsgc3JjWzFdKnNyY1sxXSk7XG5cdHZhciBzcmNBbmdsZSA9IGNvb3JkaW5hdGVUb0FuZ2xlKHNyYywgcmFkaXVzKTtcblx0dmFyIG1pZEFuZ2xlID0gY29vcmRpbmF0ZVRvQW5nbGUobWlkLCByYWRpdXMpO1xuXHR2YXIgY2xvY2t3aXNlID0gTWF0aC5hYnMobWlkQW5nbGUgLSBzcmNBbmdsZSkgPiBNYXRoLlBJID8gbWlkQW5nbGUgPD0gc3JjQW5nbGUgOiBtaWRBbmdsZSA+IHNyY0FuZ2xlO1xuXHRyZXR1cm4ge1xuXHQgICAgcmFkaXVzICAgOiByYWRpdXMsXG5cdCAgICBjbG9ja3dpc2UgOiBjbG9ja3dpc2Vcblx0fTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGQ7XG59O1xuXG4vLyB2ZXJ0aWNhbCBkaWFnb25hbCBmb3IgcmVjdCBicmFuY2hlc1xudHJlZS5kaWFnb25hbC52ZXJ0aWNhbCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGF0aCA9IGZ1bmN0aW9uKHBhdGhEYXRhLCBvYmopIHtcblx0dmFyIHNyYyA9IHBhdGhEYXRhWzBdO1xuXHR2YXIgbWlkID0gcGF0aERhdGFbMV07XG5cdHZhciBkc3QgPSBwYXRoRGF0YVsyXTtcblx0dmFyIHJhZGl1cyA9IDIwMDAwMDsgLy8gTnVtYmVyIGxvbmcgZW5vdWdoXG5cblx0cmV0dXJuIFwiTVwiICsgc3JjICsgXCIgQVwiICsgW3JhZGl1cyxyYWRpdXNdICsgXCIgMCAwLDAgXCIgKyBtaWQgKyBcIk1cIiArIG1pZCArIFwiTFwiICsgZHN0OyBcblx0XG4gICAgfTtcblxuICAgIHZhciBwcm9qZWN0aW9uID0gZnVuY3Rpb24oZCkgeyBcblx0cmV0dXJuIFtkLnksIGQueF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyZWUuZGlhZ29uYWwoKVxuICAgICAgXHQucGF0aChwYXRoKVxuICAgICAgXHQucHJvamVjdGlvbihwcm9qZWN0aW9uKTtcbn07XG5cbnRyZWUuZGlhZ29uYWwucmFkaWFsID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXRoID0gZnVuY3Rpb24ocGF0aERhdGEsIG9iaikge1xuICAgICAgXHR2YXIgc3JjID0gcGF0aERhdGFbMF07XG4gICAgICBcdHZhciBtaWQgPSBwYXRoRGF0YVsxXTtcbiAgICAgIFx0dmFyIGRzdCA9IHBhdGhEYXRhWzJdO1xuXHR2YXIgcmFkaXVzID0gb2JqLnJhZGl1cztcblx0dmFyIGNsb2Nrd2lzZSA9IG9iai5jbG9ja3dpc2U7XG5cblx0aWYgKGNsb2Nrd2lzZSkge1xuXHQgICAgcmV0dXJuIFwiTVwiICsgc3JjICsgXCIgQVwiICsgW3JhZGl1cyxyYWRpdXNdICsgXCIgMCAwLDAgXCIgKyBtaWQgKyBcIk1cIiArIG1pZCArIFwiTFwiICsgZHN0OyBcblx0fSBlbHNlIHtcblx0ICAgIHJldHVybiBcIk1cIiArIG1pZCArIFwiIEFcIiArIFtyYWRpdXMscmFkaXVzXSArIFwiIDAgMCwwIFwiICsgc3JjICsgXCJNXCIgKyBtaWQgKyBcIkxcIiArIGRzdDtcblx0fVxuXG4gICAgfTtcblxuICAgIHZhciBwcm9qZWN0aW9uID0gZnVuY3Rpb24oZCkge1xuICAgICAgXHR2YXIgciA9IGQueSwgYSA9IChkLnggLSA5MCkgLyAxODAgKiBNYXRoLlBJO1xuICAgICAgXHRyZXR1cm4gW3IgKiBNYXRoLmNvcyhhKSwgciAqIE1hdGguc2luKGEpXTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRyZWUuZGlhZ29uYWwoKVxuICAgICAgXHQucGF0aChwYXRoKVxuICAgICAgXHQucHJvamVjdGlvbihwcm9qZWN0aW9uKVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdHJlZS5kaWFnb25hbDtcbiIsInZhciB0cmVlID0gcmVxdWlyZSAoXCIuL3RyZWUuanNcIik7XG50cmVlLmxhYmVsID0gcmVxdWlyZShcIi4vbGFiZWwuanNcIik7XG50cmVlLmRpYWdvbmFsID0gcmVxdWlyZShcIi4vZGlhZ29uYWwuanNcIik7XG50cmVlLmxheW91dCA9IHJlcXVpcmUoXCIuL2xheW91dC5qc1wiKTtcbnRyZWUubm9kZV9kaXNwbGF5ID0gcmVxdWlyZShcIi4vbm9kZV9kaXNwbGF5LmpzXCIpO1xuLy8gdHJlZS5ub2RlID0gcmVxdWlyZShcInRudC50cmVlLm5vZGVcIik7XG4vLyB0cmVlLnBhcnNlX25ld2ljayA9IHJlcXVpcmUoXCJ0bnQubmV3aWNrXCIpLnBhcnNlX25ld2ljaztcbi8vIHRyZWUucGFyc2Vfbmh4ID0gcmVxdWlyZShcInRudC5uZXdpY2tcIikucGFyc2Vfbmh4O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0cmVlO1xuXG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcbnZhciB0cmVlID0ge307XG5cbnRyZWUubGFiZWwgPSBmdW5jdGlvbiAoKSB7XG5cInVzZSBzdHJpY3RcIjtcblxuICAgIC8vIFRPRE86IE5vdCBzdXJlIGlmIHdlIHNob3VsZCBiZSByZW1vdmluZyBieSBkZWZhdWx0IHByZXYgbGFiZWxzXG4gICAgLy8gb3IgaXQgd291bGQgYmUgYmV0dGVyIHRvIGhhdmUgYSBzZXBhcmF0ZSByZW1vdmUgbWV0aG9kIGNhbGxlZCBieSB0aGUgdmlzXG4gICAgLy8gb24gdXBkYXRlXG4gICAgLy8gV2UgYWxzbyBoYXZlIHRoZSBwcm9ibGVtIHRoYXQgd2UgbWF5IGJlIHRyYW5zaXRpb25pbmcgZnJvbVxuICAgIC8vIHRleHQgdG8gaW1nIGxhYmVscyBhbmQgd2UgbmVlZCB0byByZW1vdmUgdGhlIGxhYmVsIG9mIGEgZGlmZmVyZW50IHR5cGVcbiAgICB2YXIgbGFiZWwgPSBmdW5jdGlvbiAobm9kZSwgbGF5b3V0X3R5cGUsIG5vZGVfc2l6ZSkge1xuXHRpZiAodHlwZW9mIChub2RlKSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cobm9kZSk7XG4gICAgICAgIH1cblxuXHRsYWJlbC5kaXNwbGF5KCkuY2FsbCh0aGlzLCBub2RlLCBsYXlvdXRfdHlwZSlcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfdHJlZV9sYWJlbFwiKVxuXHQgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24gKGQpIHtcblx0XHR2YXIgdCA9IGxhYmVsLnRyYW5zZm9ybSgpKG5vZGUsIGxheW91dF90eXBlKTtcblx0XHRyZXR1cm4gXCJ0cmFuc2xhdGUgKFwiICsgKHQudHJhbnNsYXRlWzBdICsgbm9kZV9zaXplKSArIFwiIFwiICsgdC50cmFuc2xhdGVbMV0gKyBcIilyb3RhdGUoXCIgKyB0LnJvdGF0ZSArIFwiKVwiO1xuXHQgICAgfSlcblx0Ly8gVE9ETzogdGhpcyBjbGljayBldmVudCBpcyBwcm9iYWJseSBuZXZlciBmaXJlZCBzaW5jZSB0aGVyZSBpcyBhbiBvbmNsaWNrIGV2ZW50IGluIHRoZSBub2RlIGcgZWxlbWVudD9cblx0ICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG5cdFx0aWYgKGxhYmVsLm9uX2NsaWNrKCkgIT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICBkMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHQgICAgbGFiZWwub25fY2xpY2soKS5jYWxsKHRoaXMsIG5vZGUpO1xuXHRcdH1cblx0ICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGxhYmVsKVxuXHQuZ2V0c2V0ICgnd2lkdGgnLCBmdW5jdGlvbiAoKSB7IHRocm93IFwiTmVlZCBhIHdpZHRoIGNhbGxiYWNrXCIgfSlcblx0LmdldHNldCAoJ2hlaWdodCcsIGZ1bmN0aW9uICgpIHsgdGhyb3cgXCJOZWVkIGEgaGVpZ2h0IGNhbGxiYWNrXCIgfSlcblx0LmdldHNldCAoJ2Rpc3BsYXknLCBmdW5jdGlvbiAoKSB7IHRocm93IFwiTmVlZCBhIGRpc3BsYXkgY2FsbGJhY2tcIiB9KVxuXHQuZ2V0c2V0ICgndHJhbnNmb3JtJywgZnVuY3Rpb24gKCkgeyB0aHJvdyBcIk5lZWQgYSB0cmFuc2Zvcm0gY2FsbGJhY2tcIiB9KVxuXHQuZ2V0c2V0ICgnb25fY2xpY2snKTtcblxuICAgIHJldHVybiBsYWJlbDtcbn07XG5cbi8vIFRleHQgYmFzZWQgbGFiZWxzXG50cmVlLmxhYmVsLnRleHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGxhYmVsID0gdHJlZS5sYWJlbCgpO1xuXG4gICAgdmFyIGFwaSA9IGFwaWpzIChsYWJlbClcblx0LmdldHNldCAoJ2ZvbnRzaXplJywgMTApXG5cdC5nZXRzZXQgKCdjb2xvcicsIFwiIzAwMFwiKVxuXHQuZ2V0c2V0ICgndGV4dCcsIGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4gZC5kYXRhKCkubmFtZTtcblx0fSlcblxuICAgIGxhYmVsLmRpc3BsYXkgKGZ1bmN0aW9uIChub2RlLCBsYXlvdXRfdHlwZSkge1xuXHR2YXIgbCA9IGQzLnNlbGVjdCh0aGlzKVxuXHQgICAgLmFwcGVuZChcInRleHRcIilcblx0ICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRpZiAobGF5b3V0X3R5cGUgPT09IFwicmFkaWFsXCIpIHtcblx0XHQgICAgcmV0dXJuIChkLnglMzYwIDwgMTgwKSA/IFwic3RhcnRcIiA6IFwiZW5kXCI7XG5cdFx0fVxuXHRcdHJldHVybiBcInN0YXJ0XCI7XG5cdCAgICB9KVxuXHQgICAgLnRleHQoZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gbGFiZWwudGV4dCgpKG5vZGUpXG5cdCAgICB9KVxuXHQgICAgLnN0eWxlKCdmb250LXNpemUnLCBsYWJlbC5mb250c2l6ZSgpICsgXCJweFwiKVxuXHQgICAgLnN0eWxlKCdmaWxsJywgZDMuZnVuY3RvcihsYWJlbC5jb2xvcigpKShub2RlKSk7XG5cblx0cmV0dXJuIGw7XG4gICAgfSk7XG5cbiAgICBsYWJlbC50cmFuc2Zvcm0gKGZ1bmN0aW9uIChub2RlLCBsYXlvdXRfdHlwZSkge1xuXHR2YXIgZCA9IG5vZGUuZGF0YSgpO1xuXHR2YXIgdCA9IHtcblx0ICAgIHRyYW5zbGF0ZSA6IFs1LCA1XSxcblx0ICAgIHJvdGF0ZSA6IDBcblx0fTtcblx0aWYgKGxheW91dF90eXBlID09PSBcInJhZGlhbFwiKSB7XG5cdCAgICB0LnRyYW5zbGF0ZVsxXSA9IHQudHJhbnNsYXRlWzFdIC0gKGQueCUzNjAgPCAxODAgPyAwIDogbGFiZWwuZm9udHNpemUoKSlcblx0ICAgIHQucm90YXRlID0gKGQueCUzNjAgPCAxODAgPyAwIDogMTgwKVxuXHR9XG5cdHJldHVybiB0O1xuICAgIH0pO1xuXG5cbiAgICAvLyBsYWJlbC50cmFuc2Zvcm0gKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgLy8gXHR2YXIgZCA9IG5vZGUuZGF0YSgpO1xuICAgIC8vIFx0cmV0dXJuIFwidHJhbnNsYXRlKDEwIDUpcm90YXRlKFwiICsgKGQueCUzNjAgPCAxODAgPyAwIDogMTgwKSArIFwiKVwiO1xuICAgIC8vIH0pO1xuXG4gICAgbGFiZWwud2lkdGggKGZ1bmN0aW9uIChub2RlKSB7XG5cdHZhciBzdmcgPSBkMy5zZWxlY3QoXCJib2R5XCIpXG5cdCAgICAuYXBwZW5kKFwic3ZnXCIpXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCAwKVxuXHQgICAgLnN0eWxlKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuXG5cdHZhciB0ZXh0ID0gc3ZnXG5cdCAgICAuYXBwZW5kKFwidGV4dFwiKVxuXHQgICAgLnN0eWxlKCdmb250LXNpemUnLCBsYWJlbC5mb250c2l6ZSgpICsgXCJweFwiKVxuXHQgICAgLnRleHQobGFiZWwudGV4dCgpKG5vZGUpKTtcblxuXHR2YXIgd2lkdGggPSB0ZXh0Lm5vZGUoKS5nZXRCQm94KCkud2lkdGg7XG5cdHN2Zy5yZW1vdmUoKTtcblxuXHRyZXR1cm4gd2lkdGg7XG4gICAgfSk7XG5cbiAgICBsYWJlbC5oZWlnaHQgKGZ1bmN0aW9uIChub2RlKSB7XG5cdHJldHVybiBsYWJlbC5mb250c2l6ZSgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGxhYmVsO1xufTtcblxuLy8gSW1hZ2UgYmFzZWQgbGFiZWxzXG50cmVlLmxhYmVsLmltZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbGFiZWwgPSB0cmVlLmxhYmVsKCk7XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGxhYmVsKVxuXHQuZ2V0c2V0ICgnc3JjJywgZnVuY3Rpb24gKCkge30pXG5cbiAgICBsYWJlbC5kaXNwbGF5IChmdW5jdGlvbiAobm9kZSwgbGF5b3V0X3R5cGUpIHtcblx0aWYgKGxhYmVsLnNyYygpKG5vZGUpKSB7XG5cdCAgICB2YXIgbCA9IGQzLnNlbGVjdCh0aGlzKVxuXHRcdC5hcHBlbmQoXCJpbWFnZVwiKVxuXHRcdC5hdHRyKFwid2lkdGhcIiwgbGFiZWwud2lkdGgoKSgpKVxuXHRcdC5hdHRyKFwiaGVpZ2h0XCIsIGxhYmVsLmhlaWdodCgpKCkpXG5cdFx0LmF0dHIoXCJ4bGluazpocmVmXCIsIGxhYmVsLnNyYygpKG5vZGUpKTtcblx0ICAgIHJldHVybiBsO1xuXHR9XG5cdC8vIGZhbGxiYWNrIHRleHQgaW4gY2FzZSB0aGUgaW1nIGlzIG5vdCBmb3VuZD9cblx0cmV0dXJuIGQzLnNlbGVjdCh0aGlzKVxuXHQgICAgLmFwcGVuZChcInRleHRcIilcblx0ICAgIC50ZXh0KFwiXCIpO1xuICAgIH0pO1xuXG4gICAgbGFiZWwudHJhbnNmb3JtIChmdW5jdGlvbiAobm9kZSwgbGF5b3V0X3R5cGUpIHtcblx0dmFyIGQgPSBub2RlLmRhdGEoKTtcblx0dmFyIHQgPSB7XG5cdCAgICB0cmFuc2xhdGUgOiBbMTAsICgtbGFiZWwuaGVpZ2h0KCkoKSAvIDIpXSxcblx0ICAgIHJvdGF0ZSA6IDBcblx0fTtcblx0aWYgKGxheW91dF90eXBlID09PSAncmFkaWFsJykge1xuXHQgICAgdC50cmFuc2xhdGVbMF0gPSB0LnRyYW5zbGF0ZVswXSArIChkLnglMzYwIDwgMTgwID8gMCA6IGxhYmVsLndpZHRoKCkoKSksXG5cdCAgICB0LnRyYW5zbGF0ZVsxXSA9IHQudHJhbnNsYXRlWzFdICsgKGQueCUzNjAgPCAxODAgPyAwIDogbGFiZWwuaGVpZ2h0KCkoKSksXG5cdCAgICB0LnJvdGF0ZSA9IChkLnglMzYwIDwgMTgwID8gMCA6IDE4MClcblx0fVxuXG5cdHJldHVybiB0O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGxhYmVsO1xufTtcblxuLy8gTGFiZWxzIG1hZGUgb2YgMisgc2ltcGxlIGxhYmVsc1xudHJlZS5sYWJlbC5jb21wb3NpdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGxhYmVscyA9IFtdO1xuXG4gICAgdmFyIGxhYmVsID0gZnVuY3Rpb24gKG5vZGUsIGxheW91dF90eXBlKSB7XG5cdHZhciBjdXJyX3hvZmZzZXQgPSAwO1xuXG5cdGZvciAodmFyIGk9MDsgaTxsYWJlbHMubGVuZ3RoOyBpKyspIHtcblx0ICAgIHZhciBkaXNwbGF5ID0gbGFiZWxzW2ldO1xuXG5cdCAgICAoZnVuY3Rpb24gKG9mZnNldCkge1xuXHRcdGRpc3BsYXkudHJhbnNmb3JtIChmdW5jdGlvbiAobm9kZSwgbGF5b3V0X3R5cGUpIHtcblx0XHQgICAgdmFyIHRzdXBlciA9IGRpc3BsYXkuX3N1cGVyXy50cmFuc2Zvcm0oKShub2RlLCBsYXlvdXRfdHlwZSk7XG5cdFx0ICAgIHZhciB0ID0ge1xuXHRcdFx0dHJhbnNsYXRlIDogW29mZnNldCArIHRzdXBlci50cmFuc2xhdGVbMF0sIHRzdXBlci50cmFuc2xhdGVbMV1dLFxuXHRcdFx0cm90YXRlIDogdHN1cGVyLnJvdGF0ZVxuXHRcdCAgICB9O1xuXHRcdCAgICByZXR1cm4gdDtcblx0XHR9KVxuXHQgICAgfSkoY3Vycl94b2Zmc2V0KTtcblxuXHQgICAgY3Vycl94b2Zmc2V0ICs9IDEwO1xuXHQgICAgY3Vycl94b2Zmc2V0ICs9IGRpc3BsYXkud2lkdGgoKShub2RlKTtcblxuXHQgICAgZGlzcGxheS5jYWxsKHRoaXMsIG5vZGUsIGxheW91dF90eXBlKTtcblx0fVxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGxhYmVsKVxuXG4gICAgYXBpLm1ldGhvZCAoJ2FkZF9sYWJlbCcsIGZ1bmN0aW9uIChkaXNwbGF5LCBub2RlKSB7XG5cdGRpc3BsYXkuX3N1cGVyXyA9IHt9O1xuXHRhcGlqcyAoZGlzcGxheS5fc3VwZXJfKVxuXHQgICAgLmdldCAoJ3RyYW5zZm9ybScsIGRpc3BsYXkudHJhbnNmb3JtKCkpO1xuXG5cdGxhYmVscy5wdXNoKGRpc3BsYXkpO1xuXHRyZXR1cm4gbGFiZWw7XG4gICAgfSk7XG4gICAgXG4gICAgYXBpLm1ldGhvZCAoJ3dpZHRoJywgZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gZnVuY3Rpb24gKG5vZGUpIHtcblx0ICAgIHZhciB0b3Rfd2lkdGggPSAwO1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPGxhYmVscy5sZW5ndGg7IGkrKykge1xuXHRcdHRvdF93aWR0aCArPSBwYXJzZUludChsYWJlbHNbaV0ud2lkdGgoKShub2RlKSk7XG5cdFx0dG90X3dpZHRoICs9IHBhcnNlSW50KGxhYmVsc1tpXS5fc3VwZXJfLnRyYW5zZm9ybSgpKG5vZGUpLnRyYW5zbGF0ZVswXSk7XG5cdCAgICB9XG5cblx0ICAgIHJldHVybiB0b3Rfd2lkdGg7XG5cdH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdoZWlnaHQnLCBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiBmdW5jdGlvbiAobm9kZSkge1xuXHQgICAgdmFyIG1heF9oZWlnaHQgPSAwO1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPGxhYmVscy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjdXJyX2hlaWdodCA9IGxhYmVsc1tpXS5oZWlnaHQoKShub2RlKTtcblx0XHRpZiAoIGN1cnJfaGVpZ2h0ID4gbWF4X2hlaWdodCkge1xuXHRcdCAgICBtYXhfaGVpZ2h0ID0gY3Vycl9oZWlnaHQ7XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIG1heF9oZWlnaHQ7XG5cdH1cbiAgICB9KTtcblxuICAgIHJldHVybiBsYWJlbDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRyZWUubGFiZWw7XG5cblxuIiwiLy8gQmFzZWQgb24gdGhlIGNvZGUgYnkgS2VuLWljaGkgVWVkYSBpbiBodHRwOi8vYmwub2Nrcy5vcmcva3VlZGEvMTAzNjc3NiNkMy5waHlsb2dyYW0uanNcblxudmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG52YXIgZGlhZ29uYWwgPSByZXF1aXJlKFwiLi9kaWFnb25hbC5qc1wiKTtcbnZhciB0cmVlID0ge307XG5cbnRyZWUubGF5b3V0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgfTtcblxuICAgIHZhciBjbHVzdGVyID0gZDMubGF5b3V0LmNsdXN0ZXIoKVxuXHQuc29ydChudWxsKVxuXHQudmFsdWUoZnVuY3Rpb24gKGQpIHtyZXR1cm4gZC5sZW5ndGh9IClcblx0LnNlcGFyYXRpb24oZnVuY3Rpb24gKCkge3JldHVybiAxfSk7XG4gICAgXG4gICAgdmFyIGFwaSA9IGFwaWpzIChsKVxuXHQuZ2V0c2V0ICgnc2NhbGUnLCB0cnVlKVxuXHQuZ2V0c2V0ICgnbWF4X2xlYWZfbGFiZWxfd2lkdGgnLCAwKVxuXHQubWV0aG9kIChcImNsdXN0ZXJcIiwgY2x1c3Rlcilcblx0Lm1ldGhvZCgneXNjYWxlJywgZnVuY3Rpb24gKCkge3Rocm93IFwieXNjYWxlIGlzIG5vdCBkZWZpbmVkIGluIHRoZSBiYXNlIG9iamVjdFwifSlcblx0Lm1ldGhvZCgnYWRqdXN0X2NsdXN0ZXJfc2l6ZScsIGZ1bmN0aW9uICgpIHt0aHJvdyBcImFkanVzdF9jbHVzdGVyX3NpemUgaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2Ugb2JqZWN0XCIgfSlcblx0Lm1ldGhvZCgnd2lkdGgnLCBmdW5jdGlvbiAoKSB7dGhyb3cgXCJ3aWR0aCBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBvYmplY3RcIn0pXG5cdC5tZXRob2QoJ2hlaWdodCcsIGZ1bmN0aW9uICgpIHt0aHJvdyBcImhlaWdodCBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBvYmplY3RcIn0pO1xuXG4gICAgYXBpLm1ldGhvZCgnc2NhbGVfYnJhbmNoX2xlbmd0aHMnLCBmdW5jdGlvbiAoY3Vycikge1xuXHRpZiAobC5zY2FsZSgpID09PSBmYWxzZSkge1xuXHQgICAgcmV0dXJuXG5cdH1cblxuXHR2YXIgbm9kZXMgPSBjdXJyLm5vZGVzO1xuXHR2YXIgdHJlZSA9IGN1cnIudHJlZTtcblxuXHR2YXIgcm9vdF9kaXN0cyA9IG5vZGVzLm1hcCAoZnVuY3Rpb24gKGQpIHtcblx0ICAgIHJldHVybiBkLl9yb290X2Rpc3Q7XG5cdH0pO1xuXG5cdHZhciB5c2NhbGUgPSBsLnlzY2FsZShyb290X2Rpc3RzKTtcblx0dHJlZS5hcHBseSAoZnVuY3Rpb24gKG5vZGUpIHtcblx0ICAgIG5vZGUucHJvcGVydHkoXCJ5XCIsIHlzY2FsZShub2RlLnJvb3RfZGlzdCgpKSk7XG5cdH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGw7XG59O1xuXG50cmVlLmxheW91dC52ZXJ0aWNhbCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbGF5b3V0ID0gdHJlZS5sYXlvdXQoKTtcbiAgICAvLyBFbGVtZW50cyBsaWtlICdsYWJlbHMnIGRlcGVuZCBvbiB0aGUgbGF5b3V0IHR5cGUuIFRoaXMgZXhwb3NlcyBhIHdheSBvZiBpZGVudGlmeWluZyB0aGUgbGF5b3V0IHR5cGVcbiAgICBsYXlvdXQudHlwZSA9IFwidmVydGljYWxcIjtcblxuICAgIHZhciBhcGkgPSBhcGlqcyAobGF5b3V0KVxuXHQuZ2V0c2V0ICgnd2lkdGgnLCAzNjApXG5cdC5nZXQgKCd0cmFuc2xhdGVfdmlzJywgWzIwLDIwXSlcblx0Lm1ldGhvZCAoJ2RpYWdvbmFsJywgZGlhZ29uYWwudmVydGljYWwpXG5cdC5tZXRob2QgKCd0cmFuc2Zvcm1fbm9kZScsIGZ1bmN0aW9uIChkKSB7XG4gICAgXHQgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgZC55ICsgXCIsXCIgKyBkLnggKyBcIilcIjtcblx0fSk7XG5cbiAgICBhcGkubWV0aG9kKCdoZWlnaHQnLCBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgXHRyZXR1cm4gKHBhcmFtcy5uX2xlYXZlcyAqIHBhcmFtcy5sYWJlbF9oZWlnaHQpO1xuICAgIH0pOyBcblxuICAgIGFwaS5tZXRob2QoJ3lzY2FsZScsIGZ1bmN0aW9uIChkaXN0cykge1xuICAgIFx0cmV0dXJuIGQzLnNjYWxlLmxpbmVhcigpXG4gICAgXHQgICAgLmRvbWFpbihbMCwgZDMubWF4KGRpc3RzKV0pXG4gICAgXHQgICAgLnJhbmdlKFswLCBsYXlvdXQud2lkdGgoKSAtIDIwIC0gbGF5b3V0Lm1heF9sZWFmX2xhYmVsX3dpZHRoKCldKTtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QoJ2FkanVzdF9jbHVzdGVyX3NpemUnLCBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgXHR2YXIgaCA9IGxheW91dC5oZWlnaHQocGFyYW1zKTtcbiAgICBcdHZhciB3ID0gbGF5b3V0LndpZHRoKCkgLSBsYXlvdXQubWF4X2xlYWZfbGFiZWxfd2lkdGgoKSAtIGxheW91dC50cmFuc2xhdGVfdmlzKClbMF0gLSBwYXJhbXMubGFiZWxfcGFkZGluZztcbiAgICBcdGxheW91dC5jbHVzdGVyLnNpemUgKFtoLHddKTtcbiAgICBcdHJldHVybiBsYXlvdXQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbGF5b3V0O1xufTtcblxudHJlZS5sYXlvdXQucmFkaWFsID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsYXlvdXQgPSB0cmVlLmxheW91dCgpO1xuICAgIC8vIEVsZW1lbnRzIGxpa2UgJ2xhYmVscycgZGVwZW5kIG9uIHRoZSBsYXlvdXQgdHlwZS4gVGhpcyBleHBvc2VzIGEgd2F5IG9mIGlkZW50aWZ5aW5nIHRoZSBsYXlvdXQgdHlwZVxuICAgIGxheW91dC50eXBlID0gJ3JhZGlhbCc7XG5cbiAgICB2YXIgZGVmYXVsdF93aWR0aCA9IDM2MDtcbiAgICB2YXIgciA9IGRlZmF1bHRfd2lkdGggLyAyO1xuXG4gICAgdmFyIGNvbmYgPSB7XG4gICAgXHR3aWR0aCA6IDM2MFxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGxheW91dClcblx0LmdldHNldCAoY29uZilcblx0LmdldHNldCAoJ3RyYW5zbGF0ZV92aXMnLCBbciwgcl0pIC8vIFRPRE86IDEuMyBzaG91bGQgYmUgcmVwbGFjZWQgYnkgYSBzZW5zaWJsZSB2YWx1ZVxuXHQubWV0aG9kICgndHJhbnNmb3JtX25vZGUnLCBmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIFwicm90YXRlKFwiICsgKGQueCAtIDkwKSArIFwiKXRyYW5zbGF0ZShcIiArIGQueSArIFwiKVwiO1xuXHR9KVxuXHQubWV0aG9kICgnZGlhZ29uYWwnLCBkaWFnb25hbC5yYWRpYWwpXG5cdC5tZXRob2QgKCdoZWlnaHQnLCBmdW5jdGlvbiAoKSB7IHJldHVybiBjb25mLndpZHRoIH0pO1xuXG4gICAgLy8gQ2hhbmdlcyBpbiB3aWR0aCBhZmZlY3QgY2hhbmdlcyBpbiByXG4gICAgbGF5b3V0LndpZHRoLnRyYW5zZm9ybSAoZnVuY3Rpb24gKHZhbCkge1xuICAgIFx0ciA9IHZhbCAvIDI7XG4gICAgXHRsYXlvdXQuY2x1c3Rlci5zaXplKFszNjAsIHJdKVxuICAgIFx0bGF5b3V0LnRyYW5zbGF0ZV92aXMoW3IsIHJdKTtcbiAgICBcdHJldHVybiB2YWw7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kIChcInlzY2FsZVwiLCAgZnVuY3Rpb24gKGRpc3RzKSB7XG5cdHJldHVybiBkMy5zY2FsZS5saW5lYXIoKVxuXHQgICAgLmRvbWFpbihbMCxkMy5tYXgoZGlzdHMpXSlcblx0ICAgIC5yYW5nZShbMCwgcl0pO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoXCJhZGp1c3RfY2x1c3Rlcl9zaXplXCIsIGZ1bmN0aW9uIChwYXJhbXMpIHtcblx0ciA9IChsYXlvdXQud2lkdGgoKS8yKSAtIGxheW91dC5tYXhfbGVhZl9sYWJlbF93aWR0aCgpIC0gMjA7XG5cdGxheW91dC5jbHVzdGVyLnNpemUoWzM2MCwgcl0pO1xuXHRyZXR1cm4gbGF5b3V0O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGxheW91dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRyZWUubGF5b3V0O1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG52YXIgdHJlZSA9IHt9O1xuXG50cmVlLm5vZGVfZGlzcGxheSA9IGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBuID0gZnVuY3Rpb24gKG5vZGUpIHtcblx0bi5kaXNwbGF5KCkuY2FsbCh0aGlzLCBub2RlKVxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKG4pXG5cdC5nZXRzZXQoXCJzaXplXCIsIDQuNSlcblx0LmdldHNldChcImZpbGxcIiwgXCJibGFja1wiKVxuXHQuZ2V0c2V0KFwic3Ryb2tlXCIsIFwiYmxhY2tcIilcblx0LmdldHNldChcInN0cm9rZV93aWR0aFwiLCBcIjFweFwiKVxuXHQuZ2V0c2V0KFwiZGlzcGxheVwiLCBmdW5jdGlvbiAoKSB7dGhyb3cgXCJkaXNwbGF5IGlzIG5vdCBkZWZpbmVkIGluIHRoZSBiYXNlIG9iamVjdFwifSk7XG5cbiAgICByZXR1cm4gbjtcbn07XG5cbnRyZWUubm9kZV9kaXNwbGF5LmNpcmNsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbiA9IHRyZWUubm9kZV9kaXNwbGF5KCk7XG5cbiAgICBuLmRpc3BsYXkgKGZ1bmN0aW9uIChub2RlKSB7XG5cdGQzLnNlbGVjdCh0aGlzKVxuXHQgICAgLmFwcGVuZChcImNpcmNsZVwiKVxuXHQgICAgLmF0dHIoXCJyXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIGQzLmZ1bmN0b3Iobi5zaXplKCkpKG5vZGUpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiBkMy5mdW5jdG9yKG4uZmlsbCgpKShub2RlKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInN0cm9rZVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiBkMy5mdW5jdG9yKG4uc3Ryb2tlKCkpKG5vZGUpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIGQzLmZ1bmN0b3Iobi5zdHJva2Vfd2lkdGgoKSkobm9kZSk7XG5cdCAgICB9KVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG47XG59O1xuXG50cmVlLm5vZGVfZGlzcGxheS5zcXVhcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG4gPSB0cmVlLm5vZGVfZGlzcGxheSgpO1xuXG4gICAgbi5kaXNwbGF5IChmdW5jdGlvbiAobm9kZSkge1xuXHR2YXIgcyA9IGQzLmZ1bmN0b3Iobi5zaXplKCkpKG5vZGUpO1xuXHRkMy5zZWxlY3QodGhpcylcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gLXNcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gLXM7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiBzKjI7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gcyoyO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiBkMy5mdW5jdG9yKG4uZmlsbCgpKShub2RlKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInN0cm9rZVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiBkMy5mdW5jdG9yKG4uc3Ryb2tlKCkpKG5vZGUpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIGQzLmZ1bmN0b3Iobi5zdHJva2Vfd2lkdGgoKSkobm9kZSk7XG5cdCAgICB9KVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG47XG59O1xuXG50cmVlLm5vZGVfZGlzcGxheS50cmlhbmdsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbiA9IHRyZWUubm9kZV9kaXNwbGF5KCk7XG5cbiAgICBuLmRpc3BsYXkgKGZ1bmN0aW9uIChub2RlKSB7XG5cdHZhciBzID0gZDMuZnVuY3RvcihuLnNpemUoKSkobm9kZSk7XG5cdGQzLnNlbGVjdCh0aGlzKVxuXHQgICAgLmFwcGVuZChcInBvbHlnb25cIilcblx0ICAgIC5hdHRyKFwicG9pbnRzXCIsICgtcykgKyBcIiwwIFwiICsgcyArIFwiLFwiICsgKC1zKSArIFwiIFwiICsgcyArIFwiLFwiICsgcylcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiBkMy5mdW5jdG9yKG4uZmlsbCgpKShub2RlKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInN0cm9rZVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiBkMy5mdW5jdG9yKG4uc3Ryb2tlKCkpKG5vZGUpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIGQzLmZ1bmN0b3Iobi5zdHJva2Vfd2lkdGgoKSkobm9kZSk7XG5cdCAgICB9KVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG47XG59O1xuXG50cmVlLm5vZGVfZGlzcGxheS5jb25kID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBuID0gdHJlZS5ub2RlX2Rpc3BsYXkoKTtcblxuICAgIC8vIGNvbmRpdGlvbnMgYXJlIG9iamVjdHMgd2l0aFxuICAgIC8vIG5hbWUgOiBhIG5hbWUgZm9yIHRoaXMgZGlzcGxheVxuICAgIC8vIGNhbGxiYWNrOiB0aGUgY29uZGl0aW9uIHRvIGFwcGx5IChyZWNlaXZlcyBhIHRudC5ub2RlKVxuICAgIC8vIGRpc3BsYXk6IGEgbm9kZV9kaXNwbGF5XG4gICAgdmFyIGNvbmRzID0gW107XG5cbiAgICBuLmRpc3BsYXkgKGZ1bmN0aW9uIChub2RlKSB7XG5cdHZhciBzID0gZDMuZnVuY3RvcihuLnNpemUoKSkobm9kZSk7XG5cdGZvciAodmFyIGk9MDsgaTxjb25kcy5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIGNvbmQgPSBjb25kc1tpXTtcblx0ICAgIC8vIEZvciBlYWNoIG5vZGUsIHRoZSBmaXJzdCBjb25kaXRpb24gbWV0IGlzIHVzZWRcblx0ICAgIGlmIChjb25kLmNhbGxiYWNrLmNhbGwodGhpcywgbm9kZSkgPT09IHRydWUpIHtcblx0XHRjb25kLmRpc3BsYXkuY2FsbCh0aGlzLCBub2RlKVxuXHRcdGJyZWFrO1xuXHQgICAgfVxuXHR9XG4gICAgfSlcblxuICAgIHZhciBhcGkgPSBhcGlqcyhuKTtcblxuICAgIGFwaS5tZXRob2QoXCJhZGRcIiwgZnVuY3Rpb24gKG5hbWUsIGNiYWssIG5vZGVfZGlzcGxheSkge1xuXHRjb25kcy5wdXNoKHsgbmFtZSA6IG5hbWUsXG5cdFx0ICAgICBjYWxsYmFjayA6IGNiYWssXG5cdFx0ICAgICBkaXNwbGF5IDogbm9kZV9kaXNwbGF5XG5cdFx0ICAgfSk7XG5cdHJldHVybiBuO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZChcInJlc2V0XCIsIGZ1bmN0aW9uICgpIHtcblx0Y29uZHMgPSBbXTtcblx0cmV0dXJuIG47XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kKFwidXBkYXRlXCIsIGZ1bmN0aW9uIChuYW1lLCBjYmFrLCBuZXdfZGlzcGxheSkge1xuXHRmb3IgKHZhciBpPTA7IGk8Y29uZHMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChjb25kc1tpXS5uYW1lID09PSBuYW1lKSB7XG5cdFx0Y29uZHNbaV0uY2FsbGJhY2sgPSBjYmFrO1xuXHRcdGNvbmRzW2ldLmRpc3BsYXkgPSBuZXdfZGlzcGxheTtcblx0ICAgIH1cblx0fVxuXHRyZXR1cm4gbjtcbiAgICB9KTtcblxuICAgIHJldHVybiBuO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0cmVlLm5vZGVfZGlzcGxheTtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUoXCJ0bnQuYXBpXCIpO1xudmFyIHRudF90cmVlX25vZGUgPSByZXF1aXJlKFwidG50LnRyZWUubm9kZVwiKTtcblxudmFyIHRyZWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgY29uZiA9IHtcblx0ZHVyYXRpb24gICAgICAgICA6IDUwMCwgICAgICAvLyBEdXJhdGlvbiBvZiB0aGUgdHJhbnNpdGlvbnNcblx0bm9kZV9kaXNwbGF5ICAgICA6IHRyZWUubm9kZV9kaXNwbGF5LmNpcmNsZSgpLFxuXHRsYWJlbCAgICAgICAgICAgIDogdHJlZS5sYWJlbC50ZXh0KCksXG5cdGxheW91dCAgICAgICAgICAgOiB0cmVlLmxheW91dC52ZXJ0aWNhbCgpLFxuXHRvbl9jbGljayAgICAgICAgIDogZnVuY3Rpb24gKCkge30sXG5cdG9uX2RibF9jbGljayAgICAgOiBmdW5jdGlvbiAoKSB7fSxcblx0b25fbW91c2VvdmVyICAgICA6IGZ1bmN0aW9uICgpIHt9LFxuXHRsaW5rX2NvbG9yICAgICAgIDogJ2JsYWNrJyxcblx0aWQgICAgICAgICAgICAgICA6IFwiX2lkXCJcbiAgICB9O1xuXG4gICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgZm9jdXNlZCBub2RlXG4gICAgLy8gVE9ETzogV291bGQgaXQgYmUgYmV0dGVyIHRvIGhhdmUgbXVsdGlwbGUgZm9jdXNlZCBub2Rlcz8gKGllIHVzZSBhbiBhcnJheSlcbiAgICB2YXIgZm9jdXNlZF9ub2RlO1xuXG4gICAgLy8gRXh0cmEgZGVsYXkgaW4gdGhlIHRyYW5zaXRpb25zIChUT0RPOiBOZWVkZWQ/KVxuICAgIHZhciBkZWxheSA9IDA7XG5cbiAgICAvLyBFYXNlIG9mIHRoZSB0cmFuc2l0aW9uc1xuICAgIHZhciBlYXNlID0gXCJjdWJpYy1pbi1vdXRcIjtcblxuICAgIC8vIEJ5IG5vZGUgZGF0YVxuICAgIHZhciBzcF9jb3VudHMgPSB7fTtcbiBcbiAgICB2YXIgc2NhbGUgPSBmYWxzZTtcblxuICAgIC8vIFRoZSBpZCBvZiB0aGUgdHJlZSBjb250YWluZXJcbiAgICB2YXIgZGl2X2lkO1xuXG4gICAgLy8gVGhlIHRyZWUgdmlzdWFsaXphdGlvbiAoc3ZnKVxuICAgIHZhciBzdmc7XG4gICAgdmFyIHZpcztcblxuICAgIC8vIFRPRE86IEZvciBub3csIGNvdW50cyBhcmUgZ2l2ZW4gb25seSBmb3IgbGVhdmVzXG4gICAgLy8gYnV0IGl0IG1heSBiZSBnb29kIHRvIGFsbG93IGNvdW50cyBmb3IgaW50ZXJuYWwgbm9kZXNcbiAgICB2YXIgY291bnRzID0ge307XG5cbiAgICAvLyBUaGUgZnVsbCB0cmVlXG4gICAgdmFyIGJhc2UgPSB7XG5cdHRyZWUgOiB1bmRlZmluZWQsXG5cdGRhdGEgOiB1bmRlZmluZWQsXHRcblx0bm9kZXMgOiB1bmRlZmluZWQsXG5cdGxpbmtzIDogdW5kZWZpbmVkXG4gICAgfTtcblxuICAgIC8vIFRoZSBjdXJyIHRyZWUuIE5lZWRlZCB0byByZS1jb21wdXRlIHRoZSBsaW5rcyAvIG5vZGVzIHBvc2l0aW9ucyBvZiBzdWJ0cmVlc1xuICAgIHZhciBjdXJyID0ge1xuXHR0cmVlIDogdW5kZWZpbmVkLFxuXHRkYXRhIDogdW5kZWZpbmVkLFxuXHRub2RlcyA6IHVuZGVmaW5lZCxcblx0bGlua3MgOiB1bmRlZmluZWRcbiAgICB9O1xuXG4gICAgLy8gVGhlIGNiYWsgcmV0dXJuZWRcbiAgICB2YXIgdCA9IGZ1bmN0aW9uIChkaXYpIHtcblx0ZGl2X2lkID0gZDMuc2VsZWN0KGRpdikuYXR0cihcImlkXCIpO1xuXG4gICAgICAgIHZhciB0cmVlX2RpdiA9IGQzLnNlbGVjdChkaXYpXG4gICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpXG5cdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCAoY29uZi5sYXlvdXQud2lkdGgoKSArICBcInB4XCIpKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ncm91cERpdlwiKTtcblxuXHR2YXIgY2x1c3RlciA9IGNvbmYubGF5b3V0LmNsdXN0ZXI7XG5cblx0dmFyIG5fbGVhdmVzID0gY3Vyci50cmVlLmdldF9hbGxfbGVhdmVzKCkubGVuZ3RoO1xuXG5cdHZhciBtYXhfbGVhZl9sYWJlbF9sZW5ndGggPSBmdW5jdGlvbiAodHJlZSkge1xuXHQgICAgdmFyIG1heCA9IDA7XG5cdCAgICB2YXIgbGVhdmVzID0gdHJlZS5nZXRfYWxsX2xlYXZlcygpO1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPGxlYXZlcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBsYWJlbF93aWR0aCA9IGNvbmYubGFiZWwud2lkdGgoKShsZWF2ZXNbaV0pICsgZDMuZnVuY3Rvcihjb25mLm5vZGVfZGlzcGxheS5zaXplKCkpKGxlYXZlc1tpXSk7XG5cdFx0aWYgKGxhYmVsX3dpZHRoID4gbWF4KSB7XG5cdFx0ICAgIG1heCA9IGxhYmVsX3dpZHRoO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBtYXg7XG5cdH07XG5cblx0dmFyIG1heF9sZWFmX25vZGVfaGVpZ2h0ID0gZnVuY3Rpb24gKHRyZWUpIHtcblx0ICAgIHZhciBtYXggPSAwO1xuXHQgICAgdmFyIGxlYXZlcyA9IHRyZWUuZ2V0X2FsbF9sZWF2ZXMoKTtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxsZWF2ZXMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgbm9kZV9zaXplID0gZDMuZnVuY3Rvcihjb25mLm5vZGVfZGlzcGxheS5zaXplKCkpKGxlYXZlc1tpXSk7XG5cdFx0aWYgKG5vZGVfc2l6ZSA+IG1heCkge1xuXHRcdCAgICBtYXggPSBub2RlX3NpemU7XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIG1heCAqIDI7XG5cdH07XG5cblx0dmFyIG1heF9sYWJlbF9sZW5ndGggPSBtYXhfbGVhZl9sYWJlbF9sZW5ndGgoY3Vyci50cmVlKTtcblx0Y29uZi5sYXlvdXQubWF4X2xlYWZfbGFiZWxfd2lkdGgobWF4X2xhYmVsX2xlbmd0aCk7XG5cblx0dmFyIG1heF9ub2RlX2hlaWdodCA9IG1heF9sZWFmX25vZGVfaGVpZ2h0KGN1cnIudHJlZSk7XG5cblx0Ly8gQ2x1c3RlciBzaXplIGlzIHRoZSByZXN1bHQgb2YuLi5cblx0Ly8gdG90YWwgd2lkdGggb2YgdGhlIHZpcyAtIHRyYW5zZm9ybSBmb3IgdGhlIHRyZWUgLSBtYXhfbGVhZl9sYWJlbF93aWR0aCAtIGhvcml6b250YWwgdHJhbnNmb3JtIG9mIHRoZSBsYWJlbFxuXHQvLyBUT0RPOiBTdWJzdGl0dXRlIDE1IGJ5IHRoZSBob3Jpem9udGFsIHRyYW5zZm9ybSBvZiB0aGUgbm9kZXNcblx0dmFyIGNsdXN0ZXJfc2l6ZV9wYXJhbXMgPSB7XG5cdCAgICBuX2xlYXZlcyA6IG5fbGVhdmVzLFxuXHQgICAgbGFiZWxfaGVpZ2h0IDogZDMubWF4KFtkMy5mdW5jdG9yKGNvbmYubGFiZWwuaGVpZ2h0KCkpKCksIG1heF9ub2RlX2hlaWdodF0pLFxuXHQgICAgbGFiZWxfcGFkZGluZyA6IDE1XG5cdH07XG5cblx0Y29uZi5sYXlvdXQuYWRqdXN0X2NsdXN0ZXJfc2l6ZShjbHVzdGVyX3NpemVfcGFyYW1zKTtcblxuXHR2YXIgZGlhZ29uYWwgPSBjb25mLmxheW91dC5kaWFnb25hbCgpO1xuXHR2YXIgdHJhbnNmb3JtID0gY29uZi5sYXlvdXQudHJhbnNmb3JtX25vZGU7XG5cblx0c3ZnID0gdHJlZV9kaXZcblx0ICAgIC5hcHBlbmQoXCJzdmdcIilcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgY29uZi5sYXlvdXQud2lkdGgoKSlcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGNvbmYubGF5b3V0LmhlaWdodChjbHVzdGVyX3NpemVfcGFyYW1zKSArIDMwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIFwibm9uZVwiKTtcblxuXHR2aXMgPSBzdmdcblx0ICAgIC5hcHBlbmQoXCJnXCIpXG5cdCAgICAuYXR0cihcImlkXCIsIFwidG50X3N0X1wiICsgZGl2X2lkKVxuXHQgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcblx0XHQgIFwidHJhbnNsYXRlKFwiICtcblx0XHQgIGNvbmYubGF5b3V0LnRyYW5zbGF0ZV92aXMoKVswXSArXG5cdFx0ICBcIixcIiArXG5cdFx0ICBjb25mLmxheW91dC50cmFuc2xhdGVfdmlzKClbMV0gK1xuXHRcdCAgXCIpXCIpO1xuXG5cdGN1cnIubm9kZXMgPSBjbHVzdGVyLm5vZGVzKGN1cnIuZGF0YSk7XG5cdGNvbmYubGF5b3V0LnNjYWxlX2JyYW5jaF9sZW5ndGhzKGN1cnIpO1xuXHRjdXJyLmxpbmtzID0gY2x1c3Rlci5saW5rcyhjdXJyLm5vZGVzKTtcblxuXHQvLyBMSU5LU1xuXHR2YXIgbGluayA9IHZpcy5zZWxlY3RBbGwoXCJwYXRoLnRudF90cmVlX2xpbmtcIilcblx0ICAgIC5kYXRhKGN1cnIubGlua3MsIGZ1bmN0aW9uKGQpe3JldHVybiBkLnRhcmdldFtjb25mLmlkXX0pO1xuXHRcblx0bGlua1xuXHQgICAgLmVudGVyKClcblx0ICAgIC5hcHBlbmQoXCJwYXRoXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3RyZWVfbGlua1wiKVxuXHQgICAgLmF0dHIoXCJpZFwiLCBmdW5jdGlvbihkKSB7XG5cdCAgICBcdHJldHVybiBcInRudF90cmVlX2xpbmtfXCIgKyBkaXZfaWQgKyBcIl9cIiArIGQudGFyZ2V0Ll9pZDtcblx0ICAgIH0pXG5cdCAgICAuc3R5bGUoXCJzdHJva2VcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gZDMuZnVuY3Rvcihjb25mLmxpbmtfY29sb3IpKHRudF90cmVlX25vZGUoZC5zb3VyY2UpLCB0bnRfdHJlZV9ub2RlKGQudGFyZ2V0KSk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJkXCIsIGRpYWdvbmFsKTtcdCAgICBcblxuXHQvLyBOT0RFU1xuXHR2YXIgbm9kZSA9IHZpcy5zZWxlY3RBbGwoXCJnLnRudF90cmVlX25vZGVcIilcblx0ICAgIC5kYXRhKGN1cnIubm9kZXMsIGZ1bmN0aW9uKGQpIHtyZXR1cm4gZFtjb25mLmlkXX0pO1xuXG5cdHZhciBuZXdfbm9kZSA9IG5vZGVcblx0ICAgIC5lbnRlcigpLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24obikge1xuXHRcdGlmIChuLmNoaWxkcmVuKSB7XG5cdFx0ICAgIGlmIChuLmRlcHRoID09IDApIHtcblx0XHRcdHJldHVybiBcInJvb3QgdG50X3RyZWVfbm9kZVwiXG5cdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gXCJpbm5lciB0bnRfdHJlZV9ub2RlXCJcblx0XHQgICAgfVxuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIHJldHVybiBcImxlYWYgdG50X3RyZWVfbm9kZVwiXG5cdFx0fVxuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwiaWRcIiwgZnVuY3Rpb24oZCkge1xuXHRcdHJldHVybiBcInRudF90cmVlX25vZGVfXCIgKyBkaXZfaWQgKyBcIl9cIiArIGQuX2lkXG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgdHJhbnNmb3JtKTtcblxuXHQvLyBkaXNwbGF5IG5vZGUgc2hhcGVcblx0bmV3X25vZGVcblx0ICAgIC5lYWNoIChmdW5jdGlvbiAoZCkge1xuXHRcdGNvbmYubm9kZV9kaXNwbGF5LmNhbGwodGhpcywgdG50X3RyZWVfbm9kZShkKSlcblx0ICAgIH0pO1xuXG5cdC8vIGRpc3BsYXkgbm9kZSBsYWJlbFxuXHRuZXdfbm9kZVxuXHQgICAgLmVhY2ggKGZ1bmN0aW9uIChkKSB7XG5cdCAgICBcdGNvbmYubGFiZWwuY2FsbCh0aGlzLCB0bnRfdHJlZV9ub2RlKGQpLCBjb25mLmxheW91dC50eXBlLCBkMy5mdW5jdG9yKGNvbmYubm9kZV9kaXNwbGF5LnNpemUoKSkodG50X3RyZWVfbm9kZShkKSkpO1xuXHQgICAgfSk7XG5cblx0bmV3X25vZGUub24oXCJjbGlja1wiLCBmdW5jdGlvbiAobm9kZSkge1xuXHQgICAgY29uZi5vbl9jbGljay5jYWxsKHRoaXMsIHRudF90cmVlX25vZGUobm9kZSkpO1xuXG5cdCAgICB0cmVlLnRyaWdnZXIoXCJub2RlOmNsaWNrXCIsIHRudF90cmVlX25vZGUobm9kZSkpO1xuXHR9KTtcblxuXHRuZXdfbm9kZS5vbihcIm1vdXNlZW50ZXJcIiwgZnVuY3Rpb24gKG5vZGUpIHtcblx0ICAgIGNvbmYub25fbW91c2VvdmVyLmNhbGwodGhpcywgdG50X3RyZWVfbm9kZShub2RlKSk7XG5cblx0ICAgIHRyZWUudHJpZ2dlcihcIm5vZGU6aG92ZXJcIiwgdG50X3RyZWVfbm9kZShub2RlKSk7XG5cdH0pO1xuXG5cdG5ld19ub2RlLm9uKFwiZGJsY2xpY2tcIiwgZnVuY3Rpb24gKG5vZGUpIHtcblx0ICAgIGNvbmYub25fZGJsX2NsaWNrLmNhbGwodGhpcywgdG50X3RyZWVfbm9kZShub2RlKSk7XG5cblx0ICAgIHRyZWUudHJpZ2dlcihcIm5vZGU6ZGJsY2xpY2tcIiwgdG50X3RyZWVfbm9kZShub2RlKSk7XG5cdH0pO1xuXG5cblx0Ly8gVXBkYXRlIHBsb3RzIGFuIHVwZGF0ZWQgdHJlZVxuXHRhcGkubWV0aG9kICgndXBkYXRlJywgZnVuY3Rpb24oKSB7XG5cdCAgICB0cmVlX2RpdlxuXHRcdC5zdHlsZShcIndpZHRoXCIsIChjb25mLmxheW91dC53aWR0aCgpICsgXCJweFwiKSk7XG5cdCAgICBzdmcuYXR0cihcIndpZHRoXCIsIGNvbmYubGF5b3V0LndpZHRoKCkpO1xuXG5cdCAgICB2YXIgY2x1c3RlciA9IGNvbmYubGF5b3V0LmNsdXN0ZXI7XG5cdCAgICB2YXIgZGlhZ29uYWwgPSBjb25mLmxheW91dC5kaWFnb25hbCgpO1xuXHQgICAgdmFyIHRyYW5zZm9ybSA9IGNvbmYubGF5b3V0LnRyYW5zZm9ybV9ub2RlO1xuXG5cdCAgICB2YXIgbWF4X2xhYmVsX2xlbmd0aCA9IG1heF9sZWFmX2xhYmVsX2xlbmd0aChjdXJyLnRyZWUpO1xuXHQgICAgY29uZi5sYXlvdXQubWF4X2xlYWZfbGFiZWxfd2lkdGgobWF4X2xhYmVsX2xlbmd0aCk7XG5cblx0ICAgIHZhciBtYXhfbm9kZV9oZWlnaHQgPSBtYXhfbGVhZl9ub2RlX2hlaWdodChjdXJyLnRyZWUpO1xuXG5cdCAgICAvLyBDbHVzdGVyIHNpemUgaXMgdGhlIHJlc3VsdCBvZi4uLlxuXHQgICAgLy8gdG90YWwgd2lkdGggb2YgdGhlIHZpcyAtIHRyYW5zZm9ybSBmb3IgdGhlIHRyZWUgLSBtYXhfbGVhZl9sYWJlbF93aWR0aCAtIGhvcml6b250YWwgdHJhbnNmb3JtIG9mIHRoZSBsYWJlbFxuXHQvLyBUT0RPOiBTdWJzdGl0dXRlIDE1IGJ5IHRoZSB0cmFuc2Zvcm0gb2YgdGhlIG5vZGVzIChwcm9iYWJseSBieSBzZWxlY3Rpbmcgb25lIG5vZGUgYXNzdW1pbmcgYWxsIHRoZSBub2RlcyBoYXZlIHRoZSBzYW1lIHRyYW5zZm9ybVxuXHQgICAgdmFyIG5fbGVhdmVzID0gY3Vyci50cmVlLmdldF9hbGxfbGVhdmVzKCkubGVuZ3RoO1xuXHQgICAgdmFyIGNsdXN0ZXJfc2l6ZV9wYXJhbXMgPSB7XG5cdFx0bl9sZWF2ZXMgOiBuX2xlYXZlcyxcblx0XHRsYWJlbF9oZWlnaHQgOiBkMy5tYXgoW2QzLmZ1bmN0b3IoY29uZi5sYWJlbC5oZWlnaHQoKSkoKV0pLFxuXHRcdGxhYmVsX3BhZGRpbmcgOiAxNVxuXHQgICAgfTtcblx0ICAgIGNvbmYubGF5b3V0LmFkanVzdF9jbHVzdGVyX3NpemUoY2x1c3Rlcl9zaXplX3BhcmFtcyk7XG5cblx0ICAgIHN2Z1xuXHRcdC50cmFuc2l0aW9uKClcblx0XHQuZHVyYXRpb24oY29uZi5kdXJhdGlvbilcblx0XHQuZWFzZShlYXNlKVxuXHRcdC5hdHRyKFwiaGVpZ2h0XCIsIGNvbmYubGF5b3V0LmhlaWdodChjbHVzdGVyX3NpemVfcGFyYW1zKSArIDMwKTsgLy8gaGVpZ2h0IGlzIGluIHRoZSBsYXlvdXRcblxuXHQgICAgdmlzXG5cdFx0LnRyYW5zaXRpb24oKVxuXHRcdC5kdXJhdGlvbihjb25mLmR1cmF0aW9uKVxuXHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsXG5cdFx0ICAgICAgXCJ0cmFuc2xhdGUoXCIgK1xuXHRcdCAgICAgIGNvbmYubGF5b3V0LnRyYW5zbGF0ZV92aXMoKVswXSArXG5cdFx0ICAgICAgXCIsXCIgK1xuXHRcdCAgICAgIGNvbmYubGF5b3V0LnRyYW5zbGF0ZV92aXMoKVsxXSArXG5cdFx0ICAgICAgXCIpXCIpO1xuXHQgICAgXG5cdCAgICBjdXJyLm5vZGVzID0gY2x1c3Rlci5ub2RlcyhjdXJyLmRhdGEpO1xuXHQgICAgY29uZi5sYXlvdXQuc2NhbGVfYnJhbmNoX2xlbmd0aHMoY3Vycik7XG5cdCAgICBjdXJyLmxpbmtzID0gY2x1c3Rlci5saW5rcyhjdXJyLm5vZGVzKTtcblxuXHQgICAgLy8gTElOS1Ncblx0ICAgIHZhciBsaW5rID0gdmlzLnNlbGVjdEFsbChcInBhdGgudG50X3RyZWVfbGlua1wiKVxuXHRcdC5kYXRhKGN1cnIubGlua3MsIGZ1bmN0aW9uKGQpe3JldHVybiBkLnRhcmdldFtjb25mLmlkXX0pO1xuXG4gICAgICAgICAgICAvLyBOT0RFU1xuXHQgICAgdmFyIG5vZGUgPSB2aXMuc2VsZWN0QWxsKFwiZy50bnRfdHJlZV9ub2RlXCIpXG5cdFx0LmRhdGEoY3Vyci5ub2RlcywgZnVuY3Rpb24oZCkge3JldHVybiBkW2NvbmYuaWRdfSk7XG5cblx0ICAgIHZhciBleGl0X2xpbmsgPSBsaW5rXG5cdFx0LmV4aXQoKVxuXHRcdC5yZW1vdmUoKTtcblxuXHQgICAgbGlua1xuXHRcdC5lbnRlcigpXG5cdFx0LmFwcGVuZChcInBhdGhcIilcblx0XHQuYXR0cihcImNsYXNzXCIsIFwidG50X3RyZWVfbGlua1wiKVxuXHRcdC5hdHRyKFwiaWRcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHQgICAgcmV0dXJuIFwidG50X3RyZWVfbGlua19cIiArIGRpdl9pZCArIFwiX1wiICsgZC50YXJnZXQuX2lkO1xuXHRcdH0pXG5cdFx0LmF0dHIoXCJzdHJva2VcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHQgICAgcmV0dXJuIGQzLmZ1bmN0b3IoY29uZi5saW5rX2NvbG9yKSh0bnRfdHJlZV9ub2RlKGQuc291cmNlKSwgdG50X3RyZWVfbm9kZShkLnRhcmdldCkpO1xuXHRcdH0pXG5cdFx0LmF0dHIoXCJkXCIsIGRpYWdvbmFsKTtcblxuXHQgICAgbGlua1xuXHQgICAgXHQudHJhbnNpdGlvbigpXG5cdFx0LmVhc2UoZWFzZSlcblx0ICAgIFx0LmR1cmF0aW9uKGNvbmYuZHVyYXRpb24pXG5cdCAgICBcdC5hdHRyKFwiZFwiLCBkaWFnb25hbCk7XG5cblxuXHQgICAgLy8gTm9kZXNcblx0ICAgIHZhciBuZXdfbm9kZSA9IG5vZGVcblx0XHQuZW50ZXIoKVxuXHRcdC5hcHBlbmQoXCJnXCIpXG5cdFx0LmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihuKSB7XG5cdFx0ICAgIGlmIChuLmNoaWxkcmVuKSB7XG5cdFx0XHRpZiAobi5kZXB0aCA9PSAwKSB7XG5cdFx0XHQgICAgcmV0dXJuIFwicm9vdCB0bnRfdHJlZV9ub2RlXCJcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHQgICAgcmV0dXJuIFwiaW5uZXIgdG50X3RyZWVfbm9kZVwiXG5cdFx0XHR9XG5cdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gXCJsZWFmIHRudF90cmVlX25vZGVcIlxuXHRcdCAgICB9XG5cdFx0fSlcblx0XHQuYXR0cihcImlkXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0ICAgIHJldHVybiBcInRudF90cmVlX25vZGVfXCIgKyBkaXZfaWQgKyBcIl9cIiArIGQuX2lkO1xuXHRcdH0pXG5cdFx0LmF0dHIoXCJ0cmFuc2Zvcm1cIiwgdHJhbnNmb3JtKTtcbiAgIFxuXHQgICAgLy8gRXhpdGluZyBub2RlcyBhcmUganVzdCByZW1vdmVkXG5cdCAgICBub2RlXG5cdFx0LmV4aXQoKVxuXHRcdC5yZW1vdmUoKTtcblxuXHQgICAgbmV3X25vZGUub24oXCJjbGlja1wiLCBmdW5jdGlvbiAobm9kZSkge1xuXHRcdGNvbmYub25fY2xpY2suY2FsbCh0aGlzLCB0bnRfdHJlZV9ub2RlKG5vZGUpKTtcblxuXHRcdHRyZWUudHJpZ2dlcihcIm5vZGU6Y2xpY2tcIiwgdG50X3RyZWVfbm9kZShub2RlKSk7XG5cdCAgICB9KTtcblxuXHQgICAgbmV3X25vZGUub24oXCJtb3VzZWVudGVyXCIsIGZ1bmN0aW9uIChub2RlKSB7XG5cdFx0Y29uZi5vbl9tb3VzZW92ZXIuY2FsbCh0aGlzLCB0bnRfdHJlZV9ub2RlKG5vZGUpKTtcblxuXHRcdHRyZWUudHJpZ2dlcihcIm5vZGU6aG92ZXJcIiwgdG50X3RyZWVfbm9kZShub2RlKSk7XG5cdCAgICB9KTtcblxuXHQgICAgbmV3X25vZGUub24oXCJkYmxjbGlja1wiLCBmdW5jdGlvbiAobm9kZSkge1xuXHRcdGNvbmYub25fZGJsX2NsaWNrLmNhbGwodGhpcywgdG50X3RyZWVfbm9kZShub2RlKSk7XG5cblx0XHR0cmVlLnRyaWdnZXIoXCJub2RlOmRibGNsaWNrXCIsIHRudF90cmVlX25vZGUobm9kZSkpO1xuXHQgICAgfSk7XG5cblxuXHQgICAgLy8gV2UgbmVlZCB0byByZS1jcmVhdGUgYWxsIHRoZSBub2RlcyBhZ2FpbiBpbiBjYXNlIHRoZXkgaGF2ZSBjaGFuZ2VkIGxpdmVseSAob3IgdGhlIGxheW91dClcblx0ICAgIG5vZGUuc2VsZWN0QWxsKFwiKlwiKS5yZW1vdmUoKTtcblx0ICAgIG5vZGVcblx0XHQgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcblx0XHRcdGNvbmYubm9kZV9kaXNwbGF5LmNhbGwodGhpcywgdG50X3RyZWVfbm9kZShkKSlcblx0XHQgICAgfSk7XG5cblx0ICAgIC8vIFdlIG5lZWQgdG8gcmUtY3JlYXRlIGFsbCB0aGUgbGFiZWxzIGFnYWluIGluIGNhc2UgdGhleSBoYXZlIGNoYW5nZWQgbGl2ZWx5IChvciB0aGUgbGF5b3V0KVxuXHQgICAgbm9kZVxuXHRcdCAgICAuZWFjaCAoZnVuY3Rpb24gKGQpIHtcblx0XHRcdGNvbmYubGFiZWwuY2FsbCh0aGlzLCB0bnRfdHJlZV9ub2RlKGQpLCBjb25mLmxheW91dC50eXBlLCBkMy5mdW5jdG9yKGNvbmYubm9kZV9kaXNwbGF5LnNpemUoKSkodG50X3RyZWVfbm9kZShkKSkpO1xuXHRcdCAgICB9KTtcblxuXHQgICAgbm9kZVxuXHRcdC50cmFuc2l0aW9uKClcblx0XHQuZWFzZShlYXNlKVxuXHRcdC5kdXJhdGlvbihjb25mLmR1cmF0aW9uKVxuXHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsIHRyYW5zZm9ybSk7XG5cblx0fSk7XG4gICAgfTtcblxuICAgIC8vIEFQSVxuICAgIHZhciBhcGkgPSBhcGlqcyAodClcblx0LmdldHNldCAoY29uZilcblxuICAgIC8vIFRPRE86IFJld3JpdGUgZGF0YSB1c2luZyBnZXRzZXQgLyBmaW5hbGl6ZXJzICYgdHJhbnNmb3Jtc1xuICAgIGFwaS5tZXRob2QgKCdkYXRhJywgZnVuY3Rpb24gKGQpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gYmFzZS5kYXRhO1xuXHR9XG5cblx0Ly8gVGhlIG9yaWdpbmFsIGRhdGEgaXMgc3RvcmVkIGFzIHRoZSBiYXNlIGFuZCBjdXJyIGRhdGFcblx0YmFzZS5kYXRhID0gZDtcblx0Y3Vyci5kYXRhID0gZDtcblxuXHQvLyBTZXQgdXAgYSBuZXcgdHJlZSBiYXNlZCBvbiB0aGUgZGF0YVxuXHR2YXIgbmV3dHJlZSA9IHRudF90cmVlX25vZGUoYmFzZS5kYXRhKTtcblxuXHR0LnJvb3QobmV3dHJlZSk7XG5cblx0dHJlZS50cmlnZ2VyKFwiZGF0YTpoYXNDaGFuZ2VkXCIsIGJhc2UuZGF0YSk7XG5cblx0cmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICAvLyBUT0RPOiBSZXdyaXRlIHRyZWUgdXNpbmcgZ2V0c2V0IC8gZmluYWxpemVycyAmIHRyYW5zZm9ybXNcbiAgICBhcGkubWV0aG9kICgncm9vdCcsIGZ1bmN0aW9uIChteVRyZWUpIHtcbiAgICBcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIFx0ICAgIHJldHVybiBjdXJyLnRyZWU7XG4gICAgXHR9XG5cblx0Ly8gVGhlIG9yaWdpbmFsIHRyZWUgaXMgc3RvcmVkIGFzIHRoZSBiYXNlLCBwcmV2IGFuZCBjdXJyIHRyZWVcbiAgICBcdGJhc2UudHJlZSA9IG15VHJlZTtcblx0Y3Vyci50cmVlID0gYmFzZS50cmVlO1xuLy9cdHByZXYudHJlZSA9IGJhc2UudHJlZTtcbiAgICBcdHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3N1YnRyZWUnLCBmdW5jdGlvbiAoY3Vycl9ub2Rlcykge1xuXHR2YXIgc3VidHJlZSA9IGJhc2UudHJlZS5zdWJ0cmVlKGN1cnJfbm9kZXMpO1xuXHRjdXJyLmRhdGEgPSBzdWJ0cmVlLmRhdGEoKTtcblx0Y3Vyci50cmVlID0gc3VidHJlZTtcblxuXHRyZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdmb2N1c19ub2RlJywgZnVuY3Rpb24gKG5vZGUpIHtcblx0Ly8gZmluZCBcblx0dmFyIGZvdW5kX25vZGUgPSB0LnJvb3QoKS5maW5kX25vZGUoZnVuY3Rpb24gKG4pIHtcblx0ICAgIHJldHVybiBub2RlLmlkKCkgPT09IG4uaWQoKTtcblx0fSk7XG5cdGZvY3VzZWRfbm9kZSA9IGZvdW5kX25vZGU7XG5cdHQuc3VidHJlZShmb3VuZF9ub2RlLmdldF9hbGxfbGVhdmVzKCkpO1xuXG5cdHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2hhc19mb2N1cycsIGZ1bmN0aW9uIChub2RlKSB7XG5cdHJldHVybiAoKGZvY3VzZWRfbm9kZSAhPT0gdW5kZWZpbmVkKSAmJiAoZm9jdXNlZF9ub2RlLmlkKCkgPT09IG5vZGUuaWQoKSkpO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3JlbGVhc2VfZm9jdXMnLCBmdW5jdGlvbiAoKSB7XG5cdHQuZGF0YSAoYmFzZS5kYXRhKTtcblx0Zm9jdXNlZF9ub2RlID0gdW5kZWZpbmVkO1xuXHRyZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIHJldHVybiB0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdHJlZTtcbiIsInZhciB0bnRfdHJlZSA9IHJlcXVpcmUoXCJ0bnQudHJlZVwiKTtcbnZhciB0bnRfdG9vbHRpcCA9IHJlcXVpcmUoXCJ0bnQudG9vbHRpcFwiKTtcblxudmFyIGdlbmVBc3NvY2lhdGlvbnNUcmVlID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIGNvbmZpZyA9IHtcblx0ZGF0YSA6IHVuZGVmaW5lZCxcblx0ZGlhbWV0ZXIgOiAxMDAwLFxuXHRjdHR2QXBpIDogdW5kZWZpbmVkXG4gICAgfTtcbiAgICBcbiAgICB2YXIgc2NhbGUgPSBkMy5zY2FsZS5xdWFudGl6ZSgpXG5cdC5kb21haW4oWy0zLDNdKVxuXHQucmFuZ2UoW1wiI2IyMTgyYlwiLCBcIiNlZjhhNjJcIiwgXCIjZmRkYmM3XCIsIFwiI2Y3ZjdmN1wiLCBcIiNkMWU1ZjBcIiwgXCIjNjdhOWNmXCIsIFwiIzIxNjZhY1wiXSk7XG5cbiAgICBmdW5jdGlvbiBsb29rRGF0YXNvdXJjZSAoYXJyLCBkc05hbWUpIHtcblx0Zm9yICh2YXIgaT0wOyBpPGFyci5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIGRzID0gYXJyW2ldO1xuXHQgICAgaWYgKGRzLmRhdGF0eXBlID09PSBkc05hbWUpIHtcblx0XHRyZXR1cm4ge1xuXHRcdCAgICBcImNvdW50XCI6IGRzLmV2aWRlbmNlX2NvdW50LFxuXHRcdCAgICBcInNjb3JlXCI6IGRzLmFzc29jaWF0aW9uX3Njb3JlXG5cdFx0fTtcblx0ICAgIH1cblx0fVxuXHRyZXR1cm4ge1xuXHQgICAgXCJjb3VudFwiOiAwLFxuXHQgICAgXCJzY29yZVwiOiAwXG5cdH07XG4gICAgfVxuICAgIFxuXG4gICAgZnVuY3Rpb24gcmVuZGVyIChmbG93ZXJWaWV3LCBkaXYpIHtcblx0dmFyIGRhdGEgPSBjb25maWcuZGF0YTtcblx0dmFyIHRyZWVWaXMgPSB0bnRfdHJlZSgpO1xuICAgIFxuXHQvLyB0b29sdGlwc1xuXHR2YXIgbm9kZVRvb2x0aXAgPSBmdW5jdGlvbiAobm9kZSkge1xuXHQgICAgdmFyIG9iaiA9IHt9O1xuXHQgICAgdmFyIHNjb3JlID0gbm9kZS5wcm9wZXJ0eShcImFzc29jaWF0aW9uX3Njb3JlXCIpO1xuXHQgICAgb2JqLmhlYWRlciA9IG5vZGUucHJvcGVydHkoXCJsYWJlbFwiKSArIFwiIChBc3NvY2lhdGlvbiBzY29yZTogXCIgKyBzY29yZSArIFwiKVwiO1xuXHQgICAgdmFyIGxvYyA9IFwiIy9nZW5lLWRpc2Vhc2U/dD1cIiArIGNvbmZpZy50YXJnZXQgKyBcIiZkPVwiICsgbm9kZS5wcm9wZXJ0eShcImVmb19jb2RlXCIpO1xuXHQgICAgLy9vYmouYm9keT1cIjxkaXY+PC9kaXY+PGEgaHJlZj1cIiArIGxvYyArIFwiPlZpZXcgZXZpZGVuY2UgZGV0YWlsczwvYT48YnIvPjxhIGhyZWY9Jyc+Wm9vbSBvbiBub2RlPC9hPlwiO1xuXHQgICAgb2JqLnJvd3MgPSBbXTtcblx0ICAgIG9iai5yb3dzLnB1c2goe1xuXHRcdHZhbHVlIDogXCI8ZGl2PjwvZGl2PlwiXG5cdCAgICB9KTtcblx0ICAgIG9iai5yb3dzLnB1c2goe1xuXHRcdHZhbHVlOiBcIjxhIGhyZWY9XCIgKyBsb2MgKyBcIj5WaWV3IGV2aWRlbmNlIGRldGFpbHM8L2E+XCJcblx0ICAgIH0pO1xuXHQgICAgb2JqLnJvd3MucHVzaCh7XG5cdFx0dmFsdWUgOiBub2RlLmlzX2NvbGxhcHNlZCgpID8gXCJVbmNvbGxhcHNlIGNoaWxkcmVuXCIgOiBcIkNvbGxhcHNlIGNoaWxkcmVuXCIsXG5cdFx0bGluayA6IGZ1bmN0aW9uIChuKSB7XG5cdFx0ICAgIG4udG9nZ2xlKCk7XG5cdFx0ICAgIHRyZWVWaXMudXBkYXRlKCk7XG5cdFx0fSxcblx0XHRvYmo6IG5vZGVcblx0ICAgIH0pO1xuXG5cdCAgICBpZiAodHJlZVZpcy5oYXNfZm9jdXMobm9kZSkpIHtcblx0XHRvYmoucm93cy5wdXNoKHtcblx0XHQgICAgdmFsdWUgOiBcIlJlbGVhc2UgZm9jdXNcIixcblx0XHQgICAgbGluayA6IGZ1bmN0aW9uIChuKSB7XG5cdFx0XHR0cmVlVmlzLnJlbGVhc2VfZm9jdXMobilcblx0XHRcdCAgICAudXBkYXRlKCk7XG5cdFx0ICAgIH0sXG5cdFx0ICAgIG9iaiA6IG5vZGVcblx0XHR9KTtcblx0ICAgIH0gZWxzZSB7XG5cdFx0b2JqLnJvd3MucHVzaCh7XG5cdFx0ICAgIHZhbHVlOlwiU2V0IGZvY3VzIG9uIG5vZGVcIixcblx0XHQgICAgbGluayA6IGZ1bmN0aW9uIChuKSB7XG5cdFx0XHR0cmVlVmlzLmZvY3VzX25vZGUobilcblx0XHRcdCAgICAudXBkYXRlKCk7XG5cdFx0ICAgIH0sXG5cdFx0ICAgIG9iajogbm9kZVxuXHRcdH0pO1xuXHQgICAgfVxuXG5cdCAgICB2YXIgdCA9IHRudF90b29sdGlwLmxpc3QoKVxuXHRcdC5pZCgxKVxuXHRcdC53aWR0aCgxODApO1xuXHQgICAgLy8gSGlqYWNrIHRvb2x0aXAncyBmaWxsIGNhbGxiYWNrXG5cdCAgICB2YXIgb3JpZ0ZpbGwgPSB0LmZpbGwoKTtcblxuXHQgICAgLy8gUGFzcyBhIG5ldyBmaWxsIGNhbGxiYWNrIHRoYXQgY2FsbHMgdGhlIG9yaWdpbmFsIG9uZSBhbmQgZGVjb3JhdGVzIHdpdGggZmxvd2Vyc1xuXHQgICAgdC5maWxsIChmdW5jdGlvbiAoZGF0YSkge1xuXHRcdG9yaWdGaWxsLmNhbGwodGhpcywgZGF0YSk7XG5cdFx0dmFyIGRhdGF0eXBlcyA9IG5vZGUucHJvcGVydHkoXCJkYXRhdHlwZXNcIik7XG5cdFx0dmFyIGZsb3dlckRhdGEgPSBbXG5cdFx0ICAgIHtcInZhbHVlXCI6bG9va0RhdGFzb3VyY2UoZGF0YXR5cGVzLCBcImdlbmV0aWNfYXNzb2NpYXRpb25cIikuc2NvcmUsICBcImxhYmVsXCI6XCJHZW5ldGljc1wifSxcblx0XHQgICAge1widmFsdWVcIjpsb29rRGF0YXNvdXJjZShkYXRhdHlwZXMsIFwic29tYXRpY19tdXRhdGlvblwiKS5zY29yZSwgIFwibGFiZWxcIjpcIlNvbWF0aWNcIn0sXG5cdFx0ICAgIHtcInZhbHVlXCI6bG9va0RhdGFzb3VyY2UoZGF0YXR5cGVzLCBcImtub3duX2RydWdcIikuc2NvcmUsICBcImxhYmVsXCI6XCJEcnVnc1wifSxcblx0XHQgICAge1widmFsdWVcIjpsb29rRGF0YXNvdXJjZShkYXRhdHlwZXMsIFwicm5hX2V4cHJlc3Npb25cIikuc2NvcmUsICBcImxhYmVsXCI6XCJSTkFcIn0sXG5cdFx0ICAgIHtcInZhbHVlXCI6bG9va0RhdGFzb3VyY2UoZGF0YXR5cGVzLCBcImFmZmVjdGVkX3BhdGh3YXlcIikuc2NvcmUsICBcImxhYmVsXCI6XCJQYXRod2F5c1wifSxcblx0XHQgICAge1widmFsdWVcIjpsb29rRGF0YXNvdXJjZShkYXRhdHlwZXMsIFwiYW5pbWFsX21vZGVsXCIpLnNjb3JlLCAgXCJsYWJlbFwiOlwiTW9kZWxzXCJ9XG5cdFx0XVxuXHRcdGZsb3dlclZpZXdcblx0XHQgICAgLmRpYWdvbmFsKDE1MClcblx0XHQgICAgLnZhbHVlcyhmbG93ZXJEYXRhKSh0aGlzLnNlbGVjdChcImRpdlwiKS5ub2RlKCkpO1xuXHQgICAgfSk7XG5cblx0ICAgIHQuY2FsbCh0aGlzLCBvYmopO1xuXHR9XG5cblx0dHJlZVZpc1xuXHQgICAgLmRhdGEoY29uZmlnLmRhdGEpXG5cdCAgICAubm9kZV9kaXNwbGF5KHRudF90cmVlLm5vZGVfZGlzcGxheS5jaXJjbGUoKVxuXHQgICAgXHRcdCAgLnNpemUoOClcblx0ICAgIFx0XHQgIC5maWxsKGZ1bmN0aW9uIChub2RlKSB7XG5cdCAgICBcdFx0ICAgICAgcmV0dXJuIHNjYWxlKG5vZGUucHJvcGVydHkoXCJhc3NvY2lhdGlvbl9zY29yZVwiKSk7XG5cdCAgICBcdFx0ICB9KVxuXHQgICAgXHRcdCApXG5cdCAgICAub25fY2xpY2sobm9kZVRvb2x0aXApXG5cdCAgICAubGFiZWwodG50X3RyZWUubGFiZWwudGV4dCgpXG5cdCAgICBcdCAgIC50ZXh0KGZ1bmN0aW9uIChub2RlKSB7XG5cdCAgICBcdCAgICAgICBpZiAobm9kZS5pc19sZWFmKCkpIHtcblx0ICAgIFx0XHQgICB2YXIgZGlzZWFzZU5hbWUgPSBub2RlLnByb3BlcnR5KFwibGFiZWxcIik7XG5cdCAgICBcdFx0ICAgaWYgKGRpc2Vhc2VOYW1lLmxlbmd0aCA+IDMwKSB7XG5cdCAgICBcdFx0ICAgICAgIGRpc2Vhc2VOYW1lID0gZGlzZWFzZU5hbWUuc3Vic3RyaW5nKDAsMzApICsgXCIuLi5cIjtcblx0ICAgIFx0XHQgICB9XG5cdCAgICBcdFx0ICAgcmV0dXJuIGRpc2Vhc2VOYW1lXG5cdCAgICBcdCAgICAgICB9XG5cdCAgICBcdCAgICAgICByZXR1cm4gXCJcIjtcblx0ICAgIFx0ICAgfSlcblx0ICAgIFx0ICAgLmZvbnRzaXplKDE0KVxuXHQgICAgXHQgIClcblx0ICAgIC5sYXlvdXQodG50X3RyZWUubGF5b3V0LnJhZGlhbCgpXG5cdCAgICBcdCAgICAud2lkdGgoY29uZmlnLmRpYW1ldGVyKVxuXHQgICAgXHQgICAgLnNjYWxlKGZhbHNlKVxuXHQgICAgXHQgICApO1xuXG5cdHRyZWVWaXMoZGl2Lm5vZGUoKSk7XG5cdGQzLnNlbGVjdEFsbChcIi50bnRfdHJlZV9ub2RlXCIpXG5cdCAgICAuYXBwZW5kKFwidGl0bGVcIilcblx0ICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIGQubGFiZWw7XG5cdCAgICB9KTtcblxuICAgIH1cbiAgICBcbiAgICAvLyBkZXBzOiB0cmVlX3ZpcywgZmxvd2VyXG4gICAgdmFyIHRoZW1lID0gZnVuY3Rpb24gKGZsb3dlclZpZXcsIGRpdikge1xuXHR2YXIgdmlzID0gZDMuc2VsZWN0KGRpdilcblx0ICAgIC5hcHBlbmQoXCJkaXZcIilcblx0ICAgIC5zdHlsZShcInBvc2l0aW9uXCIsIFwicmVsYXRpdmVcIik7XG5cblx0aWYgKChjb25maWcuZGF0YSA9PT0gdW5kZWZpbmVkKSAmJiAoY29uZmlnLnRhcmdldCAhPT0gdW5kZWZpbmVkKSAmJiAoY29uZmlnLmN0dHZBcGkgIT09IHVuZGVmaW5lZCkpIHtcblx0ICAgIHZhciBhcGkgPSBjb25maWcuY3R0dkFwaTtcblx0ICAgIHZhciB1cmwgPSBhcGkudXJsLmFzc29jaWF0aW9ucyh7XG5cdFx0Z2VuZSA6IGNvbmZpZy50YXJnZXQsXG5cdFx0ZGF0YXN0cnVjdHVyZSA6IFwidHJlZVwiXG5cdCAgICB9KTtcblx0ICAgIGFwaS5jYWxsKHVybClcblx0XHQudGhlbiAoZnVuY3Rpb24gKHJlc3ApIHtcblx0XHQgICAgY29uZmlnLmRhdGEgPSByZXNwLmJvZHkuZGF0YTtcblx0XHQgICAgcmVuZGVyKGZsb3dlclZpZXcsIHZpcyk7XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdCAgICByZW5kZXIoZmxvd2VyVmlldywgdmlzKTtcblx0fVxuICAgIH07XG5cbiAgICAvLyBzaXplIG9mIHRoZSB0cmVlXG4gICAgdGhlbWUuZGlhbWV0ZXIgPSBmdW5jdGlvbiAoZCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBjb25maWcuZGlhbWV0ZXI7XG5cdH1cblx0Y29uZmlnLmRpYW1ldGVyID0gZDtcblx0cmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxuICAgIC8vXG4gICAgdGhlbWUudGFyZ2V0ID0gZnVuY3Rpb24gKHQpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gY29uZmlnLnRhcmdldDtcblx0fVxuXHRjb25maWcudGFyZ2V0ID0gdDtcblx0cmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHRoZW1lLmN0dHZBcGkgPSBmdW5jdGlvbiAoYXBpKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGNvbmZpZy5jdHR2QXBpO1xuXHR9XG5cdGNvbmZpZy5jdHR2QXBpID0gYXBpO1xuXHRyZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIC8vIGRhdGEgaXMgb2JqZWN0XG4gICAgdGhlbWUuZGF0YSA9IGZ1bmN0aW9uIChkKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGNvbmZpZy5kYXRhO1xuXHR9XG5cdGNvbmZpZy5kYXRhID0gZDtcblx0cmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHJldHVybiB0aGVtZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGdlbmVBc3NvY2lhdGlvbnNUcmVlO1xuIl19
