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
                    if (view.currentItem.url !== this.src && view.currentItem.thumbnail.src !== this.src){
                        return false;
                    }

                    if (!view.options.showThumbnailsBeforeLoad || this.loadingThumbnail){
                        this.loadingThumbnail = false;
                        var item = view.currentItem,
                            position = view.getPosition(item, view.containerDimensions, view.options);

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
                        var imageUrl = loadThumbnail && item.thumbnail ? item.thumbnail.src : item.url;
                        element.loading = true;
                        if (loadThumbnail)
                            element.loadingThumbnail = true;

                        if (element.src !== imageUrl){
                            element.src = "";
                            element.src = imageUrl;
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

            for(var i=originalNumberOfItems, count=view.items.length; i < count; i++){
                view.items[i].id = i + 1;
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
                this.transition.getPanel(item);
                this.transition.transition.call(this, { item: item });
                this.triggerEvent("select", item);
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
                if (this.currentItem){
                    this.selectItem(null);
                    this.triggerEvent("close");
                }
            },
            /**
             * Removes all elements created for the view, keyboard events.
             */
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

                if (currentItem && item && item.id === currentItem.id)
					return false;

                this.triggerEvent("beforeSelect", { newItem: item, oldItem: currentItem, data: data });
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
            unload: function(){
                // SOON
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
        }
    };
})(jQuery);