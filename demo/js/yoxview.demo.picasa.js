var popupContainer =  document.getElementById("popupContainer"),
    $contents = $("#contents"),
    $thumbnailsPanel = $("#thumbnailsPanel"),
    $thumbnailsContainer = $("#thumbnails"),
    $albums = $("#albums"),
    sourceInput = document.getElementById("source_input"),
    $slideshowBtn = $("#slideshowBtn"),
    $addPanel = $("#addPanel"),
    thumbnailsLoader = document.getElementById("thumbnailsLoader"),
    docElement = document.documentElement,
    info = document.getElementById("info"),
    infoTitle = document.getElementById("infoTitle"),
    loader = document.getElementById("loader"),
    itemCounter = document.getElementById("itemCounter"),
    isInit,
    heightToSubtract = document.getElementsByTagName("header")[0].clientHeight + info.clientHeight + $thumbnailsPanel.height() +2,
    title = document.title,
    imagesInit;

function setContainerSize(){
    $contents.width(docElement.clientWidth - $albums.width() - 1);

    var height = docElement.clientHeight - heightToSubtract;
    if (!imagesInit)
        height += $thumbnailsPanel.height() + info.clientHeight + 2;

    popupContainer.style.height = height + "px";
    if (isInit)
        $thumbnailsContainer.yoxview("update");
}

setContainerSize();

function setUser(){
    albumsDataSource.source({
        url: sourceInput.value,
        thumbsize: 104,
        cropThumbnails: true
    });
}

$(window).resize(function(){
    setContainerSize();
    $thumbnailsContainer.yoxscroll("update");
});

$slideshowBtn.on("click", function(e){
    $thumbnailsContainer.yoxview("toggleSlideshow");
});

$("#addBtn").on("click", function(e){ e.preventDefault(); $addPanel.slideToggle("fast"); });
$(sourceInput).on("focus", function(){ this.select(); }).on("keydown", function(e){
    if (e.keyCode === 13){
        setUser();
        return false;
    }
});
function createAlbumInfo(data, thumbnailEl){
    $(thumbnailEl).wrapInner($("#albumInfoTemplate").tmpl(data));
}

var albumsDataSource = new YoxData({ source: {
        type: "picasa",
        url: document.getElementById("source_input").value,
        thumbsize: 104,
        cropThumbnails: true
    }}),
    thumbnailsDataSource = new YoxData({
        events: {
            loadSourcesStart: function(e, data){
                thumbnailsLoader.style.display = "block";
                if (!(data instanceof jQuery) && !imagesInit){
                    imagesInit = true;
                    setContainerSize();
                    $(".yoxviewControlBtn").show();
                }
            },
            loadSources: function(e, data){
                thumbnailsLoader.style.display = "none";
            }
        }
    }),
    thumbs = new YoxThumbnails($thumbnailsContainer, {
        data: thumbnailsDataSource,
        handleClick: false,
        events: {
            create: function(){
                $thumbnailsContainer.yoxscroll("update");
            }
        }
    }),
    albumThumbs = new YoxThumbnails($albums, {
        data: albumsDataSource,
        handleClick: false,
        events: {
            create: function(data){
                $.each(data.thumbnails, function(i){
                    createAlbumInfo(data.items[i].data.album, this);
                });

                $(data.thumbnails[0]).trigger("click");
            }
        }
    });


$albums.yoxview({
    handleThumbnailClick: false,
    renderThumbnailsTitle: false,
    data: albumsDataSource,
    events: {
        load: function(e, data){
            document.title = document.getElementById("pageTitle").innerHTML = data.sources[0].data.author.name + "'s gallery";
        }
    }
})
    .on("click", "a", function(e){
        e.preventDefault();
        $(".selected", $albums).removeClass("selected");
        thumbnailsDataSource.source({
            url: this.getAttribute("href"),
            cropThumbnails: false,
            thumbsize: 104
        });

        this.className = "selected";
    });

$thumbnailsContainer.yoxview({
    delayOpen: true,
    enableKeyboard: true,
    margin: { top: 10, right: 45, bottom: 10, left: 45 },
    container: popupContainer,
    controls: {
        prev: $("#yoxviewPrev"),
        next: $("#yoxviewNext")
    },
    createThumbnails: false,
    data: thumbnailsDataSource,
    //popupPadding: 20,
    events: {
        beforeSelect: function(e, items, data){
            $thumbnailsContainer.yoxscroll("scrollTo", items.newItem.thumbnail.element, { centerElement: !data });
            thumbs.select(items.newItem.id - 1);
        },
        close: function(){ info.innerHTML = "" },
        select: function(e, item){
            infoTitle.innerHTML = item.title || "";
            itemCounter.innerHTML = [item.id, '/', this.items.length].join("");
            document.title = title + (item ? " - " + item.title : "");
        },
        cacheStart: function(e, item){ loader.style.display = "inline" },
        cacheEnd: function(e, item){ loader.style.display = "none" },
        init: function(){ this.items.length && this.selectItem(0); },
        loadItem: function(e, item){ $(item.thumbnail.element).addClass("loadedThumbnail"); },
        load: function(e, data){
            if (this.initialized)
                this.selectItem(data.items[0]);
        },
        slideshowStop: function(){ $slideshowBtn.removeClass("slideshowBtn_on"); },
        slideshowStart: function(){ $slideshowBtn.addClass("slideshowBtn_on"); }
    },
    handleThumbnailClick: false,
    //selectedThumbnailClass: "selectedThumbnail",
    zoom: true,
    transform: true,
    //transition: "evaporate",
    transitionTime: 300
})
.yoxscroll({
    events: {
        click: function(e, originalEvent){
            $thumbnailsContainer.yoxview("selectItem", parseInt(originalEvent.target.parentNode.getAttribute("data-yoxthumbindex"), 10), "yoxscroll");
        }
    },
    elements: $(".thumbnailsBtn"),
    pressedButtonClass: "enabledThumbnailsButton"
});
isInit = true;