yox.view.transitions.flip = function(){
    var $frame,
        panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime,
        currentDeg = -180,
        currentItemIndex = 0,
        self = this;

    this.create = function($container){
        var view = this;
        self.$container = $container;
        $container.css("perspective", "800px");
        $frame = $("<div>", { "class": "yoxviewFrame yoxviewFrame_" + this.options.resizeMode + " yoxviewFrame_" + yox.utils.browser.getPlatform() + " yoxviewFrame_flip"}).appendTo($container);
        if (this.options.transitionTime){
            currentTransitionTime = defaultTransitionTime = this.options.transitionTime;
            $frame.css({
                transition: yox.utils.browser.getCssPrefix() + "transform " + defaultTransitionTime + "ms ease-out",
                transformStyle: "preserve-3d",
                width: $container.width() - this.options.margin.horizontal,
                left: this.options.margin.left,
                height: "100%",
                border: "none",
                overflow: "visible"
            });
        }

        panels = [];
        for(var i=0; i<2; i++){
            var $panel = $("<div>", { "class": "yoxviewImg" });
            $panel.css({
                backfaceVisibility: "hidden",
                background: "Black",
                position: "absolute",
                top: "50%", left: "50%",
                width: 0, height: 0,
                transform: i ? "rotateY(180deg)" : "rotateY(0)", // The rotate(0) is for Firefox, which otherwise displays the backface (bug exists in version 11)
                marginLeft: "-" + this.options.margin.left + "px"
            });

            $panel.attr("data-index", i);
            //$panel.on("load", { view: view }, onLoad);
            panels.push($panel.appendTo($frame));
        }
    };

    this.destroy = function(){
        self.$container.css("perspective", "");
        $frame.remove();
    };

    this.getCurrentPanel = function(){
        return panels[currentPanelIndex];
    };

    this.getPanel = function(item){
        currentPanelIndex = currentPanelIndex ? 0 : 1;
        return panels[currentPanelIndex];
    };

    this.transition = function(options){
        self.getCurrentPanel().css(options.position);
        if (options.isUpdate){
            $frame.css({
                width: self.$container.width() - this.options.margin.horizontal,
                left: this.options.margin.left
            });
        }
        else {
            var isBackwards = (options.index < currentItemIndex && !(currentItemIndex === this.items.length - 1 && options.index === 0 )) ||
                options.index === this.items.length - 1 && !currentItemIndex;

            currentDeg += isBackwards ? -180 : 180;
            currentItemIndex = options.index;
            $frame.css("transform", "rotateY(" + currentDeg + "deg)");
        }
    };

    this.update = function(updateData){
        if (updateData.transitionTime !== undefined)
            $frame.css("transitionDuration", updateData.transitionTime + "ms");
    };
};

yox.view.transitions.flip.prototype = new yox.view.transition("flip");