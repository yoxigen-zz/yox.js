yox.themes.wall = function(data, options){
    var elements = {},
        containerWidth;

    this.name = "wall";

    var thumbs = [],
        currentRowWidth = 0;

    this.config = {
        thumbnails: {
            createThumbnail: function(itemIndex, item, totalItems){
                var thumbnails = this,
                    thumbnail = document.createElement("a"),
                    thumbnailImg = document.createElement("img");

                var dimensions = { height: options.thumbnailsMaxHeight, width: Math.round(options.thumbnailsMaxHeight / item.ratio) };
                currentRowWidth += dimensions.width;
                thumbs.push({ element: thumbnailImg, dimensions: dimensions });

                if ((currentRowWidth  + options.borderWidth) >= containerWidth || itemIndex === totalItems - 1){
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
                        thumb.element.style.height = rowHeight + "px";
                        if (setWidth)
                            thumb.element.style.width = width + "px";
                    }

                    thumbs[thumbs.length - 1].element.style.marginRight = "0";

                    thumbs = [];
                    currentRowWidth = 0;
                }

                thumbnailImg.src = item.thumbnail.src;
                thumbnail.appendChild(thumbnailImg);
                thumbnail.setAttribute("href", item.url);
                return thumbnail;
            }
        }
    };

    this.create = function(container){
        var containerClass = this.getThemeClass();
        $(container).addClass(containerClass);
        elements.wall = document.createElement("div");
        elements.wall.className = this.getThemeClass() + " yoxthumbnails";
        elements.wall.style.padding = options.padding + "px";
        container.appendChild(elements.wall);
        containerWidth = container.clientWidth - options.padding * 2;

        var styleEl = document.createElement("style");
        styleEl.innerHTML = "." + containerClass + " img{ margin-right: " + options.borderWidth + "px; margin-bottom: " + options.borderWidth + "px; }";
        document.getElementsByTagName("head")[0].appendChild(styleEl);
    };
}

yox.themes.wall.defaults = {
    borderWidth: 7,
    padding: 10,
    thumbnailsMaxHeight: 200
};

yox.themes.wall.prototype = new yox.theme();