/**
 * SlidingCanvas module.
 * @module foundation.offcanvas
 * @requires foundation.util.triggers
 * @requires foundation.util.motion
 */
// !function($, Foundation) {
//
// 'use strict';

/**
 * Creates a new instance of an off-canvas wrapper.
 * @class
 * @fires SlidingCanvas#init
 * @param {Object} element - jQuery object to initialize.
 * @param {Object} options - Overrides to the default plugin settings.
 */
function SlidingCanvas(element, options) {
  this.$element = element;
  this.options = $.extend({}, SlidingCanvas.defaults, this.$element.data(), options);
  this.$lastTrigger = $();

  this._init();
  this._events();

  // Foundation.registerPlugin(this, 'SlidingCanvas');
}

SlidingCanvas.defaults = {
  /**
   * Allow the user to click outside of the menu to close it.
   * @option
   * @example true
   */
  closeOnClick: true,
  /**
   * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
   * @option
   * @example 500
   */
  transitionTime: 0,
  /**
   * Direction the offcanvas opens from. Determines class applied to body.
   * @option
   * @example left
   */
  position: 'left',
  /**
   * Force the page to scroll to top on open.
   */
  forceTop: true,
  /**
   * Allow the offcanvas to be sticky while open. Does nothing if Sass option `$maincontent-prevent-scroll === true`.
   * Performance in Safari OSX/iOS is not great.
   */
  // isSticky: false,
  /**
   * Allow the offcanvas to remain open for certain breakpoints. Can be used with `isSticky`.
   * @option
   * @example false
   */
  isRevealed: false,
  /**
   * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class @`revealClass`.
   * @option
   * @example reveal-for-large
   */
  revealOn: null,
  /**
   * Force focus to the offcanvas on open. If true, will focus the opening trigger on close.
   * @option
   * @example true
   */
  autoFocus: true,
  /**
   * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
   * @option
   * TODO improve the regex testing for this.
   * @example reveal-for-large
   */
  revealClass: 'reveal-for-',
  /**
   * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
   * @option
   * @example true
   */
  trapFocus: false
};

/**
 * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
 * @function
 * @private
 */
SlidingCanvas.prototype._init = function() {
  var id = this.$element.attr('id');

  this.$element.attr('aria-hidden', 'true');

  // Find triggers that affect this element and add aria-expanded to them
  $(document)
    .find('[data-open="'+id+'"], [data-close="'+id+'"], [data-toggle="'+id+'"]')
    .attr('aria-expanded', 'false')
    .attr('aria-controls', id);

  // Add a close trigger over the body if necessary
  if (this.options.closeOnClick){
    if($('.js-off-canvas-exit').length){
      this.$exiter = $('.js-off-canvas-exit');
    }else{
      var exiter = document.createElement('div');
      exiter.setAttribute('class', 'js-off-canvas-exit');
      $('[data-off-canvas-content]').append(exiter);

      this.$exiter = $(exiter);
    }
  }

  this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

  if(this.options.isRevealed){
    this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
    this._setMQChecker();
  }
  if(!this.options.transitionTime){
    this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas-wrapper]')[0]).transitionDuration) * 1000;
  }
};

/**
 * Adds event handlers to the off-canvas wrapper and the exit overlay.
 * @function
 * @private
 */
SlidingCanvas.prototype._events = function() {
  this.$element.off('.zf.trigger .zf.offcanvas').on({
    'open.zf.trigger': this.open.bind(this),
    'close.zf.trigger': this.close.bind(this),
    'toggle.zf.trigger': this.toggle.bind(this),
    'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
  });

  if (this.$exiter.length) {
    var _this = this;
    this.$exiter.on({'click.zf.offcanvas': this.close.bind(this)});
  }
};
/**
 * Applies event listener for elements that will reveal at certain breakpoints.
 * @private
 */
SlidingCanvas.prototype._setMQChecker = function(){
  var _this = this;

  // $(window).on('changed.zf.mediaquery', function(){
  //   if(Foundation.MediaQuery.atLeast(_this.options.revealOn)){
  //     _this.reveal(true);
  //   }else{
  //     _this.reveal(false);
  //   }
  // }).one('load.zf.offcanvas', function(){
  //   if(Foundation.MediaQuery.atLeast(_this.options.revealOn)){
  //     _this.reveal(true);
  //   }
  // });
};
/**
 * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
 * @param {Boolean} isRevealed - true if element should be revealed.
 * @function
 */
