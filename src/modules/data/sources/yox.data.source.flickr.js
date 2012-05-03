yox.data.sources.flickr = (function($){
    var dataSourceName = "flickr",
        flickrUrl = "http://www.flickr.com/",
        flickrApiUrl = "http://api.flickr.com/services/rest/",
        apiKey = "9a220a98ef188519fb87b08d310ebdbe", // yox.js API key @flickr
        flickrUserIdRegex = /\d+@N\d+/,
        flickrUrlRegex = /^http:\/\/(?:www\.)?flickr\.com\/(\w+)\/(?:([^\/]+)\/(?:(\w+)\/?(?:([^\/]+)\/?)?)?)?(?:\?(.*))?/,
        fixedOptions = {
            api_key: apiKey,
            format: 'json'
        },
        defaults = {
            imageSize: "medium", // medium/large/original, for large, your images in Flickr must be 1280 in width or more. For original, you must allow originals to be downloaded
            thumbsize: "thumbnail", // smallSquare (75x75) / thumbnail (100) / small (240) / largeSquare (150x150) / medium (500) / large (1024) / original
            setThumbnail: true,
            setSinglePhotosetThumbnails: true,
            setTitle: true,
            method: 'flickr.photosets.getList',
            extras: 'description'
        };

    var dataTypes = {
        sets: function(source, id){
            return {
                method: id || source.photoset_id ? "flickr.photosets.getPhotos" : "flickr.photosets.getList",
                photoset_id: id
            };
        },
        galleries: function(source, id){
            return {
                method: id ? "flickr.galleries.getPhotos" : "flickr.galleries.getList",
                gallery_id: id
            };
        },
        collections: function(source, id){
            return {
                method: "flickr.collections.getTree",
                collection_id: id
            };
        },
        "default": function(){
            return {
                method: "flickr.photos.search"
            };
        }
    };

    var flickrImageSizes = {
            smallSquare : "_s", // 75x75
            thumbnail : "_t", // 100px
            small : "_m", // 240px
            medium : "", // 500px
            large : "_b", // 1024px
            original : "_o"
        };
    function getImageUrl(photoData, size){
        return "http://farm" + photoData.farm + ".static.flickr.com/" + photoData.server + "/" + (photoData.primary || photoData.id) + "_" + photoData.secret + size + ".jpg";
    }

    function getPhotosetUrl(userid, photosetId){
         return prepareUrl(flickrUrl + "photos/" + userid + "/sets/" + photosetId + "/");
    }

    // makes sure a string can be used as a Flickr url
    function prepareUrl(url){
        return url.replace(/\s/g, "_");
    }

    function getImagesDataFromJson(data, datasourceOptions){
        var isPhotos = data.photoset || data.photos,
            photos,
            imagesData = [],
            inSet = data.photoset ? "/in/set-" + data.photoset.id : "";

        if (isPhotos)
            photos = data.photoset ? data.photoset.photo : data.photos.photo;
        else if (data.photosets)
            photos = data.photosets.photoset;
        else if (data.collections)
            photos = data.collections.collection[0].set;

        // Photos:
        if (photos)
        {
            var thumbSuffix = flickrImageSizes[datasourceOptions.thumbsize],
                imageSuffix = flickrImageSizes[datasourceOptions.imageSize];

            $.each(photos, function(i, photo){
                var imageData = {
                    thumbnail: {
                        src : getImageUrl(photo, thumbSuffix)
                    },
                    link: prepareUrl(flickrUrl + "photos/" + (photo.owner || datasourceOptions.user_id) + "/" + photo.id + inSet),
                    url: getImageUrl(photo, imageSuffix),
                    title: isPhotos ? photo.title : photo.title._content,
                    type: "image",
                    description: photo.description ? photo.description._content : undefined
                };

                if (!isPhotos)
                    imageData.data = { photoset_id: photo.id };

                imagesData.push(imageData);
            });
        }

        return imagesData;
    }

    return {
        name: dataSourceName,
        defaults: defaults,
        map: { pageSize: "per_page" },
        match: function(source){
            return source.url && flickrUrlRegex.test(source.url);
        },
        load: function(source, callback){
            var requireLookup = true,
                urlMatch = source.url && source.url.match(flickrUrlRegex),
                queryData,
                fromDataUrl = {},
                lookupData = {
                    method: "flickr.urls.lookupUser",
                    onData: function(data)
                    {
                        return {
                            user_id: data.user.id,
                            username: data.user.username._content
                        };
                    }
                };

            function getData(){
                $.ajax({
                    url: flickrApiUrl,
                    dataType: 'jsonp',
                    data: datasourceOptions,
                    jsonpCallback: "jsonFlickrApi",
                    success: function(data)
                    {
                        var returnData = {
                            source: source,
                            sourceType: dataSourceName,
                            createThumbnails: true
                        };

                        returnData.items = getImagesDataFromJson(data, datasourceOptions);

                        if (data.photosets || data.collections)
                            $.extend(returnData, {
                                createGroups: true
                            });

                        if (returnData.items.length > 0 && ((datasourceOptions.setThumbnail && !datasourceOptions.setSinglePhotosetThumbnails) || source.isSingleLink))
                        {
                            $.extend(returnData, {
                                isGroup: true,
                                link: getPhotosetUrl(data.photoset.owner, data.photoset.id),
                                thumbnailSrc: source.isSingleLink ? undefined : getImageUrl(data.photoset.photo[0], flickrImageSizes[datasourceOptions.thumbsize]),
                                title: "None"
                            });
                        }

                        if (callback)
                            callback(returnData);
                    },
                    error : function(xOptions, textStatus){
                        if (options.onLoadError)
                            options.onLoadError("Flickr plugin encountered an error while retrieving data");
                    }
                });
            }

            if (source.url && !urlMatch)
                return false;

            if (urlMatch){
                var urlData = {
                    inputType: urlMatch[1],
                    user: urlMatch[2],
                    dataType: urlMatch[3],
                    id: urlMatch[4],
                    query: urlMatch[5]

                };

                if (urlData.query)
                {
                    queryData = yox.utils.url.queryToJson(urlData.query);
                    $.extend(fromDataUrl, queryData);
                }

                if (urlData.inputType == "search"){
                    fromDataUrl.method = "flickr.photos.search";
                    fromDataUrl.text = queryData.q;
                    if (queryData.w)
                    {
                        queryData.w = queryData.w.replace("%40", "@");
                        if (queryData.w.match(flickrUserIdRegex))
                            fromDataUrl.user_id = queryData.w;
                    }
                    if (!queryData || !queryData.sort)
                        fromDataUrl.sort = "relevance";

                    requireLookup = false;
                }
                else{
                    if (urlData.dataType){
                        $.extend(fromDataUrl, dataTypes[urlData.dataType || "default"](source, urlData.id));

                        if (urlData.dataType === "galleries"){
                            if (urlData.id){
                                requireLookup = true;
                                lookupData = {
                                    method: "flickr.urls.lookupGallery",
                                    onData: function(data)
                                    {
                                        return {
                                            gallery_id: data.gallery.id,
                                            title: data.gallery.title
                                        };
                                    }
                                };
                            }
                        }
                    }
                    else
                        fromDataUrl.method = "flickr.people.getPublicPhotos";

                    fromDataUrl.username = urlData.user;
                    fromDataUrl.type = urlData.dataType;
                }
            }

            var datasourceOptions = jQuery.extend({}, defaults, fromDataUrl,source, fixedOptions);

            datasourceOptions.media = "photos";
            if (datasourceOptions.user && datasourceOptions.photoset_id)
                datasourceOptions.method = "flickr.photosets.getPhotos";

            var screenSize = screen.width > screen.height ? screen.width : screen.height;

            // Save resources for smaller screens:
            if (!datasourceOptions.imageSize || (screenSize.width <= 800 && datasourceOptions.imageSize != "medium"))
                datasourceOptions.imageSize = "medium";

            if (requireLookup){
                $.ajax({
                    url: flickrApiUrl,
                    dataType: 'jsonp',
                    data: $.extend({ url: source.url, method: lookupData.method }, fixedOptions),
                    jsonpCallback: "jsonFlickrApi",
                    success: function(data)
                    {
                        $.extend(datasourceOptions, lookupData.onData(data));
                        getData();
                    }
                });
            }
            else
                getData();
        }
    };
})(jQuery);