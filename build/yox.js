function Yox(container, options){
    this.container = container;
    this.options = options || {};

    this.init();
}

Yox.prototype = {
    init: function(){
        if (this.options.theme){
            var themeConstructor = yox.themes[this.options.theme],
                data;

            if (this.options.data){
                if (this.options.data instanceof yox.data)
                    data = this.options.data;
                else
                    data = new yox.data(this.options.data);
            }

            if (!themeConstructor)
                throw new Error("Invalid theme, '" + this.options.theme + "' does not exist.");

            var theme = new themeConstructor(data, $.extend({}, themeConstructor.defaults, this.options));
            if (!(theme instanceof yox.theme))
                throw new Error("Invalid theme, '" + this.options.theme + "' is not an instance of yox.theme.");

            theme.init(this.container, data, this.options);

            $.extend(this, {
                addEventListener: theme.addEventListener,
                destroy: function(){
                    for(var moduleName in this.modules){
                        var module = this.modules[moduleName],
                            moduleDestroy = module.destroy;

                        moduleDestroy && moduleDestroy.call(module);
                    }
                    theme.destroy.call(theme);
                },
                modules: theme.modules,
                triggerEvent: theme.triggerEvent,
                data: data
            });
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
        isElement: Object(HTMLElement) === HTMLElement
            ? function(el){ return el instanceof HTMLElement; }
            : Object(Element) === Element
                ? function(el){ return el instanceof Element; }
                : function(e){
                    return Object(el) === el && el.nodeType === 1 && typeof(el.nodeName) === "string";
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
yox.eventsHandler = function(){
    var namespaces = {
        _default: {}
    };

    this.triggerEvent = function(eventName, data, id){
        var eventNameParts = eventName.split("."),
            eventType = eventNameParts[0],
            namespaceName = eventNameParts[1];

        if (namespaceName){
            var namespace = namespaces[namespaceName];
            if (namespace){
                var namespaceEvents = namespace[eventType];
                if (namespaceEvents){
                    for(var i=0, eventHandler; eventHandler = namespaceEvents[i]; i++){
                        eventHandler.call(this, data, id);
                    }
                }
            }
        }

        var noNamespacedEvents = namespaces._default[eventType];
        if (noNamespacedEvents){
            for(var i=0, eventHandler; eventHandler = noNamespacedEvents[i]; i++){
                eventHandler.call(this, data, id);
            }
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
yox.data = function(options){
    this.data = [];
    this.options = $.extend(true, {}, this.defaults, options);

    var eventsHandler = this.options.eventsHandler || new yox.eventsHandler();
    $.extend(this, eventsHandler);

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
    addSources: function(sourceArr){
        var deferredPromises = [],
            sources = sourceArr instanceof Array ? sourceArr : arguments,
            self = this;

        this.triggerEvent("loadSourcesStart", sources);
        this.isLoading = true;

        for(var i=0; i < sources.length; i++){
            var promise = this.loadSource(sources[i]);
            if (promise)
                deferredPromises.push(promise);
        }

        $.when.apply(this, deferredPromises).done(function () {
            for(var i=0; i < arguments.length; i++)
                self.data.push(arguments[i]);

            self.isLoading = false;
            self.triggerEvent("loadSources", Array.prototype.slice.call(arguments, 0));
        });
    },
    clear: function(){
        this.triggerEvent("removeSources", this.data);
        this.triggerEvent("clear");
        this.data = [];
    },
    countItems: function(){
        var totalItemsCount = 0;
        for(var i=this.data.length; i--;){
            totalItemsCount += this.data[i].items.length;
        }

        return totalItemsCount;
    },
    findDataSource: function(sourceData){
        for(var dataSourceName in yox.data.sources){
            var dataSource = yox.data.sources[dataSourceName];

            if (dataSource.match(sourceData))
                return dataSource;
        }
    },
    getData: function(){ return this.data; },
    getDataSource: function(dataSourceName){
        return yox.data.sources[dataSourceName];
    },
    loadSource: function(source){
        var dataSource = source.type ? this.getDataSource(source.type) : this.findDataSource(source),
            self = this;

        if (!dataSource)
            return;

        var dfd = $.Deferred(),
            onLoadSource = function(sourceData){
                self.store(source, sourceData);
                dfd.resolve(sourceData);
            },
            savedSourceData = this.store(source);

        if (savedSourceData)
            onLoadSource(savedSourceData);
        else{
            dataSource.load(source, onLoadSource,
                function(error){
                    dfd.reject();
                }
            )
        }
        return dfd;
    },
    source: function(sources){
        this.clear();
        this.addSources.apply(this, arguments);
    },
    store: function(source, data){
        if (!this.options.cache || !window.localStorage || !source.url)
            return false;

        var keyName = this.namespace + ".source." + source.url;

        if (!data){
            var item = window.localStorage.getItem(keyName);
            if (item)
                return JSON.parse(item);

            return null;
        }
        window.localStorage.setItem(keyName, JSON.stringify(data));
    }
};
yox.data.source = function(){};
yox.data.sources = {}; // Will hold the transition types

yox.data.source.prototype = {
    load: function(source, callback){ throw new Error("'load' function isn't implemented for this data source."); },
    match: function(source){ throw new Error("'match' function isn't implemented for this data source."); }
};
yox.data.sources.element = (function(){
	var dataSourceName = "element";

    var isElement = Object(HTMLElement) === HTMLElement
        ? function(el){ return el instanceof HTMLElement; }
        : Object(Element) === Element
            ? function(el){ return el instanceof Element; }
            : function(e){
                return Object(el) === el && el.nodeType === 1 && typeof(el.nodeName) === "string";
            };

	return {
		name: dataSourceName,
		match: function(source){
            return isElement(source) || source instanceof jQuery || (source.element && isElement(source.element) || source.element instanceof jQuery);
        },
		load: function(source, callback){
			var imagesData = [],
                element = source instanceof HTMLElement ? source : source.element;

			$("a:has('img')", element).each(function(){
				var thumbnailImg = $("img:first", this)[0];
				
				imagesData.push({
					thumbnail: {
						element: this,
						image: thumbnailImg,
						src: thumbnailImg.src
					},
					url: this.href,
					title: this.title || thumbnailImg.title,
					type: "image"
				});
			});

            var data = {
                items: imagesData,
                source: source,
                sourceType: dataSourceName,
                createThumbnails: false
            };

			if (callback)
				callback(data);
				
			return data;
		}
	};
}());
yox.data.sources.files = (function(){
    var dataSourceName = "files",
        createObjectURL;

    if (window.URL && window.URL.createObjectURL)
        createObjectURL = function(file){ return window.URL.createObjectURL(file); };
    else if (window.webkitURL && window.webkitURL.createObjectURL){
        createObjectURL = function(file){
            return window.webkitURL.createObjectURL(file);
        }
    }
    else
        createObjectURL = function(file){ return null; }

    return {
        name: dataSourceName,
        match: function(source){
            return false;
        },
        load: function(source, callback){
            if (!callback)
                return false;

            var items = [];
            for(var i=0, file; file = source.files[i]; i++){
                if (/^image\//.test(file.type)){
                    var url = createObjectURL(file);
                    items.push({
                        url: url,
                        type: "image",
                        title: file.name || file.fileName,
                        thumbnail: {
                            src: url
                        }
                    });
                }
            }

            var data = {
                items: items,
                source: source,
                sourceType: dataSourceName,
                createThumbnails: true
            };

            callback(data);
        }
    };
})();
yox.data.sources.flickr = (function($){
    var dataSourceName = "flickr",
        flickrUrl = "http://www.flickr.com/",
        flickrApiUrl = "http://api.flickr.com/services/rest/",
        apiKey = "9a220a98ef188519fb87b08d310ebdbe", // yox.js API key @flickr
        flickrUserIdRegex = /\d+@N\d+/,
        flickrUrlRegex = /^http:\/\/(?:www\.)?flickr\.com\/(\w+)\/(?:([^\/]+)\/(?:(\w+)\/?(?:([^\/]+)\/?)?)?)?(?:\?(.*))?/,
        fixedOptions = {
            api_key: apiKey,
            format: 'json'
        },
        defaults = {
            imageSize: "medium", // medium/large/original, for large, your images in Flickr must be 1280 in width or more. For original, you must allow originals to be downloaded
            thumbsize: "thumbnail", // smallSquare (75x75) / thumbnail (100) / small (240) / largeSquare (150x150) / medium (500) / large (1024) / original
            setThumbnail: true,
            setSinglePhotosetThumbnails: true,
            setTitle: true,
            method: 'flickr.photosets.getList',
            extras: 'description'
        };

    var dataTypes = {
        sets: function(source, id){
            return {
                method: id || source.photoset_id ? "flickr.photosets.getPhotos" : "flickr.photosets.getList",
                photoset_id: id
            };
        },
        galleries: function(source, id){
            return {
                method: id ? "flickr.galleries.getPhotos" : "flickr.galleries.getList",
                gallery_id: id
            };
        },
        collections: function(source, id){
            return {
                method: "flickr.collections.getTree",
                collection_id: id
            };
        },
        "default": function(){
            return {
                method: "flickr.photos.search"
            };
        }
    };

    var flickrImageSizes = {
            smallSquare : "_s", // 75x75
            thumbnail : "_t", // 100px
            small : "_m", // 240px
            medium : "", // 500px
            large : "_b", // 1024px
            original : "_o"
        };
    function getImageUrl(photoData, size){
        return "http://farm" + photoData.farm + ".static.flickr.com/" + photoData.server + "/" + (photoData.primary || photoData.id) + "_" + photoData.secret + size + ".jpg";
    }

    function getPhotosetUrl(userid, photosetId){
         return prepareUrl(flickrUrl + "photos/" + userid + "/sets/" + photosetId + "/");
    }

    // makes sure a string can be used as a Flickr url
    function prepareUrl(url){
        return url.replace(/\s/g, "_");
    }

    function getImagesDataFromJson(data, datasourceOptions){
        var isPhotos = data.photoset || data.photos,
            photos,
            imagesData = [],
            inSet = data.photoset ? "/in/set-" + data.photoset.id : "";

        if (isPhotos)
            photos = data.photoset ? data.photoset.photo : data.photos.photo;
        else if (data.photosets)
            photos = data.photosets.photoset;
        else if (data.collections)
            photos = data.collections.collection[0].set;

        // Photos:
        if (photos)
        {
            var thumbSuffix = flickrImageSizes[datasourceOptions.thumbsize],
                imageSuffix = flickrImageSizes[datasourceOptions.imageSize];

            $.each(photos, function(i, photo){
                var imageData = {
                    thumbnail: {
                        src : getImageUrl(photo, thumbSuffix)
                    },
                    link: prepareUrl(flickrUrl + "photos/" + (photo.owner || datasourceOptions.user_id) + "/" + photo.id + inSet),
                    url: getImageUrl(photo, imageSuffix),
                    title: isPhotos ? photo.title : photo.title._content,
                    type: "image",
                    description: photo.description ? photo.description._content : undefined
                };

                if (!isPhotos)
                    imageData.data = { photoset_id: photo.id };

                imagesData.push(imageData);
            });
        }

        return imagesData;
    }

    return {
        name: dataSourceName,
        defaults: defaults,
        match: function(source){
            return source.url && flickrUrlRegex.test(source.url);
        },
        load: function(source, callback){
            var requireLookup = true,
                urlMatch = source.url && source.url.match(flickrUrlRegex),
                queryData,
                fromDataUrl = {},
                lookupData = {
                    method: "flickr.urls.lookupUser",
                    onData: function(data)
                    {
                        return {
                            user_id: data.user.id,
                            username: data.user.username._content
                        };
                    }
                };

            function getData(){
                $.ajax({
                    url: flickrApiUrl,
                    dataType: 'jsonp',
                    data: datasourceOptions,
                    jsonpCallback: "jsonFlickrApi",
                    success: function(data)
                    {
                        var returnData = {
                            source: source,
                            sourceType: dataSourceName,
                            createThumbnails: true
                        };

                        returnData.items = getImagesDataFromJson(data, datasourceOptions);

                        if (data.photosets || data.collections)
                            $.extend(returnData, {
                                createGroups: true
                            });

                        if (returnData.items.length > 0 && ((datasourceOptions.setThumbnail && !datasourceOptions.setSinglePhotosetThumbnails) || source.isSingleLink))
                        {
                            $.extend(returnData, {
                                isGroup: true,
                                link: getPhotosetUrl(data.photoset.owner, data.photoset.id),
                                thumbnailSrc: source.isSingleLink ? undefined : getImageUrl(data.photoset.photo[0], flickrImageSizes[datasourceOptions.thumbsize]),
                                title: "None"
                            });
                        }

                        if (callback)
                            callback(returnData);
                    },
                    error : function(xOptions, textStatus){
                        if (options.onLoadError)
                            options.onLoadError("Flickr plugin encountered an error while retrieving data");
                    }
                });
            }

            if (source.url && !urlMatch)
                return false;

            if (urlMatch){
                var urlData = {
                    inputType: urlMatch[1],
                    user: urlMatch[2],
                    dataType: urlMatch[3],
                    id: urlMatch[4],
                    query: urlMatch[5]

                };

                if (urlData.query)
                {
                    queryData = yox.utils.url.queryToJson(urlData.query);
                    $.extend(fromDataUrl, queryData);
                }

                if (urlData.inputType == "search"){
                    fromDataUrl.method = "flickr.photos.search";
                    fromDataUrl.text = queryData.q;
                    if (queryData.w)
                    {
                        queryData.w = queryData.w.replace("%40", "@");
                        if (queryData.w.match(flickrUserIdRegex))
                            fromDataUrl.user_id = queryData.w;
                    }
                    if (!queryData || !queryData.sort)
                        fromDataUrl.sort = "relevance";

                    requireLookup = false;
                }
                else{
                    if (urlData.dataType){
                        $.extend(fromDataUrl, dataTypes[urlData.dataType || "default"](source, urlData.id));

                        if (urlData.dataType === "galleries"){
                            if (urlData.id){
                                requireLookup = true;
                                lookupData = {
                                    method: "flickr.urls.lookupGallery",
                                    onData: function(data)
                                    {
                                        return {
                                            gallery_id: data.gallery.id,
                                            title: data.gallery.title
                                        };
                                    }
                                };
                            }
                        }
                    }
                    else
                        fromDataUrl.method = "flickr.people.getPublicPhotos";

                    fromDataUrl.username = urlData.user;
                    fromDataUrl.type = urlData.dataType;
                }
            }

            var datasourceOptions = jQuery.extend({}, defaults, fromDataUrl,source, fixedOptions);

            datasourceOptions.media = "photos";
            if (datasourceOptions.user && datasourceOptions.photoset_id)
                datasourceOptions.method = "flickr.photosets.getPhotos";

            var screenSize = screen.width > screen.height ? screen.width : screen.height;

            // Save resources for smaller screens:
            if (!datasourceOptions.imageSize || (screenSize.width <= 800 && datasourceOptions.imageSize != "medium"))
                datasourceOptions.imageSize = "medium";

            if (requireLookup){
                $.ajax({
                    url: flickrApiUrl,
                    dataType: 'jsonp',
                    data: $.extend({ url: source.url, method: lookupData.method }, fixedOptions),
                    jsonpCallback: "jsonFlickrApi",
                    success: function(data)
                    {
                        $.extend(datasourceOptions, lookupData.onData(data));
                        getData();
                    }
                });
            }
            else
                getData();
        }
    };
})(jQuery);
yox.data.sources.html = (function(){
    var dataSourceName = "html";

    return {
        name: dataSourceName,
        match: function(source){
            return yox.utils.dom.isElement(source) || source instanceof jQuery || (source.element && yox.utils.dom.isElement(source.element) || source.element instanceof jQuery);
        },
        load: function(source, callback){
            var items = [];

            if (source.selector && source.element){
                var elements = source.element.querySelectorAll(source.selector);
                for(var i=0, count=elements.length; i < count; i++){
                    var el = elements[i];
                    items.push({
                        element: el,
                        name: el.id,
                        type: "html",
                        title: el.title || el.getAttribute("data-title"),
                        width: el.clientWidth,
                        height: el.clientHeight,
                        thumbnail: {
                            src: el.getAttribute("data-thumbnail"),
                            className: source.thumbnailsClass || "yox-thumbnail"
                        }
                    });
                    el.parentNode.removeChild(el);
                }
            }
            else if (source.items){
                items = Array.prototype.slice.call(source.items, 0);
                for(var i=0, count = items.length; i < count; i++){
                    items[i].type = "html";
                }
            }

            var data = {
                items: items,
                source: source,
                sourceType: dataSourceName,
                createThumbnails: true
            };

            callback(data);
        }
    };
})();
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
            fields: "category(@term),entry(category(@term)),title,entry(summary),entry(media:group(media:thumbnail(@url))),entry(media:group(media:content(@url))),entry(media:group(media:content(@width))),entry(media:group(media:content(@height))),entry(link[@rel='alternate'](@href)),entry(media:group(media:credit))"
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
                data.fields += ",entry(title),entry(gphoto:numphotos),entry(gphoto:name),entry(link[@rel='alternate']),author,entry(summary)";

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
                    author: image.media$group.media$credit[0].$t
                };

            if (isAlbum){
                itemData.data = { album: { name: image.title.$t, imageCount: image.gphoto$numphotos.$t, description: image.summary.$t }};
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
                        sourceType: dataSourceName
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
yox.data.sources.youtube = (function($){
	var dataSourceName = "youtube",
        youtubeRegex = /^http:\/\/(?:www\.)?youtube.com\//,
        ytRegex = {
            singleVideo: /^http:\/\/(?:www\.)?youtube.com\/watch\?v=([^\&]+)(.*)?/,
            playlist: /^http:\/\/(?:www\.)?youtube.com\/(?:view_play_list|my_playlists)\?p=([^\&]+)(.*)?/,
            user: /^http:\/\/(?:www\.)?youtube.com\/user\/([^\?]+)(?:\?(.*))?/,
            search: /^http:\/\/(?:www\.)?youtube.com\/results\?(.*)/
        };
        apiUrl = "http://gdata.youtube.com/feeds/api/videos",
        fixedOptions = {
            v: 2,
            format: 5,
            alt: "jsonc"
        },
        defaults = {
            hqThumbnails: false,
            aspectRatio: "auto"
        };

    function getDimensionsCalc(datasourceOptions){
        var widescreenDimensions,
            defaultDimensions,
            widescreenAspectRatio = 16/9,
            defaultIsWidescreen = false;

        if (!datasourceOptions.width && !datasourceOptions.height)
            datasourceOptions.width = 720;

        if ((datasourceOptions.height && !datasourceOptions.width) || (datasourceOptions.width && !datasourceOptions.height)){
            if (typeof(datasourceOptions.aspectRatio) === "string"){
                if (datasourceOptions.aspectRatio === "auto")
                    datasourceOptions.aspectRatio = 4/3;
                else{
                    var ratioValues = datasourceOptions.aspectRatio.split(":");
                    datasourceOptions.aspectRatio = parseInt(ratioValues[0], 10) / parseInt(ratioValues[1], 10);
                }
            }

            defaultIsWidescreen = datasourceOptions.aspectRatio === 16/9;
            if (datasourceOptions.height){
                widescreenDimensions = { height: datasourceOptions.height, width: datasourceOptions.height * widescreenAspectRatio };
                if (!defaultIsWidescreen)
                    defaultDimensions = { height: datasourceOptions.height, width: datasourceOptions.height * datasourceOptions.aspectRatio };
            }
            else{
                widescreenDimensions = { width: datasourceOptions.width, height: datasourceOptions.width / widescreenAspectRatio };
                if (!defaultIsWidescreen)
                    defaultDimensions = { width: datasourceOptions.width, height: datasourceOptions.width / datasourceOptions.aspectRatio };
            }

        }

        var getDimensions = function(isWidescreen){
            return isWidescreen ? widescreenDimensions : defaultDimensions;
        }

        return getDimensions;
    }
    
    function isFiltered(tags, options){
        if (!options.filter || !tags)
            return false;

        var tagsStr = tags.join(","),
            result = options.negativeFilterRegex && options.negativeFilterRegex.test(tagsStr);
            
        if (!result)
            result = options.positiveFilterRegex && !options.positiveFilterRegex.test(tagsStr);
        
        return result;
    }
    function getEmbedObject(embedUrl){
        var videoElement = document.createElement("object");
        videoElement.setAttribute("width", "100%");
        videoElement.setAttribute("height", "100%");
        videoElement.innerHTML = "<param name='movie' value='" + embedUrl + "'</param><param name='allowFullScreen' value='true'></param><param name='wmode' value='transparent'></param><param name='allowScriptAccess' value='always'></param><embed src='" + embedUrl + "' type='application/x-shockwave-flash' allowfullscreen='true' allowscriptaccess='always' wmode='transparent' width='100%' height='100%'></embed>"
        return videoElement;
    }
    getEmbedObject.id = 1;

    function formatItem(ytVideoData, options){
        var item = {
            type: "html",
            thumbnail: {
                src: ytVideoData.thumbnail[options.hqThumbnails ? "hqDefault" : "sqDefault"]
            },
            link: ytVideoData.player["default"],
            "element": getEmbedObject(ytVideoData.content["5"] + "&fs=1&hd=1&enablejsapi=1&playerapiid=ytplayer" + getEmbedObject.id++ + "&version=3"),
            title: ytVideoData.title,
            id: ytVideoData.id,
            description: ytVideoData.description,
            duration: ytVideoData.duration
        };

        $.extend(item, options.getDimensions(ytVideoData.aspectRatio && ytVideoData.aspectRatio === "widescreen"));
        if (item.width && item.height)
            item.ratio = item.height / item.width;

        return item;
    }
    
    function getVideosDataFromJson(items, options)
    {
        var videosData = [];

        if (options.filter){
            var negativeFilters = options.filter.match(/!([^,]+)/g),
                positiveFilters = options.filter.match(/(,|^)[^!,]([^,]+)/g),
                negativeRegex = negativeFilters ? negativeFilters.join("|").replace(/^!/, "").replace(/\|!/g, "|") : null,
                positiveRegex = positiveFilters ? positiveFilters.join("|").replace(/\|,/g, "|") : null;

            if (negativeRegex)
                options.negativeFilterRegex = new RegExp("(?:^|,)(" + decodeURI()(negativeRegex) + ")(?:,|$)");

            if (positiveRegex)
                options.positiveFilterRegex = new RegExp("(?:^|,)(" + decodeURI()(positiveRegex) + ")(?:,|$)");
        }

        $.each(items, function(i, video){
            if (options.feedType === "playlist")
                video = video.video;

            if (!isFiltered(video.tags, options))
                videosData.push(formatItem(video, options));
        });

        return videosData;
    }
    function onData(source, options, ytData, callback){
        var returnData = {
            source: source,
            sourceType: dataSourceName,
            createThumbnails: true
        };

        if ((options.isSingleVideo && !ytData.data) || (!options.isSingleVideo && (!ytData.data.items || ytData.data.items.length === 0)))
        {
            returnData.items = [];
            callback(returnData);
            return;
        }

        returnData.items = getVideosDataFromJson(options.isSingleVideo ? [ ytData.data ] : ytData.data.items, options);

        if (!options.isSingleVideo){
            var dataTitle = ytData.data.title;
            if (dataTitle)
                returnData.title = dataTitle;
        }

        callback(returnData);
    }

	return {
		name: dataSourceName,
		match: function(source){ return source.url && youtubeRegex.test(source.url); },
		load: function(source, callback){
            if (!callback)
                throw new Error("Can't load YouTube data, no callback provided.");

            var options = $.extend({}, defaults, source, fixedOptions);

            if (source.url){
                var urlMatch;
                for (var regexType in ytRegex){
                    urlMatch = source.url.match(ytRegex[regexType]);
                    if (urlMatch)
                    {
                        options.feedType = regexType;
                        break;
                    }
                }

                if (urlMatch){
                    switch(options.feedType){
                        case "singleVideo":
                            options.isSingleVideo = true;
                            options.url += "/" + urlMatch[1];
                            break;
                        case "playlist":
                            options.url = "http://gdata.youtube.com/feeds/api/playlists/" + urlMatch[1];
                            break;
                        case "user":
                            options.url = "http://gdata.youtube.com/feeds/api/users/" + urlMatch[1] + "/uploads";
                            break;
                        case "search":
                            options.url = apiUrl;
                            break;
                        default:
                            break;
                    }

                    var queryData = yox.utils.url.queryToJson(urlMatch.length == 2 ? urlMatch[1] : urlMatch[2]);
                    if (queryData){
                        if (queryData.search_query){
                            queryData.q = queryData.search_query;
                            delete queryData.search_query;
                        }
                        $.extend(options, queryData);
                    }
                }
            }

            $.ajax({
                url: options.url,
                dataType: 'jsonp',
                data: options,
                async: false,
                jsonpCallback: "callback",
                success: function(ytData)
                {
                    options.getDimensions = getDimensionsCalc(options);
                    onData(source, options, ytData, callback);
                },
                error : function(xOptions, textStatus){
                    if (options.onLoadError)
                        options.onLoadError("YouTube plugin encountered an error while retrieving data");
                }
            });
	    }
    };
})(jQuery);
yox.statistics = function(container, options){
    if (arguments.length === 1){
        options = container;
        container = null;
    }

    this.reporter = new yox.statistics.reporters[options.reporter || yox.statistics.defaults.reporter](options);
    this.category = options.category || "yox.js";

    var eventsHandler = options.eventsHandler || new yox.eventsHandler();
    $.extend(this, eventsHandler);

    if (options.events){
        for(var eventName in options.events)
            this.addEventListener(eventName, options.events[eventName]);
    }
};
yox.statistics.prototype = {
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
                    this.elements.$container.toggleClass("yoxscroll_scrollEnabled", this.enableDrag);
                }

                if (this.options.centerContentsIfNotScrollable && !enableDrag){
                    this.elements.$slider.css({ transition: "none", left: this.minPosition / 2 });
                }
            }
        };
    })();

})(jQuery);
(function($, undefined){
    yox.thumbnails = function(container, options){
        var self = this;
        
        this.container = container instanceof jQuery ? container[0] : container;
        this.options = $.extend(true, {}, this.defaults, options);
        this.itemCount = 0;

        var eventsHandler = this.options.eventsHandler || new yox.eventsHandler();
        $.extend(this, eventsHandler);

        if (this.options.events){
            for(var eventName in this.options.events)
                this.addEventListener(eventName, this.options.events[eventName]);
        }
        this.options.data && this.addDataSources(this.options.data);

        if (this.options.handleClick !== false){
            function onClick(e){
                var index = this.getAttribute("data-yoxthumbIndex");
                e.preventDefault();
                self.triggerEvent("click", { originalEvent: e, index: index, target: this });
                self.select(index);
            }
            $(this.container).on("click", "." + self.options.thumbnailClass, onClick);
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
                            thumbnailEl = this.createThumbnail(item);

                        thumbnailEl.setAttribute("data-yoxthumbindex", this.itemCount);
                        item.thumbnail.element = thumbnailEl;
                        item.thumbnail.generated = true;

                        var thumbnailImages = thumbnailEl.getElementsByTagName("img");
                        if (thumbnailImages.length)
                            item.thumbnail.image = thumbnailImages[0];

                        documentFragment.appendChild(thumbnailEl);
                    }

                    this.container.appendChild(documentFragment);
                    this.thumbnails = this.thumbnails.add($(this.container).children("." + this.options.thumbnailClass));
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
        },
        select: function(itemIndex){
            this.currentSelectedThumbnail && this.currentSelectedThumbnail.removeClass(this.options.selectedThumbnailClass);
            if (this.thumbnails)
                this.currentSelectedThumbnail = this.thumbnails.eq(itemIndex).addClass(this.options.selectedThumbnailClass);
        },
        template: "<a class='${$item.options.thumbnailClass}' href='${link || url}'{{if $item.options.renderThumbnailsTitle}} title='title'{{/if}} data-yoxthumbIndex='${$item.getIndex()}'><img src='${thumbnail.src}' alt='${title}' /></a>"
    };

    window.yox.thumbnails = yox.thumbnails;
})(jQuery);
(function($){
    yox.utils.css.addJqueryCssHooks(["transition", "transitionDuration", "transform", "transformStyle", "backfaceVisibility", "perspective"]);

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
        var dataSources = {};

        var keyboard = {
			map: {
	            40: 'down',
	            35: 'end',
	            13: 'enter',
	            36: 'home',
	            37: 'left',
	            39: 'right',
	            32: 'space',
	            38: 'up',
	            72: 'h',
	            27: 'escape'
			},
			onKeyDown: function(e){
                var view = e.data.view,
                    pK = keyboard.map[e.keyCode],
                    calledFunction = view[view.options.keyPress[pK]];

                if (calledFunction)
                {
                    e.preventDefault();
                    calledFunction.call(view);
                    return false;
                }

				return true;
			}
		};

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

            if (view.options.lightbox){
                elements.$background = $('<div class="yoxviewBackground"></div>').appendTo(document.body);
                elements.$background.on("click",
                    function(e){
                        view.triggerEvent("backgroundClick", e);
                    }
                );
            }
            else if (view.$container.css("position") === "static")
                view.$container.css("position", "relative");

            $.extend(view, {
                getPosition: yox.utils.dimensions.resize[view.options.resizeMode],
                elements: elements
            });

            setTransition.call(view, view.options.transition);
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
                    this.transition.transition.call(this, { position: position, index: item.id - 1 });
                    this.triggerEvent("select", item);
                }
            },
            image: (function(){
                function onImageLoad(e){
                    this.loading = false;
                    var view = e instanceof yox.view ? e : e.data.view;
                    if (view.currentItem.url !== this.src){
                        return false;
                    }

                    var item = view.currentItem,
                        position = view.getPosition(item, view.containerDimensions, view.options);

                    view.transition.transition.call(view, { position: position, index: item.id - 1 });
                    view.triggerEvent("select", item);
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
                    set: function(item, element){
                        element.loading = true;
                        if (element.src !== item.url){
                            element.src = "";
                            element.src = item.url;
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

            for(var i=originalNumberOfItems, count=view.items.length; i < count; i++){
                view.items[i].id = i + 1;
            }

            view.triggerEvent("load", { items: createItems, sources: sources });

            if (!view.initialized){
                view.initialized = true;
                view.triggerEvent("init");
            }
        }

        function setItem(item){
            if (item !== this.currentItem)
                return false;

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

            if (itemType.checkLoading && !element.loading){
                $panel = this.transition.getPanel(true);
                element = checkElementExists.call(this, $panel, item.type);
            }

            element.style.display = "block";
            itemType.set.call(this, item, element);
        }

        return {
            addDataSource: function(dataSource){
                if (dataSources[dataSource.name])
                    return false;

                dataSources[dataSource.name] = dataSource;
            },
            addItems: function(items){
                if (!items)
                    return false;

                if (!(items instanceof Array))
                    items = [items];

                loadSources.call(this, { items: items });
            },
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
            destroy: function(){
                this.triggerEvent("beforeDestroy");
                this.disableKeyboard();
                this.transition.destroy();
            },
            disableKeyboard: function(){ $(document).off("keydown.modules", keyboard.onKeyDown); },
            enableKeyboard: function(){	$(document).on("keydown.modules", { view: this }, keyboard.onKeyDown); },
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

                var eventsHandler = this.options.eventsHandler || new yox.eventsHandler();
                $.extend(this, eventsHandler);

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

                if (this.options.enableKeyboard)
                    this.enableKeyboard();

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
            last: function(){
				if (!this.currentItem)
					return false;

                this.selectItem(this.items.length - 1);

			},
            next: function(slideshow){
                if (!this.currentItem)
					return false;

                this.direction = 1;
				var nextItemId = this.currentItem.id === this.items.length ? 0 : this.currentItem.id;
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
				var prevItemId = this.currentItem.id === 1 ? this.items.length - 1 : this.currentItem.id - 2;
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

                if (currentItem && item.id === currentItem.id)
					return false;

                this.triggerEvent("beforeSelect", { newItem: item, oldItem: currentItem, data: data });

				this.currentItem = item;

                this.cache.withItem(item, this, function(loadedItem){
                    setItem.call(view, loadedItem);
                });

                return true;
            },
            unload: function(){
                // SOON
            },
            update: function(force){
                var self = this;
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
            enableKeyPresses: true, // If set to false, YoxView won't catch any keyboard press events. To change individual keys, use keyPress.
            enlarge: false, // Whether to enlarge images to fit the container
            keyPress: { left: "prev", right: "next", up: "prev", down: "next", escape: "close", home: "first", end: "last", enter: "toggleSlideshow" }, // Functions to apply on key presses
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
            lightbox: false, // If true, items should be opened as a lightbox, above the page. (NOT IMPLEMENTED YET)
            panelDimensions: { width: 1600, height: 1600 }, // Default width and height for panels which aren't images
            resizeMode: "fit", // The mode in which to resize the item in the container - 'fit' (shows the whole item, resized to fit inside the container) or 'fill' (fills the entire container).
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
yox.view.transitions.evaporate = function(){
    var panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        defaultTransitionTimeStr,
        currentItemIndex = 0,
        self = this,
        defaultTransition,
        translateZ = { min: "translateZ(-800px)", max: "translateZ(500px)" },
        hideTimeoutId;

    function setDefaultTransition(transitionDuration){
        defaultTransitionTime = transitionDuration;
        defaultTransitionTimeStr = transitionDuration + "ms";
        defaultTransition = yox.utils.browser.getCssPrefix() + "transform " + defaultTransitionTimeStr + " ease-out, opacity " + defaultTransitionTimeStr +" ease-out";
    }

    this.create = function($container){
        var view = this;
        self.$container = $container;
        $container.css("perspective", "800px");

        setDefaultTransition(this.options.transitionTime);

        panels = [];
        for(var i=0; i<2; i++){
            var $panel = $("<div>", { "class": "yoxviewImg" });
            $panel.css({
                position: "absolute",
                top: "50%", left: "50%",
                width: 0, height: 0,
                border: "solid 1px #666",
                transform: i ? "translateZ(-500px)" : "translateZ(0)" // The rotate(0) is for Firefox, which otherwise displays the backface (bug exists in Firefox 11)
            });

            $panel.attr("data-index", i);
            panels.push($panel.appendTo($container));
        }
    };

    this.destroy = function(){
        self.$container.css("perspective", "");
        for(var i=0; i < panels.length; i++){
            panels[i].remove();
        }
    };

    this.getCurrentPanel = function(){
        return panels[currentPanelIndex];
    };

    this.getPanel = function(item){
        currentPanelIndex = currentPanelIndex ? 0 : 1;
        return panels[currentPanelIndex];
    };

    this.transition = function(options){
        clearTimeout(hideTimeoutId);
        var $currentPanel = self.getCurrentPanel(),
            $previousPanel = panels[currentPanelIndex ? 0 : 1].show(),
            isBackwards = (options.index < currentItemIndex && !(currentItemIndex === this.items.length - 1 && options.index === 0 )) ||
                    options.index === this.items.length - 1 && !currentItemIndex;

        $currentPanel.css($.extend(options.position, {
            display: "block",
            transform: isBackwards ?  translateZ.max : translateZ.min,
            transition: "none",
            zIndex: isBackwards ? 3 : 1
        }));

        setTimeout(function(){
            $previousPanel.css({
                transform: isBackwards ?  translateZ.min : translateZ.max,
                opacity: 0,
                zIndex: isBackwards ? 1 : 3
            });
            $currentPanel.css({ transition: defaultTransition, transform: "translateZ(0)", zIndex: 2, opacity: 1 });
            currentItemIndex = options.index;

            // In case the exiting image moves to the front (to translateZ.max), set its display to "none", so it doesn't cover the page and cancels mouse events
            // meant for elements beneath it:
            if (!isBackwards){
                hideTimeoutId = setTimeout(function(){
                    $previousPanel.hide();
                }, defaultTransitionTime);
            }
        }, 10);
    };

    this.update = function(updateData){
        if (updateData.transitionTime !== undefined){
            setDefaultTransition(updateData.transitionTime);
            for(var i=panels.length; i--;)
                panels[i].css("transitionDuration", defaultTransitionTimeStr);
        }
    };
};

yox.view.transitions.evaporate.prototype = new yox.view.transition("evaporate");
yox.view.transitions.fade = function(){
    var panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime;

    this.create = function($container){
        var view = this;
        panels = [];
        for(var i=0; i<2; i++){
            var $panel = $("<div>", { src: "", "class": "yoxviewImg" });
            if (i > 0)
                $panel.css({opacity: "0"});

            $panel.css({ transition: ["opacity ", this.options.transitionTime, "ms linear"].join("") });
            if ($.browser.webkit)
                $panel[0].style.setProperty("-webkit-transform", "translateZ(0)");

            panels.push($panel.appendTo($container));
        }
    };

    this.destroy = function(){
        for(var i=0; i < panels.length; i++){
            panels[i].remove();
        }
    };

    this.getCurrentPanel = function(){
        return panels[currentPanelIndex];
    };

    this.getPanel = function(item){
        currentPanelIndex = currentPanelIndex ? 0 : 1;
        return panels[currentPanelIndex];
    };

    this.transition = function(options){
        if (options.duration !== undefined){
            if (isNaN(options.duration))
                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
        }
        else
            options.duration = defaultTransitionTime;

        panels[currentPanelIndex].css(options.position);
        if (this.options.enlarge && this.options.resizeMode === "fill")
            panels[1].css({ opacity: currentPanelIndex });
        else{
            panels[currentPanelIndex ? 0 : 1].css({ opacity: 0 });
            panels[currentPanelIndex].css({ opacity: 1 });
        }
    };

    this.update = function(updateData){
        if (updateData.resizeMode && updateData.resizeMode !== this.options.resizeMode){
            panels[currentPanelIndex].css(this.getPosition(this.currentItem, this.containerDimensions, this.options));
        }

        if (updateData.transitionTime !== undefined)
            for(var i=panels.length; i--;)
                panels[i].css("transitionDuration", updateData.transitionTime + "ms");
    };
};

yox.view.transitions.fade.prototype = new yox.view.transition("fade");
yox.view.transitions.flip = function(){
    var $frame,
        panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime,
        currentDeg = -180,
        currentItemIndex = 0,
        self = this;

    this.create = function($container){
        var view = this;
        self.$container = $container;
        $container.css("perspective", "800px");
        $frame = $("<div>", { "class": "yoxviewFrame yoxviewFrame_" + this.options.resizeMode + " yoxviewFrame_" + yox.utils.browser.getPlatform() + " yoxviewFrame_flip"}).appendTo($container);
        if (this.options.transitionTime){
            currentTransitionTime = defaultTransitionTime = this.options.transitionTime;
            $frame.css({
                transition: yox.utils.browser.getCssPrefix() + "transform " + defaultTransitionTime + "ms ease-out",
                transformStyle: "preserve-3d",
                width: $container.width() - this.options.margin.horizontal,
                left: this.options.margin.left,
                height: "100%",
                border: "none",
                overflow: "visible"
            });
        }

        panels = [];
        for(var i=0; i<2; i++){
            var $panel = $("<div>", { "class": "yoxviewImg" });
            $panel.css({
                backfaceVisibility: "hidden",
                background: "Black",
                position: "absolute",
                top: "50%", left: "50%",
                width: 0, height: 0,
                transform: i ? "rotateY(180deg)" : "rotateY(0)", // The rotate(0) is for Firefox, which otherwise displays the backface (bug exists in version 11)
                marginLeft: "-" + this.options.margin.left + "px"
            });

            $panel.attr("data-index", i);
            //$panel.on("load", { view: view }, onLoad);
            panels.push($panel.appendTo($frame));
        }
    };

    this.destroy = function(){
        self.$container.css("perspective", "");
        $frame.remove();
    };

    this.getCurrentPanel = function(){
        return panels[currentPanelIndex];
    };

    this.getPanel = function(item){
        currentPanelIndex = currentPanelIndex ? 0 : 1;
        return panels[currentPanelIndex];
    };

    this.transition = function(options){
        self.getCurrentPanel().css(options.position);
        if (options.isUpdate){
            $frame.css({
                width: self.$container.width() - this.options.margin.horizontal,
                left: this.options.margin.left
            });
        }
        else {
            var isBackwards = (options.index < currentItemIndex && !(currentItemIndex === this.items.length - 1 && options.index === 0 )) ||
                options.index === this.items.length - 1 && !currentItemIndex;

            currentDeg += isBackwards ? -180 : 180;
            currentItemIndex = options.index;
            $frame.css("transform", "rotateY(" + currentDeg + "deg)");
        }
    };

    this.update = function(updateData){
        if (updateData.transitionTime !== undefined)
            $frame.css("transitionDuration", updateData.transitionTime + "ms");
    };
};

yox.view.transitions.flip.prototype = new yox.view.transition("flip");
yox.view.transitions.morph = function(){
    var $frame,
        panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime;

    this.create = function($container){
        var view = this;
        $frame = $("<div>", { "class": "yoxviewFrame yoxviewFrame_" + this.options.resizeMode + " yoxviewFrame_" + yox.utils.browser.getPlatform()}).appendTo($container);
        if (this.options.transitionTime){
            currentTransitionTime = defaultTransitionTime = this.options.transitionTime;
            $frame.css({
                transition: "all " + defaultTransitionTime + "ms ease-out",
                top: "50%", left: "50%",
                width: 0, height: 0
            });
            if ($.browser.webkit) // GPU acceleration for webkit:
                $frame[0].style.setProperty("-webkit-transform", "translateZ(0)");
        }

        panels = [];
        for(var i=0; i<2; i++){
            var $panel = $("<div>", { "class": "yoxviewImg" });
            $panel.css("display", "inline");
            if (i > 0)
                $panel.css({opacity: "0"});

            $panel.css({
                transition: ["all ", this.options.transitionTime, "ms ease-out"].join("")
            });
            if ($.browser.webkit)
                $panel[0].style.setProperty("-webkit-transform", "translateZ(0)");

            $panel.attr("data-index", i);
            panels.push($panel.appendTo($frame));
        }
    };

    this.destroy = function(){
        $frame.remove();
    };

    this.getCurrentPanel = function(){
        return panels[currentPanelIndex];
    };

    this.getPanel = function(item){
        currentPanelIndex = currentPanelIndex ? 0 : 1;
        return panels[currentPanelIndex];
    };

    this.transition = function(options){
        var panelCss = { opacity: currentPanelIndex },
            frameCss = $.extend({}, options.position);

        if (options.duration !== undefined){
            if (isNaN(options.duration))
                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
        }
        else
            options.duration = defaultTransitionTime;

        if (options.duration !== currentTransitionTime){
            panelCss.transition = "opacity " + options.duration + "ms ease-out";
            frameCss.transition = "all " + options.duration + "ms ease-out";
            currentTransitionTime = options.duration;
        }

        if (!options.isUpdate)
            panels[1].css("opacity", currentPanelIndex);

        $frame.css(frameCss);
    };

    this.update = function(updateData){
        if (updateData.transitionTime !== undefined){
            $frame.css("transitionDuration", updateData.transitionTime + "ms");
            for(var i=panels.length; i--;)
                panels[i].css("transitionDuration", updateData.transitionTime + "ms");
        }
    };
};

yox.view.transitions.morph.prototype = new yox.view.transition("morph");
yox.theme = function(data, options){};
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
    init: function(container, data, options){
        if (!(data instanceof yox.data))
            throw new Error("Invalid data provided for theme, must be an instance of yox.data.");

        var eventsHandler = new yox.eventsHandler();
        $.extend(this, eventsHandler);

        this.create(container);

        function createModule(container, moduleName, moduleOptions){
            moduleOptions.data = data;

            moduleOptions.eventsHandler = {
                addEventListener: function(eventName, eventHandler){
                    eventsHandler.addEventListener(eventName, eventHandler.bind(this));
                },
                triggerEvent: function(eventName, eventData){
                    eventsHandler.triggerEvent.call(this, eventName + "." + moduleName, eventData, moduleOptions.id);
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
yox.themes.classic = function(data, options){
    var self = this,
        elements,
        mousemoveTimeoutId,
        isFullScreen,
        isFullScreenApi,
        isFullScreenResize,
        galleryOriginalHeight,
        lastPos,
        isInfo = options.showInfo,
        isThumbnails = options.showThumbnails,
        buttons = {},
        itemsCount = data.countItems();

    var actions = {
        fullscreen: toggleFullScreen,
        info: function(button){
            isInfo = !isInfo;
            elements.infoPanel.style.opacity = isInfo ? "1" : "0";
            toggleButton(button);
        },
        slideshow: function(){
            self.modules.view.toggleSlideshow();
        },
        thumbnails: function(button){
            isThumbnails = !isThumbnails;
            elements.gallery.style.height = (elements.gallery.clientHeight + options.thumbnailsHeight * (isThumbnails ? -1 : 1)) + "px";
            self.modules.view.update();
            toggleButton(button);
        }
    };

    this.name = "classic";
    this.config = {
        view: {
            enableKeyboard: true,
            enlarge: true,
            resizeMode: "fit",
            transition: yox.view.transitions.fade,
            transitionTime: 300,
            margin: 0,
            events: {
                cacheStart: function(e, item){ elements.loader.style.display = "inline" },
                cacheEnd: function(e, item){ elements.loader.style.display = "none" },
                "click.thumbnails": function(e){ this.selectItem(e.index, "scroll"); },
                "init.view": function(){
                    this.selectItem(this.options.firstItem || 0);
                    elements.infoPanel.style.opacity = "1";
                },
                "slideshowStart": function(){
                    toggleButton(buttons.slideshow);
                },
                slideshowStop: function(){
                    toggleButton(buttons.slideshow);
                },
                beforeSelect: function(e){
                    elements.infoText.innerHTML = e.newItem.title || "";
                    elements.infoPosition.innerHTML = e.newItem.id;
                    if (options.showCopyright){
                        if (e.newItem.author){
                            elements.copyright.href = e.newItem.link;
                            elements.copyright.innerHTML = "&copy; " + e.newItem.author;
                        }
                        else
                            elements.copyright.innerHTML = "";
                    }
                }
            }
        },
        thumbnails: {
            events: {
                beforeSelect: function(e){
                    this.select(e.newItem.id - 1);

                },
                loadItem: function(item){
                    $(this.thumbnails[item.id - 1]).addClass("loaded");
                },
                "create.thumbnails": function(){
                    this.select(0);
                }
            }
        },
        scroll: {
            events: {
                "create.thumbnails": function(e, id){
                    this.update();
                },
                "select.thumbnails": function(e){
                    this.scrollTo(e, { centerElement: true, time: .5 });
                },
                resize: function(){ this.updateSize(); },
                beforeSelect: function(e){
                    var thumbnailIndex = e.newItem.id - 1;
                    if (self.modules.thumbnails.thumbnails)
                        this.scrollTo(self.modules.thumbnails.thumbnails[thumbnailIndex], { centerElement: !e.data });
                }
            },
            pressedButtonClass: "enabledThumbnailsButton"
        },
        statistics: {
            category: "yox.js Classic theme",
            events: {
                toggle: function(e){
                    this.report({ action: "Toggle", label: e.action, value: e.state ? 1 : 0 });
                }
            }
        }
    };

    data.addEventListener("loadSources", function(source){
        elements.infoItemsCount.innerHTML = data.countItems();
        $(elements.container).removeClass(self.getThemeClass("loading"));
    });
    data.addEventListener("loadSourcesStart", function(){
        $(elements.container).addClass(self.getThemeClass("loading"));
    });

    function emptyFunction(){};
    function toggleButton(button){
        var $button = $(button);
        $button.toggleClass("yox-theme-classic-button-on");
        self.triggerEvent("toggle", { action: button.innerHTML, state: $button.hasClass("yox-theme-classic-button-on") });
    }

    if (options.enableFullScreen !== false){
        document.cancelFullScreen = document.cancelFullScreen || document.mozCancelFullScreen || document.webkitCancelFullScreen || emptyFunction;
        HTMLElement.prototype.requestFullScreen = HTMLElement.prototype.requestFullScreen || HTMLElement.prototype.mozRequestFullScreen || HTMLElement.prototype.webkitRequestFullScreen || emptyFunction;
        isFullScreenApi = document.cancelFullScreen !== emptyFunction;
    }
    function onFullScreenChange(e){
        if (isFullScreenApi)
            isFullScreen = !isFullScreen;

        if (isFullScreen){
            self.modules.view.option("resizeMode", "fit");
            elements.gallery.style.cursor = "none";
            elements.gallery.style.height = (document.documentElement.clientHeight - (isThumbnails ? options.thumbnailsHeight : 0)) + "px";
        }
        else{
            elements.gallery.style.height = galleryOriginalHeight + "px";
            elements.gallery.style.cursor = "default";
        }

        var $window = $(window),
            windowEventCaller = isFullScreen ? $window.on : $window.off;

        windowEventCaller.call($window, "mousemove", onMouseMove);
        if (!isFullScreenApi)
            windowEventCaller.call($(document), "keydown", onKeyDown);

        isFullScreenResize = false;
        onResize();
        toggleButton(buttons.fullscreen);
    }

    if (options.enableFullScreen !== false && isFullScreenApi)
        document.addEventListener(document.mozCancelFullScreen ? "mozfullscreenchange" : "webkitfullscreenchange", onFullScreenChange, false);

    function toggleFullScreen(){
        isFullScreenResize = true;

        if (isFullScreenApi){
            if (isFullScreen){
                document.cancelFullScreen();
            }
            else{
                elements.themeContents.style.height = "100%";
                elements.themeContents.requestFullScreen();
            }
        }
        else{
            isFullScreen = !isFullScreen;
            elements.themeContents.style.position = isFullScreen ? "fixed" : "relative";
            elements.themeContents.style.height = isFullScreen ? "100%" : galleryOriginalHeight;
            elements.themeContents.style.border = isFullScreen ? "none" : "solid 1px Black";
            elements.themeContents.style.zIndex = isFullScreen ? "100" : "1";
            onFullScreenChange();
            self.modules.scroll.updateSize();
        }
    }

    function onResize(){
        if (isFullScreenResize)
            return false;

        //if (!isFullScreen)
            setSize();

        self.modules.view.update(true);
    }

    function onKeyDown(e){
        if (e.keyCode === 27)
            toggleFullScreen();
    }

    function onMouseMove(e){
        if (!lastPos || e.pageX < lastPos.x - 3 || e.pageX > lastPos.x + 3 || e.pageY < lastPos.y - 3 || e.pageY > lastPos.y + 3){
            clearTimeout(mousemoveTimeoutId);
            elements.controlsPanel.style.opacity = "1";
            elements.gallery.style.cursor = "default";

            mousemoveTimeoutId = setTimeout(function(){
                var controlsPanelRect = elements.controlsPanel.getClientRects()[0];
                if (e.pageY >= controlsPanelRect.top && e.pageY <= controlsPanelRect.bottom && e.pageX >= controlsPanelRect.left && e.pageX <= controlsPanelRect.right)
                    return;

                elements.controlsPanel.style.opacity = "0";
                elements.gallery.style.cursor = "none";
            }, 1000);
        }
        lastPos = { x: e.pageX, y: e.pageY };
    }

    function setSize(){
        var newHeight = isFullScreen ? document.documentElement.clientHeight : elements.container.clientHeight;
        if (isThumbnails)
            newHeight -= options.thumbnailsHeight;
        elements.gallery.style.height = newHeight + "px";
    }

    function resizeEventHandler(e){
        onResize();
        self.triggerEvent("resize");
    }

    function createButton(data){
        var button = document.createElement("a");
        button.innerHTML = data.title;
        button.className = self.getThemeClass("button") + " " + self.getThemeClass("button-" + data.action);
        button.setAttribute("data-action", data.action);
        return button;
    }

    function createControlButton(method){
        var button = document.createElement("a"),
            className = self.getThemeClass("controlBtn");

        button.setAttribute("data-method", method);
        button.className = className + " " + className + "-" + method;

        button.innerHTML = "<div></div>";
        return button;
    }

    this.create = function(container){
        $(container).addClass(this.getThemeClass() + (data.isLoading ? " " + this.getThemeClass("loading") : ""));

        elements = {
            container: container,
            themeContents: document.createElement("div"),
            gallery: document.createElement("div"),
            viewer: document.createElement("div"),
            thumbnails: document.createElement("div"),
            thumbnailsPanel: document.createElement("div"),
            loader: document.createElement("div"),
            description: document.createElement("p"),
            controlsPanel: document.createElement("div"),
            controls: [],
            infoPanel: document.createElement("div"),
            info: document.createElement("div"),
            infoText: document.createElement("div"),
            infoPosition: document.createElement("span"),
            infoItemsCount: document.createElement("span")
        };

        elements.$thumbnails = $(elements.thumbnails);
        var thumbnailsBtnClass = this.getThemeClass("thumbnailsBtn");
        elements.thumbnailsPanel.className = this.getThemeClass("thumbnailsPanel");
        elements.thumbnailsPanel.style.height = (options.thumbnailsHeight - 1) + "px";
        elements.thumbnailsPanel.innerHTML =
            '<a href="#" class="' + thumbnailsBtnClass + ' ' + thumbnailsBtnClass + '_left" data-yoxscroll-holdstart="scroll-left" data-yoxscroll-click="page-left"></a>' +
            '<a href="#" class="' + thumbnailsBtnClass + ' ' + thumbnailsBtnClass + '_right" data-yoxscroll-holdstart="scroll-right" data-yoxscroll-click="page-right"></a>';
        elements.thumbnailsPanel.appendChild(elements.thumbnails);

        this.config.scroll.elements = $("a", elements.thumbnailsPanel);
        elements.themeContents.appendChild(elements.gallery);
        elements.themeContents.className = this.getThemeClass("contents");
        container.appendChild(elements.themeContents);
        elements.gallery.appendChild(elements.viewer);
        elements.gallery.appendChild(elements.description);
        elements.themeContents.appendChild(elements.thumbnailsPanel);
        elements.gallery.appendChild(elements.loader);

        elements.viewer.className = this.getThemeClass("viewer") + " yoxview";
        elements.gallery.className = this.getThemeClass("gallery");
        elements.thumbnails.className = this.getThemeClass("thumbnails") + " yoxthumbnails yoxscroll";
        elements.thumbnails.style.height = options.thumbnailsHeight + "px";

        elements.loader.className = this.getThemeClass("loader") + " yoxloader";
        elements.description.className = this.getThemeClass("description");

        elements.controlsPanel.className = this.getThemeClass("controls");
        var controls = [
            { title: "Fullscreen", action: "fullscreen" },
            { title: "Slideshow", action: "slideshow" },
            { title: "Info", action: "info" },
            { title: "Thumbnails", action: "thumbnails" }
        ];

        for(var i=0, control; control = controls[i]; i++){
            elements.controlsPanel.appendChild(buttons[control.action] = createButton(control));
        }
        $(elements.controlsPanel).on("click", "a", function(e){
            e.preventDefault();
            actions[this.getAttribute("data-action")](this);
        });

        elements.gallery.appendChild(elements.controlsPanel);

        if (!options.showInfo)
            elements.infoPanel.style.opacity = "0";
        else
            toggleButton(buttons.info);

        if (options.showThumbnails)
            toggleButton(buttons.thumbnails);

        var position = document.createElement("div");
        position.className = this.getThemeClass("info-position");
        position.appendChild(elements.infoPosition);
        position.appendChild(document.createTextNode(" / "));
        elements.infoItemsCount.innerHTML = itemsCount;
        elements.infoPosition.innerHTML = "0";
        position.appendChild(elements.infoItemsCount);
        elements.info.appendChild(position);
        elements.infoText.className = this.getThemeClass("info-text");
        elements.info.appendChild(elements.infoText);

        if (options.showCopyright){
            elements.copyright = document.createElement("a");
            elements.copyright.target = "_blank";
            elements.copyright.className = this.getThemeClass("copyright");
            elements.info.appendChild(elements.copyright);
        }

        elements.infoPanel.appendChild(elements.info);
        elements.gallery.appendChild(elements.infoPanel);

        elements.infoPanel.className = this.getThemeClass("infoPanel");
        elements.info.className = this.getThemeClass("info");

        elements.gallery.appendChild(createControlButton("prev"));
        elements.gallery.appendChild(createControlButton("next"));

        galleryOriginalHeight = elements.gallery.clientHeight;

        setSize();

        $(elements.gallery)
            .on("mousemove", onMouseMove)
            .on("click", "." + this.getThemeClass("controlBtn"), function(e){
                self.modules.view[this.getAttribute("data-method")]();
            });
        $(window).on("resize", resizeEventHandler);
    };

    this.destroy = function(){
        $(elements.container).removeClass(this.getThemeClass());
        elements.container.removeChild(elements.themeContents);
        elements = null;
        clearTimeout(mousemoveTimeoutId);
        $(window).off("resize", resizeEventHandler);
    };
}

yox.themes.classic.defaults = {
    showCopyright: false,
    showInfo: true,
    showThumbnails: true,
    thumbnailsHeight: 61
};

yox.themes.classic.prototype = new yox.theme();
yox.themes.inline = function(data, options){
    var self = this,
        elements,
        mousemoveTimeoutId,
        isFullScreen,
        isFullScreenApi,
        galleryOriginalHeight,
        thumbnailsRect,
        lastPos;

    this.name = "inline";
    this.config = {
        view: {
            enableKeyboard: true,
            enlarge: true,
            resizeMode: "fill",
            transition: "fade",
            transitionTime: 300,
            events: {
                cacheStart: function(e, item){ elements.loader.style.display = "inline" },
                cacheEnd: function(e, item){ elements.loader.style.display = "none" },
                "click.thumbnails": function(e){ this.selectItem(e.index); },
                "init.view": function(){
                    this.selectItem(0);
                }
            }
        },
        thumbnails: {
            events: {
                beforeSelect: function(e){
                    this.select(e.newItem.id - 1);
                },
                loadItem: function(item){
                    $(this.thumbnails[item.id - 1]).addClass("loaded");
                },
                "create.thumbnails": function(){ this.select(0); }
            }
        }
    };

    function emptyFunction(){};
    document.cancelFullScreen = document.cancelFullScreen || document.mozCancelFullScreen || document.webkitCancelFullScreen || emptyFunction;
    HTMLElement.prototype.requestFullScreen = HTMLElement.prototype.requestFullScreen || HTMLElement.prototype.mozRequestFullScreen || HTMLElement.prototype.webkitRequestFullScreen || emptyFunction;
    isFullScreenApi = document.cancelFullScreen !== emptyFunction;

    function onFullScreenChange(e){
        if (isFullScreenApi)
            isFullScreen = !isFullScreen;

        if (isFullScreen){
            mousemoveTimeoutId = setTimeout(function(){
                elements.$thumbnails.css({ opacity: 0 });
                document.body.style.cursor = "none"; }
            , 3000);

            self.modules.view.option("resizeMode", "fit");
        }
        else{
            clearTimeout(mousemoveTimeoutId);
            elements.$thumbnails.css("opacity", "1");
            elements.gallery.style.height = galleryOriginalHeight + "px";
            document.body.style.cursor = "default";
            self.modules.view.option("resizeMode", "fill");
        }

        onResize();

        var $window = $(window),
            windowEventCaller = isFullScreen ? $window.on : $window.off;

        windowEventCaller.call($window, "mousemove", onMouseMove);
        if (!isFullScreenApi)
            windowEventCaller.call($(document), "keydown", onKeyDown);
    }

    if (isFullScreenApi)
        document.addEventListener(document.mozCancelFullScreen ? "mozfullscreenchange" : "webkitfullscreenchange", onFullScreenChange, false);

    function toggleFullScreen(){
        if (isFullScreenApi){
            if (isFullScreen)
                document.cancelFullScreen();
            else{
                elements.gallery.style.height = "100%";
                elements.gallery.requestFullScreen();
            }
        }
        else{
            isFullScreen = !isFullScreen;
            elements.gallery.style.position = isFullScreen ? "fixed" : "relative";
            elements.gallery.style.height = isFullScreen ? "100%" : galleryOriginalHeight;
            elements.gallery.style.border = isFullScreen ? "none" : "solid 1px Black";
            elements.gallery.style.zIndex = isFullScreen ? "100" : "1";
            onFullScreenChange();
        }
    }

    function onResize(){
        self.modules.view.update(true);
        thumbnailsRect = elements.thumbnails.getClientRects()[0];
    }

    function onKeyDown(e){
        if (e.keyCode === 27)
            toggleFullScreen();
    }

    function onMouseMove(e){
        if (!lastPos || e.pageX < lastPos.x - 4 || e.pageX > lastPos.x + 4 || e.pageY < lastPos.y - 4 || e.pageY > lastPos.y + 4){
            clearTimeout(mousemoveTimeoutId);
            elements.$thumbnails.css("opacity", "1");
            document.body.style.cursor = "default";

            mousemoveTimeoutId = setTimeout(function(){
                if (e.pageY >= thumbnailsRect.top)
                    return;

                elements.$thumbnails.css({ opacity: 0 });
                document.body.style.cursor = "none";
            }, 2000);
        }
        lastPos = { x: e.pageX, y: e.pageY };
    }

    this.create = function(container){
        $(container).addClass(this.getThemeClass());

        elements = {
            container: container,
            title: document.createElement("h2"),
            gallery: document.createElement("div"),
            viewer: document.createElement("div"),
            thumbnails: document.createElement("div"),
            loader: document.createElement("loader"),
            description: document.createElement("p")

        };

        elements.$thumbnails = $(elements.thumbnails);

        container.appendChild(elements.title);
        container.appendChild(elements.gallery);
        container.appendChild(elements.description);
        elements.gallery.appendChild(elements.viewer);
        elements.gallery.appendChild(elements.thumbnails);
        elements.gallery.appendChild(elements.loader);

        elements.viewer.className = this.getThemeClass("viewer") + " yoxview";
        elements.title.className = this.getThemeClass("title");
        elements.gallery.className = this.getThemeClass("gallery");
        elements.thumbnails.className = this.getThemeClass("thumbnails") + " yoxthumbnails";
        elements.loader.className = this.getThemeClass("loader") + " yoxloader";
        elements.description.className = this.getThemeClass("description");

        if (options.title)
            elements.title.innerHTML = options.title;

        galleryOriginalHeight = elements.gallery.clientHeight;
        thumbnailsRect = elements.thumbnails.getClientRects()[0];

        $(elements.gallery).on("dblclick", toggleFullScreen);
        $(window).on("resize", onResize);
    };

    this.destroy = function(){
        $(elements.container).removeClass(this.getThemeClass());
        elements.container.removeChild(elements.title);
        elements.container.removeChild(elements.gallery);
        elements.container.removeChild(elements.description);
        elements = null;

        $(window).off("resize", onResize);
    };
}

yox.themes.inline.prototype = new yox.theme();
yox.themes.scroll = function(data, options){
    var self = this;
    this.name = "scroll";
    this.config = {
        thumbnails: [
            // The scrolling panel:
            {
                id: "scroller",
                useFullImages: true,
                events: {
                    beforeSelect: function(e){
                        this.select(e.newItem.id - 1);
                    },
                    "select.view": function(e){
                        self.triggerEvent("select.thumbnails", this.thumbnails[e.id - 1], "scroller");
                    }
                }
            },
            // Thumbnails:
            {
                id: "thumbnails",
                events: {
                    beforeSelect: function(e){
                        this.select(e.newItem.id - 1);
                    },
                    loadItem: function(item){
                        $(item.thumbnail.element).addClass("loadedThumbnail");
                    }
                }
            }
        ],
        scroll: {
            events: {
                "create.thumbnails": function(e, id){
                    if (id === "scroller")
                        this.update();
                },
                "select.thumbnails": function(e){
                    this.scrollTo(e, { centerElement: true, time: .5 });
                },
                resize: function(){ this.updateSize() }
            },
            toggleButtons: false
        },
        view: {
            delayOpen: true,
            enableKeyboard: true,
            events: {
                "click.thumbnails": function(e, id){
                    if (id === "thumbnails")
                        this.selectItem(e.index);
                },
                "click.scroll": function(e){
                    this.selectItem(e.target.parentNode, "yoxscroll");
                }
            }
        }
    };

    var wrapper;

    function onResize(){
        self.triggerEvent("resize");
    }

    this.create = function(container){
        if ($(container).css("position") === "static" && container !== document.body)
            container.style.position = "relative";
        container.style.overflow = "hidden";

        wrapper = document.createElement("div");
        wrapper.className = this.getThemeClass("wrapper");

        var scroller = document.createElement("div");
        scroller.className = this.getThemeClass("scroller") + " yoxview yoxthumbnails yoxscroll ";
        wrapper.appendChild(scroller);

        container.appendChild(wrapper);

        if (options.renderThumbnails !== false){
            var thumbnails = document.createElement("div");
            thumbnails.className = this.getThemeClass("thumbnails") + " thumbnails yoxthumbnails";
            wrapper.appendChild(thumbnails);
        }

        var loader = document.createElement("div");
        loader.className = this.getThemeClass("loader") + " yoxloader";
        wrapper.appendChild(loader);

        $(window).on("resize", onResize);
    };

    this.destroy = function(){
        wrapper.parentNode.removeChild(wrapper);
        wrapper = null;
        $(window).off("resize", onResize);
    }
};

yox.themes.scroll.prototype = new yox.theme();
yox.themes.slideshow = function(data, options){
    var elements = {},
        self = this;


    this.name = "slideshow";
    this.config = {
        view: {
            enableKeyboard: true,
            transition: "flip",
            margin: 10,
            transitionTime: 600,
            events: {
                beforeSelect: function(e){
                    var index = e.newItem.id;
                    elements.position.innerHTML = index + " / " + this.items.length;
                },
                create: function(){this.selectItem(0); }
            }
        }
    };
    this.create = function(container){
        elements.container = container;
        $(container).addClass(this.getThemeClass());

        function createButton(method, title){
            var button = document.createElement("a");
            button.className = self.getThemeClass("button") + " " + self.getThemeClass("button-" + method);
            button.setAttribute("data-method", method);
            button.setAttribute("href", "#");
            button.textContent = title;
            return button;
        }

        elements.viewer = document.createElement("div");
        elements.viewer.className = this.getThemeClass("viewer") + " yoxview";
        container.appendChild(elements.viewer);

        elements.controls = document.createElement("div");
        elements.controls.className = this.getThemeClass("controls");
        container.appendChild(elements.controls);
        elements.controls.appendChild(createButton("first", "First"));
        elements.controls.appendChild(createButton("prev", "Previous"));

        var position = document.createElement("span");
        position.className = this.getThemeClass("position");
        elements.position = position;

        elements.controls.appendChild(position);

        elements.controls.appendChild(createButton("next", "Next"));
        elements.controls.appendChild(createButton("last", "Last"));

        $(elements.controls).on("click", "a", function(e){
            e.preventDefault();
            self.modules.view[this.getAttribute("data-method")]();
        });
    };

    this.destroy = function(){
        elements.container.removeChild(elements.controls);
        elements.container.removeChild(elements.viewer);
        $(elements.container).removeClass(this.getThemeClass());
    };
};

yox.themes.slideshow.prototype = new yox.theme();