SlidingCanvas.prototype.reveal = function(isRevealed){
  var $closer = this.$element.find('[data-close]');
  if(isRevealed){
    this.close();
    this.isRevealed = true;
    // if(!this.options.forceTop){
    //   var scrollPos = parseInt(window.pageYOffset);
    //   this.$element[0].style.transform = 'translate(0,' + scrollPos + 'px)';
    // }
    // if(this.options.isSticky){ this._stick(); }
    this.$element.off('open.zf.trigger toggle.zf.trigger');
    if($closer.length){ $closer.hide(); }
  }else{
    this.isRevealed = false;
    // if(this.options.isSticky || !this.options.forceTop){
    //   this.$element[0].style.transform = '';
    //   $(window).off('scroll.zf.offcanvas');
    // }
    this.$element.on({
      'open.zf.trigger': this.open.bind(this),
      'toggle.zf.trigger': this.toggle.bind(this)
    });
    if($closer.length){
      $closer.show();
    }
  }
};

/**
 * Opens the off-canvas menu.
 * @function
 * @param {Object} event - Event object passed from listener.
 * @param {jQuery} trigger - element that triggered the off-canvas to open.
 * @fires SlidingCanvas#opened
 */
SlidingCanvas.prototype.open = function(event, trigger) {
  if (this.$element.hasClass('is-open') || this.isRevealed){ return; }
  var _this = this,
      $body = $(document.body);
  // $('body').scrollTop(0);
  // window.pageYOffset = 0;

  // if(!this.options.forceTop){
  //   var scrollPos = parseInt(window.pageYOffset);
  //   this.$element[0].style.transform = 'translate(0,' + scrollPos + 'px)';
  //   if(this.$exiter.length){
  //     this.$exiter[0].style.transform = 'translate(0,' + scrollPos + 'px)';
  //   }
  // }
  /**
   * Fires when the off-canvas menu opens.
   * @event SlidingCanvas#opened
   */
  Foundation.Move(this.options.transitionTime, this.$element, function(){
    $('[data-off-canvas-wrapper]').addClass('is-off-canvas-open is-open-'+ _this.options.position);

    _this.$element
      .addClass('is-open')

    // if(_this.options.isSticky){
    //   _this._stick();
    // }
  });
  this.$element.attr('aria-hidden', 'false')
      .trigger('opened.zf.offcanvas');


  if(trigger){
    this.$lastTrigger = trigger.attr('aria-expanded', 'true');
  }
  if(this.options.autoFocus){
    this.$element.one('finished.zf.animate', function(){
      _this.$element.find('a, button').eq(0).focus();
    });
  }
  if(this.options.trapFocus){
    $('[data-off-canvas-content]').attr('tabindex', '-1');
    this._trapFocus();
  }
};
/**
 * Traps focus within the offcanvas on open.
 * @private
 */
SlidingCanvas.prototype._trapFocus = function(){
  var focusable = Foundation.Keyboard.findFocusable(this.$element),
      first = focusable.eq(0),
      last = focusable.eq(-1);

  focusable.off('.zf.offcanvas').on('keydown.zf.offcanvas', function(e){
    if(e.which === 9 || e.keycode === 9){
      if(e.target === last[0] && !e.shiftKey){
        e.preventDefault();
        first.focus();
      }
      if(e.target === first[0] && e.shiftKey){
        e.preventDefault();
        last.focus();
      }
    }
  });
};
/**
 * Allows the offcanvas to appear sticky utilizing translate properties.
 * @private
 */
// SlidingCanvas.prototype._stick = function(){
//   var elStyle = this.$element[0].style;
//
//   if(this.options.closeOnClick){
//     var exitStyle = this.$exiter[0].style;
//   }
//
//   $(window).on('scroll.zf.offcanvas', function(e){
//     console.log(e);
//     var pageY = window.pageYOffset;
//     elStyle.transform = 'translate(0,' + pageY + 'px)';
//     if(exitStyle !== undefined){ exitStyle.transform = 'translate(0,' + pageY + 'px)'; }
//   });
//   // this.$element.trigger('stuck.zf.offcanvas');
// };
/**
 * Closes the off-canvas menu.
 * @function
 * @param {Function} cb - optional cb to fire after closure.
 * @fires SlidingCanvas#closed
 */
