/*
* yox.js
* HTML5 gallery library
* http://www.yoxjs.com
*
* Copyright (c) 2012 Yossi Kolesnicov
*
* License: MIT license
* Date: 2012-06-18 
*/

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
/*
 * Minimal classList shim for IE 9
 * By Devon Govett
 * MIT LICENSE
 */


if (!("classList" in document.documentElement) && Object.defineProperty && typeof HTMLElement !== 'undefined') {
    Object.defineProperty(HTMLElement.prototype, 'classList', {
        get: function() {
            var self = this;
            function update(fn) {
                return function(value) {
                    var classes = self.className.split(/\s+/),
                        index = classes.indexOf(value);

                    fn(classes, index, value);
                    self.className = classes.join(" ");
                }
            }

            var ret = {
                add: update(function(classes, index, value) {
                    ~index || classes.push(value);
                }),

                remove: update(function(classes, index) {
                    ~index && classes.splice(index, 1);
                }),

                toggle: update(function(classes, index, value) {
                    ~index ? classes.splice(index, 1) : classes.push(value);
                }),

                contains: function(value) {
                    return !!~self.className.split(/\s+/).indexOf(value);
                },

                item: function(i) {
                    return self.className.split(/\s+/)[i] || null;
                }
            };

            Object.defineProperty(ret, 'length', {
                get: function() {
                    return self.className.split(/\s+/).length;
                }
            });

            return ret;
        }
    });
}
function Yox(container, options){
    this.container = container;
    this.options = options || {};

    this.init();
}

Yox.prototype = {
    init: function(){
        if (this.options.theme){
            var eventBus = new yox.eventBus(),
                data,
                self = this;

            if (this.options.data){
                if (this.options.data instanceof yox.data)
                    data = this.options.data;
                else
                    data = new yox.data(this.options.data);
            }

            function createTheme(themeName, themeOptions){
                var themeConstructor = yox.themes[themeName];

                if (!themeConstructor)
                    throw new Error("Invalid theme, '" + themeName + "' does not exist.");

                var theme = new themeConstructor(data, $.extend({}, themeConstructor.defaults, themeOptions));
                if (!(theme instanceof yox.theme))
                    throw new Error("Invalid theme, '" + themeName + "' is not an instance of yox.theme.");

                theme.init(self.container, $.extend(themeOptions, { data: data, eventBus: eventBus }));
                return theme;
            }

            if (this.options.theme instanceof Array){
                this.themes = {};
                for(var i=0, theme; theme = this.options.theme[i]; i++){
                    this.themes[theme.id || theme.name] = createTheme(theme.name, theme.options || {});
                }
            }
            else{
                var theme = createTheme(this.options.theme, this.options);
                this.modules = theme.modules;
            }

            $.extend(this, {
                destroy: function(){
                    for(var moduleName in this.modules){
                        var module = this.modules[moduleName],
                            moduleDestroy = module.destroy;

                        moduleDestroy && moduleDestroy.call(module);
                    }
                    theme.destroy.call(theme);
                },
                data: data
            },
            eventBus);

            if (this.options.events){
                for(var eventName in this.options.events)
                    this.addEventListener(eventName, this.options.events[eventName]);
            }
        }

        delete this.init;
    }
};

yox = typeof(yox) === "undefined" ? {} : yox;

$.fn.yox = function(options) 
{
    if (!this.length)
        return this;

    return this.each(function(i, el){
        var yoxObj = $(this).data("yox");
        if (typeof(options) === "string" && yoxObj){
            if (yoxObj && yoxObj[options])
                yoxObj[options].apply(yoxObj, Array.prototype.slice.call(arguments, 1));
            else
                throw new Error("Invalid method '" + options + "'");
        }
        else if (Object(options) === options || !options){
            $(this).data("yox", new Yox(this, options));
        }
        else
            $.error( 'Method ' +  options + ' does not exist on Yox.' );
    });
};
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
            var scrollElement = container;

            if (container === document.body && !$.browser.webkit)
                scrollElement = document.documentElement;

            var containerSize = { width: container.clientWidth, height: container.clientHeight },
                containerScrollSize = { height: scrollElement.scrollHeight, width: scrollElement.scrollWidth };

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
                containerScrollPos = { left: scrollElement.scrollLeft, top: scrollElement.scrollTop },
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
                $(scrollElement).stop(true, true).animate(animateParams, animateTime);
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
yox.eventBus = function(){
    var namespaces = {
            _default: {}
        },
        currentlyTriggeredEventName,
        eventListenersToBeRemoved,
        self = this;

    this.triggerEvent = function(eventName, data, sender){
        currentlyTriggeredEventName = eventName;
        var eventNameParts = eventName.split("."),
            eventType = eventNameParts[0],
            namespaceName = eventNameParts[1];

        if (namespaceName){
            var namespace = namespaces[namespaceName];
            if (namespace){
                var namespaceEvents = namespace[eventType];
                if (namespaceEvents){
                    for(var i=0, eventHandler; eventHandler = namespaceEvents[i]; i++){
                        eventHandler.call(this, data, sender);
                    }
                }
            }
        }

        var noNamespacedEvents = namespaces._default[eventType];
        if (noNamespacedEvents){
            for(var i=0, eventHandler; eventHandler = noNamespacedEvents[i]; i++){
                eventHandler.call(this, data, sender);
            }
        }

        currentlyTriggeredEventName = undefined;
        if (eventListenersToBeRemoved){
            for(var i=0, eventListenerToBeRemoved; eventListenerToBeRemoved = eventListenersToBeRemoved[i]; i++){
                self.removeEventListener(eventListenerToBeRemoved.eventName, eventListenerToBeRemoved.eventHandler);
            }
            eventListenersToBeRemoved = undefined;
        }
    };

    this.addEventListener = function(eventName, eventHandler){
        var eventNameParts = eventName.split("."),
            eventType = eventNameParts[0],
            namespaceName = eventNameParts[1],
            namespace;

        if (namespaceName){
            namespace = namespaces[namespaceName];
            if (!namespace)
                namespace = namespaces[namespaceName] = { };
        }
        else
            namespace = namespaces._default;

        var event = namespace[eventType];
        if (!event)
            event = namespace[eventType] = [];

        event.push(eventHandler);
    };

    this.removeEventListener = function(eventName, eventHandler){
        // A safety measure - in case an event is removed that's currently being triggered (if removeEventListener is called from inside an event handler),
        // delay the removeEventListener until after the trigger is done.
        if (eventName === currentlyTriggeredEventName){
            eventListenersToBeRemoved = eventListenersToBeRemoved || [];
            eventListenersToBeRemoved.push({ eventName: eventName, eventHandler: eventHandler });
            return false;
        }

        var eventNameParts = eventName.split("."),
            eventType = eventNameParts[0],
            namespaceName = eventNameParts[1],
            namespace,
            foundHandler = false;

        if (namespaceName){
            namespace = namespaces[namespaceName];
            if (!namespace)
                namespace = namespaces[namespaceName] = { };
        }
        else
            namespace = namespaces._default;

        var event = namespace[eventType];
        if (event && event.length){
            for(var i=event.length; i--;){
                if (event[i] === eventHandler){
                    event.splice(i, 1);
                    foundHandler = true;
                }
            }
        }

        return foundHandler;
    }
};

yox.eventBus.prototype = {
    /**
     * Wraps the eventHandler's triggerEvent method with a specified 'this' and 'sender' arguments.
     * Note: This isn't done simply with the 'bind' function because the sender should be the last parameter,
     * rather than the first, and 'bind' only prepends parameters.
     * @param thisArg The object to serve as the 'this' of the triggerEvent function's call.
     * @param sender The 'sender' argument to send on triggerEvent function calls.
     */
    bindTriggerEvent: function(thisArg, sender){
        var self = this;
        return function(eventName, data){
            return self.triggerEvent.call(thisArg, eventName, data, sender);
        };
    }
}
/**
 * Data module, responsible for retrieving and holding data used by other modules.
 * Data is retrieved through data sources, which are sub-modules of the data module.
 * Each data source retrieves data from an external resource, such as external APIs, the DOM or HTML5 APIs (such as the File API).
 * Data can be cache in localStorage to improve loading times on recurring uses from external APIs.
 * yox.data can be used independently as an easy interface to external API's.
 *
 * @constructor
 * @param options
 */
yox.data = function(options){
    this.data = [];
    this.options = $.extend(true, {}, this.defaults, options);

    var eventBus = this.options.eventBus || new yox.eventBus();
    $.extend(this, eventBus);

    if (this.options.events){
        for(var eventName in this.options.events)
            this.addEventListener(eventName, this.options.events[eventName]);
    }

    this.options.source && this.addSources(this.options.source);
}

