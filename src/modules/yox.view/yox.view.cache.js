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