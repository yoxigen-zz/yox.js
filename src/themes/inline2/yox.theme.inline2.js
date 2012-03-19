yox.themes.inline2 = function(data, options){
    var self = this,
        elements,
        mousemoveTimeoutId,
        isFullScreen,
        isFullScreenApi,
        isFullScreenResize,
        galleryOriginalHeight,
        controlsPanelRect,
        lastPos,
        isInfo = true,
        isThumbnails = true;

    var actions = {
        fullscreen: toggleFullScreen,
        info: function(){
            isInfo = !isInfo;
            elements.infoPanel.style.opacity = isInfo ? "1" : "0";
        },
        slideshow: function(){
            self.modules.view.toggleSlideshow();
        },
        thumbnails: function(){
            isThumbnails = !isThumbnails;
            elements.gallery.style.height = (elements.gallery.clientHeight + options.thumbnailsHeight * (isThumbnails ? -1 : 1)) + "px";
        }
    };

    this.name = "inline2";
    this.config = {
        view: {
            enableKeyboard: true,
            enlarge: true,
            resizeMode: "fill",
            transition: yox.view.transitions.fade,
            transitionTime: 300,
            margin: 0,
            events: {
                cacheStart: function(e, item){ elements.loader.style.display = "inline" },
                cacheEnd: function(e, item){ elements.loader.style.display = "none" },
                "click.thumbnails": function(e){ this.selectItem(e.index); },
                "init.view": function(){
                    this.selectItem(this.options.firstItem || 0);
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
        },
        scroll: {
            events: {
                "create.thumbnails": function(e, id){
                    this.update();
                },
                "select.thumbnails": function(e){
                    this.scrollTo(e, { centerElement: true, time: .5 });
                },
                resize: function(){ if (!isFullScreen) this.updateSize(); },
                beforeSelect: function(e){
                    var thumbnailIndex = e.newItem.id - 1;
                    if (self.modules.thumbnails.thumbnails)
                        this.scrollTo(self.modules.thumbnails.thumbnails[thumbnailIndex], { centerElement: !e.data });

                    elements.info.innerHTML = e.newItem.title || "";
                }
            },
            pressedButtonClass: "enabledThumbnailsButton"
        }
    };

    function emptyFunction(){};

    if (options.enableFullScreen !== false){
        document.cancelFullScreen = document.cancelFullScreen || document.mozCancelFullScreen || document.webkitCancelFullScreen || emptyFunction;
        HTMLElement.prototype.requestFullScreen = HTMLElement.prototype.requestFullScreen || HTMLElement.prototype.mozRequestFullScreen || HTMLElement.prototype.webkitRequestFullScreen || emptyFunction;
        isFullScreenApi = document.cancelFullScreen !== emptyFunction;
    }
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

        isFullScreenResize = false;
        onResize();
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
        controlsPanelRect = elements.controlsPanel.getClientRects()[0];
        if (isFullScreenResize)
            return false;

        if (!isFullScreen)
            setSize();

        self.modules.view.update(true);
        controlsPanelRect = elements.thumbnails.getClientRects()[0];
    }

    function onKeyDown(e){
        if (e.keyCode === 27)
            toggleFullScreen();
    }

    function onMouseMove(e){
        if (!lastPos || e.pageX < lastPos.x - 4 || e.pageX > lastPos.x + 4 || e.pageY < lastPos.y - 4 || e.pageY > lastPos.y + 4){
            clearTimeout(mousemoveTimeoutId);
            elements.controlsPanel.style.opacity = "1";
            //document.body.style.cursor = "default";

            mousemoveTimeoutId = setTimeout(function(){
                if (e.pageY >= controlsPanelRect.top && e.pageY <= controlsPanelRect.bottom && e.pageX >= controlsPanelRect.left && e.pageX <= controlsPanelRect.right)
                    return;

                elements.controlsPanel.style.opacity = "0";
                //document.body.style.cursor = "none";
            }, 1000);
        }
        lastPos = { x: e.pageX, y: e.pageY };
    }

    function setSize(){
        elements.gallery.style.height = (elements.container.clientHeight - options.thumbnailsHeight) + "px";
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

    this.create = function(container){
        $(container).addClass(this.getThemeClass());

        elements = {
            container: container,
            gallery: document.createElement("div"),
            viewer: document.createElement("div"),
            thumbnails: document.createElement("div"),
            thumbnailsPanel: document.createElement("div"),
            loader: document.createElement("loader"),
            description: document.createElement("p"),
            controlsPanel: document.createElement("div"),
            controls: [],
            infoPanel: document.createElement("div"),
            info: document.createElement("div")
        };

        elements.$thumbnails = $(elements.thumbnails);
        var thumbnailsBtnClass = this.getThemeClass("thumbnailsBtn");
        elements.thumbnailsPanel.className = this.getThemeClass("thumbnailsPanel");
        elements.thumbnailsPanel.innerHTML =
            '<a href="#" class="' + thumbnailsBtnClass + ' ' + thumbnailsBtnClass + '_left" data-yoxscroll-holdstart="scroll-left" data-yoxscroll-click="page-left"></a>' +
            '<a href="#" class="' + thumbnailsBtnClass + ' ' + thumbnailsBtnClass + '_right" data-yoxscroll-holdstart="scroll-right" data-yoxscroll-click="page-right"></a>';
        elements.thumbnailsPanel.appendChild(elements.thumbnails);

        this.config.scroll.elements = $("a", elements.thumbnailsPanel);
        container.appendChild(elements.gallery);
        elements.gallery.appendChild(elements.viewer);
        elements.gallery.appendChild(elements.description);
        container.appendChild(elements.thumbnailsPanel);
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

        for(var i=0; i<controls.length; i++){
            elements.controlsPanel.appendChild(createButton(controls[i]));
        }
        $(elements.controlsPanel).on("click", "a", function(e){
            e.preventDefault();
            actions[this.getAttribute("data-action")]();
        });

        elements.gallery.appendChild(elements.controlsPanel);

        elements.infoPanel.appendChild(elements.info);
        elements.gallery.appendChild(elements.infoPanel);

        elements.infoPanel.className = this.getThemeClass("infoPanel");
        elements.info.className = this.getThemeClass("info");

        galleryOriginalHeight = elements.gallery.clientHeight;

        controlsPanelRect = elements.controlsPanel.getClientRects()[0];
        setSize();
        //if (options.enableFullScreen !== false)
          //  $(elements.gallery).on("dblclick", toggleFullScreen);

        $(elements.gallery).on("mousemove", onMouseMove);
        $(window).on("resize", resizeEventHandler);
    };

    this.destroy = function(){
        $(elements.container).removeClass(this.getThemeClass());
        elements.container.removeChild(elements.gallery);
        elements.container.removeChild(elements.thumbnailsPanel);
        elements = null;

        $(window).off("resize", resizeEventHandler);
    };
}

yox.themes.inline2.defaults = {
    thumbnailsHeight: 61
};

yox.themes.inline2.prototype = new yox.theme();