yox.data.prototype = {
    defaults: {
        cache: false // Set this to true to enable caching on localStorage. Cache is used only for external sources - it saves the data retrieved from the source (what's return from the source's load() method).
    },
    /**
     * Add sources to the data object.
     * When the added sources are finished loading (when all the data sources' load() methods calls their callbacks),
     * the 'loadSources' event is fired.
     *
     * @param {Object[]|Object} sourceArr An array of source data objects (or a single object) to add.
     */
    addSources: function(sourceArr){
        var deferredPromises = [],
            sources = sourceArr instanceof Array ? sourceArr : arguments,
            self = this;

        this.triggerEvent("loadSourcesStart", sources);
        this.isLoading = true;

        for(var i=0, source; source = sources[i]; i++){
            var promise = this.loadSource(source);
            if (promise)
                deferredPromises.push(promise);
        }

        $.when.apply(this, deferredPromises).done(function () {
            var totalItemsCount = self.countItems();

            for(var sourceIndex=0, source; sourceIndex < arguments.length; sourceIndex++){
                source = arguments[sourceIndex];
                source.id = self.data.length;
                source.parent = self;

                for(var itemIndex = 0, item; item = source.items[itemIndex]; itemIndex++){
                    item.id = ++totalItemsCount;
                    item.indexInSource = itemIndex;
                    item.source = source;
                    source.items[itemIndex] = new yox.data.item(item);
                }

                self.data.push(source);
            }

            self.isLoading = false;
            self.triggerEvent("loadSources", Array.prototype.slice.call(arguments, 0));
        });
    },
    /**
     * Clears the data object of all data.
     * Triggers two events: 'removeSources', with the removed data, and 'clear', with no data.
     */
    clear: function(){
        this.triggerEvent("removeSources", this.data);
        this.triggerEvent("clear");
        this.data = [];
    },
    /**
     * Returns a count of the total items in the data object (from all sources).
     * @return {Number}
     */
    countItems: function(){
        var totalItemsCount = 0;
        for(var i=this.data.length; i--;){
            totalItemsCount += this.data[i].items.length;
        }

        return totalItemsCount;
    },
    /**
     * Given an object with source data (the same as given to the 'addSources' method or to the yox.data constructor),
     * returns the data source sub-module which matches the source data, using the data source's 'match' method.
     *
     * @param sourceData
     * @return {Object} The data source object that matches the source data, or null if none found.
     */
    findDataSource: function(sourceData){
        for(var dataSourceName in yox.data.sources){
            var dataSource = yox.data.sources[dataSourceName];

            if (dataSource.match(sourceData))
                return dataSource;
        }

        return null;
    },
    /**
     * Returns an array of sources holding the module's data.
     * @return {Array}
     */
    getData: function(){ return this.data; },
    /**
     * Returns a data source, by name, simply gets yox.data.sources[dataSourceName].
     * @param {String} dataSourceName The name of the data source, such as 'picasa', 'flickr' or 'html'.
     * @return {*}
     */
    getDataSource: function(dataSourceName){
        return yox.data.sources[dataSourceName];
    },
    /**
     * Given a valid source data (a matching data source sub-module is found), returns a jQuery Deferred object
     * which resolves once the load() method of the data source sub-module called its callback.
     *
     * @param {Object} source
     * @return {jQuery.Deferred} A jQuery.Deferred object, or null if no data source sub-module exists for the given data.
     */
    loadSource: function(source){
        var dataSource = source.type ? this.getDataSource(source.type) : this.findDataSource(source),
            self = this;

        if (!dataSource)
            return null;

        var dfd = $.Deferred(),
            onLoadSource = function(sourceData){
                self.store(source, sourceData);
                dfd.resolve(sourceData);
            },
            savedSourceData = this.store(source);

        if (savedSourceData)
            onLoadSource(savedSourceData);
        else{
            // If a property map exists in the data source, convert properies in the data to the data source's own format:
            if (source.page && source.pageSize && source.offset === undefined){
                source.offset = source.pageSize * source.page;
            }

            if (dataSource.map){
                for(var mapProperty in dataSource.map){
                    var sourceProperty = source[mapProperty];
                    if (sourceProperty){
                        source[dataSource.map[mapProperty]] = sourceProperty;
                    }
                }
            }

            dataSource.load(source, onLoadSource,
                function(error){
                    dfd.reject();
                }
            )
        }
        return dfd;
    },
    /**
     * Replaces all data in the yox.data object with the given source(s).
     * @param {Object} sources One or more source data objects (for more than one, pass the method multiple params).
     */
    source: function(sources){
        this.clear();
        this.addSources.apply(this, arguments);
    },
    /**
     * Saves or retrieves from localStorage a source's data object.
     * options.cache must be set to true and to use this method, otherwise it just returns false.
     * If there is no window.localStorage object, the method also returns false.
     * If no data is specified, the method returns the available data for the given source.
     *
     * @param {Object} source The source data object to store (defines the localStorage key name)
     * @param {object} data The source's data to save to localStorage.
     * @return {Boolean|Object} true: data was saved, false: the method failed, JSON: the retrieved data.
     */
    store: function(source, data){
        if (!this.options.cache || !window.localStorage || !source || !source.url)
            return false;

        var keyName = this.namespace + ".source." + source.url;

        if (!data){
            var item = window.localStorage.getItem(keyName);
            if (item)
                return JSON.parse(item);

            return null;
        }
        window.localStorage.setItem(keyName, JSON.stringify(data));
        return true;
    }
};
yox.data.item = function(itemData){
    for(var p in itemData){
        if (itemData.hasOwnProperty(p))
            this[p] = itemData[p];
    }
};

yox.data.item.prototype = {
    get next(){
        if (this.indexInSource < this.source.items.length - 1)
            return this.source.items[this.indexInSource + 1];
        else if (this.source.id < this.source.parent.data.length - 1){
            var nextSourceItems = this.source.parent.data[this.source.id + 1].items;
            return nextSourceItems[0] || null;
        }
        else
            return null;
    },
    get previous(){
        if (this.indexInSource)
            return this.source.items[this.indexInSource - 1];
        else if (this.source.id){
            var prevSourceItems = this.source.parent.data[this.source.id - 1].items;
            return prevSourceItems[prevSourceItems.length - 1];
        }
        else
            return null;
    }
};
yox.data.source = function(){};
yox.data.sources = {}; // Will hold the transition types

