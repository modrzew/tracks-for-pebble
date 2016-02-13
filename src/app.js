/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vector2 = require('vector2');

var api = require('api');
var appUI = require('app-ui');

// var main = new UI.Card({
//   title: 'Pebble.js',
//   icon: 'images/menu_icon.png',
//   subtitle: 'Hello World!',
//   body: 'Press any button.',
//   subtitleColor: 'indigo', // Named colors
//   bodyColor: '#9a0036' // Hex colors
// });

// main.show();

var menu = new UI.Menu({sections: []});
api.getTodos().then(function (contexts) {
    for (var i=0; i<contexts.length; i++) {
        var context = contexts[i];
        var items = [];
        for (var j=0; j<context.todos.length; j++) {
            items.push(appUI.Todo2MenuItem(context.todos[j]));
        }
        menu.section(i, {title: context.name, items: items});
    }
    menu.show();
});

menu.on('longSelect', function(e) {
    var item = appUI.Todo2MenuItem(e.item.original);
    item.title = 'Toggling...';
    menu.item(e.sectionIndex, e.itemIndex, item);
    api.toggle(e.item.original).then(function () {
        menu.item(e.sectionIndex, e.itemIndex, appUI.Todo2MenuItem(e.item.original));
    });
});

// main.on('click', 'down', function(e) {
//   var card = new UI.Card();
//   card.title('A Card');
//   card.subtitle('Is a Window');
//   card.body('The simplest window type in Pebble.js.');
//   card.show();
// });