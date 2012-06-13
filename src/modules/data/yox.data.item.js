yox.data.item = function(itemData){
    for(var p in itemData){
        if (itemData.hasOwnProperty(p))
            this[p] = itemData[p];
    }
};

yox.data.item.prototype = {
    get next(){
        if (this.indexInSource < this.source.items.length - 1)
            return this.source.items[this.indexInSource + 1];
        else if (this.source.id < this.source.parent.data.length - 1){
            var nextSourceItems = this.source.parent.data[this.source.id + 1].items;
            return nextSourceItems[0] || null;
        }
        else
            return null;
    },
    get previous(){
        if (this.indexInSource)
            return this.source.items[this.indexInSource - 1];
        else if (this.source.id){
            var prevSourceItems = this.source.parent.data[this.source.id - 1].items;
            return prevSourceItems[prevSourceItems.length - 1];
        }
        else
            return null;
    }
};