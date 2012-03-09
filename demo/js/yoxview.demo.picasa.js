var viewer =  document.getElementById("viewer"),
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

var modules = {
    albumsData: new yox.data({ source: {
        type: "picasa",
        url: document.getElementById("source_input").value,
        thumbsize: 104,
        imgmax: 912,
        cropThumbnails: true
    }}),
    data: new yox.data({
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
    })
};
function setContainerSize(){
    $contents.width(docElement.clientWidth - $albums.width() - 1);

    var height = docElement.clientHeight - heightToSubtract;
    if (!imagesInit)
        height += $thumbnailsPanel.height() + info.clientHeight + 2;

    viewer.style.height = height + "px";
    if (isInit)
        modules.view.update();
}

setContainerSize();

function setUser(){
    modules.albumsData.source({
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
    modules.view.toggleSlideshow();
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

modules.thumbnails = new yox.thumbnails($thumbnailsContainer, {
    data: modules.data,
    handleClick: false,
    events: {
        create: function(){
            $thumbnailsContainer.yoxscroll("update");
        }
    }
});

modules.albumThumbnails = new yox.thumbnails($albums, {
    data: modules.albumsData,
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

modules.albumsView = new yox.view(document.body, {
    handleThumbnailClick: false,
    renderThumbnailsTitle: false,
    data: modules.albumsData,
    events: {
        load: function(data){
            document.title = document.getElementById("pageTitle").innerHTML = data.sources[0].data.author.name + "'s gallery";
        }
    }
});
$albums.on("click", "a", function(e){
    e.preventDefault();
    $(".selected", $albums).removeClass("selected");
    modules.data.source({
        url: this.getAttribute("href"),
        cropThumbnails: false,
        thumbsize: 104,
        imgmax: 912
    });

    this.className = "selected";
});

modules.view = new yox.view(viewer, {
    enableKeyboard: true,
    margin: { top: 10, right: 45, bottom: 10, left: 45 },
    controls: {
        prev: $("#yoxviewPrev"),
        next: $("#yoxviewNext")
    },
    createThumbnails: false,
    data: modules.data,
    events: {
        beforeSelect: function(items, data){
            $thumbnailsContainer.yoxscroll("scrollTo", items.newItem.thumbnail.element, { centerElement: !data });
            modules.thumbnails.select(items.newItem.id - 1);
        },
        close: function(){ info.innerHTML = "" },
        select: function(item){
            infoTitle.innerHTML = item.title || "";
            itemCounter.innerHTML = [item.id, '/', this.items.length].join("");
            document.title = title + (item ? " - " + item.title : "");
        },
        cacheStart: function(){ loader.style.display = "inline" },
        cacheEnd: function(){
            loader.style.display = "none";
        },
        init: function(){ this.items.length && this.selectItem(0); },
        loadItem: function(item){ $(modules.thumbnails.thumbnails[item.id - 1]).addClass("loadedThumbnail"); },
        load: function(data){
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
});

$thumbnailsContainer.yoxscroll({
    events: {
        click: function(originalEvent){
            modules.view.selectItem(parseInt(originalEvent.target.parentNode.getAttribute("data-yoxthumbindex"), 10), "yoxscroll");
        }
    },
    elements: $(".thumbnailsBtn"),
    pressedButtonClass: "enabledThumbnailsButton"
});
isInit = true;