SlidingCanvas.prototype.close = function(cb) {
  if(!this.$element.hasClass('is-open') || this.isRevealed){ return; }

  var _this = this;

  //  Foundation.Move(this.options.transitionTime, this.$element, function(){
  $('[data-off-canvas-wrapper]').removeClass('is-off-canvas-open is-open-' + _this.options.position);
  _this.$element.removeClass('is-open');
    // Foundation._reflow();
  // });
  this.$element.attr('aria-hidden', 'true')
    /**
     * Fires when the off-canvas menu opens.
     * @event SlidingCanvas#closed
     */
      .trigger('closed.zf.offcanvas');
  // if(_this.options.isSticky || !_this.options.forceTop){
  //   setTimeout(function(){
  //     _this.$element[0].style.transform = '';
  //     $(window).off('scroll.zf.offcanvas');
  //   }, this.options.transitionTime);
  // }

  this.$lastTrigger.attr('aria-expanded', 'false');
  if(this.options.trapFocus){
    $('[data-off-canvas-content]').removeAttr('tabindex');
  }

};

/**
 * Toggles the off-canvas menu open or closed.
 * @function
 * @param {Object} event - Event object passed from listener.
 * @param {jQuery} trigger - element that triggered the off-canvas to open.
 */
SlidingCanvas.prototype.toggle = function(event, trigger) {
  if (this.$element.hasClass('is-open')) {
    this.close(event, trigger);
  }
  else {
    this.open(event, trigger);
  }
};

/**
 * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
 * @function
 * @private
 */
SlidingCanvas.prototype._handleKeyboard = function(event) {
  if (event.which !== 27) return;

  event.stopPropagation();
  event.preventDefault();
  this.close();
  this.$lastTrigger.focus();
};
/**
 * Destroys the offcanvas plugin.
 * @function
 */
SlidingCanvas.prototype.destroy = function(){
  this.close();
  this.$element.off('.zf.trigger .zf.offcanvas');
  this.$exiter.off('.zf.offcanvas');

  // Foundation.unregisterPlugin(this);
};

// Foundation.plugin(SlidingCanvas, 'SlidingCanvas');

// }(jQuery, Foundation);

$(function() {
  // $(document).foundation();

  var $sidebar = $('#sidebar');
  if ($sidebar.length) {
    var $docs = $('#docs');
    var $nav = $sidebar.find('nav');

    //
    // Setup sidebar navigation
    var traverse = new Traverse($nav, {
      threshold: 10,
      barOffset: $sidebar.position().top
    });

    $nav.on('update.traverse', function(event, element) {
      $nav.find('section').removeClass('expand');
      var $section = element.parents('section:first');
      if ($section.length) {
        $section.addClass('expand');
      }
    });

    //
    // Bind the drawer layout
    var $drawerLayout = $('.drawer-layout'),
      $drawer = $drawerLayout.find('.drawer'),
      closeDrawer = function() {
        $drawer.removeClass('slide-right slide-left');
        $drawer.find('.drawer-overlay').remove();
        $drawerLayout.removeClass('drawer-open drawer-slide-left-large drawer-slide-right-large');
        return false;
      };

    // Drawer open buttons
    $drawerLayout.find('[data-drawer-slide]').click(function(e) {
      var $this = $(this),
        direction = $this.data('drawer-slide');
      $drawerLayout.addClass('drawer-open');
      $drawer.addClass('slide-' + direction);

      var $overlay = $('<a href="#" class="drawer-overlay"></a>')
      $drawer.append($overlay);
      $overlay.click(closeDrawer);

      return false;
    });

    // Drawer close buttons
    $drawerLayout.find('[data-drawer-close]').click(closeDrawer);
  }
});

/**
 * Creates a new instance of Traverse.
 * @class
 * @fires Traverse#init
 * @param {Object} element - jQuery object to add the trigger to.
 * @param {Object} options - Overrides to the default plugin settings.
 */
function Traverse(element, options) {
  this.$element = element;
  this.options  = $.extend({}, Traverse.defaults, this.$element.data(), options);

  this._init();
}

/**
 * Default settings for plugin
 */
