yox.themes.scroll = function(data, options){
    var self = this;
    this.name = "scroll";
    this.config = {
        thumbnails: [
            // The scrolling panel:
            {
                id: "scroller",
                useFullImages: true,
                events: {
                    beforeSelect: function(e){
                        this.select(e.newItem.id - 1);
                    },
                    "select.view": function(e){
                        self.triggerEvent("select.thumbnails", this.thumbnails[e.id - 1], "scroller");
                    }
                }
            },
            // Thumbnails:
            {
                id: "thumbnails",
                events: {
                    beforeSelect: function(e){
                        this.select(e.newItem.id - 1);
                    },
                    loadItem: function(item){
                        $(item.thumbnail.element).addClass("loadedThumbnail");
                    }
                }
            }
        ],
        scroll: {
            events: {
                "create.thumbnails": function(e, id){
                    if (id === "scroller")
                        this.update();
                },
                "select.thumbnails": function(e){
                    this.scrollTo(e, { centerElement: true, time: .5 });
                },
                resize: function(){ this.update() }
            },
            toggleButtons: false
        },
        view: {
            delayOpen: true,
            enableKeyboard: true,
            events: {
                "click.thumbnails": function(e, id){
                    if (id === "thumbnails")
                        this.selectItem(e.index);
                },
                "click.scroll": function(e){
                    this.selectItem(e.target.parentNode, "yoxscroll");
                }
            }
        }
    };

    var wrapper;

    this.create = function(container){
        if ($(container).css("position") === "static" && container !== document.body)
            container.style.position = "relative";
        container.style.overflow = "hidden";

        wrapper = document.createElement("div");
        wrapper.className = this.getThemeClass("wrapper");

        var scroller = document.createElement("div");
        scroller.className = this.getThemeClass("scroller") + " yoxview yoxthumbnails yoxscroll ";
        wrapper.appendChild(scroller);

        container.appendChild(wrapper);

        if (options.renderThumbnails !== false){
            var thumbnails = document.createElement("div");
            thumbnails.className = this.getThemeClass("thumbnails") + " thumbnails yoxthumbnails";
            wrapper.appendChild(thumbnails);
        }

        var loader = document.createElement("div");
        loader.className = this.getThemeClass("loader") + " yoxloader";
        container.appendChild(loader);

        $(window).on("resize", function(){ self.triggerEvent("resize"); });
    };

    this.destroy = function(){
        wrapper.parentNode.removeChild(wrapper);
        wrapper = null;
    }
};

yox.themes.scroll.prototype = new yox.theme();