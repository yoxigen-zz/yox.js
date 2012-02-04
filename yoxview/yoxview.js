(function($){
	$.fn.yoxview = function(options) 
	{
		if (this.length != 0)
		{
            var $this = $(this),
                view = $this.data("yoxview");

			if (typeof(options) === "string" && view && view[options]){
				return view[options].apply(view, Array.prototype.slice.call(arguments, 1));
            }
			else if (typeof options === 'object' || !options){
                $this.data("yoxview",$.yoxview.add(this, options));
            }
			else
			  $.error( 'Method ' +  options + ' does not exist on YoxView.' );
		}
		return this;
	};

    (function(){
        function styleSupport( prop ) {
            var vendorProp, supportedProp,
                capProp = prop.charAt(0).toUpperCase() + prop.slice(1),
                prefixes = [ "Moz", "Webkit", "O", "ms" ],
                div = document.createElement( "div" );

            if ( prop in div.style ) {
                supportedProp = prop;
            } else {
                for ( var i = 0; i < prefixes.length; i++ ) {
                    vendorProp = prefixes[i] + capProp;
                    if ( vendorProp in div.style ) {
                        supportedProp = vendorProp;
                        break;
                    }
                }
            }

            div = null;
            $.support[ prop ] = supportedProp;
            return supportedProp;
        }

        var transitionDuration = styleSupport("transitionDuration");
        if (transitionDuration && transitionDuration !== "transitionDuration") {
            $.cssHooks.transitionDuration = {
                get: function( elem, computed, extra ) {
                    return $.css( elem, transitionDuration );
                },
                set: function( elem, value) {
                    elem.style[ transitionDuration ] = value;
                }
            };
        }

        var transition = styleSupport("transition");
        if (transition && transition !== "transition") {
            $.cssHooks.transition = {
                get: function(elem, computed, extra){
                    return $.css(elem, transition);
                },
                set: function(elem, value){
                    elem.style[transition] = value;
                }
            };
        }
    })();

	function YoxView(container, id, options, cache){
		this.container = container;
		this.options = options;
		this.id = id;
        this.cache = cache;
        this.direction = 1;
		this.init();
	}

	YoxView.prototype = (function(){
        var dataSources = {};
        
        function onImageLoad(e){
            this.loading = false;
            var view = e instanceof YoxView ? e : e.data.view;
            if (view.currentItem.url !== this.src)
                return false;

            var item = view.currentItem,
                position = view.getPosition(item, view.containerDimensions, view.options);

            view.transition.call(view, position);
            view.triggerEvent("select", item);
        }

        var resizeCalculateFunctions = {
            fill: function(item, containerDimensions, options){
                options = options || {};
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
        };

        var transitions = {
            evaporate: (function(){
                var panels,
                    currentPanelIndex = 1,
                    defaultTransitionTime,
                    currentTransitionTime;

                return {
                    create: function($container){
                        var view = this;
                        currentTransitionTime = this.options.transitionTime;
                        defaultTransitionTime = this.options.transitionTime;

                        panels = [];
                        for(var i=0; i<2; i++){
                            var $img = $("<img>", { src: "", "class": "yoxviewImg" });
                            if (i > 0)
                                $img.css({opacity: "0"});

                            $img.css({ transition: ["all ", this.options.transitionTime, "ms ease-out"].join("") });
                            if ($.browser.webkit)
                                $img[0].style.setProperty("-webkit-transform", "translateZ(0)");

                            $img.on("load", { view: view }, onImageLoad);
                            panels.push($img.appendTo($container));
                        }
                    },
                    getPanel: function(item){
                        currentPanelIndex = currentPanelIndex ? 0 : 1;
                        return panels[currentPanelIndex];
                    },
                    transition: function(position, time){
                        if (time !== undefined){
                            if (isNaN(time))
                                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
                        }
                        else
                            time = defaultTransitionTime;

                        if (time !== currentTransitionTime){
                            for(var i=panels.length; i--;){
                                panels[i].css("transition", "all " + time + "ms ease-out");
                            }
                            currentTransitionTime = time;
                        }

                        var currentPanel = panels[currentPanelIndex ? 0 : 1].css("z-index", "2"),
                            newPanel = panels[currentPanelIndex],
                            panelCss = $.extend({ transition: "all  0ms ease-out", "z-index": "1" },
                                resizeCalculateFunctions.fit(
                                    $.extend({}, position, { ratio: position.height / position.width }),
                                    { width: currentPanel.width(), height: currentPanel.height() }));

                        newPanel.css(panelCss);
                        currentPanel.css({ transition: "all " + time + "ms ease-out", opacity: 0 });
                        newPanel.css($.extend({ transition: "all " + time + "ms ease-out", opacity: 1 }, position));
                    }
                };
            })(),
            morph: (function(){
                var $frame,
                    panels,
                    currentPanelIndex = 1,
                    defaultTransitionTime,
                    currentTransitionTime;

                return {
                    create: function($container){
                        var view = this;
                        $frame = $("<div>", { "class": "yoxviewFrame yoxviewFrame_" + this.options.resizeMode + " yoxviewFrame_" + $.yoxview.platform}).appendTo($container);
                        if (this.options.transitionTime){
                            currentTransitionTime = this.options.transitionTime;
                            defaultTransitionTime = this.options.transitionTime;
                            $frame.css("transition", "all " + defaultTransitionTime + "ms ease-out");
                            if ($.browser.webkit)
                                $frame[0].style.setProperty("-webkit-transform", "translateZ(0)");
                        }

                        panels = [];
                        for(var i=0; i<2; i++){
                            var $img = $("<img>", { src: "", "class": "yoxviewImg" });
                            if (i > 0)
                                $img.css({opacity: "0"});

                            $img.css({ transition: ["all ", this.options.transitionTime, "ms ease-out"].join("") });
                            if ($.browser.webkit)
                                $img[0].style.setProperty("-webkit-transform", "translateZ(0)");

                            $img.on("load", { view: view }, onImageLoad);
                            panels.push($img.appendTo($frame));
                        }
                    },
                    getCurrentPanel: function(){
                        return panels[currentPanelIndex];
                    },
                    getPanel: function(item){
                        currentPanelIndex = currentPanelIndex ? 0 : 1;
                        return panels[currentPanelIndex];
                    },
                    transition: function(position, time){
                        var panelCss = { opacity: currentPanelIndex },
                            frameCss = $.extend({}, position);

                        if (time !== undefined){
                            if (isNaN(time))
                                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
                        }
                        else
                            time = defaultTransitionTime;

                        if (time !== currentTransitionTime){
                            panelCss.transition = "opacity " + time + "ms ease-out";
                            frameCss.transition = "all " + time + "ms ease-out";
                            currentTransitionTime = time;
                        }

                        panels[1].css("opacity", currentPanelIndex);
                        $frame.css(frameCss);
                    }
                };
            })(),
            fade: (function(){
                var panels,
                    currentPanelIndex = 1,
                    defaultTransitionTime,
                    currentTransitionTime;

                return {
                    create: function($container){
                        var view = this;
                        panels = [];
                        for(var i=0; i<2; i++){
                            var $img = $("<img>", { src: "", "class": "yoxviewImg" });
                            if (i > 0)
                                $img.css({opacity: "0"});

                            $img.css({ transition: ["opacity ", this.options.transitionTime, "ms linear"].join("") });
                            if ($.browser.webkit)
                                $img[0].style.setProperty("-webkit-transform", "translateZ(0)");

                            $img.on("load", { view: view }, onImageLoad);
                            panels.push($img.appendTo($container));
                        }
                    },
                    getCurrentPanel: function(){
                        return panels[currentPanelIndex];
                    },
                    getPanel: function(item){
                        currentPanelIndex = currentPanelIndex ? 0 : 1;
                        return panels[currentPanelIndex];
                    },
                    transition: function(position, time){
                        if (time !== undefined){
                            if (isNaN(time))
                                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
                        }
                        else
                            time = defaultTransitionTime;

                        //if (time !== currentTransitionTime){
//                            panelCss.transition = "opacity " + time + "ms linear";
//                            currentTransitionTime = time;
//                        }

                        panels[currentPanelIndex].css(position);
                        if (this.options.enlarge && this.options.resizeMode === "fill")
                            panels[1].css({ opacity: currentPanelIndex });
                        else{
                            panels[currentPanelIndex ? 0 : 1].css({ opacity: 0 });
                            panels[currentPanelIndex].css({ opacity: 1 });
                        }
                    },
                    update: function(updateData){
                        if (updateData.resizeMode && updateData.resizeMode !== this.options.resizeMode && this.options.enlarge && updateData.resizeMode === "fill")
                            panels[0].css({ opacity: 1 });
                    }
                };
            })()
        };

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

        function createViewer(view){
            var elements = {};

            elements.$container = $(view.options.container);

            if (view.options.container === document.documentElement){
                elements.$background = $('<div class="yoxviewBackground"></div>').appendTo(document.body);
                elements.$background.on("click",
                    function(e){
                        view.triggerEvent("backgroundClick", e);
                    }
                );
            }
            else if (elements.$container.css("position") === "static")
                elements.$container.css("position", "relative");

            var transitionMode = typeof view.options.transition === "string" ? transitions[view.options.transition] : view.options.transition;
            if (!transitionMode)
                throw new Error("Invalid transition - \"" + view.options.transition + "\" doesn't exist.");

            transitionMode.create.call(view, elements.$container);
            $.extend(view, {
                getPanel: transitionMode.getPanel,
                getCurrentPanel: transitionMode.getCurrentPanel,
                transition: transitionMode.transition,
                getPosition: resizeCalculateFunctions[view.options.resizeMode],
                elements: elements,
                updateTransition: transitionMode.update
            });
        }

        var onOptionsChange = {
            resizeMode: function(resizeMode){
                this.getPosition = resizeCalculateFunctions[resizeMode];
            }
        };

        return {
            addDataSource: function(dataSource){
                if (dataSources[dataSource.name])
                    return false;

                dataSources[dataSource.name] = dataSource;
            },
            addItems: function(items, createThumbnails){
                if (!items)
                    return false;

                if (!(items instanceof Array))
                    items = [items];

                this.triggerEvent("loadSources", { createThumbnails: createThumbnails, items: items });
            },
            addDataSources: function(dataSource){
                var self = this,
                    dataSourceItems = dataSource.getData();

                function appendItems(data){
                    var dataItems = data.items;
                    dataItems && (self.items = self.items.concat(dataItems));
                }

                if (dataSourceItems && dataSourceItems.length){
                    for(var i=0; i < dataSourceItems.length; i++){
                        appendItems(dataSourceItems[i]);
                    }

                    self.triggerEvent("loadSources", dataSourceItems);
                }

                dataSource.addEventListener("loadSources", function(e, sources){
                    for(var i=0; i < sources.length; i++){
                        appendItems(sources[i]);
                    }

                    // Should probably remove the following and do it ONLY with YoxData:
                    self.triggerEvent("loadSources", sources);
                });

                dataSource.addEventListener("clear", function(){
                    self.removeItems();
                });
            },
            addEventListener: function(eventName, eventHandler){
                var self = this;
                if (!eventHandler || typeof(eventHandler) !== "function")
                    throw new Error("Invalid event handler, must be a function.");

                $(this.container).on(eventName + ".yoxview", $.proxy(eventHandler, self));
            },
            cacheCount: 0,
            disableKeyboard: function(){ $(document).off("keydown.yoxview", keyboard.onKeyDown); },
            enableKeyboard: function(){	$(document).on("keydown.yoxview", { view: this }, keyboard.onKeyDown); },
            first: function(){
				if (!this.currentItem)
					return false;

                this.selectItem(0);
			},
            items: [],
            init: function(){
                var self = this;

                this.options.margin = utils.distributeMeasures(this.options.margin);
                this.options.padding = utils.distributeMeasures(this.options.padding);

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

                this.options.data && this.addDataSources(this.options.data);

                createViewer(this);
                
                // Apply event handlers:
                if (this.options.handleThumbnailClick){
                    this.container.on("click.yoxview", "a:has('img')", function(e){
                        e.preventDefault();
                        self.triggerEvent("thumbnailClick", self.items[$(e.currentTarget).data("yoxviewIndex") - 1]);
                    });
                }

                if (this.options.selectedThumbnailClass)
                    this.addEventListener("beforeSelect", function(e, data){
                        if (data.oldItem)
                            $(data.oldItem.thumbnail.element).removeClass(this.options.selectedThumbnailClass);

                        $(data.newItem.thumbnail.element).addClass(this.options.selectedThumbnailClass);
                    });

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
                if (value === undefined && typeof(option) === "object")
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

                this.updateTransition && this.updateTransition.call(this, options);
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
                this.removeThumbnails();
                this.triggerEvent("removeItems", this.items);
                this.currentItem = undefined;
                this.items = [];
            },
            removeThumbnails: function(){
                var removedThumbnails = [];

                for(var i=0, count = this.items.length; i < count; i++){
                    var item = this.items[i];
                    if (item.thumbnail && item.thumbnail.generated){
                        removedThumbnails.push($(item.thumbnail.element).remove());
                        delete item.thumbnail.element;
                    }
                }
                this.triggerEvent("removeThumbnails", removedThumbnails);
            },
            removeEventListener: function(eventName, eventHandler){
                if (eventHandler && typeof(eventHandler) !== "function")
                    throw new Error("Invalid event handler, must be a function or undefined.");

                $(this.container).off(eventName + ".yoxview", eventHandler);
            },
            selectItem: function(item, data, slideshow){
                if (!slideshow && this.isPlaying)
                    this.toggleSlideshow();
                else if (slideshow && !this.isPlaying){
                    this.isPlaying = true;
                    this.triggerEvent("slideshowStart");
                }

                if (!isNaN(item)){
                    if (item >= this.items.length || item < 0)
                        throw new Error("Invalid item index.");
                    
                    item = this.items[item];
                }
                else{
                    if (item instanceof HTMLElement)
                        item = $(item);

                    if (item instanceof jQuery){
                        item = this.items[item.data("yoxviewIndex") - 1];
                    }
                }

                var currentItem = this.currentItem,
                    view = this;

                if (currentItem && item.id === currentItem.id)
					return false;

                this.triggerEvent("beforeSelect", [{ newItem: item, oldItem: currentItem }, data]);
				this.currentItem = item;

                this.cache.withItem(item, this, function(loadedItem){
                    if (loadedItem !== this.currentItem)
                        return false;

                    var $panel = this.getCurrentPanel();
                    if (!$panel[0].loading)
                        $panel = this.getPanel(true);

                    $panel[0].loading = true;

                    if ($panel.attr("src") !== item.url){
                        $panel.attr("src", item.url);
                        /*
                        if (window.chrome){ // This fixes a bug in Chrome 16, without it the second image doesn't show on the first run.
                            var otherPanel = elements.panels[currentPanelIndex === 1 ? 0 : 1];
                            if (!otherPanel.attr("src"))
                                otherPanel.attr("src", item.url);
                        }
                        */
                    }
                    else
                        onImageLoad.call($panel[0], this);
                });
            },
            triggerEvent: function(eventName, data){
                $(this.container).trigger(eventName + ".yoxview", data);
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
                var containerDimensions = { width: this.elements.$container.width(), height: this.elements.$container.height() };
                if (force || !this.containerDimensions || containerDimensions.width !== this.containerDimensions.width || containerDimensions.height !== this.containerDimensions.height){
                    this.containerDimensions = containerDimensions;
                    if (this.currentItem){
                        this.transition(this.getPosition(this.currentItem, this.containerDimensions, this.options), 0);
                    }
                }
            }
        };
    })();

	$.yoxview = (function(){
		var views = [],
            platform = getPlatform(),
			isOpen = false,
			elements = {}, // $yoxviewPopup
			docElement = document.documentElement,
			currentView,
            currentViewSelectedThumbnailClass,
			currentPopupContainer,
			currentPopupContainerDimensions,
			currentPopupContainerIsDocElement,
			currentItem,
            thumbnailsActions = {
                createThumbnail: function(item, options){
                    var $thumbnail = $("<a>", {
                        href: item.link || item.url,
                        title: options.renderThumbnailsTitle !== false ? item.title : undefined,
                        data: { yoxviewIndex: item.id }
                    });

                    $thumbnail.append($("<img>", {
                        src: item.thumbnail.src,
                        alt: item.title
                    }));

                    return $thumbnail[0];
                }
            },
			config = {
                defaults: {
                    cacheImagesInBackground: true, // If true, full-size images are cached even while the gallery hasn't been opened yet.
                    createThumbnail: thumbnailsActions.createThumbnail, // A function that creates a thumbnail element when YoxView generates thumbnails. (Flickr, Picasa, etc.)
                    enableKeyPresses: true, // If set to false, YoxView won't catch any keyboard press events. To change individual keys, use keyPress.
                    enlarge: false, // Whether to enlarge images to fit the container
                    handleThumbnailClick: true, // Whether clicks on thumbnails should be handled. Set to false to implement clicks using the API.
                    keyPress: { left: "prev", right: "next", up: "prev", down: "next", escape: "close", home: "first", end: "last", enter: "toggleSlideshow" }, // Functions to apply on key presses
                    events: { // Predefined event handlers
                        backgroundClick: function(){ $.yoxview.close() },
                        init: function(){
                            views.push(this);
                            if (this.options.cacheImagesInBackground && this.items.length)
                                cache.cacheItem(this);

                            // Need to trigger init only once per view:
                            this.removeEventListener("init");
                        },
                        loadSources: function(e){
                            var documentFragment,
                                createItems = [],
                                view = this,
                                sources = Array.prototype.slice.call(arguments, 1),
                                originalNumberOfItems = view.items.length;
                            
                            for(var i=0; i < sources.length; i++){
                                var sourceData = sources[i];
                                if (sourceData.createThumbnails){
                                    documentFragment = document.createDocumentFragment();
                                    for(var j = 0, count = sourceData.items.length; j < count; j++){
                                        var item = sourceData.items[j],
                                            thumbnailEl = view.options.createThumbnail(item, view.options);
        
                                        $(thumbnailEl).data("yoxviewIndex", item.id);
                                        item.thumbnail.element = thumbnailEl;
                                        item.thumbnail.generated = true;

                                        var thumbnailImages = thumbnailEl.getElementsByTagName("img");
                                        if (thumbnailImages.length)
                                            item.thumbnail.image = thumbnailImages[0];
        
                                        documentFragment.appendChild(thumbnailEl);
                                    }
                                }
        
                                view.items = view.items.concat(sourceData.items);
                                createItems = createItems.concat(sourceData.items);
                            }
        
                            for(var i=originalNumberOfItems, count=view.items.length; i < count; i++){
                                var item = view.items[i];
                                item.id = i + 1;
                                if (item.thumbnail && item.thumbnail.element)
                                    $(item.thumbnail.element).data("yoxviewIndex", item.id);
                            }
        
                            if (documentFragment){
                                view.container[0].appendChild(documentFragment);
                                view.triggerEvent("createThumbnails", { items: createItems, sources: sources });
                            }

                            if (!view.initialized){
                                view.initialized = true;
                                view.triggerEvent("init");
                            }
                        },
                        select: function(e, item){
                            var view = this;
                            if (this.isPlaying)
                                this.playTimeoutId = setTimeout(function(){ view.next.call(view, true); }, this.options.slideshowDelay + (this.options.transitionTime || 0));
                        },
                        thumbnailClick: function(e, item){
                            e.preventDefault();
                            this.selectItem(item);
                        }
                    }, // A function to call when the popup's background is clicked. (Applies only in popup mode)
                    container: docElement, // The element in which the viewer is rendered. Defaults to the whole window.
                    resizeMode: "fit", // The mode in which to resize the item in the container - 'fit' (shows the whole item, resized to fit inside the container) or 'fill' (fills the entire container).
                    slideshowDelay: 3000, // Time in milliseconds to display each image when in slideshow
                    storeDataSources: false // Whether to save to localStorage (if available) external data sources data, so as not to fetch it each time YoxView loads.

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
                        backgroundStyle: "background: Black",
                        cacheBuffer: 2, // The number of images to cache after the current image (directional, depends on the current viewing direction)
                        onBackgroundClick: null,
                        onBeforeOpen: function(){ window.scrollTo(0, 1); },
                        margin: 0,
                        padding: 0,
                        showInfo: true,
                        transitionTime: 0 // The time it takes to animate transitions between items or opening and closing.
                    },
                    regular: {
                        cacheBuffer: 5, // The number of images to cache after the current image (directional, depends on the current viewing direction)
                        margin: 20, // the minimum margin between the popup and the window
                        padding: 0,
                        showInfo: true,
                        transitionTime: 300 // The time it takes to animate transitions between items or opening and closing.
                    }
                }
			},
			$window = $(window);

        var cache = (function(){
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
                $(cacheImage).on("load", { cacheImageIndex: i }, onLoadImage);
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

                if (cacheImage.onCache)
                    cacheImage.onCache.call(view, item);

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
                if (!(view instanceof YoxView))
                    throw new TypeError("Invalid view for cacheItem.");

                if (!view)
                    throw new Error("View is required for cacheItem.");

                // Reset current cache count for outside calls:
                if (arguments.length < 4 || arguments[3] !== innerKey){
                    currentCacheCount = 0;
                }

                item = item || view.items[0];

                // Check whether the specified item is already being cached:
                for(var i = 0; i < concurrentCachedImagesCount; i++){
                    var cacheImage = cacheImages[i];
                    if (cacheImage.view && cacheImage.view.id === view.id && cacheImage.item && cacheImage.item.id === item.id){
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
                    cacheImage.img.src = "";
                    cacheImage.img.src = item.url;
                    cacheImage.onCache = onCache;
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

        function getPlatform(){
            var mobilePlatforms = /(Android)|(iPhone)|(iPod)/;

            // Consider the platform to be mobile if a predefined string in the userAgent is found or if the screen resolution is very small:
            return mobilePlatforms.test(navigator.userAgent) || (screen.width * screen.height < 400000) ? "mobile" : "regular";
        }


		return {
			add: function(container, options){
				var optionsEvents = $.extend({}, options.events),
                    platformConfig = config.platform[platform];
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

				return new YoxView(container, views.length, viewOptions, cache);
			},
            platform: platform
		}
	})();

    var utils = {
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
        }
    }

})(jQuery);