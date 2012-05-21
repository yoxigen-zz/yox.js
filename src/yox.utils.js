yox.utils = {
    browser: {
        // Returns the CSS prefix for the current browser.
        // For example, getCssPrefix() in Firefox returns "-moz-", while in Opera it returns "-o-".
        getCssPrefix: function(){
            if (arguments.callee.cache)
                return arguments.callee.cache;

            var prefix = "-" + yox.utils.browser.getPrefix().toLowerCase() + "-"
            this.cache = prefix;
            return prefix;
        },
        // Gets the current platform - either yox.utils.browser.mobile or yox.utils.browser.desktop.
        getPlatform: function getPlatform(){
            if (arguments.callee.platform)
                return arguments.callee.platform;

            var mobilePlatforms = /(Android)|(iPhone)|(iPod)/;

            // Consider the platform to be mobile if a predefined string in the userAgent is found or if the screen resolution is very small:
            arguments.callee.platform = mobilePlatforms.test(navigator.userAgent) || (screen.width * screen.height < 400000) ? this.platforms.mobile : this.platforms.desktop;
            return arguments.callee.platform;
        },
        // Returns Javascript style prefix for the current browser.
        // For example, getPrefix() in Firefox returns "Moz", while in Opera it returns "O".
        getPrefix: function(){
            if (arguments.callee.cache)
                return arguments.callee.cache;

            var prefixes =[ "Moz", "Webkit", "O", "ms" ],
                    div = document.createElement( "div" ),
                    property = "Transform",
                    vendorProperty, vendorPrefix,
                    prefix;

            for ( var i = 0; i < prefixes.length && !prefix; i++ ) {
                vendorPrefix = prefixes[i];
                vendorProperty = vendorPrefix + property;
                if (vendorProperty in div.style)
                    prefix = vendorPrefix;
            }

            arguments.callee.cache = prefix;
            return prefix;
        },
        platforms: {
            desktop: "desktop",
            mobile: "mobile"
        }
    },
    css: {
        // Adds a jQuery css hook for the specified CSS property, so it can be used without vendor-specific prefixes.
        // For example, after calling addJqueryCssHook("transitionDuration"), the following can be done: $("div").css("transitionDuration", "1000ms").
        addJqueryCssHook: function(cssProperty){
            if (typeof(jQuery) === "undefined")
                return false;

            var supportedProperty = yox.utils.css.getSupportedProperty(cssProperty);
            if (supportedProperty && supportedProperty !== cssProperty) {
                jQuery.cssHooks[cssProperty] = {
                    get: function( elem, computed, extra ) {
                        return $.css( elem, supportedProperty );
                    },
                    set: function( elem, value) {
                        elem.style[ supportedProperty ] = value;
                    }
                };
            }

            return true;
        },
        // Adds a number of css hooks. Usage:
        // addJqueryCssHooks(["transition", "transform", "transitionDuration"]).
        addJqueryCssHooks: function(cssProperties){
            for(var i=cssProperties.length; i--;)
                yox.utils.css.addJqueryCssHook(cssProperties[i]);
        },
        // Given the name of a css property, returns its prefixed version, in case there's support for the unprefixed property.
        // For example, getSupportedProperty("transform") in a Webkit browser returns "WebkitTransform",
        // or getSupportedProperty("transition") in Firefox returns "MozTransition".
        getSupportedProperty: function(prop){
            var vendorProp, supportedProp,
                capProp = prop.charAt(0).toUpperCase() + prop.slice(1),
                prefix = yox.utils.browser.getPrefix(),
                div = document.createElement( "div" );

            if ( prop in div.style ) {
                supportedProp = prop;
            } else {
                vendorProp = prefix + capProp;
                if ( vendorProp in div.style )
                    supportedProp = vendorProp;
            }

            div = null;
            $.support[ prop ] = supportedProp;
            return supportedProp;
        }
    },
    dom: {
        /**
         * Returns true if the specified value is a DOM element, false if it isn't.
         */
        isElement: Object(HTMLElement) === HTMLElement
            ? function(el){ return el instanceof HTMLElement; }
            : Object(Element) === Element
                ? function(el){ return el instanceof Element; }
                : function(e){
                    return Object(el) === el && el.nodeType === 1 && typeof(el.nodeName) === "string";
                },
        scrollIntoView: function(element, container, animateTime, margin){
            var containerSize = { width: container.clientWidth, height: container.clientHeight },
                containerScrollSize = { height: container.scrollHeight, width: container.scrollWidth };

            margin = margin || 0;

            if (containerSize.height >= containerScrollSize.height && containerSize.width >= containerScrollSize.width)
                return false;

            if (!animateTime){
                element.scrollIntoView();
                return true;
            }

            var $element = $(element),
                elementOffset = $element.offset(),
                elementSize = { width: $element.width(), height: $element.height() },
                containerScrollPos = { left: container.scrollLeft, top: container.scrollTop },
                containerOffset = $(container).offset(),
                scrollTo = {},
                sizes = { top: "height", left: "width" };

            function setScroll(side){
                var firstDelta = elementOffset[side] - containerScrollPos[side] - margin;
                if (containerOffset[side] > firstDelta){
                    scrollTo[side] = containerScrollPos[side] + firstDelta;
                }
                else {
                    var sizeParam = sizes[side],
                        elementLimit = elementOffset[side] - containerScrollPos[side] + elementSize[sizeParam] + margin,
                        containerLimit = containerOffset[side] + containerSize[sizeParam];

                    if (containerLimit < elementLimit){
                        scrollTo[side] = containerScrollPos[side] + elementLimit - containerLimit;
                    }
                }
            }
            setScroll("top");
            setScroll("left");

            if (scrollTo.top !== undefined || scrollTo.left !== undefined){
                var animateParams = {};
                if (scrollTo.top)
                    animateParams.scrollTop = scrollTo.top;
                if (scrollTo.left)
                    animateParams.scrollLeft = scrollTo.left;
                $(container).stop(true, true).animate(animateParams, animateTime);
            }
        }
    },
    dimensions: {
        // Distributes an object or number into the following structure:
        // { top: 10, left: 10, bottom: 15, right: 13, horizontal: 23, vertical: 25 }
        // If a number is provided, it's the same structure, with the same value for top, left, bottom and right.
        // If a value isn't given, it's set with 0.
        distributeMeasures: function(original){
            var distributed = { top: 0, bottom: 0, left: 0, right: 0};

            if (original){
                var isNumber = typeof(original) === "number";

                for(var side in distributed){
                    distributed[side] = isNumber ? original : (original[side] || 0);
                }
            }
            distributed.horizontal = distributed.left + distributed.right;
            distributed.vertical = distributed.top + distributed.bottom;

            return distributed;
        },
        resize: {
            fill: function(item, containerDimensions, options){
                options = options || {};
                item.ratio = item.ratio || (item.height / item.width);

                var newWidth = options.enlarge ? containerDimensions.width : Math.min(item.width, containerDimensions.width),
                        newHeight = Math.round(newWidth * item.ratio),
                        maxHeight = containerDimensions.height;

                if (newHeight < maxHeight && (maxHeight <= item.height || options.enlarge)){
                    newHeight = maxHeight;
                    newWidth = Math.round(newHeight / item.ratio);
                }

                return {
                    left: Math.round((containerDimensions.width - newWidth) / 2),
                    top: Math.round((containerDimensions.height - newHeight) / 2),
                    width: Math.round(newWidth),
                    height: Math.round(newHeight)
                };
            },
            fit: function(item, containerDimensions, options){
                options = options || {};
                item.ratio = item.ratio || (item.height / item.width);

                var margin = options.margin || {},
                        padding = options.padding || {},
                        requiredWidth = containerDimensions.width - (margin.horizontal || 0) - (padding.horizontal || 0),
                        newWidth =  options.enlarge ? requiredWidth : Math.min(item.width, requiredWidth),
                        newHeight = Math.round(newWidth * item.ratio),
                        maxHeight = containerDimensions.height - (margin.vertical || 0) - (padding.vertical || 0);

                if (newHeight > maxHeight){
                    newHeight = maxHeight;
                    newWidth = Math.round(newHeight / item.ratio);
                }

                return {
                    left: (containerDimensions.width - (margin.left || 0) - (margin.right || 0) - newWidth) / 2 + (margin.left || 0) - (padding.left || 0),
                    top: (containerDimensions.height - (margin.top || 0) - (margin.bottom || 0) - newHeight) / 2 + (margin.top || 0) - (padding.top || 0),
                    width: newWidth,
                    height: newHeight
                };
            }
        }
    },
    performance: {
        debounce: function(fn, delay, params){
            var context = this,
                args = Array.prototype.slice.call(arguments, 2);

            clearTimeout(fn.bounceTimer);
            fn.bounceTimer = setTimeout(function () {
                fn.apply(context, args);
            }, delay);
        },
        // http://remysharp.com/2010/07/21/throttling-function-calls/
        // http://www.nczonline.net/blog/2007/11/30/the-throttle-function/
        throttle: function(fn, delay){
            fn.bounceTimer = null;
            return function () {
                var context = this, args = arguments;
                clearTimeout(fn.bounceTimer);
                fn.bounceTimer = setTimeout(function () {
                    fn.apply(context, args);
                }, delay);
            }
        }
    },
    url: {
        queryToJson: function(query)
        {
            if (!query)
                return null;

            var queryParams = query.split("&"),
                json = {};

            for(var i=queryParams.length; i--;)
            {
                var paramData = queryParams[i].split('=');
                json[paramData[0]] = paramData.length == 2 ? paramData[1] : true;
            }
            return json;
        }
    }
};

if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                fNOP = function () {},
                fBound = function () {
                    return fToBind.apply(this instanceof fNOP
                            ? this
                            : oThis || window,
                            aArgs.concat(Array.prototype.slice.call(arguments)));
                };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}