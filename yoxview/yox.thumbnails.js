(function($, undefined){
    yox.thumbnails = function(container, options){
        var self = this;
        
        this.container = container instanceof jQuery ? container[0] : container;
        this.options = $.extend(true, {}, this.defaults, options);
        this.itemCount = 0;

        this.$eventsElement = $("<div>");
        if (this.options.events){
            for(var eventName in this.options.events)
                this.addEventListener(eventName, this.options.events[eventName]);
        }
        this.options.data && this.addDataSources(this.options.data);

        if (this.options.handleClick !== false){
            $(this.container).on("click", "." + self.options.thumbnailClass, function(e){
                var index = this.getAttribute("data-yoxthumbIndex");
                e.preventDefault();
                self.triggerEvent("click", { originalEvent: e, index: index });
                self.select(index);
            });
        }
    }

    yox.thumbnails.prototype = {
        addDataSources: function(dataSource){
            var self = this;
            function renderSources(sources){
                for(var i=0; i < sources.length; i++){
                    var source = sources[i];
                        self.createThumbnails(source);
                }
            }

            var dataSources = dataSource.getData();
            if (dataSources && dataSources.length)
                renderSources(dataSources);


            dataSource.addEventListener("loadSources", function(e, source){
                self.clear();
                this.itemCount = 0;
                renderSources(Array.prototype.slice.call(arguments, 1));
            });

            dataSource.addEventListener("clear", function(){
                self.clear();
                this.itemCount = 0;
            });
        },
        addEventListener: function(eventName, eventHandler){
            var self = this;
            if (!eventHandler || typeof(eventHandler) !== "function")
                throw new Error("Invalid event handler, must be a function.");

            this.$eventsElement.on(eventName + ".yoxthumbnails", function(e, data){ eventHandler.call(self, data); });
        },
        clear: function(){
            this.thumbnails && this.thumbnails.remove();
            this.itemCount = 0;
            this.currentSelectedThumbnail = null;
        },
        createThumbnail: function(item){
            var self = this,
                $thumbnail = $("<a>", {
                    href: item.link || item.url,
                    title: this.options.renderThumbnailsTitle !== false ? item.title : undefined,
                    class: self.options.thumbnailClass
                });

            $thumbnail.append($("<img>", {
                src: this.options.useFullImages ? item.url : item.thumbnail.src,
                alt: item.title
            }));

            return $thumbnail[0];
        },
        createThumbnails: function(source){
            var self = this,
                thumbnailElements;

            this.thumbnails = this.thumbnails || $();
            if (source.createThumbnails !== false){
                if ($.tmpl){
                    var thumbs = $.tmpl($.template(this.template), source.items, { options: this.options, getIndex: function(){ return self.itemCount++; } });
                    thumbs.appendTo(this.container);
                    this.thumbnails = thumbs;
                }
                else{
                    var documentFragment = document.createDocumentFragment();
                    for(var i = 0, count = source.items.length; i < count; i++, this.itemCount++){
                        var item = source.items[i],
                            thumbnailEl = this.createThumbnail(item);

                        thumbnailEl.setAttribute("data-yoxthumbindex", this.itemCount);
                        item.thumbnail.element = thumbnailEl;
                        item.thumbnail.generated = true;

                        var thumbnailImages = thumbnailEl.getElementsByTagName("img");
                        if (thumbnailImages.length)
                            item.thumbnail.image = thumbnailImages[0];

                        documentFragment.appendChild(thumbnailEl);
                    }

                    this.container.appendChild(documentFragment);
                    this.thumbnails = this.thumbnails.add($(this.container).children("." + this.options.thumbnailClass));
                }

                thumbnailElements = this.container.childNodes;
            }
            else{
                var $thumbnails = $("a:has(img)", this.container)
                    .attr("data-yoxthumbindex", function(i){
                        return self.itemCount++;
                    });

                this.thumbnails = this.thumbnails.add($thumbnails);
                thumbnailElements = $thumbnails.get();
            }

            this.triggerEvent("create", { thumbnails: thumbnailElements, items: source.items });
        },
        defaults: {
            renderThumbnailsTitle: true,
            selectedThumbnailClass: "selectedThumbnail",
            thumbnailClass: "yoxthumbnail"
        },
        select: function(itemIndex){
            this.currentSelectedThumbnail && this.currentSelectedThumbnail.removeClass(this.options.selectedThumbnailClass);
            if (this.thumbnails)
                this.currentSelectedThumbnail = this.thumbnails.eq(itemIndex).addClass(this.options.selectedThumbnailClass);
        },
        template: "<a class='${$item.options.thumbnailClass}' href='${link || url}'{{if $item.options.renderThumbnailsTitle}} title='title'{{/if}} data-yoxthumbIndex='${$item.getIndex()}'><img src='${thumbnail.src}' alt='${title}' /></a>",
        triggerEvent: function(eventName, data){
            this.$eventsElement.trigger(eventName + ".yoxthumbnails", data);
        }
    };

    window.yox.thumbnails = yox.thumbnails;
})(jQuery);