Traverse.defaults = {
  /**
   * Amount of time, in ms, the animated scrolling should take between locations.
   * @option
   * @example 500
   */
  animationDuration: 500,
  /**
   * Animation style to use when scrolling between locations.
   * @option
   * @example 'ease-in-out'
   */
  animationEasing: 'linear',
  /**
   * Number of pixels to use as a marker for location changes.
   * @option
   * @example 50
   */
  threshold: 50,
  /**
   * Class applied to the active locations link on the traverse container.
   * @option
   * @example 'active'
   */
  activeClass: 'active',
  /**
   * Allows the script to manipulate the url of the current page, and if supported, alter the history.
   * @option
   * @example true
   */
  deepLinking: false,
  /**
   * Number of pixels to offset the scroll of the page on item click if using a sticky nav bar.
   * @option
   * @example 25
   */
  barOffset: 0
};

/**
 * Initializes the Traverse plugin and calls functions to get equalizer functioning on load.
 * @private
 */
Traverse.prototype._init = function() {
  var id = this.$element[0].id, // || Foundation.GetYoDigits(6, 'traverse'),
      _this = this;
  this.$targets = $('[data-traverse-target]');
  this.$links = this.$element.find('a');
  this.$element.attr({
    'data-resize': id,
    'data-scroll': id,
    'id': id
  });
  this.$active = $();
  this.scrollPos = parseInt(window.pageYOffset, 10);

  this._events();
};

/**
 * Calculates an array of pixel values that are the demarcation lines between locations on the page.
 * Can be invoked if new elements are added or the size of a location changes.
 * @function
 */
Traverse.prototype.calcPoints = function(){
  var _this = this,
      body = document.body,
      html = document.documentElement;

  this.points = [];
  this.winHeight = Math.round(Math.max(window.innerHeight, html.clientHeight));
  this.docHeight = Math.round(Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight));

  this.$targets.each(function(){
    var $tar = $(this),
        pt = $tar.offset().top; // Math.round($tar.offset().top - _this.options.threshold);
    $tar.targetPoint = pt;
    _this.points.push(pt);
  });
};

/**
 * Initializes events for Traverse.
 * @private
 */
Traverse.prototype._events = function() {
  var _this = this,
      $body = $('html, body'),
      opts = {
        duration: _this.options.animationDuration,
        easing:   _this.options.animationEasing
      };

  $(window).one('load', function(){
    _this.calcPoints();
    _this._updateActive();

    $(this).resize(function(e) {
      _this.reflow();
    }).scroll(function(e) {
      _this._updateActive();
    });
  })

  this.$element.on('click', 'a[href^="#"]', function(e) { //'click.zf.traverse'
      e.preventDefault();
      var arrival   = this.getAttribute('href'),
          scrollPos = $(arrival).offset().top - _this.options.barOffset; // - _this.options.threshold / 2 - _this.options.barOffset;

      $body.stop(true).animate({
        scrollTop: scrollPos
      }, opts);
    });
};

/**
 * Calls necessary functions to update Traverse upon DOM change
 * @function
 */
Traverse.prototype.reflow = function(){
  this.calcPoints();
  this._updateActive();
};

/**
 * Updates the visibility of an active location link,
 * and updates the url hash for the page, if deepLinking enabled.
 * @private
 * @function
 * @fires Traverse#update
 */
 Traverse.prototype._updateActive = function(){
   var winPos = parseInt(window.pageYOffset, 10),
       curIdx;

   if(winPos + this.winHeight === this.docHeight){ curIdx = this.points.length - 1; }
   else if(winPos < this.points[0]){ curIdx = 0; }
   else{
     var isDown = this.scrollPos < winPos,
         _this = this,
         curVisible = this.points.filter(function(p, i){
           return isDown ?
             p <= (winPos + _this.options.barOffset + _this.options.threshold) :
             (p - (_this.options.barOffset + _this.options.threshold)) <= winPos;
            //   p <= (winPos - (offset - _this.options.threshold)) :
            //   (p - (-offset + _this.options.threshold)) <= winPos;
         });
     curIdx = curVisible.length ? curVisible.length - 1 : 0;
   }

   var $prev = this.$active;
   var $next = this.$links.eq(curIdx);
   this.$active.removeClass(this.options.activeClass);
   this.$active = $next.addClass(this.options.activeClass);

   if(this.options.deepLinking){
     var hash = this.$active[0].getAttribute('href');
     if(window.history.pushState){
       window.history.pushState(null, null, hash);
     }else{
       window.location.hash = hash;
     }
   }

   this.scrollPos = winPos;

   // Fire event if the active element was changed
   var changed = $prev[0] !== $next[0];
   if (changed) {
     this.$element.trigger('update.traverse', [this.$active]);
   }
 };
