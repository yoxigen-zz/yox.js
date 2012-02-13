yox.view.prototype.transitions.fade = function(){
    var panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime;

    this.create = function($container, onLoad){
        var view = this;
        panels = [];
        for(var i=0; i<2; i++){
            var $img = $("<img>", { src: "", "class": "yoxviewImg" });
            if (i > 0)
                $img.css({opacity: "0"});

            $img.css({ transition: ["opacity ", this.options.transitionTime, "ms linear"].join("") });
            if ($.browser.webkit)
                $img[0].style.setProperty("-webkit-transform", "translateZ(0)");

            $img.on("load", { view: view }, onLoad);
            panels.push($img.appendTo($container));
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
        if (time !== undefined){
            if (isNaN(time))
                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
        }
        else
            time = defaultTransitionTime;

        //if (time !== currentTransitionTime){
//                            panelCss.transition = "opacity " + time + "ms linear";
//                            currentTransitionTime = time;
//                        }

        panels[currentPanelIndex].css(position);
        if (this.options.enlarge && this.options.resizeMode === "fill")
            panels[1].css({ opacity: currentPanelIndex });
        else{
            panels[currentPanelIndex ? 0 : 1].css({ opacity: 0 });
            panels[currentPanelIndex].css({ opacity: 1 });
        }
    };

    this.update = function(updateData){
        if (updateData.resizeMode && updateData.resizeMode !== this.options.resizeMode && this.options.enlarge && updateData.resizeMode === "fill")
            panels[0].css({ opacity: 1 });
    };
};

yox.view.prototype.transitions.fade.prototype = new yox.viewTransition();