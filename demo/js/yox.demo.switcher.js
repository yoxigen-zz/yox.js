var defaultDataUrl = "",
        yoxApi = new Yox(document.body, {
            theme: [
                {
                    name: "switcher"
                },
                {
                    name: "wall",
                    options: {
                        thumbnailsMaxHeight: 300,
                        borderWidth: 3,
                        padding: 3,
                        scrollToElementOnSelect: true
                    }
                }
            ],
            data: {
                type: "picasa",
                cache: false,
                source: {
                    url: "https://picasaweb.google.com/105098710956916751721/" + (getHash() || defaultDataUrl),
                    imgmax: 1600,
                    thumbsize: 400,
                    kind: "photo",
                    pageSize: 25
                }
            },
            events: {
                keydown: function(e){
                    if (e.key === "up" || e.key === "down"){
                        var isUp = e.key === "up";

                        if(yoxApi.themes.switcher.modules.view.isOpen()){
                            var selectedThumbnail = yoxApi.themes.switcher.modules.view.currentItem.thumbnail.element,
                                    thumbnailBounds = selectedThumbnail.getBoundingClientRect(),
                                    halfPoint = {
                                        left: Math.round(thumbnailBounds.left + thumbnailBounds.width / 2),
                                        top: isUp ? thumbnailBounds.top - 10 : thumbnailBounds.bottom + 10
                                    },
                                    currentItemIndex = yoxApi.themes.switcher.modules.view.currentItem.id - 1;

                            var nextThumbnail = isUp ? selectedThumbnail.previousSibling : selectedThumbnail.nextSibling,
                                    nextThumbBounds,
                                    targetThumbnail;

                            while (!targetThumbnail && nextThumbnail && currentItemIndex >= 0){
                                if (nextThumbnail.nodeType === 1){
                                    currentItemIndex += isUp ? -1 : 1;
                                    nextThumbBounds = nextThumbnail.getBoundingClientRect()
                                    if (nextThumbBounds.top !== thumbnailBounds.top){
                                        if (halfPoint.left >= nextThumbBounds.left && halfPoint.left <= nextThumbBounds.right){
                                            targetThumbnail = nextThumbnail;
                                        }
                                    }
                                }

                                nextThumbnail = isUp ? nextThumbnail.previousSibling : nextThumbnail.nextSibling;
                            }

                            if (targetThumbnail)
                                yoxApi.themes.switcher.modules.view.selectItem(currentItemIndex);
                        }
                    }
                }
            }
        });

var albumsData = new yox.data({
    cache: false,
    events: {
        loadSources: function(data){
            var categoriesArr = [];
            for(var i=0, album; album = data[0].items[i]; i++){
                categoriesArr.push("<a href='#", album.data.album.name, "'>", album.title, "</a>");
            }
            document.getElementById("categories").innerHTML = categoriesArr.join("");
        }
    },
    source: {
        type: "picasa",
        url: "https://picasaweb.google.com/105098710956916751721"
    }
});

function getHash(){
    return window.location.hash.replace(/^#/, "");
}

window.addEventListener("hashchange", function(){
    yoxApi.data.source({
        type: "picasa",
        url: "https://picasaweb.google.com/105098710956916751721/" + getHash(),
        kind: "photo",
        imgmax: 1600,
        thumbsize: 400,
        pageSize: 25
    });
}, false);