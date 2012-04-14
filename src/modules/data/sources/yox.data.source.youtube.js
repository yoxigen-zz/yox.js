yox.data.sources.youtube = (function($){
	var dataSourceName = "youtube",
        youtubeRegex = /^http:\/\/(?:www\.)?youtube.com\//,
        ytRegex = {
            singleVideo: /^http:\/\/(?:www\.)?youtube.com\/watch\?v=([^\&]+)(.*)?/,
            playlist: /^http:\/\/(?:www\.)?youtube.com\/(?:view_play_list|my_playlists)\?p=([^\&]+)(.*)?/,
            user: /^http:\/\/(?:www\.)?youtube.com\/user\/([^\?]+)(?:\?(.*))?/,
            search: /^http:\/\/(?:www\.)?youtube.com\/results\?(.*)/
        };
        apiUrl = "http://gdata.youtube.com/feeds/api/videos",
        fixedOptions = {
            v: 2,
            format: 5,
            alt: "jsonc"
        },
        defaults = {
            hqThumbnails: false,
            aspectRatio: "auto"
        };

    function getDimensionsCalc(datasourceOptions){
        var widescreenDimensions,
            defaultDimensions,
            widescreenAspectRatio = 16/9,
            defaultIsWidescreen = false;

        if (!datasourceOptions.width && !datasourceOptions.height)
            datasourceOptions.width = 720;

        if ((datasourceOptions.height && !datasourceOptions.width) || (datasourceOptions.width && !datasourceOptions.height)){
            if (typeof(datasourceOptions.aspectRatio) === "string"){
                if (datasourceOptions.aspectRatio === "auto")
                    datasourceOptions.aspectRatio = 4/3;
                else{
                    var ratioValues = datasourceOptions.aspectRatio.split(":");
                    datasourceOptions.aspectRatio = parseInt(ratioValues[0], 10) / parseInt(ratioValues[1], 10);
                }
            }

            defaultIsWidescreen = datasourceOptions.aspectRatio === 16/9;
            if (datasourceOptions.height){
                widescreenDimensions = { height: datasourceOptions.height, width: datasourceOptions.height * widescreenAspectRatio };
                if (!defaultIsWidescreen)
                    defaultDimensions = { height: datasourceOptions.height, width: datasourceOptions.height * datasourceOptions.aspectRatio };
            }
            else{
                widescreenDimensions = { width: datasourceOptions.width, height: datasourceOptions.width / widescreenAspectRatio };
                if (!defaultIsWidescreen)
                    defaultDimensions = { width: datasourceOptions.width, height: datasourceOptions.width / datasourceOptions.aspectRatio };
            }

        }

        var getDimensions = function(isWidescreen){
            return isWidescreen ? widescreenDimensions : defaultDimensions;
        }

        return getDimensions;
    }
    
    function isFiltered(tags, options){
        if (!options.filter || !tags)
            return false;

        var tagsStr = tags.join(","),
            result = options.negativeFilterRegex && options.negativeFilterRegex.test(tagsStr);
            
        if (!result)
            result = options.positiveFilterRegex && !options.positiveFilterRegex.test(tagsStr);
        
        return result;
    }
    function getEmbedObject(embedUrl){
        var videoElement = document.createElement("object");
        videoElement.setAttribute("width", "100%");
        videoElement.setAttribute("height", "100%");
        videoElement.innerHTML = "<param name='movie' value='" + embedUrl + "'</param><param name='allowFullScreen' value='true'></param><param name='wmode' value='transparent'></param><param name='allowScriptAccess' value='always'></param><embed src='" + embedUrl + "' type='application/x-shockwave-flash' allowfullscreen='true' allowscriptaccess='always' wmode='transparent' width='100%' height='100%'></embed>"
        return videoElement;
    }
    getEmbedObject.id = 1;

    function formatItem(ytVideoData, options){
        var item = {
            type: "html",
            thumbnail: {
                src: ytVideoData.thumbnail[options.hqThumbnails ? "hqDefault" : "sqDefault"]
            },
            link: ytVideoData.player["default"],
            "element": getEmbedObject(ytVideoData.content["5"] + "&fs=1&hd=1&enablejsapi=1&playerapiid=ytplayer" + getEmbedObject.id++ + "&version=3"),
            title: ytVideoData.title,
            id: ytVideoData.id,
            description: ytVideoData.description,
            duration: ytVideoData.duration
        };

        $.extend(item, options.getDimensions(ytVideoData.aspectRatio && ytVideoData.aspectRatio === "widescreen"));
        if (item.width && item.height)
            item.ratio = item.height / item.width;

        return item;
    }
    
    function getVideosDataFromJson(items, options)
    {
        var videosData = [];

        if (options.filter){
            var negativeFilters = options.filter.match(/!([^,]+)/g),
                positiveFilters = options.filter.match(/(,|^)[^!,]([^,]+)/g),
                negativeRegex = negativeFilters ? negativeFilters.join("|").replace(/^!/, "").replace(/\|!/g, "|") : null,
                positiveRegex = positiveFilters ? positiveFilters.join("|").replace(/\|,/g, "|") : null;

            if (negativeRegex)
                options.negativeFilterRegex = new RegExp("(?:^|,)(" + decodeURI()(negativeRegex) + ")(?:,|$)");

            if (positiveRegex)
                options.positiveFilterRegex = new RegExp("(?:^|,)(" + decodeURI()(positiveRegex) + ")(?:,|$)");
        }

        $.each(items, function(i, video){
            if (options.feedType === "playlist")
                video = video.video;

            if (!isFiltered(video.tags, options))
                videosData.push(formatItem(video, options));
        });

        return videosData;
    }
    function onData(source, options, ytData, callback){
        var returnData = {
            source: source,
            sourceType: dataSourceName,
            createThumbnails: true
        };

        if ((options.isSingleVideo && !ytData.data) || (!options.isSingleVideo && (!ytData.data.items || ytData.data.items.length === 0)))
        {
            returnData.items = [];
            callback(returnData);
            return;
        }

        returnData.items = getVideosDataFromJson(options.isSingleVideo ? [ ytData.data ] : ytData.data.items, options);

        if (!options.isSingleVideo){
            var dataTitle = ytData.data.title;
            if (dataTitle)
                returnData.title = dataTitle;
        }

        callback(returnData);
    }

	return {
		name: dataSourceName,
		match: function(source){ return source.url && youtubeRegex.test(source.url); },
		load: function(source, callback){
            if (!callback)
                throw new Error("Can't load YouTube data, no callback provided.");

            var options = $.extend({}, defaults, source, fixedOptions);

            if (source.url){
                var urlMatch;
                for (var regexType in ytRegex){
                    urlMatch = source.url.match(ytRegex[regexType]);
                    if (urlMatch)
                    {
                        options.feedType = regexType;
                        break;
                    }
                }

                if (urlMatch){
                    switch(options.feedType){
                        case "singleVideo":
                            options.isSingleVideo = true;
                            options.url += "/" + urlMatch[1];
                            break;
                        case "playlist":
                            options.url = "http://gdata.youtube.com/feeds/api/playlists/" + urlMatch[1];
                            break;
                        case "user":
                            options.url = "http://gdata.youtube.com/feeds/api/users/" + urlMatch[1] + "/uploads";
                            break;
                        case "search":
                            options.url = apiUrl;
                            break;
                        default:
                            break;
                    }

                    var queryData = yox.utils.url.queryToJson(urlMatch.length == 2 ? urlMatch[1] : urlMatch[2]);
                    if (queryData){
                        if (queryData.search_query){
                            queryData.q = queryData.search_query;
                            delete queryData.search_query;
                        }
                        $.extend(options, queryData);
                    }
                }
            }

            $.ajax({
                url: options.url,
                dataType: 'jsonp',
                data: options,
                async: false,
                jsonpCallback: "callback",
                success: function(ytData)
                {
                    options.getDimensions = getDimensionsCalc(options);
                    onData(source, options, ytData, callback);
                },
                error : function(xOptions, textStatus){
                    if (options.onLoadError)
                        options.onLoadError("YouTube plugin encountered an error while retrieving data");
                }
            });
	    }
    };
})(jQuery);