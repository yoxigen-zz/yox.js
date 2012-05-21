yox.eventsHandler = function(){
    var namespaces = {
        _default: {}
    };

    this.triggerEvent = function(eventName, data, sender){
        var eventNameParts = eventName.split("."),
            eventType = eventNameParts[0],
            namespaceName = eventNameParts[1];

        if (namespaceName){
            var namespace = namespaces[namespaceName];
            if (namespace){
                var namespaceEvents = namespace[eventType];
                if (namespaceEvents){
                    for(var i=0, eventHandler; eventHandler = namespaceEvents[i]; i++){
                        eventHandler.call(this, data, sender);
                    }
                }
            }
        }

        var noNamespacedEvents = namespaces._default[eventType];
        if (noNamespacedEvents){
            for(var i=0, eventHandler; eventHandler = noNamespacedEvents[i]; i++){
                eventHandler.call(this, data, sender);
            }
        }
    };

    this.addEventListener = function(eventName, eventHandler){
        var eventNameParts = eventName.split("."),
            eventType = eventNameParts[0],
            namespaceName = eventNameParts[1],
            namespace;

        if (namespaceName){
            namespace = namespaces[namespaceName];
            if (!namespace)
                namespace = namespaces[namespaceName] = { };
        }
        else
            namespace = namespaces._default;

        var event = namespace[eventType];
        if (!event)
            event = namespace[eventType] = [];

        event.push(eventHandler);
    };

    this.removeEventListener = function(eventName, eventHandler){
        var eventNameParts = eventName.split("."),
            eventType = eventNameParts[0],
            namespaceName = eventNameParts[1],
            namespace,
            foundHandler = false;

        if (namespaceName){
            namespace = namespaces[namespaceName];
            if (!namespace)
                namespace = namespaces[namespaceName] = { };
        }
        else
            namespace = namespaces._default;

        var event = namespace[eventType];
        if (event && event.length){
            for(var i=event.length; i--;){
                if (event[i] === eventHandler){
                    event.splice(i, 1);
                    foundHandler = true;
                }
            }
        }

        return foundHandler;
    }
};

yox.eventsHandler.prototype = {
    /**
     * Wraps the eventHandler's triggerEvent method with a specified 'this' and 'sender' arguments.
     * Note: This isn't done simply with the 'bind' function because the sender should be the last parameter,
     * rather than the first, and 'bind' only prepends parameters.
     * @param thisArg The object to serve as the 'this' of the triggerEvent function's call.
     * @param sender The 'sender' argument to send on triggerEvent function calls.
     */
    bindTriggerEvent: function(thisArg, sender){
        var self = this;
        return function(eventName, data){
            return self.triggerEvent.call(thisArg, eventName, data, sender);
        };
    }
}