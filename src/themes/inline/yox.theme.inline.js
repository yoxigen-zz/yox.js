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
        elements.description = this.getThemeClass("description");

        if (options.title)
            elements.title.innerHTML = options.title;

        galleryOriginalHeight = elements.gallery.clientHeight;
        thumbnailsRect = elements.thumbnails.getClientRects()[0];

        $(elements.gallery).on("dblclick", toggleFullScreen);
        $(window).on("resize", onResize);
    };

    this.destroy = function(){
        $(elements.container).removeClass(this.getThemeClass());
        elements.removeChild(elements.title);
        elements.removeChild(elements.gallery);
        elements.removeChild(elements.description);
        elements = null;

        $(window).off("resize", onResize);
    };
}

yox.themes.inline.prototype = new yox.theme();