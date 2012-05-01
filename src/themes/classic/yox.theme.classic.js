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
                            elements.copyright.href = e.newItem.author.link || e.newItem.link;
                            elements.copyright.innerHTML = "&copy; " + (e.newItem.author.name || e.newItem.author);
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
                },
                "page.scroll": function(e){
                    this.report({ action: "Page thumbnails", value: e.direction });
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