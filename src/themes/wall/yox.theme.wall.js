yox.themes.wall = function(data, options){
    var elements = {},
        containerWidth,
        self = this,
        isLoading, // Flag indicating whether new contents are currently being fetched
        loadedAllItems = false; // Flag indicating whether all the items have been loaded (all the possible items, after loading all pages)

    this.name = "wall";

    var loadingClass = this.getThemeClass("loading"),
        thumbs = [],
        currentRowWidth = 0;

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
                        yox.utils.dom.scrollIntoView(e.newItem.thumbnail.element, self.container, options.scrollAnimationDuration, options.scrollOffset);
                    }
                }
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
                showThumbnail = isFullRow || loadedAllItems,
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

    var thumbnailsResizeTimeoutId;
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
        $(elements.wall).removeClass(loadingClass);
    }

    function onImageLoad(e){
        this.style.visibility = "visible";
        this.style.setProperty(yox.utils.browser.getCssPrefix() + "transform", "scale(1)");
        this.removeEventListener("load", onImageLoad, false);
    }

    function loadItems(){
        isLoading = true;
        $(elements.wall).addClass(loadingClass);
        loadMoreItems();
    }

    data.addEventListener("loadSources", setDataSource);

    this.create = function(container){
        this.container = container;
        var containerClass = this.getThemeClass();

        function getContainerWidth(){
            containerWidth = container.clientWidth - options.padding * 2;
        }

        $(container).addClass(containerClass);
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

        styleEl.innerHTML = " ." + containerClass + " a{ " + thumbnailStyle.join("; ") + " }";
        document.getElementsByTagName("head")[0].appendChild(styleEl);

        $(window).on("resize", function(e){
            clearTimeout(thumbnailsResizeTimeoutId);
            thumbnailsResizeTimeoutId = setTimeout(function(){
                getContainerWidth();
                thumbs = [];
                currentRowWidth = 0;
                updateThumbnails();
            }, 50);
        });

        var scrollElement = container === document.body ? document : container,
            scrollElementForMeasure = container;

        // All non-webkit browsers measure scrollTop for the body element in the HTML element rather than the document (Firefox 13, IE9, Opera 11.62):
        if (!$.browser.webkit && container === document.body)
            scrollElementForMeasure = document.documentElement;

        elements.loader = document.createElement("div");
        elements.loader.className = this.getThemeClass("loader");
        elements.loader.style.paddingBottom = (options.borderWidth + options.padding) + "px";

        container.appendChild(elements.loader);

        // Used for infinite scrolling:
        function onScroll(e){
            // When reaching the scroll limit, check for new contents:
            if (!isLoading && scrollElementForMeasure.scrollTop >= scrollElementForMeasure.scrollHeight - scrollElementForMeasure.clientHeight - options.thumbnailsMaxHeight){
                loadItems();
            }
        }

        scrollElement.addEventListener("scroll", onScroll, false);

        self.addEventListener("loadedAllItems", function(){
            scrollElement.removeEventListener("scroll", onScroll, false);
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