yox.data.sources.twitpic = (function($){
    var dataSourceName = "twitpic",
        twitpicUrl = "http://twitpic.com/",
        twitpicApiUrl = "http://api.twitpic.com/2/",
        twitpicImageUrl = "http://twitpic.com/show/",
        apiKey = "f0be525ae803e5f60882432e925cbbc0", // yox.js API key @twitpic
        twitpicUrlRegex = /^http:\/\/(?:www\.)?twitpic\.com\/(\w+)\/([^\/\?#]+)/,
        defaults = {
            imageSize: "full", // large (600px) / full (original, about 1024px)
            thumbsize: "mini", // mini (75x75) / thumb (150x150),
            page: 1 // Twitpic serves a maximum of 20 images per request, so paging is required to get more than that.
        };

    var dataTypes = {
        photos: "users"
    };

    function getImageUrl(imageData, size){
        return [twitpicImageUrl, size, "/", imageData.short_id, "?key=", apiKey].join("");
    }

    function getUrlData(url){
        var urlDataMatch = url.match(twitpicUrlRegex);
        return urlDataMatch ? {
            method: urlDataMatch[1],
            userId: urlDataMatch[2]
        } : null;
    }

    function getApiUrl(data, options){
        var apiParts = [twitpicApiUrl, dataTypes[data.method], "/show.jsonp?username=", data.userId, "&key=", apiKey];
        if (options.page)
            apiParts.push("&page=", options.page);

        return apiParts.join("");
    }

    function getImagesDataFromJson(data, datasourceOptions){
        var images = [],
            author = { name: data.name, avatar: data.avatar_url, link: data.website };

        for(var i=0, image; image = data.images[i]; i++){
            images.push({
                thumbnail: {
                    src: getImageUrl(image, datasourceOptions.thumbsize)
                },
                link: twitpicUrl + image.short_id,
                url: getImageUrl(image, datasourceOptions.imageSize),
                title: image.message,
                type: "image",
                author: author
            });
        }

        return images;
    }

    return {
        name: dataSourceName,
        defaults: defaults,
        match: function(source){
            return source.url && twitpicUrlRegex.test(source.url);
        },
        load: function(source, callback, error){
            var urlData = getUrlData(source.url);
            if (!urlData){
                error && error({ message: "Invalid Twitpic URL, can't parse fields." });
                return false;
            }

            $.ajax(getApiUrl(urlData, source), {
                dataType: 'jsonp',
                success: function(data){
                    var datasourceOptions = jQuery.extend({}, defaults, urlData, source),
                        returnData = {
                            source: source,
                            sourceType: dataSourceName,
                            items: getImagesDataFromJson(data, datasourceOptions)
                        };

                    callback(returnData);
                }
            });
        }
    };
})(jQuery);