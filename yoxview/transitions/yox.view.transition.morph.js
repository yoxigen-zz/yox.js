yox.view.prototype.transitions.morph = function(){
    var $frame,
        panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime;

    this.create = function($container, onLoad){
        var view = this;
        $frame = $("<div>", { "class": "yoxviewFrame yoxviewFrame_" + this.options.resizeMode + " yoxviewFrame_" + $.yoxview.platform}).appendTo($container);
        if (this.options.transitionTime){
            currentTransitionTime = defaultTransitionTime = this.options.transitionTime;
            $frame.css("transition", "all " + defaultTransitionTime + "ms ease-out");
            if ($.browser.webkit) // GPU acceleration for webkit:
                $frame[0].style.setProperty("-webkit-transform", "translateZ(0)");
        }

        panels = [];
        for(var i=0; i<2; i++){
            var $img = $("<img>", { src: "", "class": "yoxviewImg" });
            if (i > 0)
                $img.css({opacity: "0"});

            $img.css({ transition: ["all ", this.options.transitionTime, "ms ease-out"].join("") });
            if ($.browser.webkit)
                $img[0].style.setProperty("-webkit-transform", "translateZ(0)");

            $img.attr("data-index", i);
            $img.on("load", { view: view }, onLoad);
            panels.push($img.appendTo($frame));
        }
    };

    this.getCurrentPanel = function(){
        return panels[currentPanelIndex];
    };

    this.getPanel = function(item){
        currentPanelIndex = currentPanelIndex ? 0 : 1;
        return panels[currentPanelIndex];
    };

    this.transition = function(position, time){
        var panelCss = { opacity: currentPanelIndex },
            frameCss = $.extend({}, position);

        if (time !== undefined){
            if (isNaN(time))
                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
        }
        else
            time = defaultTransitionTime;

        if (time !== currentTransitionTime){
            panelCss.transition = "opacity " + time + "ms ease-out";
            frameCss.transition = "all " + time + "ms ease-out";
            currentTransitionTime = time;
        }

        panels[1].css("opacity", currentPanelIndex);
        $frame.css(frameCss);
    };
};

yox.view.prototype.transitions.morph.prototype = new yox.viewTransition();