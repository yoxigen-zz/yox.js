yox.themes.slideshow = function(data, options){
    var elements = {},
        self = this;


    this.name = "slideshow";
    this.config = {
        view: {
            enableKeyboard: true,
            transition: "flip",
            margin: 10,
            transitionTime: 600,
            events: {
                beforeSelect: function(e){
                    var index = e.newItem.id;
                    elements.position.innerHTML = index + " / " + this.items.length;
                },
                create: function(){this.selectItem(0); }
            }
        }
    };
    this.create = function(container){
        elements.container = container;
        $(container).addClass(this.getThemeClass());

        function createButton(method, title){
            var button = document.createElement("a");
            button.className = self.getThemeClass("button") + " " + self.getThemeClass("button-" + method);
            button.setAttribute("data-method", method);
            button.setAttribute("href", "#");
            button.textContent = title;
            return button;
        }

        elements.viewer = document.createElement("div");
        elements.viewer.className = this.getThemeClass("viewer") + " yoxview";
        container.appendChild(elements.viewer);

        elements.controls = document.createElement("div");
        elements.controls.className = this.getThemeClass("controls");
        container.appendChild(elements.controls);
        elements.controls.appendChild(createButton("first", "First"));
        elements.controls.appendChild(createButton("prev", "Previous"));

        var position = document.createElement("span");
        position.className = this.getThemeClass("position");
        elements.position = position;

        elements.controls.appendChild(position);

        elements.controls.appendChild(createButton("next", "Next"));
        elements.controls.appendChild(createButton("last", "Last"));

        $(elements.controls).on("click", "a", function(e){
            e.preventDefault();
            self.modules.view[this.getAttribute("data-method")]();
        });
    };

    this.destroy = function(){
        elements.container.removeChild(elements.controls);
        elements.container.removeChild(elements.viewer);
        $(elements.container).removeClass(this.getThemeClass());
    };
};

yox.themes.slideshow.prototype = new yox.theme();