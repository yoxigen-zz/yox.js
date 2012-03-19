yox.view.transitions.fade = function(){
    var panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime;

    this.create = function($container){
        var view = this;
        panels = [];
        for(var i=0; i<2; i++){
            var $panel = $("<div>", { src: "", "class": "yoxviewImg" });
            if (i > 0)
                $panel.css({opacity: "0"});

            $panel.css({ transition: ["opacity ", this.options.transitionTime, "ms linear"].join("") });
            if ($.browser.webkit)
                $panel[0].style.setProperty("-webkit-transform", "translateZ(0)");

            panels.push($panel.appendTo($container));
        }
    };

    this.destroy = function(){
        for(var i=0; i < panels.length; i++){
            panels[i].remove();
        }
    };

    this.getCurrentPanel = function(){
        return panels[currentPanelIndex];
    };

    this.getPanel = function(item){
        currentPanelIndex = currentPanelIndex ? 0 : 1;
        return panels[currentPanelIndex];
    };

    this.transition = function(options){
        if (options.duration !== undefined){
            if (isNaN(options.duration))
                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
        }
        else
            options.duration = defaultTransitionTime;

        panels[currentPanelIndex].css(options.position);
        if (this.options.enlarge && this.options.resizeMode === "fill")
            panels[1].css({ opacity: currentPanelIndex });
        else{
            panels[currentPanelIndex ? 0 : 1].css({ opacity: 0 });
            panels[currentPanelIndex].css({ opacity: 1 });
        }
    };

    this.update = function(updateData){
        if (updateData.resizeMode && updateData.resizeMode !== this.options.resizeMode){
            panels[currentPanelIndex].css(this.getPosition(this.currentItem, this.containerDimensions, this.options));
        }

        if (updateData.transitionTime !== undefined)
            for(var i=panels.length; i--;)
                panels[i].css("transitionDuration", updateData.transitionTime + "ms");
    };
};

yox.view.transitions.fade.prototype = new yox.view.transition("fade");