yox.data.prototype.addDataSource((function(){
	var dataSourceName = "picasa",
        picasaRegex = /^https?:\/\/picasaweb\.google\./,
        picasaMatchRegex = /https?:\/\/picasaweb\.google\.\w+\/([^\/#\?]+)\/?([^\/#\?]+)?(\?([^#]*))?/,
        apiUrl = "http://picasaweb.google.com/data/feed/api/",
        picasaCropSizes = [32, 48, 64, 72, 104, 144, 150, 160],
        picasaUncropSizes = [94, 110, 128, 200, 220, 288, 320, 400, 512, 576, 640, 720, 800, 912, 1024, 1152, 1280, 1440, 1600].concat(picasaCropSizes).sort(function(a,b){ return a-b; }),
        defaults = {
            setThumbnail: true,
            setSingleAlbumThumbnails: true,
            setTitle: true, // Whether to add a header with user and/or album name before thumbnails
			alt: 'json',
            cropThumbnails: false,
			thumbsize: 64,
            imgmax: picasaUncropSizes[picasaUncropSizes.length - 1],
            fields: "category(@term),entry(category(@term)),title,entry(summary),entry(media:group(media:thumbnail(@url))),entry(media:group(media:content(@url))),entry(media:group(media:content(@width))),entry(media:group(media:content(@height))),entry(link[@rel='alternate'](@href))"
        };

    function getDataFromUrl(url, options){
        var urlMatch = url.match(picasaMatchRegex),
            data = $.extend({}, defaults, options);

        if (urlMatch && urlMatch.length > 1)
        {
            data.user = urlMatch[1];
            if (urlMatch[2]){
                data.album = urlMatch[2];
                data.fields += ",entry(summary),gphoto:name";
            }
            else
                data.fields += ",entry(title),entry(gphoto:numphotos),entry(gphoto:name),entry(link[@rel='alternate']),author,entry(summary)";
        }

        data.imgmax = getImgmax(picasaUncropSizes, data.imgmax);
        data.thumbsize = getImgmax(data.cropThumbnails ? picasaCropSizes : picasaUncropSizes, data.thumbsize) + (data.cropThumbnails ? "c" : "u");
        return data;
    }

    function getImgmax(picasaSizes, optionsImgmax){
        var imgmax = Math.min(optionsImgmax, Math.max(screen.width, screen.height));

        for(var i=picasaSizes.length, picasaSize; (i-- -1) && (picasaSize = picasaSizes[i]) && picasaSizes[i - 1] >= imgmax;){}
        return picasaSize;
    }

    function getFeedUrl(picasaData)
    {
        var feedUrl = apiUrl;
        if (picasaData.user && picasaData.user != "lh")
        {
            feedUrl += "user/" + picasaData.user;
            if (picasaData.album)
                feedUrl += "/album/" + picasaData.album;
        }
        else
            feedUrl += "all";

        return feedUrl;
    }

    function getImagesData(picasaData, kind)
    {
        var entry = picasaData.feed.entry,
            itemsData = [];

        jQuery.each(picasaData.feed.entry, function(i, image){
            var isAlbum = image.category[0].term.match(/#(.*)$/)[1] === "album";
            if (isAlbum && !image.gphoto$numphotos.$t)
                return true;
            var imageTitle = isAlbum ? image.title.$t : image.summary.$t,
                mediaData = image.media$group.media$content[0],
                itemData = {
                    thumbnail: {
                        src: image.media$group.media$thumbnail[0].url
                    },
                    url: mediaData.url,
                    link: image.link[0].href,
                    title: imageTitle,
                    type: "image"
                };

            if (isAlbum){
                itemData.data = { album: { name: image.title.$t, imageCount: image.gphoto$numphotos.$t, description: image.summary.$t }};
                itemData.isLoaded = true;
            }
            else{
                $.extend(itemData, {
                    width: mediaData.width,
                    height: mediaData.height,
                    ratio: mediaData.height / mediaData.width
                });
            }

            itemsData.push(itemData);
        });

        return itemsData;
    }

	return {
		name: dataSourceName,
		match: function(source){ return source.url && picasaRegex.test(source.url); },
		load: function(source, callback){
            var picasaData = getDataFromUrl(source.url, source);

            $.ajax({
                url: getFeedUrl(picasaData),
                dataType: 'jsonp',
                data: picasaData,
                success: function(data)
                {
                    var returnData = {
                        source: source,
                        sourceType: dataSourceName
                    };

                    if (!data.feed.entry || data.feed.entry.length == 0){
                        returnData.items = [];
                    }
                    else{
                        var kind = data.feed.category[0].term.match(/#(.*)$/)[1];

                        if (kind === "user")
                            $.extend(returnData, {
                                title: data.feed.title.$t,
                                data: {
                                    kind: "user",
                                    author: {
                                        name: data.feed.author[0].name.$t,
                                        link: data.feed.author[0].uri.$t
                                    }
                                }
                            });

                        returnData.createThumbnails = true;
                        returnData.items = getImagesData(data, kind);
                    }

                    if (callback)
                        callback(returnData);
                },
                error : function(xOptions, textStatus){
                    console.log("error: ", arguments);
                }
            });
	    }
    };
})());