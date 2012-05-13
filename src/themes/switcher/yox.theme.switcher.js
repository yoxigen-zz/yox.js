yox.themes.switcher = function(data, options){
    var elements,
        self = this;

    this.name = "switcher";

    this.config = {
        view: {
            enableKeyboard: true,
            enlarge: false,
            resizeMode: "fit",
            transition: yox.view.transitions.thumbnails,
            transitionTime: 300,
            margin: 30,
            events: {
                "click.thumbnails": function(e){ this.selectItem(e.index); }
            }
        }
    };

    this.create = function(container){
        elements = {
            background: document.createElement("div"),
            view: document.createElement("div")
        };

        elements.background.className = this.getThemeClass("background");
        elements.view.className = this.getThemeClass("view") + " yoxview";

        container.appendChild(elements.background);
        container.appendChild(elements.view);

        $(window).on("resize", function(){
            self.modules.view.update();
        });
    };

};
yox.themes.switcher.defaults = {
    margin: 30
};

yox.themes.switcher.prototype = new yox.theme();