yox.data.source.prototype = {
    load: function(source, callback){ throw new Error("'load' function isn't implemented for this data source."); },
    match: function(source){ throw new Error("'match' function isn't implemented for this data source."); }
};
yox.data.sources.picasa = (function(){
	var dataSourceName = "picasa",
        picasaRegex = /^https?:\/\/picasaweb\.google\./,
        picasaMatchRegex = /^https?:\/\/picasaweb\.google\.\w+\/([^\/#\?]+)\/?([^\/#\?]+)?(?:\?([^#]*))?/,
        apiUrl = "http://picasaweb.google.com/data/feed/api/",
        picasaCropSizes = [32, 48, 64, 72, 104, 144, 150, 160],
        picasaUncropSizes = [94, 110, 128, 200, 220, 288, 320, 400, 512, 576, 640, 720, 800, 912, 1024, 1152, 1280, 1440, 1600].concat(picasaCropSizes).sort(function(a,b){ return a-b; }),
        defaults = {
            setThumbnail: true,
            setSingleAlbumThumbnails: true,
            setTitle: true, // Whether to add a header with user and/or album name before thumbnails
			alt: 'json',
            cropThumbnails: false,
			thumbsize: 64,
            imgmax: picasaUncropSizes[picasaUncropSizes.length - 1],
            fields: "category(@term),entry(category(@term)),title,entry(summary),entry(media:group(media:thumbnail(@url))),entry(media:group(media:content(@url))),entry(media:group(media:content(@width))),entry(media:group(media:content(@height))),entry(link[@rel='alternate'](@href)),entry(media:group(media:credit)),openSearch:totalResults,entry(gphoto:height),entry(gphoto:width)"
        };

    function getDataFromUrl(url, options){
        var urlMatch = url.match(picasaMatchRegex),
            data = $.extend({}, defaults, options);

        if (urlMatch && urlMatch.length > 1)
        {
            var urlData = {
                user: urlMatch[1],
                album: urlMatch[2],
                query: urlMatch[3]
            };

            data.user = urlData.user;
            if (urlData.album){
                data.album = urlData.album;
                data.fields += ",entry(summary),gphoto:name";
            }
            else
                data.fields += ",entry(title),entry(gphoto:numphotos),entry(gphoto:name),entry(link[@rel='alternate']),author,entry(summary),entry(id)";

            if (urlData.query)
                $.extend(data, yox.utils.url.queryToJson(urlData.query));
        }

        data.imgmax = getImgmax(picasaUncropSizes, data.imgmax);
        data.thumbsize = getImgmax(data.cropThumbnails ? picasaCropSizes : picasaUncropSizes, data.thumbsize) + (data.cropThumbnails ? "c" : "u");
        return data;
    }

    function getImgmax(picasaSizes, optionsImgmax){
        var imgmax = Math.min(optionsImgmax, Math.max(screen.width, screen.height));

        for(var i=picasaSizes.length, picasaSize; (i-- -1) && (picasaSize = picasaSizes[i]) && picasaSizes[i - 1] >= imgmax;){}
        return picasaSize;
    }

    function getFeedUrl(picasaData)
    {
        var feedUrl = apiUrl;
        if (picasaData.user && picasaData.user != "lh")
        {
            feedUrl += "user/" + picasaData.user;
            if (picasaData.album)
                feedUrl += "/album/" + picasaData.album;
        }
        else
            feedUrl += "all";

        return feedUrl;
    }

    function getImagesData(picasaData, kind)
    {
        var entry = picasaData.feed.entry,
            itemsData = [];

        jQuery.each(picasaData.feed.entry, function(i, image){
            var isAlbum = image.category[0].term.match(/#(.*)$/)[1] === "album";
            if (isAlbum && !image.gphoto$numphotos.$t)
                return true;

            var imageTitle = isAlbum ? image.title.$t : image.summary.$t,
                mediaData = image.media$group.media$content[0],
                itemData = {
                    thumbnail: {
                        src: image.media$group.media$thumbnail[0].url
                    },
                    url: mediaData.url,
                    link: image.link[0].href,
                    title: imageTitle,
                    type: "image",
                    author: { name: image.media$group.media$credit[0].$t },
                    width: parseInt(image.gphoto$width, 10),
                    height: parseInt(image.gphoto$height, 10)
                };

            itemData.ratio = itemData.height / itemData.width;

            if (isAlbum){
                itemData.data = { album: { name: image.gphoto$name.$t, imageCount: image.gphoto$numphotos.$t, description: image.summary.$t }};
                itemData.isLoaded = true;
            }
            else{
                $.extend(itemData, {
                    width: mediaData.width,
                    height: mediaData.height,
                    ratio: mediaData.height / mediaData.width
                });
            }

            itemsData.push(itemData);
        });

        return itemsData;
    }

	return {
		name: dataSourceName,
        map: { pageSize: "max-results", offset: "start-index" },
		match: function(source){ return source.url && picasaRegex.test(source.url); },
		load: function(source, callback){
            var picasaData = getDataFromUrl(source.url, source);

            $.ajax({
                url: getFeedUrl(picasaData),
                dataType: 'jsonp',
                data: picasaData,
                success: function(data)
                {
                    var returnData = {
                        source: source,
                        sourceType: dataSourceName,
                        totalItems: data.feed.openSearch$totalResults.$t
                    };

                    if (!data.feed.entry || data.feed.entry.length == 0){
                        returnData.items = [];
                    }
                    else{
                        var kind = data.feed.category[0].term.match(/#(.*)$/)[1];

                        if (kind === "user")
                            $.extend(returnData, {
                                title: data.feed.title.$t,
                                data: {
                                    kind: "user",
                                    author: {
                                        name: data.feed.author[0].name.$t,
                                        link: data.feed.author[0].uri.$t
                                    }
                                }
                            });

                        returnData.createThumbnails = true;
                        returnData.items = getImagesData(data, kind);
                    }

                    if (callback)
                        callback(returnData);
                },
                error : function(xOptions, textStatus){
                    console.log("error: ", arguments);
                }
            });
	    }
    };
})();
/**
 * Statistics module, used for saving or sending usage data.
 * Data is send through reporter sub-modules, each of which has a single method, 'report'.
 *
 * @constructor
 * @param container
 * @param options
 */
yox.statistics = function(container, options){
    if (arguments.length === 1){
        options = container;
        container = null;
    }

    this.reporter = new yox.statistics.reporters[options.reporter || yox.statistics.defaults.reporter](options);
    this.category = options.category || "yox.js";

    var eventBus = options.eventBus || new yox.eventBus();
    $.extend(this, eventBus);

    if (options.events){
        for(var eventName in options.events)
            this.addEventListener(eventName, options.events[eventName]);
    }
};
yox.statistics.prototype = {
    /**
     * Sends data through a reporter.
     * @param data
     */
    report: function(data){
        data.category = data.category || this.category;
        this.reporter.report(data);
    }
};

yox.statistics.defaults = {
    reporter: "ga"
};

yox.statistics.reporter = function(name){ this.name = name; };
yox.statistics.reporters = {};

yox.statistics.reporter.prototype = {
    report: function(data){ throw new Error("'report' method isn't implemented yet for this reporter type."); }
};
yox.statistics.reporters.ga = function(options){
    if (!_gaq)
        throw new Error("Can't initialize Google Analytics reporter, Google Analytics isn't loaded.");

    this.report = function(data){
        _gaq.push(['_trackEvent', data.category || options.category, data.action, data.label, data.value]);
    }
};

yox.statistics.reporters.ga.prototype = new yox.statistics.reporter("ga");
(function($, undefined){
    yox.thumbnails = function(container, options){
        var self = this;
        
        this.container = container instanceof jQuery ? container[0] : container;
        this.options = $.extend(true, {}, this.defaults, options);
        this.itemCount = 0;

        var eventBus = this.options.eventBus || new yox.eventBus();
        $.extend(this, eventBus);

        this.triggerEvent = function(eventName, data){
            eventBus.triggerEvent.call(self, eventName, data, self);
        }

        if (this.options.events){
            for(var eventName in this.options.events)
                this.addEventListener(eventName, this.options.events[eventName]);
        }
        this.options.data && this.addDataSources(this.options.data);

        if (this.options.handleClick !== false){
            function onClick(e){
                var index = this.getAttribute("data-yoxthumbIndex"),
                    isSelected;

                e.preventDefault();

                if (this.classList && self.options.selectedThumbnailClass)
                    isSelected = this.classList.contains(self.options.selectedThumbnailClass);
                else
                    isSelected = $(this).hasClass(self.options.selectedThumbnailClass);

                self.triggerEvent("click", { originalEvent: e, index: index, target: this, isSelected: isSelected });

                if (!isSelected)
                    self.select(index);
            }
            $(this.container).on("click", "[data-yoxthumbindex]", onClick);
            this.addEventListener("beforeDestroy", function(){
                $(this.container).off("click", "." + self.options.thumbnailClass, onClick);
            });
        }
    }

    yox.thumbnails.prototype = {
        addDataSources: function(dataSource){
            var self = this;
            function renderSources(sources){
                for(var i=0; i < sources.length; i++){
                    var source = sources[i];
                        self.createThumbnails(source);
                }
            }

            var dataSources = dataSource.getData();
            if (dataSources && dataSources.length)
                renderSources(dataSources);

            function onLoadSources(sources){
                if (!self.options.allowAppend){
                    self.clear();
                    this.itemCount = 0;
                }
                renderSources(sources);
            }

            dataSource.addEventListener("loadSources", onLoadSources);
            this.addEventListener("beforeDestroy", function(){
                dataSource.removeEventListener("loadSources", onLoadSources);
            });

            dataSource.addEventListener("clear", function(){
                self.clear();
                this.itemCount = 0;
            });
        },
        clear: function(){
            this.thumbnails && this.thumbnails.remove();
            this.itemCount = 0;
            this.currentSelectedThumbnail = null;
            this.thumbnails = $();
        },
        createThumbnail: function(item){
            var self = this,
                $thumbnail = $("<a>", {
                    href: item.link || item.url,
                    title: this.options.renderThumbnailsTitle !== false ? item.title : undefined,
                    "class": self.options.thumbnailClass
                });

            $thumbnail.append($("<img>", {
                src: this.options.useFullImages ? item.url : item.thumbnail.src,
                alt: item.title
            }));

            return $thumbnail[0];
        },
        createThumbnails: function(source){
            var self = this,
                thumbnailElements;

            this.thumbnails = this.thumbnails || $();
            if (source.createThumbnails !== false){
                if ($.tmpl){
                    var thumbs = $.tmpl($.template(this.template), source.items, { options: this.options, getIndex: function(){ return self.itemCount++; } });
                    thumbs.appendTo(this.container);
                    this.thumbnails = thumbs;
                }
                else{
                    var documentFragment = document.createDocumentFragment();
                    for(var i = 0, count = source.items.length; i < count; i++, this.itemCount++){
                        var item = source.items[i],
                            thumbnailEl = self.options.createThumbnail ? self.options.createThumbnail.call(self, i, item, count) : this.createThumbnail(item);

                        thumbnailEl.setAttribute("data-yoxthumbindex", this.itemCount);
                        item.thumbnail.element = thumbnailEl;
                        item.thumbnail.generated = true;

                        var thumbnailImages = thumbnailEl.getElementsByTagName("img");
                        if (thumbnailImages.length)
                            item.thumbnail.image = thumbnailImages[0];

                        documentFragment.appendChild(thumbnailEl);
                    }

                    this.thumbnails = this.thumbnails.add(documentFragment.childNodes);
                    this.container.appendChild(documentFragment);

                }

                thumbnailElements = this.container.childNodes;
            }
            else{
                var $thumbnails = $("a:has(img)", this.container)
                    .attr("data-yoxthumbindex", function(i){
                        return self.itemCount++;
                    });

                this.thumbnails = this.thumbnails.add($thumbnails);
                thumbnailElements = $thumbnails.get();
            }

            this.triggerEvent("create", { thumbnails: thumbnailElements, items: source.items });
        },
        defaults: {
            allowAppend: true, // If true, new data sources cause thumbnails to be added rather than replace the existing thumbnails.
            renderThumbnailsTitle: true,
            selectedThumbnailClass: "selectedThumbnail",
            thumbnailClass: "yoxthumbnail"
        },
        destroy: function(){
            this.triggerEvent("beforeDestroy");
            this.clear();
        },
        reset: function(){
        },
        select: function(itemIndex){
            this.unselect();
            if (this.thumbnails)
                this.currentSelectedThumbnail = this.thumbnails.eq(itemIndex).addClass(this.options.selectedThumbnailClass);
        },
        template: "<a class='${$item.options.thumbnailClass}' href='${link || url}'{{if $item.options.renderThumbnailsTitle}} title='title'{{/if}} data-yoxthumbIndex='${$item.getIndex()}'><img src='${thumbnail.src}' alt='${title}' /></a>",
        unselect: function(){
            if (this.currentSelectedThumbnail){
                this.currentSelectedThumbnail.removeClass(this.options.selectedThumbnailClass);
                this.currentSelectedThumbnail = null;
            }
        }
    };

    window.yox.thumbnails = yox.thumbnails;
})(jQuery);
yox.controller = function(container, options){
    this.options = $.extend({}, yox.controller.defaults, options);
    var eventBus = this.options.eventBus || new yox.eventBus();

    $.extend(this, eventBus);

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
(function($){
    yox.utils.css.addJqueryCssHooks(["transition", "transitionDuration", "transform", "transformOrigin", "transformStyle", "backfaceVisibility", "perspective"]);

	yox.view = function(container, options, cache){
        var optionsEvents = $.extend({}, options.events),
            config = yox.view.config,
            platformConfig = yox.view.config.platform[yox.utils.browser.getPlatform()];

        cache = cache || yox.view.cache;
        delete options.events;

        var viewOptions = $.extend(true, {}, config.mode[options.resizeMode || platformConfig.resizeMode || config.defaults.resizeMode], config.defaults, platformConfig, options);

        // Merge the options events with the default ones:
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

		this.container = container;
        this.$container = $(container);
		this.options = viewOptions;
		this.id = yox.view.id ? ++yox.view.id : 1;
        this.cache = cache;
        this.direction = 1;

        for (var property in this){
            var f = this[property];
            if (typeof f === "function"){
                this[property] = f.bind(this);
            }
        }

        this.init();
	}

    yox.view.prototype = (function(){
        function setTransition(transition){
            var transitionModeConstructor = typeof transition === "string" ? yox.view.transitions[transition] : transition;
            if (!transitionModeConstructor)
                throw new Error("Invalid transition - \"" + transition + "\" doesn't exist.");

            var transitionMode = new transitionModeConstructor();

            if (!(transitionMode instanceof yox.view.transition))
                throw new Error("Invalid transition - transition constructors must have yox.view.transition as prototype.");

            transitionMode.create.call(this, this.$container);
            this.transition = transitionMode;
        }

        function createViewer(view){
            var elements = {};

            if (view.$container.css("position") === "static")
                view.$container.css("position", "relative");

            $.extend(view, {
                getPosition: yox.utils.dimensions.resize[view.options.resizeMode],
                elements: elements
            });

            setTransition.call(view, view.options.transition);
        }

        function createInfo(){
            var $info = $("<div>", {
                "class": "yoxview_info"
            });
            return $info;
        }

        var onOptionsChange = {
            resizeMode: function(resizeMode){
                this.getPosition = yox.utils.dimensions.resize[resizeMode];
            },
            transition: function(newTransition){
                this.transition.destroy.call(this);
                setTransition.call(this, newTransition);

                var currentItemId = this.currentItem.id - 1;
                this.currentItem = null;
                this.selectItem(currentItemId);
            }
        };

        var itemTypes = {
            html: {
                clear: function(element){
                    element.innerHTML = "";
                },
                create: function(){
                    var div = document.createElement("div");
                    div.style.overflow = "hidden";
                    return div;
                },
                set: function(item, element){
                    element.loading = false;
                    if (item.element){
                        element.innerHTML = "";
                        element.appendChild(item.element);
                    }
                    else
                        element.innerHTML = item.html;

                    item.width || (item.width = this.containerDimensions.width);
                    item.height || (item.height = this.containerDimensions.height);
                    item.ratio = item.height / item.width;

                    var position = this.getPosition(item, this.containerDimensions, this.options);
                    this.transition.transition.call(this, { position: position, index: item.id - 1, item: item });
                    this.triggerEvent("select", item);
                }
            },
            image: (function(){
                function onImageLoad(e){
                    var view = e instanceof yox.view ? e : e.data.view;
                    this.loading = false;
                    if (view.currentItem && view.currentItem.url !== this.src && view.currentItem.thumbnail.src !== this.src)
                        return false;

                    if (view.currentItem && (!view.options.showThumbnailsBeforeLoad || this.loadingThumbnail)){
                        this.loadingThumbnail = false;
                        var item = view.currentItem,
                            position = view.getPosition(item, view.containerDimensions, view.options)

                        if (view.options.showThumbnailsBeforeLoad && view.previousItem &&  view.previousItem.thumbnail){

                            var previousImage = checkElementExists(view.transition.getNotCurrentPanel());
                            if (previousImage.image.src)
                                previousImage.image.src = view.previousItem.thumbnail.src;
                        }

                        view.transition.transition.call(view, { position: position, index: item.id - 1, item: item });
                    }
                }

                return {
                    checkLoading: true,
                    clear: function(element){
                        element.src = "";
                    },
                    create: function(){
                        var img = document.createElement("img");
                        img.src = "";
                        $(img).on("load", { view: this }, onImageLoad);
                        return img;
                    },
                    set: function(item, element, loadThumbnail){
                        if (this.options.showThumbnailsBeforeLoad)
                            clearTimeout(element.changeImageTimeoutId);

                        var imageUrl = loadThumbnail && item.thumbnail ? item.thumbnail.src : item.url;
                        element.loading = true;
                        if (loadThumbnail)
                            element.loadingThumbnail = true;

                        if (element.src !== imageUrl){
                            function setSrc(){
                                console.log("chage:", element.src, imageUrl);
                                element.src = "";
                                element.src = imageUrl;
                            }

                            if (this.options.showThumbnailsBeforeLoad && !loadThumbnail){
                                clearTimeout(element.changeImageTimeoutId);
                                element.changeImageTimeoutId = setTimeout(setSrc, this.options.transitionTime + 100);
                            }
                            else
                                setSrc();
                        }
                        else
                            onImageLoad.call(element, this);
                    }
                }
            })()
        };

        function checkElementExists($panel, itemType){
            var element = $panel.data(itemType);
            if (!element){
                element = itemTypes[itemType].create.call(this);
                if (element)
                    $panel.append(element);
                else
                    element = $panel[0];

                $panel.data(itemType, element);
                if (element !== $panel[0]){
                    element.style.height = element.style.width = "100%";
                    element.style.display = "none";
                }

                if (this.options.displayInfo){
                    var $info = createInfo();
                    $panel.append($info).data("info", $info);
                }
            }

            return element;
        }

        function loadSources(sources){
            var createItems = [],
                view = this,
                originalNumberOfItems = view.items.length;

            for(var i=0; i < sources.length; i++){
                var sourceData = sources[i];
                view.items = view.items.concat(sourceData.items);
                createItems = createItems.concat(sourceData.items);
            }

            view.triggerEvent("load", { items: createItems, sources: sources });

            if (!view.initialized){
                view.initialized = true;
                view.triggerEvent("init");
            }
        }

        function setItem(item, loadThumbnail){
            if (item !== this.currentItem)
                return false;

            if (item){
                var itemType = itemTypes[item.type],
                    $panel = itemType.checkLoading ? this.transition.getCurrentPanel() : this.transition.getPanel(),
                    currentPanelItemType = $panel.data("itemType"),
                    element = checkElementExists.call(this, $panel, item.type);

                if (currentPanelItemType !== item.type){
                    if (currentPanelItemType){
                        currentPanelItemType && itemType.clear.call(this, element);
                        $panel.data(currentPanelItemType).style.display = "none";
                    }
                    $panel.data("itemType", item.type);
                }

                if (itemType.checkLoading && !element.loading && (!this.options.showThumbnailsBeforeLoad || loadThumbnail)){
                    $panel = this.transition.getPanel(item);
                    element = checkElementExists.call(this, $panel, item.type);
                }

                if (this.options.displayInfo){
                    var $info = $panel.data("info");
                    if (item.title)
                        $info.text(item.title).removeAttr("disabled");
                    else
                        $info.text("").attr("disabled", "disabled");
                }

                element.style.display = "block";
                itemType.set.call(this, item, element, loadThumbnail);
            }
            else { // No item given, the transition should close if it can.
                var closingElement = this.transition.getPanel();

                // In case thumbnails are displayed before the full image, change back to the thumbnail when closing, for better performance.
                if (this.options.showThumbnailsBeforeLoad){
                    itemType = itemTypes[this.previousItem.type];
                    itemType.set.call(this, this.previousItem, closingElement, true);
                }
                this.transition.transition.call(this, { item: null });
                this.triggerEvent("select");
            }
        }

        return {
            addDataSources: function(dataSource){
                var self = this,
                    dataSources = dataSource.getData();

                if (dataSources && dataSources.length){
                    loadSources.call(self, dataSources);
                }

                function onLoadSources(sources){
                    loadSources.call(self, sources);
                }

                dataSource.addEventListener("loadSources", onLoadSources);
                this.addEventListener("beforeDestroy", function(){
                    dataSource.removeEventListener("loadSources", onLoadSources);
                });

                dataSource.addEventListener("clear", function(){
                    self.removeItems();
                });
            },
            cacheCount: 0,
            /**
             * Selects a null item. Transitions that support this should close the view.
             */
            close: function(){
                if (this.isOpen()){
                    this.selectItem(null);
                    this.triggerEvent("close");
                }
            },
            /**
             * Removes all elements created for the view
             */
            destroy: function(){
                this.triggerEvent("beforeDestroy");
                this.transition.destroy();
            },
            first: function(){
				if (!this.currentItem)
					return false;

                this.selectItem(0);
			},
            items: [],
            init: function(){
                var self = this;

                this.options.margin = yox.utils.dimensions.distributeMeasures(this.options.margin);
                this.options.padding = yox.utils.dimensions.distributeMeasures(this.options.padding);

                var eventBus = this.options.eventBus || new yox.eventBus();
                $.extend(this, eventBus);

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

                createViewer(this);
                this.options.data && this.addDataSources(this.options.data);

                if (this.options.controls){
                    for(var methodName in this.options.controls){
                        var method = this[methodName];
                        if (method){
                            $(this.options.controls[methodName])
                                .data("yoxviewControl", methodName)
                                .on("click", function(e){
                                    e.preventDefault(); self[$(this).data("yoxviewControl")].call(self);
                                });
                        }
                    }
                }

                this.update();
                this.triggerEvent("create");
            },
            isOpen: function(){
                return !!this.currentItem;
            },
            last: function(){
				if (!this.currentItem)
					return false;

                this.selectItem(this.items.length - 1);

			},
            next: function(slideshow){
                if (!this.currentItem)
					return false;

                this.direction = 1;
				var nextItemId = this.currentItem.id;
                if (this.currentItem.id === this.items.length){
                    if (this.options.loop)
                        this.currentItem.id = 0;
                    else
                        return false;
                }
				this.selectItem(nextItemId, undefined, slideshow);
            },
            option: function(option, value){
                var options;
                if (value === undefined && Object(option) === option)
                    options = option;
                else{
                    options = {};
                    options[option] = value;
                }

                // Some options require special treatment once changed:
                for(var opt in options){
                    var prevValue = this.options[opt],
                        newValue = options[opt];

                    if (prevValue !== newValue){
                        var onChange = onOptionsChange[opt];
                        if (onChange)
                            onChange.call(this, newValue, prevValue);
                    }
                }

                this.transition.update && this.transition.update.call(this, options);
                $.extend(true, this.options, options);
            },
            toggleSlideshow: function(){
                var view = this;

                if (this.isPlaying){
                    clearTimeout(this.playTimeoutId);
                    this.isPlaying = false;
                    this.triggerEvent("slideshowStop");
                }
                else{
                    this.isPlaying = true;
                    this.playTimeoutId = setTimeout(function(){ view.next.call(view, true) }, this.options.slideshowDelay);
                    this.triggerEvent("slideshowStart");
                }
            },
            prev: function(){
                if (!this.currentItem)
					return false;

                this.direction = -1;
                var prevItemId = this.currentItem.id - 2;
                if (this.currentItem.id === 1){
                    if (this.options.loop)
                        this.currentItem.id = this.items.length - 1;
                    else
                        return false;
                }
				this.selectItem(prevItemId);
            },
            removeItems: function(){
                this.triggerEvent("removeItems", this.items);
                this.currentItem = undefined;
                this.items = [];
            },
            removeEventListener: function(eventName, eventHandler){
                if (eventHandler && typeof(eventHandler) !== "function")
                    throw new Error("Invalid event handler, must be a function or undefined.");

                $(this.container).off(eventName + ".modules", eventHandler);
            },
            selectItem: function(item, data, slideshow){
                if (!slideshow && this.isPlaying)
                    this.toggleSlideshow();
                else if (slideshow && !this.isPlaying){
                    this.isPlaying = true;
                    this.triggerEvent("slideshowStart");
                }

                if (!isNaN(item)){
                    if (item >= this.items.length || item < 0){
                        throw new Error("Invalid item index: " + item);
                    }
                    
                    item = this.items[item];
                }
                if (String(item) === item){
                    for(var i=0, tempItem; tempItem = this.items[i]; i++){
                        if (tempItem.name && tempItem.name === item){
                            item = tempItem;
                            break;
                        }
                    }
                    tempItem = null;
                }
                else {
                    if (item instanceof HTMLElement)
                        item = $(item);

                    if (item instanceof jQuery){
                        var index = item.data("yoxviewIndex");
                        if (isNaN(index))
                            index = parseInt(item.attr("data-yoxviewIndex"), 10);

                        item = this.items[index];
                    }
                }

                var currentItem = this.currentItem,
                    view = this;

                if (currentItem && item && item.id === currentItem.id)
					return false;

                this.triggerEvent("beforeSelect", { newItem: item, oldItem: currentItem, data: data });
                this.previousItem = this.currentItem;
				this.currentItem = item;

                if (item){
                    if (view.options.showThumbnailsBeforeLoad){
                        setItem.call(view, item, true);
                    }

                    this.cache.withItem(item, this, function(loadedItem){
                        setItem.call(view, loadedItem);
                    });
                }
                else
                    setItem.call(view, item);

                return true;
            },
            update: function(force){
                if (this.options.transitionTime){
                    if (this.updateTransitionTimeoutId){
                        clearTimeout(this.updateTransitionTimeoutId);
                        this.updateTransitionTimeoutId = null;
                    }
                }

                var containerDimensions = { width: this.$container.width(), height: this.$container.height() };
                if (force || !this.containerDimensions || containerDimensions.width !== this.containerDimensions.width || containerDimensions.height !== this.containerDimensions.height){
                    this.containerDimensions = containerDimensions;
                    if (this.currentItem){
                        this.transition.transition.call(this, {
                            position: this.getPosition(this.currentItem, this.containerDimensions, this.options),
                            duration: 0,
                            isUpdate: true
                        });
                    }
                }
            }
        };
    })();

	yox.view.config = {
        defaults: {
            cacheImagesInBackground: true, // If true, full-size images are cached even while the gallery hasn't been opened yet.
            createInfo: undefined, // If this is set to a function, it overrides the default createInfo function, which creates the info elements for an item.
            enlarge: false, // Whether to enlarge images to fit the container
            events: { // Predefined event handlers
                init: function(){
                    if (this.options.cacheImagesInBackground && this.items.length)
                        yox.view.cache.cacheItem(this);

                    // Need to trigger init only once per view:
                    this.removeEventListener("init");
                },
                select: function(item){
                    var view = this;
                    if (this.isPlaying){
                        this.playTimeoutId = setTimeout(function(){ view.next.call(view, true); }, Number(this.options.slideshowDelay) + Number((this.options.transitionTime || 0)));
                    }
                }
            }, // A function to call when the popup's background is clicked. (Applies only in popup mode)
            container: document.body || document.getElementsByTagName("body")[0], // The element in which the viewer is rendered. Defaults to the whole window.
            loop: true, // If true, viewing never ends - the first item is shown after the last, and the last after the first.
            panelDimensions: { width: 1600, height: 1600 }, // Default width and height for panels which aren't images
            resizeMode: "fit", // The mode in which to resize the item in the container - 'fit' (shows the whole item, resized to fit inside the container) or 'fill' (fills the entire container).
            showThumbnailsBeforeLoad: false, // If set to true, the viewer will open thumbnails using the transition. When the full image is loaded, it replaces the thumbnail.
            slideshowDelay: 3000 // Time in milliseconds to display each image when in slideshow
        },
        mode: {
            fill: {
                transition: "fade",
                enlarge: true,
                margin: 0,
                padding: 0
            },
            fit: {
                transition: "morph"
            }
        },
        platform: {
            mobile: {
                cacheBuffer: 2, // The number of images to cache after the current image (directional, depends on the current viewing direction)
                margin: 0,
                padding: 0,
                showInfo: true,
                transitionTime: 0 // The time it takes to animate transitions between items or opening and closing.
            },
            desktop: {
                cacheBuffer: 5, // The number of images to cache after the current image (directional, depends on the current viewing direction)
                margin: 20, // the minimum margin between the popup and the window
                padding: 0,
                showInfo: true,
                transitionTime: 300 // The time it takes to animate transitions between items or opening and closing.
            }
        },
        keys: {
            right: "next",
            left: "prev",
            enter: "toggleSlideshow",
            escape: "close",
            home: "first",
            end: "last",
            space: "next"
        }
    };
})(jQuery);
yox.view.cache = (function(){
    var currentCacheIndex,
        currentCacheCount = 0,
        concurrentCachedImagesCount = 2,
        cacheImages = [],
        currentCachedImageIndex = 0,
        innerKey = (new Date()).valueOf(),
        cachingCount = 0, // The number of currently loading images
        loadGracetime = 200,
        loadGracetimeTimeoutId,
        loadingItemId;

    for(var i=0; i<concurrentCachedImagesCount; i++){
        var cacheImage = new Image();
        cacheImage.setAttribute("data-id", i);
        $(cacheImage)
            .on("load", { cacheImageIndex: i }, onLoadImage)
            .on("error", function(e){
                // TODO: Do something more meaningful with image errors.
                console.error("Image not found or couldn't load:", this.src);
            });
        cacheImages.push({ img: cacheImage });
    }

    function updateViewCacheAndAdvance(view, increaseCacheCount){
        var advance = true;
        currentCacheCount++;
        if (increaseCacheCount && (++view.cacheCount) === view.items.length){
            delete view.cacheCount;
            view.isLoaded = true;
            advance = false;
        }

        if (advance)
            advance = (currentCacheCount + cachingCount < view.options.cacheBuffer);

        if (advance)
            advanceCache(view);
    }

    function endCache(item, view){
        view.triggerEvent("cacheEnd", item);
        loadingItemId = null;
    }

    function onLoadImage(e){
        if (!this.width || !this.height)
            return false;

        var cacheImage = cacheImages[currentCachedImageIndex = e.data.cacheImageIndex],
            item = cacheImage.item,
            view = cacheImage.view;

        item.width = this.width;
        item.height = this.height;
        item.ratio = this.height / this.width;

        item.isLoaded = true;

        if (item.id === loadingItemId)
            endCache(item, view);

        view.triggerEvent("loadItem", item);
        if (cacheImage.onCache){
            cacheImage.onCache.call(view, item);
            cacheImage.onCache = null;
        }

        cachingCount--;
        delete cacheImage.item;
        updateViewCacheAndAdvance(view, true);
    }

    function advanceCache(view){
        var itemsCount = view.items.length,
            nextItemIndex = currentCacheIndex + view.direction;

        if (nextItemIndex === itemsCount)
            nextItemIndex = 0;
        else if (nextItemIndex === -1)
            nextItemIndex += itemsCount;

        cacheItem(view, view.items[nextItemIndex], null, innerKey);
    }

    function cacheItem(view, item, onCache){
        if (!(view instanceof yox.view))
            throw new TypeError("Invalid view for cacheItem.");

        if (!view)
            throw new Error("View is required for cacheItem.");

        // Reset current cache count for outside calls:
        if (arguments.length < 4 || arguments[3] !== innerKey){
            currentCacheCount = 0;
        }

        item = item || view.items[0];

        if (item.type !== "image"){
            if (onCache)
                onCache.call(view, item);

            //advanceCache(view);
            return true;
        }

        // Check whether the specified item is already being cached:
        for(var i = 0; i < concurrentCachedImagesCount; i++){
            var cacheImage = cacheImages[i];
            if (cacheImage.view && cacheImage.view.id === view.id && cacheImage.item && cacheImage.item.id === item.id && onCache){
                // If it is loading, add the onCache function to it:
                cacheImage.onCache = onCache;
                return true;
            }
        }

        currentCacheIndex = item.id - 1;

        if (!item.isLoaded && item.type === "image"){
            var cacheImage = cacheImages[currentCachedImageIndex];
            cacheImage.item = item;
            cacheImage.view = view;

            // Fix for a Firefox bug, image load wouldn't get triggered otherwise (last tested on Firefox v11.0):
            if ($.browser.mozilla)
                cacheImage.img.src = "";

            if (onCache)
                cacheImage.onCache = onCache;

            cacheImage.img.src = item.url;
            cachingCount++;

            if (++currentCachedImageIndex === cacheImages.length)
                currentCachedImageIndex = 0;

            // Init another cache, if there are available slots:
            if (cachingCount < concurrentCachedImagesCount && currentCacheCount + cachingCount < view.options.cacheBuffer)
                advanceCache(view);
        }
        else{
            updateViewCacheAndAdvance(view, !item.isLoaded);
            item.isLoaded = true;
            onCache && onCache.call(view, item);
        }

        return true;
    }

    function withItem(item, view, onCache){
        // Reset current cache count for outside calls:
        if (arguments.length < 3 || arguments[2] !== innerKey)
            currentCacheCount = 0;

        if (item.isLoaded){
            onCache.call(view, item);

            if (loadingItemId)
                endCache(item, view);

            currentCacheIndex = item.id - 1;
            if (!view.isLoaded){
                updateViewCacheAndAdvance(view, false);
            }
        }
        else{
            if (loadGracetimeTimeoutId)
                clearTimeout(loadGracetimeTimeoutId);

            loadGracetimeTimeoutId = setTimeout(function(){
                if (!item.isLoaded){
                    loadGracetimeTimeoutId = null;
                    view.triggerEvent("cacheStart", item);
                    loadingItemId = item.id;
                }
            }, loadGracetime);

            cacheItem(view, item, onCache, innerKey);
        }
    }

    return {
        cacheItem: cacheItem,
        withItem: withItem
    };
})();
// Prototype for all transition classes

yox.view.transition = function(name){ this.name = name; };
yox.view.transitions = {}; // Will hold the transition types

yox.view.transition.prototype = {
    // Creates all the elements and event handlers required for the transition:
    // $container: The container in which the panels are rendered (jQuery instance).
    // onLoad: A function to call when an item is ready to display.
    create: function($container, onLoad){ throw new Error("'create' method isn't implemented for this transition type.") },

    // Removes all elements created by the transition type and clears memory (by nullifying variables, etc.).
    destroy: function(){ throw new Error("'destroy' method isn't implemented for this transition type."); },

    // Returns the currently displaying panel (the last that was used):
    getCurrentPanel: function(){ throw new Error("'getCurrentPanel' method isn't implemented for this transition type.") },

    // Returns the next panel to be used:
    getPanel: function(){ throw new Error("'getPanel' method isn't implemented for this transition type.") },

    // Does the actual transition.
    // options may contain:
    // position: { width, height, left, top } for the panel.
    // duration: The time, in milliseconds, the transition should take. If not specified, the default time is used (from options.transitionTime)
    transition: function(options){ throw new Error("'transition' method isn't implemented for this transition type.") },

    // A function that's called when one or more options are changed is YoxView.
    // updateData: the changed options.
    update: function(updateData){}
};
yox.view.transitions.thumbnails = function(){
    var panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime,
        $currentItemThumbnail,
        zIndex = 100,
        scrollElement,
        scrollEventElement,
        lastPosition;

    this.create = function($container){
        var self = this;
        function createImg(index){
            var $panel = $("<div>", {
                "class": "yoxviewFrame yoxviewFrame_" + self.options.resizeMode + " yoxviewFrame_" + yox.utils.browser.getPlatform() + " yoxviewFrame_thumbnails",
                css: {
                    transition: "all " + defaultTransitionTime + "ms linear",
                    transformOrigin: "center center",
                    display: "none",
                    "box-sizing": "border-box",
                    position: "fixed",
                    overflow: "visible"
                }
            }).appendTo($container);

            if ($.browser.webkit) // GPU acceleration for webkit:
                $panel[0].style.setProperty("-webkit-transform", "translateZ(0)");

            var closeBtn = document.createElement("a");
            closeBtn.className = "yoxview_close";
            closeBtn.onclick = self.close;

            $panel.append(closeBtn);

            $container.append($panel);
            return $panel;
        }

        currentTransitionTime = defaultTransitionTime = this.options.transitionTime;
        panels = [];

        for(var i=0; i<2; i++){
            panels.push(createImg(i));
        }

        function isScrollableElement(element){
            var compStyleOverflow = window.getComputedStyle(element, null).overflow;
            return ~["scroll", "auto"].indexOf(compStyleOverflow);
        }

        scrollElement = $container[0];
        while(!isScrollableElement(scrollElement) && scrollElement.parentNode && scrollElement !== document.documentElement){
            scrollElement = scrollElement.parentNode;
        }

        scrollEventElement = scrollElement;
        if (scrollElement === document.body || scrollElement === document.documentElement)
            scrollEventElement = window;
    };

    this.destroy = function(){
        for(var i=0; i<panels.length; i++){
            panels[i].remove();
        }
        panels = [];
    };

    this.getCurrentPanel = function(){
        return panels[currentPanelIndex];
    };

    this.getNotCurrentPanel = function(){
        return panels[currentPanelIndex ? 0 : 1];
    }

    this.getPanel = function(item){
        currentPanelIndex = currentPanelIndex ? 0 : 1;
        return panels[currentPanelIndex];
    };

    function showThumbnail($thumbnail){
        return function(){
            $thumbnail.css("visibility", "visible");
        };
    }

    function doTransition(options){
        clearTimeout(openPanelTimeoutId);
        clearTimeout(hideOldPanelTimeoutId);

        var $newPanel = panels[currentPanelIndex],
            $oldPanel = panels[currentPanelIndex ? 0 : 1];

        if (!options.isUpdate){
            if (options.item){
                var $thumbnail;
                if (options.item.openFromElement){
                    $thumbnail = $(options.item.openFromElement);
                    delete options.item.openFromElement;
                }
                else
                    $thumbnail = $(options.item.thumbnail.image);

                var thumbnailOffset = $thumbnail.offset(),
                    thumbnailScale = $thumbnail.width() / options.position.width;

                if (window.getComputedStyle($thumbnail[0], null).position !== "fixed"  && window.getComputedStyle($thumbnail[0].parentNode, null).position !== "fixed"){
                    thumbnailOffset.top -= scrollElement.scrollTop;
                    thumbnailOffset.left -= scrollElement.scrollLeft;
                }

                $newPanel.show().css($.extend({
                    transition: "none",
                    transform: [
                        "scale(", thumbnailScale,
                        ") translateX(", Math.round((thumbnailOffset.left - options.position.left - options.position.width * (1 - thumbnailScale) / 2) / thumbnailScale),
                        "px) translateY(", Math.round((thumbnailOffset.top - options.position.top - options.position.height * (1 - thumbnailScale) / 2) / thumbnailScale),
                        "px) translateZ(0)"].join(""),
                    "z-index": zIndex + 1
                }, options.position));

                openPanelTimeoutId = setTimeout(function(){
                    $newPanel.css({
                        transform: "scale(1) translateX(0) translateY(0) translateZ(0)",
                        transition: "all " + defaultTransitionTime +"ms ease-out"
                    });
                }, 5);

            }

            if ($oldPanel && $currentItemThumbnail){
                var thumbnailPosition = $currentItemThumbnail.offset(),
                    scale = $currentItemThumbnail.width() / lastPosition.width;

                thumbnailPosition.top -= scrollElement.scrollTop;
                thumbnailPosition.left -= scrollElement.scrollLeft;

                $oldPanel.css({
                    "z-index": zIndex,
                    transform: [
                        "scale(", scale,
                        ") translateX(", Math.round((thumbnailPosition.left - lastPosition.left - lastPosition.width * (1 - scale) / 2) / scale),
                        "px) translateY(", Math.round((thumbnailPosition.top - lastPosition.top - lastPosition.height * (1 - scale) / 2) / scale),
                        "px) translateZ(0)"].join("")
                });
                hideOldPanelTimeoutId = setTimeout(function(){ $oldPanel.hide() }, defaultTransitionTime);
                showThumbnailTimeoutId = setTimeout(showThumbnail($currentItemThumbnail), defaultTransitionTime);
            }

            lastPosition = options.position;
            $currentItemThumbnail = $thumbnail;
            if ($currentItemThumbnail)
                $currentItemThumbnail.css("visibility", "hidden");
        }
        else {
            $newPanel.css(options.position);
        }
    }
    var throttledTransition = yox.utils.performance.throttle(doTransition, 120);

    var openPanelTimeoutId, hideOldPanelTimeoutId, showThumbnailTimeoutId;
    this.transition = function(options){
        if (options.isUpdate)
            throttledTransition.call(this,options);
        else
            doTransition.call(this, options);
    };

    this.update = function(updateData){
        /*
        if (updateData.transitionTime !== undefined){
            $frame.css("transitionDuration", updateData.transitionTime + "ms");
            for(var i=panels.length; i--;)
                panels[i].css("transitionDuration", updateData.transitionTime + "ms");
        }
        */
    };
};

yox.view.transitions.thumbnails.prototype = new yox.view.transition("thumbnails");
yox.theme = function(){};
yox.themes = {}; // Will hold the theme types

yox.theme.prototype = {
    // Creates the elements required for the theme, adds event listeners, etc.
    create: function(container){
        throw new Error("'create' method is not implemented for this theme.");
    },
    // Removes all elements and event listeners created by the 'create' method.
    destroy: function(){
        throw new Error("'destroy' method is not implemented for this theme.");
    },
    getThemeClass: function(className){
        return "yox-theme-" + this.name + (className ? "-" + className : "");
    },
    init: function(container, options){
        if (!(options.data instanceof yox.data))
            throw new Error("Invalid data provided for theme, must be an instance of yox.data.");

        $.extend(this, options.eventBus);

        this.create(container);

        function createModule(container, moduleName, moduleOptions){
            moduleOptions.data = options.data;

            moduleOptions.eventBus = {
                addEventListener: function(eventName, eventHandler){
                    options.eventBus.addEventListener(eventName, eventHandler.bind(this));
                },
                triggerEvent: function(eventName, eventData, sender){
                    options.eventBus.triggerEvent.call(this, eventName + "." + moduleName, eventData, sender || this);
                }
            };

            return new moduleConstructor(container, moduleOptions);
        }

        var modulesConfig = $.extend(true, {}, this.config, options.modules);
        for(var moduleName in modulesConfig){
            var moduleOptions = modulesConfig[moduleName],
                moduleConstructor = yox[moduleName];

            if (!moduleConstructor)
                throw new Error("Module not found: '" + moduleName + "', can't create theme '" + this.name + "'.");

            var moduleElements = $(".yox" + moduleName, container);
            if (moduleOptions instanceof Array){
                this.modules[moduleName] = [];

                for(var i=0, options; options = moduleOptions[i]; i++){
                    this.modules[moduleName].push(createModule(moduleElements[i], moduleName, options));
                }
            }
            else
                this.modules[moduleName] = createModule(moduleElements[0], moduleName, moduleOptions);
        }
    },
    // The configuration for modules used by the theme.
    config: {},
    modules: {}
}
yox.themes.switcher = function(data, options){
    var elements,
        self = this,
        isOpen = false,
        navButtonWidth = 70,
        lastNavButton,
        openTimeoutId,
        throttledSetNavButtons = yox.utils.performance.throttle(function(item){
            setNavButton(elements.buttons.prev, elements.buttons.prevImg, item.previous);
            setNavButton(elements.buttons.next, elements.buttons.nextImg, item.next);
        }, 0);

    function setNavButton(button, buttonImg, item){
        if (item){
            buttonImg.src = item.thumbnail.src;
            button.style.marginTop = Math.floor((navButtonWidth * item.ratio) / -2) + "px";
            if (!button.hasItem)
                button.style.display = "block";

            button.hasItem = true;
        }
        else{
            if (button.hasItem)
                button.style.display = "none";

            button.hasItem = false;
        }
    }

    this.name = "switcher";

    this.config = {
        view: {
            displayInfo: true,
            enableKeyboard: true,
            enlarge: false,
            loop: false,
            resizeMode: "fit",
            transition: yox.view.transitions.thumbnails,
            transitionTime: 400,
            margin: { top: 45, right: 40, left: 40, bottom: 30 },
            showThumbnailsBeforeLoad: true,
            events: {
                "click.thumbnails": function(e, sender){
                    if (isOpen && e.isSelected){
                        this.close();
                        sender.unselect();
                    }
                    else
                        this.selectItem(e.index);
                },
                beforeSelect: function(e){
                    if (e.newItem){
                        if (!isOpen){
                            clearTimeout(openTimeoutId);
                            openTimeoutId = setTimeout(function(){
                                $(elements.container).addClass(self.getThemeClass("open"));
                                elements.buttons.wrapper.classList.add(self.getThemeClass("nav-enabled"));
                            }, self.config.view.transitionTime + 100);
                            isOpen = true;
                        }
                        else{
                            //e.newItem.openFromElement = lastNavButton;
                        }

                        throttledSetNavButtons(e.newItem);
                    }
                },
                close: function(e){
                    clearTimeout(openTimeoutId);
                    openTimeoutId = setTimeout(function(){
                        elements.buttons.wrapper.classList.remove(self.getThemeClass("nav-enabled"));
                        $(elements.container).removeClass(self.getThemeClass("open"));
                    }, self.config.view.transitionTime + 100);
                    self.modules.view.close();
                    isOpen = false;
                },
                keydown: function(e){
                    var keyHandler = yox.view.config.keys[e.key];
                    if (keyHandler)
                        this[keyHandler]();
                }
            }
        },
        controller: {
            keydownFrequency: options.keydownFrequency
        }
    };

    data.addEventListener("clear", function(){
        self.modules.view.close();
    });
    function resizeEventHandler(){
        self.modules.view.update();
    }

    this.create = function(container){
        elements = {
            view: document.createElement("div"),
            container: container,
            buttons: {
                wrapper: document.createElement("div"),
                prev: document.createElement("a"),
                prevImg: document.createElement("img"),
                next: document.createElement("a"),
                nextImg: document.createElement("img")
            }
        };

        elements.view.className = this.getThemeClass("view") + " yoxview";
        elements.buttons.wrapper.className = this.getThemeClass("nav");

        elements.buttons.prev.className = this.getThemeClass("btn") + " " + this.getThemeClass("btn-prev");
        elements.buttons.prev.appendChild(elements.buttons.prevImg);
        elements.buttons.next.className = this.getThemeClass("btn") + " " + this.getThemeClass("btn-next");
        elements.buttons.next.appendChild(elements.buttons.nextImg);
        elements.buttons.prev.onclick = function(){ lastNavButton = elements.buttons.prevImg; self.modules.view.prev(); };
        elements.buttons.next.onclick = function(){ lastNavButton = elements.buttons.nextImg; self.modules.view.next(); };

        container.appendChild(elements.view);
        elements.buttons.wrapper.appendChild(elements.buttons.prev);
        elements.buttons.wrapper.appendChild(elements.buttons.next);
        container.appendChild(elements.buttons.wrapper);

        $(window).on("resize", resizeEventHandler);
        $(elements.view).on("click", "img", function(){ self.modules.view.next() });
    };

    this.destroy = function(){
        elements.container.removeChild(elements.view);
        elements.container.removeChild(elements.buttons.prev);
        elements.container.removeChild(elements.buttons.next);

        $(window).off("resize", resizeEventHandler);
        $(elements.container).removeClass(self.getThemeClass("open"));
        elements = null;
    }

};
yox.themes.switcher.defaults = {
    keydownFrequency: 200, // The minimum interval to fire keydown events. Set to zero or less to disable this option
    scrollDuration: 500 // The time, in milliseconds, for scrolling animations, when a thumbnail should be brought into view
};

yox.themes.switcher.prototype = new yox.theme();
yox.themes.wall = function(data, options){
    var elements = {},
        containerWidth,
        self = this,
        isLoading, // Flag indicating whether new contents are currently being fetched
        loadedAllItems = false, // Flag indicating whether all the items have been loaded (all the possible items, after loading all pages)
        enlargeThumbnailQueue = [],
        enlargingThumbnails = 0,
        enlargeThumbnailsTimer = 100,
        concurrentEnlargingThumbnails = 3;

    this.name = "wall";

    var loadingClass = this.getThemeClass("loading"),
        thumbs = [],
        currentRowWidth = 0,
        throttledScrollIntoView = yox.utils.performance.throttle(function(element){
            yox.utils.dom.scrollIntoView(element, self.container, options.scrollAnimationDuration, options.scrollOffset);
        }, 300);

    this.config = {
        thumbnails: {
            createThumbnail: function(itemIndex, item, totalItems){
                var thumbnail = document.createElement("a"),
                    thumbnailImg = document.createElement("img");

                var dimensions = { height: options.thumbnailsMaxHeight, width: Math.round(options.thumbnailsMaxHeight / item.ratio) };
                thumbnail.dimensions = dimensions;

                thumbnailImg.addEventListener("load", onImageLoad, false);

                thumbnailImg.src = item.thumbnail.src;
                thumbnail.appendChild(thumbnailImg);
                thumbnail.setAttribute("href", item.url);
                thumbnail.style.display = "none";

                calculateDimensions(thumbnail, itemIndex, totalItems);
                return thumbnail;
            },
            events: {
                beforeSelect: function(e){
                    if (options.scrollToElementOnSelect && e.newItem){
                        throttledScrollIntoView(e.newItem.thumbnail.element);
                    }
                },
                create: onScroll
            }
        }
    };

    // This function does the resizing that creates the wall effect:
    function calculateDimensions(thumbnail, index, totalThumbnailsCount, isUpdate){
        currentRowWidth += thumbnail.dimensions.width;
        thumbs.push(thumbnail);

        var isLastThumbnail = index === totalThumbnailsCount - 1,
            totalBordersWidth = (thumbs.length - 1) * options.borderWidth,
            isFullRow = currentRowWidth + totalBordersWidth >= containerWidth;

        // Gathered enough thumbnails to fill the current row:
        if (isFullRow || isLastThumbnail){

            var rowAspectRatio = (containerWidth - totalBordersWidth) / currentRowWidth,
                rowHeight = Math.round(thumbs[0].dimensions.height * rowAspectRatio),
                setWidth = true,
                showThumbnail = isFullRow || isLastThumbnail,
                finalRowWidth = totalBordersWidth;

            if (rowHeight > options.thumbnailsMaxHeight){
                rowHeight = options.thumbnailsMaxHeight;
                setWidth = false;
            }

            for(var i=0, thumb; thumb = thumbs[i]; i++){
                var width = Math.floor(thumb.dimensions.width * rowAspectRatio);
                finalRowWidth += width;

                thumb.style.height = rowHeight + "px";
                if (setWidth)
                    thumb.style.width = width + "px";
                else if (isLastThumbnail)
                    thumb.style.width = thumb.dimensions.width + "px";

                if (showThumbnail)
                    thumb.style.removeProperty("display");
            }

            // Due to the rounding in image widths, a small fix is required to arrange the thumbnails pixel-perfectly:
            for(var thumbIndex = thumbs.length; thumbIndex-- && finalRowWidth < containerWidth; finalRowWidth++){
                thumb = thumbs[thumbIndex];
                thumb.style.width = (parseInt(thumb.style.width, 10) + 1) + "px";
            }

            // Finally, the last thumbnail in the row's right margin is removed and the row is closed:
            if (!isLastThumbnail || isFullRow){
                thumbnail.style.marginRight = "0";
                thumbs = [];
                currentRowWidth = 0;
            }
        }
        else if (isUpdate)
            thumbnail.style.removeProperty("margin-right");

    }

    function updateThumbnails(){
        var thumbnails = self.modules.thumbnails.thumbnails;
        if (!thumbnails)
            return;

        var thumbnailsCount = thumbnails.length;

        for(var i=0, thumbnail; thumbnail = thumbnails[i]; i++){
            calculateDimensions(thumbnail, i, thumbnailsCount, true);
        }
    }

    var dataSource,
        totalItems;

    setDataSource(data.getData());

    // Used for infinite scrolling to get the next batch of items.
    // TODO: Try to make this part of the data module itself, so other themes may benefit.
    function loadMoreItems(){
        if (!dataSource)
            return false;

        dataSource.offset = data.countItems() + 1;
        data.addSources([ dataSource ]);
    }

    function setDataSource(loadedDataSources){
        if (loadedDataSources.length){
            var loadedDataSource = loadedDataSources[0];
            if (!dataSource){
                dataSource = loadedDataSource.source;
                totalItems = loadedDataSource.totalItems;
                dataSource.type = loadedDataSource.sourceType;
            }

            if (data.countItems() >= totalItems){
                self.triggerEvent("loadedAllItems");
            }
        }
        isLoading = false;
        $(self.container).removeClass(loadingClass);
    }

    function onImageLoad(e){
        if (enlargingThumbnails < concurrentEnlargingThumbnails){
            enlargingThumbnails++;
            this.style.visibility = "visible";
            this.style.setProperty(yox.utils.browser.getCssPrefix() + "transform", "scale(1)");
            this.removeEventListener("load", onImageLoad, false);
            setTimeout(function(){
                enlargingThumbnails--;
                if (enlargeThumbnailQueue.length){
                    onImageLoad.call(enlargeThumbnailQueue.shift());
                }
            }, enlargeThumbnailsTimer);
        }
        else{
            enlargeThumbnailQueue.push(this);
        }
    }

    function loadItems(){
        isLoading = true;
        $(self.container).addClass(loadingClass);
        loadMoreItems();
    }

    // Used for infinite scrolling:
    function onScroll(){
        // When reaching the scroll limit, check for new contents:
        if (!isLoading && elements.scrollElementForMeasure.scrollTop >= elements.scrollElementForMeasure.scrollHeight - elements.scrollElementForMeasure.clientHeight - options.thumbnailsMaxHeight){
            loadItems();
        }
    }

    data.addEventListener("loadSources", setDataSource);
    data.addEventListener("clear", function(){
        dataSource = null;
        thumbs = [];
        currentRowWidth = 0;
        if (loadedAllItems){
            loadedAllItems = false;
            elements.scrollElement.addEventListener("scroll", onScroll, false);
            data.addEventListener("loadSources", setDataSource);
            $(self.container).removeClass(self.getThemeClass("loadedAll"));
        }
    });

    this.create = function(container){
        this.container = container;
        var containerClass = this.getThemeClass();

        function getContainerWidth(){
            containerWidth = container.clientWidth - options.padding * 2;
        }

        $(container).addClass(containerClass).addClass(loadingClass);
        elements.wall = document.createElement("div");
        elements.wall.className = this.getThemeClass("thumbnails") + " yoxthumbnails";
        elements.wall.style.padding = options.padding + "px";
        container.appendChild(elements.wall);
        getContainerWidth();

        var styleEl = document.createElement("style"),
            thumbnailStyle = [
                "margin-right: " + options.borderWidth + "px",
                "margin-bottom: " + options.borderWidth + "px"
            ];

        styleEl.innerHTML = " ." + containerClass + " a[data-yoxthumbindex]{ " + thumbnailStyle.join("; ") + " }";
        document.getElementsByTagName("head")[0].appendChild(styleEl);

        $(window).on("resize", yox.utils.performance.throttle(function(){
            $(container).addClass(self.getThemeClass("resizing"));
            getContainerWidth();
            thumbs = [];
            currentRowWidth = 0;
            updateThumbnails();
            setTimeout(function(){
                $(self.container).removeClass(self.getThemeClass("resizing"));
            }, 5);
        }, 50));

        elements.scrollElement = container === document.body ? document : container;
        elements.scrollElementForMeasure = container;

        // All non-webkit browsers measure scrollTop for the body element in the HTML element rather than the document (Firefox 13, IE9, Opera 11.62):
        if (!$.browser.webkit && container === document.body)
            elements.scrollElementForMeasure = document.documentElement;

        elements.loader = document.createElement("div");
        elements.loader.className = this.getThemeClass("loader");
        elements.loader.style.paddingBottom = (options.borderWidth + options.padding) + "px";

        container.appendChild(elements.loader);

        elements.scrollElement.addEventListener("scroll", onScroll, false);

        self.addEventListener("loadedAllItems", function(){
            elements.scrollElement.removeEventListener("scroll", onScroll, false);
            data.removeEventListener("loadSources", setDataSource);
            loadedAllItems = true;
            $(container).addClass(self.getThemeClass("loadedAll"));
        });
    };
}

yox.themes.wall.defaults = {
    borderWidth: 7, // The size, in pixels, of the space between thumbnails
    loadItemsOnScroll: false, // Whether to get more results from the data source when scrolling down
    padding: 10, // The padding arround the thumbnails (padding for the element that contains all the thumbnails)
    scrollAnimationDuration: 500, // The time, in milliseconds, for the scroll animation, when a thumbnail is brought into view.
    scrollOffset: 60, // When scrolling a thumbnail into view, this number of pixels will be added to the scroll distance, so the thumbnail isn't at the very limit of the visible area.
    scrollToElementOnSelect: false, // If set to true, the theme's container will be scrolled to the selected thumbnail when its item is selected
    thumbnailsMaxHeight: 200 // The maximum height allowed for each thumbnail
};

yox.themes.wall.prototype = new yox.theme();