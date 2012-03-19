// Prototype for all transition classes

yox.view.transition = function(name){ this.name = name; };
yox.view.transitions = {}; // Will hold the transition types

yox.view.transition.prototype = {
    // Creates all the elements and event handlers required for the transition:
    // $container: The container in which the panels are rendered (jQuery instance).
    // onLoad: A function to call when an item is ready to display.
    create: function($container, onLoad){ throw new Error("'create' method isn't implemented for this transition type.") },

    // Removes all elements created by the transition type and clears memory (by nullifying variables, etc.).
    destroy: function(){ throw new Error("'destroy' method isn't implemented for this transition type."); },

    // Returns the currently displaying panel (the last that was used):
    getCurrentPanel: function(){ throw new Error("'getCurrentPanel' method isn't implemented for this transition type.") },

    // Returns the next panel to be used:
    getPanel: function(){ throw new Error("'getPanel' method isn't implemented for this transition type.") },

    // Does the actual transition.
    // options may contain:
    // position: { width, height, left, top } for the panel.
    // duration: The time, in milliseconds, the transition should take. If not specified, the default time is used (from options.transitionTime)
    transition: function(options){ throw new Error("'transition' method isn't implemented for this transition type.") },

    // A function that's called when one or more options are changed is YoxView.
    // updateData: the changed options.
    update: function(updateData){}
};