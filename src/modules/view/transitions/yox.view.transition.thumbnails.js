yox.view.transitions.thumbnails = function(){
    var $frame,
        panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime,
        $currentItemThumbnail,
        zIndex = 100;

    this.create = function($container){
        var self = this;
        function createImg(index){
            var $panel = $("<div>", {
                "class": "yoxviewFrame yoxviewFrame_" + self.options.resizeMode + " yoxviewFrame_" + yox.utils.browser.getPlatform(),
                css: {
                    transition: "all " + defaultTransitionTime + "ms ease-out",
                    display: "none",
                    border: "none"
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

    this.transition = function(options){
        var $newPanel = panels[currentPanelIndex],
            $oldPanel = panels[currentPanelIndex ? 0 : 1];

        if (!options.isUpdate){
            var $thumbnail = $(options.item.thumbnail.image),
                thumbnailOffset = $thumbnail.offset();

            $newPanel
                .show()
                .css($.extend({
                    transition: "none",
                    "z-index": zIndex + 1
                }, thumbnailOffset, {width: $thumbnail.width(), height: $thumbnail.height() }));
            setTimeout(function(){
                $newPanel.css($.extend({
                    transition: "all " + defaultTransitionTime +"ms ease-out"
                }, options.position ));
            }, 5);

            if ($oldPanel && $currentItemThumbnail){
                $oldPanel.css($.extend({ "z-index": zIndex}, $currentItemThumbnail.offset(), {width: $currentItemThumbnail.width(), height: $currentItemThumbnail.height()}));
                setTimeout(showThumbnail($currentItemThumbnail), defaultTransitionTime);
            }
            $currentItemThumbnail = $thumbnail;
            $currentItemThumbnail.css("visibility", "hidden");
        }

    };

    this.update = function(updateData){
        if (updateData.transitionTime !== undefined){
            $frame.css("transitionDuration", updateData.transitionTime + "ms");
            for(var i=panels.length; i--;)
                panels[i].css("transitionDuration", updateData.transitionTime + "ms");
        }
    };
};

yox.view.transitions.thumbnails.prototype = new yox.view.transition("thumbnails");