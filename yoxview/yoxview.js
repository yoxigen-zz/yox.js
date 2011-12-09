(function($){
	$.fn.yoxview = function(options) 
	{
		if (this.length != 0)
		{
			if ($.yoxview[options])
				return $.yoxview[options].apply(this, Array.prototype.slice.call(arguments, 1));
			else if (typeof options === 'object' || !options)
				$.yoxview.add(this, options);
			else
			  $.error( 'Method ' +  options + ' does not exist on YoxView.' );
		}
		return this;
	};

	function YoxView(container, id, options){
		this.container = container;
		this.options = options;
		this.id = id;

        function distributeMeasures(original){
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

        this.options.popupMargin = distributeMeasures(this.options.popupMargin);
        this.options.popupPadding = distributeMeasures(this.options.popupPadding);
        		
		this.init();
	}

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
        if ( transitionDuration && transitionDuration !== "transitionDuration" ) {
            $.cssHooks.transitionDuration = {
                get: function( elem, computed, extra ) {
                    return $.css( elem, transitionDuration );
                },
                set: function( elem, value) {
                    elem.style[ transitionDuration ] = value;
                }
            };
        }
    })();
	YoxView.prototype = {
        addSources: function(sources, onDone){
            var deferredPromises = [],
                self = this;
            
            for(var i=0; i<sources.length; i++){
                var promise = this.loadSource(sources[i]);
                if (promise)
                    deferredPromises.push(promise);
            }

            $.when.apply(this, deferredPromises).done(function () {
                var documentFragment;
                
                for(var i=0; i < arguments.length; i++){
                    var sourceData = arguments[i];
                    if (sourceData.createThumbnails){
                        documentFragment = documentFragment || document.createDocumentFragment();
                        for(var j = 0, count = sourceData.items.length; j < count; j++){
                            var item = sourceData.items[j],
                                thumbnailEl = self.options.createThumbnail(item);

                            $(thumbnailEl).data("yoxviewIndex", item.id);
                            item.thumbnail.element = thumbnailEl;

                            var thumbnailImages = thumbnailEl.getElementsByTagName("img");
                            if (thumbnailImages.length)
                                item.thumbnail.image = thumbnailImages[0];
                            
                            documentFragment.appendChild(thumbnailEl);
                        }
                    }
                }

                if (documentFragment)
                    self.container[0].appendChild(documentFragment);
                
                if (onDone)
                    onDone(arguments);
            });
        },
        cacheCount: 0,
		dataSources: {},
        items: [],
		init: function(){
			var self = this,
                sources = [this.container],
                optionsSource = this.options.source;

            if (optionsSource){
                if (optionsSource instanceof Array)
                    sources = sources.concat(optionsSource);
                else
                    sources.push(optionsSource);
            }

            this.addSources(sources, function(){
                if (self.options.onInit){
                    for(var i=0; i<self.options.onInit.length; i++){
                        self.options.onInit[i].call(null, self);
                    }
                }
            });
            
			// Apply event handlers:
			this.container.on("click.yoxview", "a:has('img')", { yoxviewViewId: this.id }, function(e){ 
				e.preventDefault(); 
				$.yoxview.open({ viewId: e.data.yoxviewViewId, item: self.items[$(e.currentTarget).data("yoxviewIndex") - 1],  srcElement: e.currentTarget });
			});
		},
        loadSource: function(source){
            var self = this,
                onLoadSource = function(sourceData){
                    var startIndex = self.items.length;

                    self.store(source, sourceData);
                    for(var i=0, count=sourceData.items.length; i < count; i++){
                        var item = sourceData.items[i];
                        item.id = ++startIndex;
                        if (item.thumbnail && item.thumbnail.element)
                            $(item.thumbnail.element).data("yoxviewIndex", item.id);
                    }

                    self.items = self.items.concat(sourceData.items);
                    dfd.resolve(sourceData);
                };


            for(var dataSourceName in this.dataSources){
				var dataSource = this.dataSources[dataSourceName];

				if (dataSource.match(source)){
                    var dfd = $.Deferred(),
                        savedSourceData = self.store(source);

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
				}
			}
        },
        store: function(key, data){
            if (!this.options.storeDataSources || !window.localStorage || typeof(key) !== "string")
                return;

            var keyName = "yoxview.source." + key;

            if (!data){
                var item = window.localStorage.getItem(keyName);
                if (item)
                    return JSON.parse(item);

                return;
            }
            window.localStorage.setItem(keyName, JSON.stringify(data));
            return;
        }
	};

    var utils = (function(){
        var cssStylePrefix;
        return {
            getCssStylePrefix: function(){
                if (!cssStylePrefix)
                    cssStylePrefix =
                        $.browser.msie ? "-ms-" :
                        $.browser.mozilla ? "-moz-" :
                        $.browser.webkit ? "-webkit-" :
                        $.browser.opera ? "-o-" : "";

                return cssStylePrefix;
            }
        };
    })();

	$.yoxview = (function(){
		var views = [],
			isInit,
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
			currentPanelIndex = 0,
            currentDirection = 1,
            thumbnailsActions = {
                createThumbnail: function(item){
                    var $thumbnail = $("<a>", {
                        href: item.link || item.url,
                        title: item.title,
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
                    keyPress: { left: "prev", right: "next", up: "prev", down: "next", escape: "close", home: "first", end: "last" }, // Functions to apply on key presses
                    onBackgroundClick: function(){ $.yoxview.close() }, // A function to call when the popup's background is clicked. (Applies only in popup mode)
                    popupContainer: docElement, // The element in which the viewer is rendered. Defaults to the whole window.
                    resizeMode: "fit", // The mode in which to resize the item in the container - 'fit' (shows the whole item, resized to fit inside the container) or 'fill' (fills the entire container).
                    storeDataSources: true // Whether to save to localStorage (if available) external data sources data, so as not to fetch it each time YoxView loads.
                },
                mobile: {
                    backgroundStyle: "background: Black",
                    cacheBuffer: 2, // The number of images to cache after the current image (directional, depends on the current viewing direction)
                    onBackgroundClick: null,
                    onBeforeOpen: function(){ window.scrollTo(0, 1); },
                    showInfo: true,
                    transitionTime: 0 // The time it takes to animate transitions between items or opening and closing.
                },
                regular: {
                    cacheBuffer: 5, // The number of images to cache after the current image (directional, depends on the current viewing direction)
                    popupMargin: 20, // the minimum margin between the popup and the window
                    popupPadding: 0,
                    showInfo: true,
                    transitionTime: 500 // The time it takes to animate transitions between items or opening and closing.
                }
			},
			$window = $(window);
        
		var viewActions = {
			// Closes the popup, resets the viewer.
			close: function(){
				if (!isOpen)
					return false;
					
				viewActions.resizeToThumbnail(currentItem.thumbnail.image, true);
				setTimeout(function(){ elements.$yoxviewPopup.hide(); }, currentView.options.transitionTime);
				
				if (currentView.options.enableKeyPresses)
					$.yoxview.keyPresses.disable();
				
		
				if (currentView.options.onClose)
					currentView.options.onClose.call(currentView);

                elements.$background.hide();
				currentView = currentPopupContainer = currentPopupContainerDimensions = currentViewSelectedThumbnailClass = currentPopupContainerIsDocElement = currentItem = null;
				isOpen = false;
				
				return true;
			},
			first: function(){
				if (!currentItem)
					return false;

                viewActions.selectItem(currentView.items[0]);
                return currentItem;
			},
            last: function(){
				if (!currentItem)
					return false;

                viewActions.selectItem(currentView.items[currentView.items.length - 1]);
                return currentItem;
			},
			next: function(){
				if (!currentItem)
					return false;

                currentDirection = 1;
				var nextItemId = currentItem.id === currentView.items.length ? 0 : currentItem.id;
				viewActions.selectItem(currentView.items[nextItemId]);
				
				return currentItem;
			},
			// Opens the popup; 1. Set the popup on the thumbnail, 2. Sets the current view and item, 3. Selects the specified item.
			// Params: e (object): { item (object): itemData, viewId (number): ID of the view to open.
			open: function(e){
                e = e || {};
				if (!isOpen){
					currentView = views[e.viewId || 0];
					currentViewSelectedThumbnailClass = currentView.options.selectedThumbnailClass;

					if (!e.item)
						e.item = currentView.items[0];

                    viewActions.updatePopup();
					viewActions.resizeToThumbnail(e.item.thumbnail.image, false);
					
					currentPopupContainer = currentView.options.popupContainer;
					currentPopupContainerIsDocElement = currentPopupContainer === docElement;
					viewActions.setPopupContainerDimensions();
					viewActions.resizeStaticStyleTransitions = viewActions.resizeStaticStyleTransitionsDefault.replace(/TIME/g, currentView.options.transitionTime + "ms");
					
					if (currentView.options.enableKeyPresses)
						$.yoxview.keyPresses.enable();

                    if (currentView.options.onBeforeOpen)
                        currentView.options.onBeforeOpen.call(currentView, { item: e.item });

                    if (currentView.options.popupContainer === docElement)
                        elements.$background.show();
				}

				viewActions.selectItem(e.item);
			},
			prev: function(){
				if (!currentItem)
					return false;

                currentDirection = -1;
				var prevItemId = currentItem.id === 1 ? currentView.items.length - 1 : currentItem.id - 2;
				viewActions.selectItem(currentView.items[prevItemId]);
				
				return currentItem;
			},
			// Resizes the popup to the current item's dimensions, limited by the popup container's dimensions and margins.
			// Params: useTransitions (boolean): If true, the resize is animated, callback (function): A function to call after the resize is done.
			resize: function(useTransitions, callback){
				var popupSize = this.resizeModes[currentView.options.resizeMode](currentItem);
				viewActions.setPopupStyle(popupSize, 1, useTransitions);
                if (!currentView.options.zoom)
				    elements.panels[currentPanelIndex].css({ width: newWidth, height: newHeight });

				if (callback)
					callback(popupSize);
			},
            resizeModes: {
                fill: function(item){
                    var maxOrMin = currentView.options.enlarge ? Math.max : Math.min,
                        newWidth = maxOrMin.call(null, item.width, currentPopupContainerDimensions.width),
					    newHeight = Math.round(newWidth * item.ratio),
					    maxHeight = currentPopupContainerDimensions.height;

                    if (newHeight < maxHeight && (maxHeight <= item.height || options.enlarge)){
                        newHeight = maxHeight;
                        newWidth = Math.round(newHeight / item.ratio);
                    }

                    return {
						left: (currentPopupContainerDimensions.width - newWidth) / 2,
						top: (currentPopupContainerDimensions.height - newHeight) / 2,
						width: newWidth,
						height: newHeight
					};
                },
                fit: function(item){
                    var options = currentView.options,
                        popupMargin = options.popupMargin,
                        popupPadding = options.popupPadding,
                        maxOrMin = options.enlarge ? Math.max : Math.min,
                        newWidth = maxOrMin.call(null, item.width, currentPopupContainerDimensions.width - popupMargin.horizontal - popupPadding.horizontal),
                        newHeight = Math.round(newWidth * currentItem.ratio),
                        maxHeight = currentPopupContainerDimensions.height - popupMargin.vertical - popupPadding.vertical;

                    if (newHeight > maxHeight){
                        newHeight = maxHeight;
                        newWidth = Math.round(newHeight / currentItem.ratio);
                    }
                    
                    var containerPos = currentPopupContainerIsDocElement ? undefined : currentPopupContainer.getClientRects()[0];
                    return {
                        left: (currentPopupContainerDimensions.width - newWidth) / 2 + (containerPos ? containerPos.left : 0) + (popupMargin.left - popupMargin.right) - popupPadding.left,
                        top: (currentPopupContainerDimensions.height - newHeight + (popupMargin.top - popupMargin.bottom)) / 2 + (containerPos ? containerPos.top : 0) - popupPadding.top,
                        width: newWidth,
                        height: newHeight
                    };
                }
            },
			resizeStaticStyleBase: "display: block; ",
            resizeStaticStyleView: "",
			resizeStaticStyleTransitions: "",
			resizeStaticStyleTransitionsDefault: utils.getCssStylePrefix() + "transition: all TIME ease-out; -webkit-transform: translateZ(0);",
			resizeToThumbnail: function(thumbnailEl, useTransitions){
				var thumbnailPosition = $(thumbnailEl).offset();
				
				viewActions.setPopupStyle({
					width: thumbnailEl.clientWidth,
					height: thumbnailEl.clientHeight,
					top: thumbnailPosition.top - $window.scrollTop(),
					left: thumbnailPosition.left - $window.scrollLeft() }, 0, useTransitions);
			},
            onImageLoad: function(e){
                var $currentPanel = elements.panels[currentPanelIndex];
                if (!isOpen){
                    $currentPanel.css({ width: currentItem.ratio > 1 ? "100%" : "auto", height: currentItem.ratio <= 1 ? "100%" : "auto" });
                }
                elements.panels[1].css("opacity", currentPanelIndex);
                
                viewActions.resize(true, elements.panels[currentPanelIndex].callback);

                if (currentView.options.onSelect)
                    currentView.options.onSelect.call(currentItem, currentItem);
            },
			// Does the actual displaying of the selected item. Switches between the current and next items, if there was one selected:
			selectItem: function(item, callback){
				if (currentItem && item.id === currentItem.id)
					return false;

				if (currentItem && currentViewSelectedThumbnailClass && currentItem.thumbnail)
					$(currentItem.thumbnail.element).removeClass(currentViewSelectedThumbnailClass);
					
				currentItem = item;

                if (currentViewSelectedThumbnailClass && currentItem.thumbnail)
                    $(currentItem.thumbnail.element).addClass(currentViewSelectedThumbnailClass);

                isOpen = true;
                currentPanelIndex = currentPanelIndex === 1 ? 0 : 1;

                cache.withItem(item, function(){

                    var currentPanel = elements.panels[currentPanelIndex];
                    if (currentPanel.attr("src") !== item.url){
                        currentPanel.callback = callback;
                        currentPanel.attr("src", item.url);
                        if (window.chrome){ // This fixes a bug in Chrome 16, without it the second image doesn't show on the first run.
                            var otherPanel = elements.panels[currentPanelIndex === 1 ? 0 : 1];
                            if (!otherPanel.attr("src"))
                                otherPanel.attr("src", item.url);
                        }
                    }
                    else
                        viewActions.onImageLoad();
                });
			},
			setPopupContainerDimensions: function(){
				currentPopupContainerDimensions = { width: currentPopupContainer.clientWidth, height: currentPopupContainer.clientHeight };
			},
			setPopupStyle: function(popupProperties, opacity, useTransitions){
				var popupStyle = [];
				for(var property in popupProperties){
					popupStyle.push(property, ": ", popupProperties[property], "px;");
				}
				popupStyle.push(viewActions.resizeStaticStyleBase);
                popupStyle.push(viewActions.resizeStaticStyleView);
				popupStyle.push("opacity: ", opacity, ";");
				
				if (useTransitions)
					popupStyle.push(viewActions.resizeStaticStyleTransitions);
					
				// Set all the styles at once, to avoid animation stuttering (noticeable in FF8):
				elements.$yoxviewPopup[0].setAttribute("style", popupStyle.join(""));
			},
            // Modifies the popup element according to the current view's options:
            updatePopup: function(){
                var style = [],
                    options = currentView.options,
                    padding = options.popupPadding;

                for(var side in padding){
                    style.push("padding-", side, ": ", padding[side], "px;");
                }

                elements.$yoxviewPopup.attr("class", "yoxviewPopup yoxviewPopup_" + platform);

                for(var i=elements.panels.length; i--;){
                    elements.panels[i].css({ transitionDuration: options.transitionTime + "ms" });
                }

                style.push("position: ", options.resizeMode === "fill" ? "absolute" : "fixed", ";");
                this.resizeStaticStyleView = style.join("");
                if (options.backgroundStyle)
                    elements.$background.attr("style", options.backgroundStyle);
                else
                    elements.$background.removeAttr("style");

                if (elements.$yoxviewPopup.parent() !== options.popupContainer)
                    elements.$yoxviewPopup.appendTo(options.popupContainer);

            }
		};

        var cache = (function(){
            var currentCacheIndex,
                cacheView,
                currentCacheCount = 0,
                concurrentCachedImagesCount = 2,
                cacheImages = [],
                currentCachedImageIndex = 0,
                innerKey = (new Date()).valueOf(),
                cachingCount = 0; // The number of currently loading images

            for(var i=0; i<concurrentCachedImagesCount; i++){
                var cacheImage = new Image();
                $(cacheImage).on("load", { cacheImageIndex: i }, onLoadImage);
                cacheImages.push({ img: cacheImage });
            }

            function updateViewCacheAndAdvance(increaseCacheCount){
                var advance = true;
                currentCacheCount++;
                if (increaseCacheCount && (++cacheView.cacheCount) === cacheView.items.length){
                    delete cacheView.cacheCount;
                    cacheView.isLoaded = true;
                    advance = false;
                }

                if (advance)
                    advance = (currentCacheCount + cachingCount < cacheView.options.cacheBuffer);

                if (advance)
                    advanceCache();
            }

            function onLoadImage(e){
                var cacheImage = cacheImages[currentCachedImageIndex = e.data.cacheImageIndex],
                    item = cacheImage.item,
                    loadedThumbnailClass;

                item.width = this.width;
                item.height = this.height;
                item.ratio = this.height / this.width;
                item.isLoaded = true;

                if (cacheImage.onCache)
                    cacheImage.onCache.call(item);

                if (loadedThumbnailClass = cacheView.options.loadedThumbnailClass)
                    $(item.thumbnail.element).addClass(loadedThumbnailClass);

                cachingCount--;
                delete cacheImage.item;
                updateViewCacheAndAdvance(true);
            }

            function advanceCache(){
                var itemsCount = cacheView.items.length,
                    nextItemIndex = currentCacheIndex + currentDirection;
                if (nextItemIndex === itemsCount)
                    nextItemIndex = 0;
                else if (nextItemIndex === -1)
                    nextItemIndex += itemsCount;

                cacheItem(cacheView.items[nextItemIndex], null, innerKey);
            }

            function cacheItem(item, onCache){
                if (item instanceof YoxView){
                    cacheView = item;
                    item = undefined;
                }

                // Reset current cache count for outside calls:
                if (arguments.length < 3 || arguments[2] !== innerKey){
                    currentCacheCount = 0;
                }
                
                if (!item){
                    if (!cacheView)
                        cacheView = views[0];

                    if (!cacheView)
                        return false;

                    return cacheItem(cacheView.items[0], onCache, innerKey);
                }

                // Check whether the specified item is already being cached:
                for(var i = 0; i < concurrentCachedImagesCount; i++){
                    var cacheImage = cacheImages[i];
                    if (cacheImage.item && cacheImage.item.id === item.id){
                        return true;
                    }
                }
                
                currentCacheIndex = item.id - 1;
                
                if (!item.isLoaded && item.type === "image"){
                    var cacheImage = cacheImages[currentCachedImageIndex];
                    cacheImage.item = item;
                    cacheImage.img.src = item.url;
                    cacheImage.onCache = onCache;
                    cachingCount++;

                    if (++currentCachedImageIndex === cacheImages.length)
                        currentCachedImageIndex = 0;

                    // Init another cache, if there are available slots:
                    if (cachingCount < concurrentCachedImagesCount && currentCacheCount + cachingCount < cacheView.options.cacheBuffer)
                        advanceCache();
                }
                else{
                    updateViewCacheAndAdvance(!item.isLoaded);
                    item.isLoaded = true;
                }

                return true;
            }

            function withItem(item, onCache){
                // Reset current cache count for outside calls:
                if (arguments.length < 3 || arguments[2] !== innerKey)
                    currentCacheCount = 0;
                
                if (item.isLoaded){
                    onCache.call(item);
                    currentCacheIndex = item.id - 1;
                    if (!cacheView.isLoaded){
                        updateViewCacheAndAdvance(false);
                    }
                }
                else{
                    cacheItem(item, onCache, innerKey);
                }
            }

            return {
                cacheItem: cacheItem,
                withItem: withItem
            };
        })();

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
				if (currentView && isOpen)
				{
					var pK = keyboard.map[e.keyCode],
						calledFunction = $.yoxview[currentView.options.keyPress[pK]];
						
					if (calledFunction)
					{
						e.preventDefault();
						calledFunction.apply($.yoxview);
						return false;
					}
					return true;
				}
				return true;
			}
		};

        function getPlatform(){
            var mobilePlatforms = /(Android)|(iPhone)|(iPod)/;

            // Consider the platform to be mobile if a predefined string in the userAgent is found or if the screen resolution is very small:
            return mobilePlatforms.test(navigator.userAgent) || (screen.width * screen.height < 400000) ? "mobile" : "regular";
        }

		// Inject into the DOM all the elements required:
		function setup(){
			var $yoxviewPopup = $("<div>", {
				className: "yoxviewPopup"
			});
			
			elements.panels = [];
			for(var i=0; i<2; i++){
				var $img = $("<img>", { src: "" });
				if (i > 0)
					$img.css({opacity: "0"});

                $img.load(viewActions.onImageLoad);
				elements.panels.push($img.appendTo($yoxviewPopup));
			}

            elements.$background = $('<div class="yoxviewPopupBackground"></div>').appendTo(document.body);
            elements.$background.on("click",
                function(e){ if (currentView.options.onBackgroundClick) currentView.options.onBackgroundClick.call(currentView, e); }
            );

			elements.$yoxviewPopup = $yoxviewPopup.appendTo(document.body);
		}
		
		function init(){
			setup();
			
			$window.on("resize", $.yoxview.update);
			isInit = true;
		}
		
		
		
		return {
			add: function(container, options){
				if (!isInit)
					init();

				var viewOptions = $.extend({}, config.defaults, config[platform], options);
				
				viewOptions.onInit = viewOptions.onInit ? [viewOptions.onInit] : [];
				viewOptions.onInit.splice(0, 0, function(view){ views.push(view); } );
				
				if (viewOptions.cacheImagesInBackground){
					viewOptions.onInit.splice(1, 0, cache.cacheItem);
				}
				new YoxView(container, views.length, viewOptions);
			},
			addDataSource: function(dataSource){
                // Add the data source if it doesn't exist yet:
				if (!YoxView.prototype.dataSources[dataSource.name])
				    YoxView.prototype.dataSources[dataSource.name] = dataSource;
			},
			close: viewActions.close,
			first: viewActions.first,
			keyPresses: {
				enable: function(){	$(document).on("keydown.yoxview", keyboard.onKeyDown); },
				disable: function(){ $(document).off("keydown.yoxview", keyboard.onKeyDown); }
			},
			last: viewActions.last,
			next: viewActions.next,
			open: viewActions.open,
			prev: viewActions.prev,
			update: function(useTransitions, callback){
				if (isOpen){
					viewActions.setPopupContainerDimensions();
					viewActions.resize(useTransitions === true, callback);
				}
			}
		}
	})();
	
})(jQuery);