(function($){
    $.fn.yoxscroll = function(options)
    {
        if (this.length != 0)
        {
            var $this = $(this),
                yoxscroll = $this.data("yoxscroll");

            if (typeof(options) === "string" && yoxscroll && yoxscroll[options]){
                return yoxscroll[options].apply(yoxscroll, Array.prototype.slice.call(arguments, 1));
            }
            else if (typeof options === 'object' || !options){
                $this.data("yoxscroll", new YoxScroll(this, options));
            }
            else
              $.error( 'Method ' +  options + ' does not exist on YoxScroll.' );
        }
        return this;
    };

    function YoxScroll(container, opt){
        this.container = container;
        this.init(opt);
    }

    YoxScroll.prototype = (function(){
        var defaults = {
                isHorizontal: true,
                float: "left"
            },
            mouseDownTimeoutId,
            mouseDownTimeout = 50,
            mousedownStartPoint,
            startPosition,
            moved = false,
            lastMousePosition,
            direction = 0,
            lastSliderPosition,
            decceleration = 1.5,
            dragIntervalId,
            dragInterval = 50,
            currentView,
            mousePos,
            moveTimeoutId,
            currentDelta =0,
            defaultCubicBezier = [0, .42, .36, 1],
            bezierPoints = [
                {x: 0, y: 0},
                {x: defaultCubicBezier[0], y: defaultCubicBezier[1]},
                {x: defaultCubicBezier[2], y: defaultCubicBezier[3]},
                {x: 1, y: 1}
            ],
            defaultCubicBezierStr = defaultCubicBezier.join(", "),
            isMobile = isMobile(),
            moveEvent = isMobile ? "touchmove" : "mousemove",
            downEvent = isMobile ? "touchstart" : "mousedown",
            upEvent = isMobile ? "touchend" : "mouseup";
        
        function isMobile(){
            var mobilePlatforms = /(Android)|(iPhone)|(iPod)/;

            // Consider the platform to be mobile if a predefined string in the userAgent is found or if the screen resolution is very small:
            return mobilePlatforms.test(navigator.userAgent) || (screen.width * screen.height < 400000);
        }

        function Point(x,y){
            this.x = x;
            this.y = y;
        }
        function splitBezier(V, t){
            var Vtemp = [[],[],[],[]],
                result = [];

            /* Copy control points  */

            for (var j =0; j <= 3; j++)
              Vtemp[0][j] = V[j];

            /* Triangle computation */
            for (var i = 1; i <= 3; i++) {
                for (j =0 ; j <= 3 - i; j++) {
                    Vtemp[i][j] = new Point(
                        Math.abs(t -1) * Vtemp[i-1][j].x + (t) * Vtemp[i-1][j+1].x,
                        Math.abs(t - 1) * Vtemp[i-1][j].y + (t) * Vtemp[i-1][j+1].y
                    );
                }                                                   /* end for i */
            }                                                   /* end for j */

            for (j = 0; j <= 3; j++)
                result[j]  = Vtemp[j][0];

            var lastPoint = result[3];
            for(var i=1; i<4;i++){
                var point = result[i];
                point.x /= lastPoint.x;
                point.y /= lastPoint.y;
            }

            return result;
        }


        function resetDrag(e){
            mousedownStartPoint = mousePos;
            startPosition = parseInt(this.elements.$slider.css("left"), 10);
        }

        function dragSlider(e){
            var pos = startPosition + mousePos - mousedownStartPoint,
                //currentDelta = mousePos - (lastMousePosition || mousedownStartPoint),
                currentDirection = Math.abs(currentDelta) / currentDelta;

            if (pos >= currentView.minPosition && pos <= 0)
                currentView.elements.$slider.css("left", pos);
            else{
                if (!currentDelta || currentDirection !== direction){
                    resetDrag.call(currentView);
                }
                if (pos < currentView.minPosition && lastSliderPosition !== currentView.minPosition)
                    currentView.elements.$slider.css("left", pos = currentView.minPosition);
                else if (pos > 0 && lastSliderPosition !== 0)
                    currentView.elements.$slider.css("left", pos = 0);

            }

            moved = true;
            direction = currentDirection;
            lastSliderPosition = pos;
        }

        function trackMousePos(e){
            var event = isMobile ? window.event.touches[0] : e;
            currentDelta = event.pageX - mousePos;
            mousePos = event.pageX;
        }
        function move(time, distance){
            var $slider = this.elements.$slider,
                newLeft = lastSliderPosition + (distance * direction),
                xFraction = newLeft > 0
                        ? (distance - newLeft) / distance
                        : newLeft < currentView.minPosition
                            ? (distance - currentView.minPosition + newLeft) / distance
                            : 1;
            
            if (xFraction !== 0){
                newLeft = lastSliderPosition + xFraction * distance * direction;
				time = xFraction * time;
				var cubicBezier;
				if (xFraction !== 1){
					var cubicBezierPoints = splitBezier(bezierPoints, xFraction);
					cubicBezier = [cubicBezierPoints[1].x, cubicBezierPoints[1].y, cubicBezierPoints[2].x, cubicBezierPoints[2].y].join(", ");
				}
				else
					cubicBezier = defaultCubicBezierStr;

                $slider.css({ transition: "left " + time + "s cubic-bezier(" + cubicBezier + ")", left: newLeft });
            }
        }

        function onMouseUp(e){
            clearInterval(dragIntervalId);
            currentView.elements.$window.off(moveEvent, trackMousePos);

            //mousePos = undefined;
            currentDirection = 0;
            
            //e.data.view.elements.$window.off("mousemove", dragSlider)
            e.data.view.elements.$window.off(upEvent, onMouseUp);

            if (currentDelta !== 0){console.log(currentDelta);
                var v = Math.abs(currentDelta) / 50,
                    distance = Math.round((v*v) * decceleration * 1000),
                    time = v * decceleration;

                move.call(e.data.view, time, distance);
                moved = false;
                currentView = null;
            }
            return false;
        }
        
        return {
            addEventListener: function(eventName, eventHandler){
                var self = this;
                if (!eventHandler || typeof(eventHandler) !== "function")
                    throw new Error("Invalid event handler, must be a function.");

                $(this.$eventsElement).on(eventName + ".yoxscroll", $.proxy(eventHandler, self));
            },
            calculateSliderSize: function(){
                this.elements.$slider[this.options.isHorizontal ? "width" : "height"](999999);
                var $measurer = $("<span>").appendTo(this.elements.$slider),
                    width = $measurer.position().left;

                if (!width){
                    $measurer.css("float", this.options.float);
                    width = $measurer.position().left;
                }
                $measurer.remove();
                return width;
            },
            init: function(opt){
                var options = $.extend({}, opt),
                    self = this;

                // Merge the options events with the default ones:
                var optionsEvents = $.extend({}, options.events);

                for(var eventName in optionsEvents){
                    var eventHandlers = options.events[eventName],
                        events = optionsEvents[eventName];

                    if (!eventHandlers)
                        eventHandlers = options.events[eventName] = [];
                    else if (!(eventHandlers instanceof Array))
                        eventHandlers = options.events[eventName] = [eventHandlers];

                    if (events instanceof Array)
                        eventHandlers = eventHandlers.concat(events);
                    else if (typeof events === "function")
                        eventHandlers.push(events);
                }

                this.options = options = $.extend({}, defaults, options);

                this.$eventsElement = $("<div>");

                var elements = {
                    $window: $(window),
                    $container: $(this.container),
                    $slider: $("<div>", { "class": "yoxscrollSlider", css: options.isHorizontal ? { height: "100%" } : { width: "100%" } })
                };
                this.elements = elements;

                if ($.browser.webkit)
                    elements.$slider[0].style.setProperty("-webkit-transform", "translateZ(0)", null);
                
                var $container = elements.$container;

                if ($container.css("position") === "static")
                    $container.css("position", "relative");

                $container.children().appendTo(elements.$slider);
                elements.$slider.appendTo(elements.$container);

                this.update();

                // Init events:
                for(var eventName in this.options.events){
                    var eventHandlers = this.options.events[eventName];
                    if (eventHandlers instanceof Array){
                        for(var i=0; i < eventHandlers.length; i++){
                            self.addEventListener(eventName, eventHandlers[i]);
                        }
                    }
                    else
                        self.addEventListener(eventName, eventHandlers);
                }
                
                elements.$slider.on(downEvent, function(e){
                    e.preventDefault();
                    mousePos = isMobile ? window.event.touches[0].pageX : e.pageX;
                    resetDrag.call(self, e);

                    elements.$slider.css({ transition: "none", left: elements.$slider.css("left") });
                    currentDelta = 0;
                    moved = false;
                    
                    //mouseDownTimeoutId = setTimeout(function(){
                        currentView = self;
                        dragIntervalId = setInterval(dragSlider, dragInterval);

                        elements.$window.on(moveEvent, trackMousePos)
                            .on(upEvent, { view: self }, onMouseUp);
                        mouseDownTimeoutId = null;
                    //}, mouseDownTimeout);

                })
                .on(upEvent, function(e){
                    e.preventDefault();
                    //clearTimeout(mouseDownTimeoutId);
                            try{
                    var currentMousePos = mousePos;
                            } catch(e){ alert(e); }
                    if (!moved || (currentMousePos > mousedownStartPoint - 4 && currentMousePos < mousedownStartPoint + 4) )
                        self.triggerEvent("click", e);
                })
                .on("click", function(e){ e.preventDefault(); });

                //console.log("READY");
            },
            triggerEvent: function(eventName, data){
                $(this.$eventsElement).trigger(eventName + ".yoxscroll", data);
            },
            update: function(){
                var sliderWidth = this.calculateSliderSize();
                this.elements.$slider.width(sliderWidth);
                this.minPosition = this.elements.$container.width() - sliderWidth;
            }
        };
    })();

})(jQuery);