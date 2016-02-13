var xmldoc = require('xmldoc');
var Promise = require('p');

var config = require('config');

// var config = {
//     get: function () {
//         console.log('AAAAAAAAAAAAa');
//         var deferred = Promise.init();
//         setTimeout(function(){
//             deferred.resolve({
//                 url: 'https://zadaniska.modriv.net/',
//                 username: 'test',
//                 password: 'testtest',
//             });
//         }, 1000);
//         return deferred;
//     }
// };

var CACHE = {
    todos: null,
    contexts: null,
};

function ajax(method, endpoint) {
    var deferred = Promise.init();
    config.get().then(function (config) {
        var url = config.url + endpoint;
        var req = new XMLHttpRequest();
        console.log('Calling ' + method + ' ' + url);
        req.open(method, url, true, config.username, config.password);
        req.onload = function(e) {
            if (req.readyState == 4 && req.status == 200) {
                if(req.status == 200) {
                    console.log('OK!');
                    deferred.resolve(req.responseText);
                } else {
                    console.error('API error');
                    console.log(req);
                    deferred.reject();
                }
            }
        };
        req.onerror = function (e) {
            console.error('API error');
            console.log(e);
            deferred.reject();
        };
        req.send(null);
    });
    return deferred;
}

function Context (id, name) {
    var self = this;
    self.id = parseInt(id, 10);
    self.name = name;
    self.todos = [];
}

function Todo (data) {
    var self = this;
    self.id = parseInt(data.id, 10);
    self.contextId = parseInt(data.contextId, 10);
    self.name = data.name;
    self.description = data.description;
    self.status = data.status;
    self.completed = self.status === 'completed';
    if (data.due !== '') {
        self.due = new Date(data.due);
    } else {
        self.due = null;
    }
    
    self.getDueString = function getDueString () {
        var days, sAppendix = '';
        if (self.due === null) {
            return null;
        }
        // Add 1000 because JS operates on miliseconds
        // And one day because Tracks doesn't care about time
        var diff = (self.due - new Date()) / 1000 + 86400;
        if (diff < 0) {
            // Now add +1 days because of +86400 above
            days = parseInt(diff / -86400, 10) + 1;
            if (days > 1) {
                sAppendix = 's';
            }
            return 'overdue by ' + days + ' day' + sAppendix;
        }
        if (diff < 86400) {
            return 'due today';
        } if (diff < 2 * 86400) {
            return 'due tomorrow';
        } if (diff < 7 * 86400) {
            days = parseInt(diff / 86400, 10);
            return 'due in ' + days + ' days';
        }
        return 'due in more than week';
    };
    
    self.toggle = function () {
        if (!self.completed) {
            self.status = 'completed';
            self.completed = true;
        } else {
            self.status = 'active';
            self.completed = false;
        }
    };
}

function getContexts () {
    var deferred = Promise.init();
    if (CACHE.contexts !== null) {
        deferred.resolve(CACHE.contexts);
    } else {
        ajax('GET', 'contexts.xml').then(function (raw) {
            var tree = new xmldoc.XmlDocument(raw);
            var contexts = tree.childrenNamed('context');
            var result = [];
            for (var i=0; i<contexts.length; i++) {
                var item = contexts[i];
                result.push(new Context(
                    item.childNamed('id').val,
                    item.childNamed('name').val
                ));
            }
            CACHE.contexts = result;
            deferred.resolve(CACHE.contexts);
        });
    }
    return deferred;
}

function getTodos() {
    var deferred = Promise.init();
    if (CACHE.todos !== null) {
        deferred.resolve(CACHE.todos);
    } else {
        getContexts().then(function (contexts) {
            console.log('Contexts: ' + contexts);
            var contextsDict = {};
            for (var i=0; i<contexts.length; i++) {
                var context = contexts[i];
                contextsDict[context.id] = context;
            }
            ajax('GET', 'todos.xml?limit_to_active_todos=1').then(function (raw) {
                var tree = new xmldoc.XmlDocument(raw);
                var todos = tree.childrenNamed('todo');
                var result = [];
                for (var i=0; i<todos.length; i++) {
                    var item = todos[i];
                    var todo = new Todo({
                        id: item.childNamed('id').val,
                        contextId: item.childNamed('context-id').val,
                        name: item.childNamed('description').val,
                        due: item.childNamed('due').val,
                        description: item.childNamed('notes').val,
                        status: item.childNamed('state').val,
                    });
                    console.log(todo.contextId);
                    console.log(contextsDict[todo.contextId]);
                    contextsDict[todo.contextId].todos.push(todo);
                }
                for (i=0; i<contexts.length; i++) {
                    var context = contexts[i];
                    if (context.todos.length) {
                        result.push(context);
                    }
                }
                CACHE.todos = result;
                deferred.resolve(CACHE.todos);
            });
        });
    }
    return deferred;
}

function toggle (todo) {
    var deferred = Promise.init();
    var endpoint = 'todos/' + todo.id + '/toggle_check.xml';
    console.log('Trying to toggle');
    ajax('PUT', endpoint).then(function () {
        console.log('All good!');
        todo.toggle();
        deferred.resolve();
    }, function (e) {
        console.error(e);
    });
    return deferred;
}

module.exports = {
    getTodos: getTodos,
    toggle: toggle,
};