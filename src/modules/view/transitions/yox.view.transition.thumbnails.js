yox.view.transitions.thumbnails = function(){
    var panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime,
        $currentItemThumbnail,
        zIndex = 100,
        scrollElement,
        scrollEventElement,
        isOpen = false,
        lastPosition;

    this.create = function($container){
        var self = this;
        function createImg(index){
            var $panel = $("<div>", {
                "class": "yoxviewFrame yoxviewFrame_" + self.options.resizeMode + " yoxviewFrame_" + yox.utils.browser.getPlatform(),
                css: {
                    transition: "all " + defaultTransitionTime + "ms ease-out",
                    display: "none",
                    "box-sizing": "border-box"
                }
            }).appendTo($container);

            if ($.browser.webkit) // GPU acceleration for webkit:
                $panel[0].style.setProperty("-webkit-transform", "translateZ(0)");

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

    var onScroll = yox.utils.performance.throttle(function(){
        panels[currentPanelIndex].css({
            top: lastPosition.top + scrollElement.scrollTop,
            left: lastPosition.left + scrollElement.scrollLeft
        });
    }, 50);

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

        if (options.position){
            lastPosition = {
                top: options.position.top,
                left: options.position.left
            };

            options.position.top += scrollElement.scrollTop;
            options.position.left += scrollElement.scrollLeft;
        }

        if (!options.isUpdate){
            if (options.item){
                var $thumbnail = $(options.item.thumbnail.image),
                        thumbnailOffset = $thumbnail.offset();

                $newPanel
                        .show()
                        .css($.extend({
                    transition: "none",
                    "z-index": zIndex + 1
                }, thumbnailOffset, { width: $thumbnail.width(), height: $thumbnail.height() }));

                openPanelTimeoutId = setTimeout(function(){
                    $newPanel.css($.extend({
                        transition: "all " + defaultTransitionTime +"ms ease-out"
                    }, options.position ));
                }, 5);

                if (!isOpen){
                    isOpen = true;
                    scrollEventElement.addEventListener("scroll", onScroll, false);
                }
            }
            else{
                isOpen = false;
                scrollEventElement.removeEventListener("scroll", onScroll, false);
            }

            if ($oldPanel && $currentItemThumbnail){
                $oldPanel.css($.extend({ "z-index": zIndex}, $currentItemThumbnail.offset(), {width: $currentItemThumbnail.width(), height: $currentItemThumbnail.height()}));
                hideOldPanelTimeoutId = setTimeout(function(){ $oldPanel.hide() }, defaultTransitionTime);
                showThumbnailTimeoutId = setTimeout(showThumbnail($currentItemThumbnail), defaultTransitionTime);
            }
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