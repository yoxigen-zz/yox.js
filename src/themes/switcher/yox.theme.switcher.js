yox.themes.switcher = function(data, options){
    var elements,
        self = this,
        isOpen = false,
        navButtonWidth = 70,
        lastNavButton,
        openTimeoutId,
        throttledSetNavButtons = yox.utils.performance.throttle(function(item){
            setNavButton(elements.buttons.prev, elements.buttons.prevImg, item.previous);
            setNavButton(elements.buttons.next, elements.buttons.nextImg, item.next);
        }, 0);

    function setNavButton(button, buttonImg, item){
        if (item){
            buttonImg.src = item.thumbnail.src;
            button.style.marginTop = Math.floor((navButtonWidth * item.ratio) / -2) + "px";
            if (!button.hasItem)
                button.style.display = "block";

            button.hasItem = true;
        }
        else{
            if (button.hasItem)
                button.style.display = "none";

            button.hasItem = false;
        }
    }

    this.name = "switcher";

    this.config = {
        view: {
            displayInfo: true,
            enableKeyboard: true,
            enlarge: false,
            loop: false,
            resizeMode: "fit",
            transition: yox.view.transitions.thumbnails,
            transitionTime: 400,
            margin: { top: 45, right: 40, left: 40, bottom: 30 },
            showThumbnailsBeforeLoad: true,
            events: {
                "click.thumbnails": function(e, sender){
                    if (isOpen && e.isSelected){
                        this.close();
                        sender.unselect();
                    }
                    else
                        this.selectItem(e.index);
                },
                beforeSelect: function(e){
                    if (e.newItem){
                        if (!isOpen){
                            clearTimeout(openTimeoutId);
                            openTimeoutId = setTimeout(function(){
                                $(elements.container).addClass(self.getThemeClass("open"));
                                elements.buttons.wrapper.classList.add(self.getThemeClass("nav-enabled"));
                            }, self.config.view.transitionTime + 100);
                            isOpen = true;
                        }
                        else{
                            //e.newItem.openFromElement = lastNavButton;
                        }

                        throttledSetNavButtons(e.newItem);
                    }
                },
                close: function(e){
                    clearTimeout(openTimeoutId);
                    openTimeoutId = setTimeout(function(){
                        elements.buttons.wrapper.classList.remove(self.getThemeClass("nav-enabled"));
                        $(elements.container).removeClass(self.getThemeClass("open"));
                    }, self.config.view.transitionTime + 100);
                    self.modules.view.close();
                    isOpen = false;
                },
                keydown: function(e){
                    var keyHandler = yox.view.config.keys[e.key];
                    if (keyHandler)
                        this[keyHandler]();
                }
            }
        },
        controller: {
            keydownFrequency: options.keydownFrequency
        }
    };

    data.addEventListener("clear", function(){
        self.modules.view.close();
    });
    function resizeEventHandler(){
        self.modules.view.update();
    }

    this.create = function(container){
        elements = {
            view: document.createElement("div"),
            container: container,
            buttons: {
                wrapper: document.createElement("div"),
                prev: document.createElement("a"),
                prevImg: document.createElement("img"),
                next: document.createElement("a"),
                nextImg: document.createElement("img")
            }
        };

        elements.view.className = this.getThemeClass("view") + " yoxview";
        elements.buttons.wrapper.className = this.getThemeClass("nav");

        elements.buttons.prev.className = this.getThemeClass("btn") + " " + this.getThemeClass("btn-prev");
        elements.buttons.prev.appendChild(elements.buttons.prevImg);
        elements.buttons.next.className = this.getThemeClass("btn") + " " + this.getThemeClass("btn-next");
        elements.buttons.next.appendChild(elements.buttons.nextImg);
        elements.buttons.prev.onclick = function(){ lastNavButton = elements.buttons.prevImg; self.modules.view.prev(); };
        elements.buttons.next.onclick = function(){ lastNavButton = elements.buttons.nextImg; self.modules.view.next(); };

        container.appendChild(elements.view);
        elements.buttons.wrapper.appendChild(elements.buttons.prev);
        elements.buttons.wrapper.appendChild(elements.buttons.next);
        container.appendChild(elements.buttons.wrapper);

        $(window).on("resize", resizeEventHandler);
        $(elements.view).on("click", "img", function(){ self.modules.view.next() });
    };

    this.destroy = function(){
        elements.container.removeChild(elements.view);
        elements.container.removeChild(elements.buttons.prev);
        elements.container.removeChild(elements.buttons.next);

        $(window).off("resize", resizeEventHandler);
        $(elements.container).removeClass(self.getThemeClass("open"));
        elements = null;
    }

};
yox.themes.switcher.defaults = {
    keydownFrequency: 200, // The minimum interval to fire keydown events. Set to zero or less to disable this option
    scrollDuration: 500 // The time, in milliseconds, for scrolling animations, when a thumbnail should be brought into view
};

yox.themes.switcher.prototype = new yox.theme();