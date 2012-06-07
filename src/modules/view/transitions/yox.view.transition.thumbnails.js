yox.view.transitions.thumbnails = function(){
    var panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime,
        $currentItemThumbnail,
        zIndex = 100,
        scrollElement,
        scrollEventElement,
        lastPosition;

    this.create = function($container){
        var self = this;
        function createImg(index){
            var $panel = $("<div>", {
                "class": "yoxviewFrame yoxviewFrame_" + self.options.resizeMode + " yoxviewFrame_" + yox.utils.browser.getPlatform() + " yoxviewFrame_thumbnails",
                css: {
                    transition: "all " + defaultTransitionTime + "ms linear",
                    transformOrigin: "center center",
                    display: "none",
                    "box-sizing": "border-box",
                    position: "fixed",
                    overflow: "visible"
                }
            }).appendTo($container);

            if ($.browser.webkit) // GPU acceleration for webkit:
                $panel[0].style.setProperty("-webkit-transform", "translateZ(0)");

            var closeBtn = document.createElement("a");
            closeBtn.className = "yoxview_close";
            closeBtn.onclick = self.close;

            $panel.append(closeBtn);

            $container.append($panel);
            return $panel;
        }

        currentTransitionTime = defaultTransitionTime = this.options.transitionTime;
        panels = [];

        for(var i=0; i<2; i++){
            panels.push(createImg(i));
        }

        function isScrollableElement(element){
            var compStyleOverflow = window.getComputedStyle(element, null).overflow;
            return ~["scroll", "auto"].indexOf(compStyleOverflow);
        }

        scrollElement = $container[0];
        while(!isScrollableElement(scrollElement) && scrollElement.parentNode && scrollElement !== document.documentElement){
            scrollElement = scrollElement.parentNode;
        }

        scrollEventElement = scrollElement;
        if (scrollElement === document.body || scrollElement === document.documentElement)
            scrollEventElement = window;
    };

    this.destroy = function(){
        for(var i=0; i<panels.length; i++){
            panels[i].remove();
        }
        panels = [];
    };

    this.getCurrentPanel = function(){
        return panels[currentPanelIndex];
    };

    this.getPanel = function(item){
        currentPanelIndex = currentPanelIndex ? 0 : 1;
        return panels[currentPanelIndex];
    };

    function showThumbnail($thumbnail){
        return function(){
            $thumbnail.css("visibility", "visible");
        };
    }

    function doTransition(options){
        clearTimeout(openPanelTimeoutId);
        clearTimeout(hideOldPanelTimeoutId);

        var $newPanel = panels[currentPanelIndex],
            $oldPanel = panels[currentPanelIndex ? 0 : 1];

        if (!options.isUpdate){
            if (options.item){
                var $thumbnail = $(options.item.thumbnail.image),
                    thumbnailOffset = $thumbnail.offset(),
                    thumbnailScale = $thumbnail.width() / options.position.width;

                thumbnailOffset.top -= scrollElement.scrollTop;
                thumbnailOffset.left -= scrollElement.scrollLeft;

                $newPanel.show().css($.extend({
                    transition: "none",
                    transform: [
                        "scale(", thumbnailScale,
                        ") translateX(", Math.round((thumbnailOffset.left - options.position.left - options.position.width * (1 - thumbnailScale) / 2) / thumbnailScale),
                        "px) translateY(", Math.round((thumbnailOffset.top - options.position.top - options.position.height * (1 - thumbnailScale) / 2) / thumbnailScale),
                        "px) translateZ(0)"].join(""),
                    "z-index": zIndex + 1
                }, options.position));

                openPanelTimeoutId = setTimeout(function(){
                    $newPanel.css({
                        transform: "scale(1) translateX(0) translateY(0) translateZ(0)",
                        transition: "all " + defaultTransitionTime +"ms ease-out"
                    });
                }, 5);

            }

            if ($oldPanel && $currentItemThumbnail){
                var thumbnailPosition = $currentItemThumbnail.offset(),
                    scale = $currentItemThumbnail.width() / lastPosition.width;

                thumbnailPosition.top -= scrollElement.scrollTop;
                thumbnailPosition.left -= scrollElement.scrollLeft;

                $oldPanel.css({
                    "z-index": zIndex,
                    transform: [
                        "scale(", scale,
                        ") translateX(", Math.round((thumbnailPosition.left - lastPosition.left - lastPosition.width * (1 - scale) / 2) / scale),
                        "px) translateY(", Math.round((thumbnailPosition.top - lastPosition.top - lastPosition.height * (1 - scale) / 2) / scale),
                        "px) translateZ(0)"].join("")
                });
                hideOldPanelTimeoutId = setTimeout(function(){ $oldPanel.hide() }, defaultTransitionTime);
                showThumbnailTimeoutId = setTimeout(showThumbnail($currentItemThumbnail), defaultTransitionTime);
            }

            lastPosition = options.position;
            $currentItemThumbnail = $thumbnail;
            if ($currentItemThumbnail)
                $currentItemThumbnail.css("visibility", "hidden");
        }
        else {
            $newPanel.css(options.position);
        }
    }
    var throttledTransition = yox.utils.performance.throttle(doTransition, 120);

    var openPanelTimeoutId, hideOldPanelTimeoutId, showThumbnailTimeoutId;
    this.transition = function(options){
        if (options.isUpdate)
            throttledTransition.call(this,options);
        else
            doTransition.call(this, options);
    };

    this.update = function(updateData){
        /*
        if (updateData.transitionTime !== undefined){
            $frame.css("transitionDuration", updateData.transitionTime + "ms");
            for(var i=panels.length; i--;)
                panels[i].css("transitionDuration", updateData.transitionTime + "ms");
        }
        */
    };
};

yox.view.transitions.thumbnails.prototype = new yox.view.transition("thumbnails");