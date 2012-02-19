yox.view.transitions.evaporate = function(){
    var panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        defaultTransitionTimeStr,
        currentItemIndex = 0,
        self = this,
        defaultTransition,
        translateZ = { min: "translateZ(-800px)", max: "translateZ(500px)" },
        hideTimeoutId;

    function setDefaultTransition(transitionDuration){
        defaultTransitionTime = transitionDuration;
        defaultTransitionTimeStr = transitionDuration + "ms";
        defaultTransition = yox.utils.browser.getCssPrefix() + "transform " + defaultTransitionTimeStr + " ease-out, opacity " + defaultTransitionTimeStr +" ease-out";
    }

    this.create = function($container, onLoad){
        var view = this;
        self.$container = $container;
        $container.css("perspective", "800px");

        setDefaultTransition(this.options.transitionTime);

        panels = [];
        for(var i=0; i<2; i++){
            var $img = $("<img>", { src: "", "class": "yoxviewImg" });
            $img.css({
                position: "absolute",
                top: "50%", left: "50%",
                width: 0, height: 0,
                border: "solid 1px #666",
                transform: i ? "translateZ(-500px)" : "translateZ(0)" // The rotate(0) is for Firefox, which otherwise displays the backface (bug exists in Firefox 11)
            });

            $img.attr("data-index", i);
            $img.on("load", { view: view }, onLoad);
            panels.push($img.appendTo($container));
        }
    };

    this.destroy = function(){
        self.$container.css("perspective", "");
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
        clearTimeout(hideTimeoutId);
        var $currentPanel = self.getCurrentPanel(),
            $previousPanel = panels[currentPanelIndex ? 0 : 1].show(),
            isBackwards = (options.index < currentItemIndex && !(currentItemIndex === this.items.length - 1 && options.index === 0 )) ||
                    options.index === this.items.length - 1 && !currentItemIndex;

        $currentPanel.css($.extend(options.position, {
            display: "block",
            transform: isBackwards ?  translateZ.max : translateZ.min,
            transition: "none",
            zIndex: isBackwards ? 3 : 1
        }));

        setTimeout(function(){
            $previousPanel.css({
                transform: isBackwards ?  translateZ.min : translateZ.max,
                opacity: 0,
                zIndex: isBackwards ? 1 : 3
            });
            $currentPanel.css({ transition: defaultTransition, transform: "translateZ(0)", zIndex: 2, opacity: 1 });
            currentItemIndex = options.index;

            // In case the exiting image moves to the front (to translateZ.max), set its display to "none", so it doesn't cover the page and cancels mouse events
            // meant for elements beneath it:
            if (!isBackwards){
                hideTimeoutId = setTimeout(function(){
                    $previousPanel.hide();
                }, defaultTransitionTime);
            }
        }, 10);
    };

    this.update = function(updateData){
        if (updateData.transitionTime !== undefined){
            setDefaultTransition(updateData.transitionTime);
            for(var i=panels.length; i--;)
                panels[i].css("transitionDuration", defaultTransitionTimeStr);
        }
    };
};

yox.view.transitions.evaporate.prototype = new yox.view.transition();