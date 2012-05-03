yox.themes.wall = function(data, options){
    var elements = {},
        containerWidth,
        self = this,
        isLoading; // Flag indicating whether new contents are currently being fetched

    this.name = "wall";

    var thumbs = [],
        currentRowWidth = 0;

    this.config = {
        thumbnails: {
            createThumbnail: function(itemIndex, item, totalItems){
                var thumbnail = document.createElement("a"),
                    thumbnailImg = document.createElement("img");

                var dimensions = { height: options.thumbnailsMaxHeight, width: Math.round(options.thumbnailsMaxHeight / item.ratio) };
                thumbnail.dimensions = dimensions;

                thumbnailImg.src = item.thumbnail.src;
                thumbnail.appendChild(thumbnailImg);
                thumbnail.setAttribute("href", item.url);

                calculateDimensions(thumbnail, itemIndex, totalItems);
                return thumbnail;
            }
        }
    };

    function calculateDimensions(thumbnail, index, totalThumbnailsCount, isUpdate){
        currentRowWidth += thumbnail.dimensions.width;
        thumbs.push(thumbnail);

        var isLastThumbnail = index === totalThumbnailsCount - 1;
        if ((currentRowWidth  + options.borderWidth) >= containerWidth || isLastThumbnail){
            var rowAspectRatio = containerWidth / currentRowWidth,
                rowHeight = Math.round(thumbs[0].dimensions.height * rowAspectRatio),
                setWidth = true;

            if (rowHeight > options.thumbnailsMaxHeight){
                rowHeight = options.thumbnailsMaxHeight;
                setWidth = false;
            }
            for(var i=0, thumb; thumb = thumbs[i]; i++){
                var borderWidth = i < thumbs.length - 1 ? options.borderWidth : 0,
                    width = Math.floor(thumb.dimensions.width * rowAspectRatio - borderWidth);

                thumb.style.height = rowHeight + "px";
                if (setWidth)
                    thumb.style.width = width + "px";
                else if (isLastThumbnail)
                    thumb.style.width = thumb.dimensions.width + "px";
            }

            if (!isLastThumbnail){
                thumbs[thumbs.length - 1].style.marginRight = "0";
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

    function loadMoreItems(){
        dataSource.offset = data.countItems();
        var itemsLeft = totalItems - dataSource.offset;
        if (itemsLeft < dataSource.pageSize)
            dataSource.pageSize = itemsLeft;

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
    }

    data.addEventListener("loadSources", setDataSource);

    this.create = function(container){
        var containerClass = this.getThemeClass();

        function getContainerWidth(){
            containerWidth = container.clientWidth - options.padding * 2;
        }

        $(container).addClass(containerClass);
        elements.wall = document.createElement("div");
        elements.wall.className = this.getThemeClass() + " yoxthumbnails";
        elements.wall.style.padding = options.padding + "px";
        container.appendChild(elements.wall);
        getContainerWidth();

        var styleEl = document.createElement("style"),
            imgStyle = [
                //"opacity: 0",
                "width: 100%",
                "height: 100%",
                "visibility: hidden",
                yox.utils.browser.getCssPrefix() + "transform: scale(0.5)",
                yox.utils.browser.getCssPrefix() + "transition: " + yox.utils.browser.getCssPrefix() + "transform 300ms ease-out"
            ],
            thumbnailStyle = [
                "display: inline-block",
                "margin-right: " + options.borderWidth + "px",
                "margin-bottom: " + options.borderWidth + "px",
                "background: #ddd"
            ];

        styleEl.innerHTML = "." + containerClass + " img{ " +  imgStyle.join("; ") + " } ." + containerClass + " a{ " + thumbnailStyle.join("; ") + " }";
        document.getElementsByTagName("head")[0].appendChild(styleEl);
        container.addEventListener("load", function(e){
            if (e.target.nodeName === "IMG"){
                e.target.style.visibility = "visible";
                e.target.style.setProperty(yox.utils.browser.getCssPrefix() + "transform", "scale(1)");
            }
        }, true);

        $(window).on("resize", function(e){
            clearTimeout(thumbnailsResizeTimeoutId);
            thumbnailsResizeTimeoutId = setTimeout(function(){
                getContainerWidth();
                thumbs = [];
                currentRowWidth = 0;
                updateThumbnails();
            }, 50);
        });

        var scrollElement = container === document.body ? document : container;
        // Used for infinite scrolling:
        function onScroll(e){
            // When reaching the scroll limit, check for new contents:
            if (!isLoading && container.scrollTop >= container.scrollHeight - container.clientHeight - options.thumbnailsMaxHeight){
                isLoading = true;
                loadMoreItems();
            }
        }

        scrollElement.addEventListener("scroll", onScroll, false);

        self.addEventListener("loadedAllItems", function(){
            scrollElement.removeEventListener("scroll", onScroll, false);
            data.removeEventListener("loadSources", setDataSource);
        });
    };
}

yox.themes.wall.defaults = {
    borderWidth: 7,
    padding: 10,
    thumbnailsMaxHeight: 200
};

yox.themes.wall.prototype = new yox.theme();