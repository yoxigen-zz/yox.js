yox.data.sources.element = (function(){
	var dataSourceName = "element";

    var isElement = Object(HTMLElement) === HTMLElement
        ? function(el){ return el instanceof HTMLElement; }
        : Object(Element) === Element
            ? function(el){ return el instanceof Element; }
            : function(e){
                return Object(el) === el && el.nodeType === 1 && typeof(el.nodeName) === "string";
            };

	return {
		name: dataSourceName,
		match: function(source){
            return isElement(source) || source instanceof jQuery || (source.element && isElement(source.element) || source.element instanceof jQuery);
        },
		load: function(source, callback){
			var imagesData = [],
                element = source instanceof HTMLElement ? source : source.element;

			$("a:has('img')", element).each(function(){
				var thumbnailImg = $("img:first", this)[0];
				
				imagesData.push({
					thumbnail: {
						element: this,
						image: thumbnailImg,
						src: thumbnailImg.src
					},
					url: this.href,
					title: this.title || thumbnailImg.title,
					type: "image"
				});
			});

            var data = {
                items: imagesData,
                source: source,
                sourceType: dataSourceName,
                createThumbnails: false
            };

			if (callback)
				callback(data);
				
			return data;
		}
	};
}());