yox.view.transitions.morph = function(){
    var $frame,
        panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime;

    this.create = function($container){
        var view = this;
        $frame = $("<div>", { "class": "yoxviewFrame yoxviewFrame_" + this.options.resizeMode + " yoxviewFrame_" + yox.utils.browser.getPlatform()}).appendTo($container);
        if (this.options.transitionTime){
            currentTransitionTime = defaultTransitionTime = this.options.transitionTime;
            $frame.css({
                transition: "all " + defaultTransitionTime + "ms ease-out",
                top: "50%", left: "50%",
                width: 0, height: 0
            });
            if ($.browser.webkit) // GPU acceleration for webkit:
                $frame[0].style.setProperty("-webkit-transform", "translateZ(0)");
        }

        panels = [];
        for(var i=0; i<2; i++){
            var $panel = $("<div>", { "class": "yoxviewImg" });
            $panel.css("display", "inline");
            if (i > 0)
                $panel.css({opacity: "0"});

            $panel.css({
                transition: ["all ", this.options.transitionTime, "ms ease-out"].join("")
            });
            if ($.browser.webkit)
                $panel[0].style.setProperty("-webkit-transform", "translateZ(0)");

            $panel.attr("data-index", i);
            panels.push($panel.appendTo($frame));
        }
    };

    this.destroy = function(){
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
        var panelCss = { opacity: currentPanelIndex },
            frameCss = $.extend({}, options.position);

        if (options.duration !== undefined){
            if (isNaN(options.duration))
                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
        }
        else
            options.duration = defaultTransitionTime;

        if (options.duration !== currentTransitionTime){
            panelCss.transition = "opacity " + options.duration + "ms ease-out";
            frameCss.transition = "all " + options.duration + "ms ease-out";
            currentTransitionTime = options.duration;
        }

        if (!options.isUpdate)
            panels[1].css("opacity", currentPanelIndex);

        $frame.css(frameCss);
    };

    this.update = function(updateData){
        if (updateData.transitionTime !== undefined){
            $frame.css("transitionDuration", updateData.transitionTime + "ms");
            for(var i=panels.length; i--;)
                panels[i].css("transitionDuration", updateData.transitionTime + "ms");
        }
    };
};

yox.view.transitions.morph.prototype = new yox.view.transition();