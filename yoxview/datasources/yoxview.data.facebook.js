$.yoxview.addDataSource(function(){
	var dataSourceName = "element",
        facebookRegex = /^http:\/\/(?:www\.)?facebook\.com/;

    function getPhotos(userId){
        
    }

	return {
		name: dataSourceName,
		match: function(source){ return facebookRegex.test(source); },
		load: function(source, startIndex, callback){
			var data = [];
			$("a:has('img')", source).each(function(){
				$(this).data("yoxviewIndex", startIndex++);
				var thumbnailImg = $("img:first", this)[0];

				data.push({
					id: startIndex,
					thumbnail: {
						element: this,
						image: thumbnailImg,
						src: thumbnailImg.src
					},
					url: this.href,
					title: this.title || thumbnailImg.title,
					type: "image",
					sourceType: dataSourceName,
					source: source
				});
			});

			if (callback)
				callback(data);

			return data;
		}
	};
}());