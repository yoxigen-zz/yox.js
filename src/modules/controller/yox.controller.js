yox.controller = function(container, options){
    this.options = $.extend({}, yox.controller.defaults, options);
    var eventsHandler = this.options.eventsHandler || new yox.eventsHandler();

    $.extend(this, eventsHandler);

    if (this.options.events){
        for(var eventName in this.options.events)
            this.addEventListener(eventName, this.options.events[eventName]);
    }


    if (this.options.enableKeydown){
        this.enableKeyboard();

        if (this.options.keydownFrequency > 0){
            var self = this;
            $(document).on("keyup.yoxController", function(){
                self.keydownLock = false;
                clearTimeout(self.keydownLockTimeoutId);
            });
        }
    }
};

yox.controller.keys = {
    "40": 'down',
    "35": 'end',
    "13": 'enter',
    "36": 'home',
    "37": 'left',
    "39": 'right',
    "32": 'space',
    "38": 'up',
    "27": 'escape'
};

yox.controller.prototype = {
    destroy: function(){
        this.disableKeyboard();
    },
    disableKeyboard: function(){
        $(document).on("keydown.yoxController", this.onKeyDown);
    },
    enableKeyboard: function(){
        $(document).on("keydown.yoxController", { controller: this }, this.onKeyDown);
    },
    onKeyDown: function(e){
        var key = yox.controller.keys[e.keyCode],
            self = e.data.controller;


        if (key){
            e.preventDefault();
            if (!self.keydownLock){
                self.triggerEvent("keydown", { key: key, keyCode: e.keyCode });
                if (self.options.keydownFrequency > 0){
                    self.keydownLock = true;
                    self.keydownLockTimeoutId = setTimeout(function(){
                        self.keydownLock = false;
                    }, self.options.keydownFrequency);
                }
            }
        }
        return true;
    }
};

yox.controller.defaults = {
    enableKeydown: true, // If true, keydown events are handled by the controller
    keydownFrequency: 0 // The minimum interval to fire keydown events. Set to zero or less to disable this option
};