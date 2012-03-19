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
                $this.data("yoxscroll", new yox.scroll(this, options));
            }
            else
              $.error( 'Method ' +  options + ' does not exist on yox.scroll.' );
        }
        return this;
    };

    yox.scroll = function(container, opt){
        this.container = container;
        this.init(opt);
    };

    yox.scroll.prototype = (function(){
        var defaults = {
                centerContentsIfNotScrollable: true,
                events: {
                    buttonholdstart: function(btn){
                        applyButtonMethod.call(this, btn, "holdstart");
                    },
                    buttonholdend: function(btn){
                        this.stopScroll();
                    },
                    buttonclick: function(btn){
                        applyButtonMethod.call(this, btn, "click");
                    }
                },
                "float": "left",
                isHorizontal: true,
                scrollByTime: .5, // The time, in seconds, it takes the scroll to complete, when a page / scrollBy command is given
                scrollToEasing: "ease-in-out",
                scrollToElementTime: .2, // The time, in seconds, it takes the scroll to complete when scrollTo is called with an HTML element or jQuery object
                scrollVelocity: 500, // pixels / second
                toggleButtons: true // If true and buttons are provided, the buttons are hidden if no scroll is required, and displayed if it is.
            },
            $window = $(window),
            mousedownStartPoint,
            startPosition,
            moved = false,
            direction = 0,
            lastSliderPosition,
            currentView,
            mousePos,
            currentDelta = 0,
            eventTimestamp,
            currentTimespan,
            scrollEasing = "cubic-bezier(.15, .03, .15, .16)",
            decceleration = 2.5,
            isMobile = isMobile(),
            eventNames = {
                move: isMobile ? "touchmove" : "mousemove",
                down: isMobile ? "touchstart" : "mousedown",
                up: isMobile ? "touchend" : "mouseup"
            },
            holdTimeout = 200,
            holdTimeoutId,
            heldElement,
            eventHandlers = {
                buttonDown: function(e){
                    e.preventDefault();
                    var btn = this,
                        pressedButtonClass = e.data.view.options.pressedButtonClass;

                    if (pressedButtonClass)
                        $(btn).addClass(pressedButtonClass);

                    holdTimeoutId = setTimeout(function(){
                        $window.on(eventNames.up, e.data, eventHandlers.holdEnd);
                        if (!isMobile)
                            $window.on("mouseout", e.data, eventHandlers.mouseOut);
                        e.data.view.triggerEvent("buttonholdstart", btn);
                        holdTimeoutId = null;
                        heldElement = btn;
                    }, holdTimeout);
                },
                buttonUp: function(e){
                    var pressedButtonClass = e.data.view.options.pressedButtonClass;
                    if (pressedButtonClass)
                        $(this).removeClass(pressedButtonClass);

                    if (holdTimeoutId){
                        clearTimeout(holdTimeoutId);
                        e.data.view.triggerEvent("buttonclick", this)
                        holdTimeoutId = null;
                    }
                },
                holdEnd: function(e){
                    $window.off(eventNames.up, eventHandlers.holdEnd);
                    if (!isMobile)
                        $window.off("mouseout", eventHandlers.mouseOut);

                    e.data.view.triggerEvent("buttonholdend", heldElement);
                    heldElement = null;
                    return false;
                },
                mouseOut: function(e){
                    if (!e.relatedTarget) // Fire only if the mouse is out of the window
                        eventHandlers.holdEnd(e);
                }
            };

        function loadImages(parentEl, onLoad, onLoadImage){
            var $parentEl = $(parentEl),
                images = parentEl.getElementsByTagName("img"),
                imgCount = images.length,
                key = new Date();

            if (!imgCount){
                onLoad && onLoad(0);
                return;
            }

            var loadedCount = 0,
                onLoadImg = function(e){
                    onLoadImage && onLoadImage.call(this, e);
                    if ((e instanceof Date || e.target.nodeName === "IMG") && ++loadedCount === imgCount){
                        parentEl.removeEventListener("load", onLoadImg, true);
                        onLoad && onLoad(imgCount);
                    }
                },
                onLoadImgIE = function(e){
                    onLoadImage && onLoadImage.call(this, e);
                    if (++loadedCount === imgCount){
                        onLoad && onLoad(imgCount);
                    }
                    e.srcElement.detachEvent("onload", onLoadImgIE);
                };

            if (parentEl.addEventListener){
                parentEl.addEventListener("load", onLoadImg, true);
            }
            else if (parentEl.attachEvent){
                for(var i=imgCount; i--;){
                    images[i].attachEvent("onload", onLoadImgIE);
                }
            }

            for(var imageIndex=imgCount; imageIndex--;){
                if (images[imageIndex].complete)
                    onLoadImg(key);
            }

        }

        var cubicBeziers = (function(){
            var defaultCubicBezier = [0, .42, .36, 1],
                defaultCubicBezierPoints = [
                    new Point(0,0),
                    new Point(defaultCubicBezier[0], defaultCubicBezier[1]),
                    new Point(defaultCubicBezier[2], defaultCubicBezier[3]),
                    new Point(1,1)
                ],
                defaultCubicBezierStr = defaultCubicBezier.join(", ");

            function Point(x,y){
                this.x = x;
                this.y = y;
            }

            function splitBezier(V, t){
                // V: Array of four points of the bezier to split.
                var Vtemp = [V,[],[],[]],
                    result = [V[0]];

                /* Triangle computation */
                for (var i = 1; i <= 3; i++) {
                    for (j =0 ; j <= 3 - i; j++) {
                        var point = new Point(
                            Math.abs(t -1) * Vtemp[i-1][j].x + t * Vtemp[i-1][j+1].x,
                            Math.abs(t - 1) * Vtemp[i-1][j].y + t * Vtemp[i-1][j+1].y
                        );

                        Vtemp[i][j] = point;
                        if (!j)
                            result.push(point);
                    }
                }

                // Expand the bezier fraction into a full bezier by dividing each point by the last:
                var lastPoint = result[3];
                for(i=1; i<4;i++){
                    var point = result[i];
                    point.x /= lastPoint.x;
                    point.y /= lastPoint.y;
                }

                return result;
            }

            return {
                getCubicBezier: function(fractionOfDefaultDistance){
                    if (fractionOfDefaultDistance)
                        return defaultCubicBezierStr;
                    else{
                        var cubicBezierPoints = splitBezier(defaultCubicBezierPoints, fractionOfDefaultDistance);
                        return [cubicBezierPoints[1].x, cubicBezierPoints[1].y, cubicBezierPoints[2].x, cubicBezierPoints[2].y].join(", ");
                    }
                }
            }
        })();

        function isMobile(){
            var mobilePlatforms = /(Android)|(iPhone)|(iPod)/;

            // Consider the platform to be mobile if a predefined string in the userAgent is found or if the screen resolution is very small:
            return mobilePlatforms.test(navigator.userAgent) || (screen.width * screen.height < 400000);
        }

        function applyButtonMethod(btn, event){
            var methodParams = $(btn).data("yoxscroll-" + event);

            if (methodParams){
                methodParams = methodParams.split("-");
                var method = this[methodParams.shift()];
                if (method)
                    method.apply(this, methodParams);
            }
        }

        function resetDrag(e){
            mousedownStartPoint = mousePos;
            startPosition = parseInt(this.elements.$slider.css("left"), 10);
        }

        function dragSlider(event, $slider, minPosition){
            var timespan = (event.timeStamp || new Date()) - eventTimestamp;
            if (!timespan)
                return false;
            currentTimespan = timespan;

            eventTimestamp = event.timeStamp || new Date();
            currentDelta = event.pageX - mousePos;
            mousePos = event.pageX;

            if (this.enableDrag){
                var pos = startPosition + mousePos - mousedownStartPoint,
                    currentDirection = Math.abs(currentDelta) / currentDelta;

                if (pos >= minPosition && pos <= 0)
                    $slider.css("left", pos);
                else{
                    if (!currentDelta || currentDirection !== direction){
                        resetDrag.call(currentView);
                    }
                    if (pos < minPosition && lastSliderPosition !== minPosition)
                        $slider.css("left", pos = minPosition);
                    else if (pos > 0 && lastSliderPosition !== 0)
                        $slider.css("left", pos = 0);

                }

                moved = true;
                direction = currentDirection;
                lastSliderPosition = pos;
            }
        }

        // Called on move event:
        var trackMousePos = isMobile
            ? function(e){
                dragSlider.call(e.data.view, window.event.touches[0], e.data.$slider, e.data.minPosition);
            }
            : function(e){
                dragSlider.call(e.data.view, e, e.data.$slider, e.data.minPosition)
            };
        function move(time, distance, startFromCurrentPosition){
            var $slider = this.elements.$slider;
            lastSliderPosition = startFromCurrentPosition ? parseInt($slider.css("left"), 10) : lastSliderPosition;
            var newLeft = lastSliderPosition + (distance * direction),
                xFraction = newLeft > 0
                    ? (distance - newLeft) / distance
                    : newLeft < this.minPosition
                        ? (distance - this.minPosition + newLeft) / distance
                        : 1;

            if (xFraction !== 0){
                newLeft = lastSliderPosition + xFraction * distance * direction;
				time = xFraction * time;
				var cubicBezier = cubicBeziers.getCubicBezier(xFraction);

                $slider.css({ transition: "left " + time + "s cubic-bezier(" + cubicBezier + ")", left: newLeft });
            }
        }

        function onMouseUp(e){
            currentView.elements.$window.off(eventNames.move, trackMousePos);

            currentDirection = 0;

            e.data.view.elements.$window.off(eventNames.up, onMouseUp);

            if (e.data.view.enableDrag && currentDelta !== 0){
                var v = Math.min(Math.abs(currentDelta) / (currentTimespan * 7), 0.86),
                    time = v * decceleration,
                    distance = Math.round((v*v) * decceleration * 1000);

                move.call(e.data.view, time, distance);
                moved = false;
                currentView = null;
            }
            return false;
        }

        function addEvents($slider){
            var self = this;
            $slider.on(eventNames.down, function(e){
                var event = isMobile ? window.event.touches[0] : e;
                e.preventDefault();
                mousePos = event.pageX;
                eventTimestamp = event.timeStamp || new Date();
                resetDrag.call(self, e);

                if (self.enableDrag)
                    $slider.css({ transition: "none", left: $slider.css("left") });

                currentDelta = 0;
                moved = false;

                currentView = self;
                //dragIntervalId = setInterval(function(){ dragSlider.call(self, self.elements.$slider, self.minPosition); }, dragInterval);

                $(window).on(eventNames.move, { $slider: $slider, minPosition: self.minPosition, view: self }, trackMousePos)
                    .on(eventNames.up, { view: self }, onMouseUp);
            })
            .on(eventNames.up, function(e){
                e.preventDefault();
                var currentMousePos = mousePos,
                    isClickDistance = currentMousePos > mousedownStartPoint - 4 && currentMousePos < mousedownStartPoint + 4;

                if ((self.enableDrag && !moved) || isClickDistance)
                    self.triggerEvent("click", e);
            });
        }

        return {
            calculateSliderSize: function(){
                this.elements.$slider[this.options.isHorizontal ? "width" : "height"](999999);
                var $measurer = $("<span>").appendTo(this.elements.$slider),
                    width = $measurer.position().left;

                if (!width){
                    $measurer.css("float", this.options["float"]);
                    width = $measurer.position().left;
                }
                $measurer.remove();
                return width;
            },
            destroy: function(){

            },
            init: function(opt){
                var options = $.extend({}, opt),
                    self = this;

                var eventsHandler = options.eventsHandler || new yox.eventsHandler();
                $.extend(this, eventsHandler);

                // Merge the options events with the default ones:
                var optionsEvents = $.extend({}, options.events),
                    dynamicEvents = {};

                delete options.events;
                var viewOptions = $.extend(true, {}, defaults, options);

                if (viewOptions.toggleButtons)
                    viewOptions.events.changeStatus = function(ui){
                        this.options.elements.toggle(ui.scrollEnabled);
                    };

                for(var eventName in optionsEvents){
                    var eventHandlers = viewOptions.events[eventName],
                        events = optionsEvents[eventName];

                    if (!eventHandlers)
                        eventHandlers = viewOptions.events[eventName] = [];
                    else if (!(eventHandlers instanceof Array))
                        eventHandlers = viewOptions.events[eventName] = [eventHandlers];

                    if (events instanceof Array)
                        eventHandlers = eventHandlers.concat(events);
                    else if (typeof events === "function")
                        eventHandlers.push(events);
                }

                this.options = options = viewOptions;

                var elements = this.elements = {
                    $window: $(window),
                    $container: $(this.container),
                    $slider: $("<div>", { "class": "yoxscrollSlider", css: $.extend({ position: "relative", top: 0, left: 0 }, options.isHorizontal ? { height: "100%" } : { width: "100%" }) })
                };

                if ($.browser.webkit) // Enable hardware acceleration in webkit:
                    elements.$slider[0].style.setProperty("-webkit-transform", "translateZ(0)", null);

                var $container = elements.$container;

                if ($container.css("position") === "static")
                    $container.css("position", "relative");

                $container.children().appendTo(elements.$slider);
                elements.$slider.appendTo(elements.$container);

                this.initEvents();
                this.update();
                this.initButtons();

                addEvents.call(self, elements.$slider);
                elements.$slider.on("click", function(e){ e.preventDefault(); });
            },
            initButtons: function(){
                if (!this.options.elements)
                    return false;

                if (this.options.elements instanceof jQuery){
                    this.options.elements.on(eventNames.down, { view: this }, eventHandlers.buttonDown)
                        .on(eventNames.up, { view: this }, eventHandlers.buttonUp);
                }
            },
            initEvents: function(){
                for(var eventName in this.options.events){
                    var eventHandlers = this.options.events[eventName];
                    if (eventHandlers instanceof Array){
                        for(var i=0; i < eventHandlers.length; i++){
                            this.addEventListener(eventName, eventHandlers[i]);
                        }
                    }
                    else
                        this.addEventListener(eventName, eventHandlers);
                }
            },
            page: function(dir){
                dir = dir === "left" ? 1 : -1;
                this.scrollBy(dir * this.containerSize);
            },
            // Scrolls the view until it reaches the limit. Scrolling can be stopped with stopScroll().
            scroll: function(dir){
                direction = dir === "left" ? 1 : -1;
                this.scrollTo(direction === 1 ? 0 : this.minPosition, { easing: scrollEasing});
            },
            scrollBy: function(distance){
                this.scrollTo(distance, { isRelative: true, time: this.options.scrollByTime});
            },
            scrollTo: function(scrollPosition, scrollOptions){
                scrollOptions = scrollOptions || {};
                var $slider = this.elements.$slider,
                    currentPosition = parseInt($slider.css("left"), 10),
                    isJquery = scrollPosition instanceof jQuery,
                    $item = isJquery ? scrollPosition : undefined,
                    time = scrollOptions.time;

                if (scrollPosition instanceof HTMLElement){
                    $item = $(scrollPosition);
                    isJquery = true;
                }

                if (isJquery){
                    var itemPosition = $item.position().left,
                        itemWidth = $item.width();

                    if (scrollOptions.centerElement){
                        scrollPosition =  (this.containerSize - itemWidth) / 2 - itemPosition;
                    }
                    else{
                        var itemPositionRelativeToContainer = itemPosition + currentPosition;
                        if (itemPositionRelativeToContainer + itemWidth > this.containerSize)
                            scrollPosition = this.containerSize - itemPosition - itemWidth;
                        else if (itemPositionRelativeToContainer < 0)
                            scrollPosition = itemPosition * -1;
                        else
                            return false;
                    }
                    time = time || this.options.scrollToElementTime;

                }
                if (scrollOptions.isRelative)
                    scrollPosition += currentPosition;

                scrollPosition = Math.min(Math.max(scrollPosition, this.minPosition), 0);

                if (time === undefined){
                    var scrollDistance = Math.abs(scrollPosition - currentPosition);
                    time = scrollDistance / this.options.scrollVelocity;
                }
                if (scrollPosition === 0 && scrollOptions.allowCenter !== false && this.options.centerContentsIfNotScrollable && !this.enableDrag){
                    this.elements.$slider.css({ transition: "none", left: this.minPosition / 2 });
                }
                else{
                    $slider.css("transition", "left " + time + "s " + (scrollOptions.easing || this.options.scrollToEasing))
                        .css("left", scrollPosition);
                }
            },
            stopScroll: function(){
                var v = this.options.scrollVelocity / 20,
                    time = v / decceleration,
                    //distance = v * time;
                    distance = 0;

                time = time / 10;
                move.call(this, time, distance, true);
            },
            update: function(){
                this.elements.$container.children(":not(.yoxscrollSlider)").appendTo(this.elements.$slider);
                loadImages(this.elements.$container[0], undefined, this.updateSize.bind(this));
            },
            updateSize: function(){
                var sliderWidth = this.calculateSliderSize();
                this.elements.$slider.width(sliderWidth);
                this.containerSize = this.elements.$container.width();
                this.minPosition = this.containerSize - sliderWidth;

                var enableDrag = this.minPosition < 0;
                if (enableDrag !== this.enableDrag){
                    this.enableDrag = enableDrag;
                    if ((!enableDrag && !this.options.centerContentsIfNotScrollable) || (parseInt(enableDrag && this.elements.$slider.css("left"), 10) > 0)){
                        this.elements.$slider.css({ transition: "none", "left": 0 });
                    }
                    this.triggerEvent("changeStatus", { scrollEnabled: enableDrag });
                }

                if (this.options.centerContentsIfNotScrollable && !enableDrag){
                    this.elements.$slider.css({ transition: "none", left: this.minPosition / 2 });
                }
            }
        };
    })();

})(jQuery);