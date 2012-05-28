yox.themes.switcher = function(data, options){
    var elements,
        self = this,
        isOpen = false;

    this.name = "switcher";

    this.config = {
        view: {
            displayInfo: true,
            enableKeyboard: true,
            enlarge: false,
            resizeMode: "fit",
            transition: yox.view.transitions.thumbnails,
            transitionTime: 300,
            margin: { top: 45, right: 30, left: 30, bottom: 30 },
            showThumbnailsBeforeLoad: true,
            events: {
                "click.thumbnails": function(e, sender){
                    if (e.isSelected){
                        this.close();
                        sender.unselect();
                    }
                    else
                        this.selectItem(e.index);
                },
                beforeSelect: function(e){
                    if (!isOpen && e.newItem){
                        isOpen = true;
                        $(elements.container).addClass(self.getThemeClass("open"));
                    }
                },
                close: function(e){
                    self.modules.view.close();
                    isOpen = false;
                    $(elements.container).removeClass(self.getThemeClass("open"));
                }
            }
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
            background: document.createElement("div"),
            view: document.createElement("div"),
            container: container
        };

        elements.background.className = this.getThemeClass("background");
        elements.view.className = this.getThemeClass("view") + " yoxview";

        container.appendChild(elements.background);
        container.appendChild(elements.view);

        $(window).on("resize", resizeEventHandler);
        $(elements.view).on("click", "img", function(){ self.modules.view.next() });
    };

    this.destroy = function(){
        elements.container.removeChild(elements.background);
        elements.container.removeChild(elements.view);
        $(window).off("resize", resizeEventHandler);
        $(elements.container).removeClass(self.getThemeClass("open"));
        elements = null;
    }

};
yox.themes.switcher.defaults = {
    scrollDuration: 500 // The time, in milliseconds, for scrolling animations, when a thumbnailo should be brought into view
};

yox.themes.switcher.prototype = new yox.theme();