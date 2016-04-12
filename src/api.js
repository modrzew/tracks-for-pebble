var Settings = require('settings');

var xmldoc = require('xmldoc');
var Promise = require('promise');

var models = require('models');

var CACHE_FOR = 120; // 15 minutes

function Cache () {
    var self = this;
    self.loaded = false;
    // Raw values
    var rawValues = {
        todos: [],
        contexts: [],
        lastUpdated: null
    };
    var dicts = {
        todos: {},
        contexts: {}
    };
    // Prepared & normalized values
    var normalized = null;
    self.get = function () {
        if (!rawValues.lastUpdated) {
            return null;
        }
        var then = new Date();
        then.setSeconds(then.getSeconds() - CACHE_FOR);
        if (rawValues.lastUpdated < then) {
            return null;
        }
        return normalized;
    };
    self.load = function () {
        var contexts = Settings.data('contexts');
        var todos = Settings.data('todos');
        var lastUpdated = Settings.data('lastUpdated');
        if (!!contexts && !!todos && !!lastUpdated) {
            rawValues.contexts = contexts;
            rawValues.todos = todos;
            rawValues.lastUpdated = new Date(lastUpdated);
            rehash();            
        }
        self.loaded = true;
    };
    self.save = function (todos, contexts) {
        save(todos, contexts);
        rawValues.lastUpdated = new Date();
        Settings.data('lastUpdated', rawValues.lastUpdated.toISOString());
        rehash();
    };
    
    function save(todos, contexts) {
        Settings.data('todos', todos);
        rawValues.todos = todos;
        Settings.data('contexts', contexts);
        rawValues.contexts = contexts;
    }
    
    self.updateTodo = function (todo) {
        var rawTodo;
        for(var i=0; i<rawValues.todos.length; i++) {
            rawTodo = rawValues.todos[i];
            if (rawTodo.id === todo.id) {
                rawTodo.status = todo.status;
                break;
            }
        }
        console.log(JSON.stringify(todo.toDict()));
        console.log(JSON.stringify(rawTodo));
        // Save everything
        Settings.data('todos', rawValues.todos);
    };

    function rehash () {
        normalized = [];
        var i;
        for(i=0; i<rawValues.contexts.length; i++) {
            var raw = rawValues.contexts[i];
            var context = new models.Context(raw.id, raw.name);
            dicts.contexts[context.id] = context;
            context.todos = [];
            normalized.push(context);
        }
        for(i=0; i<rawValues.todos.length; i++) {
            var todo = new models.Todo(rawValues.todos[i]);
            dicts.contexts[todo.contextId].todos.push(todo);
            dicts.todos[todo.id] = todo;
        }
    }
}

var CACHE = new Cache();


function ajax(method, endpoint) {
    return new Promise(function(resolve, reject) {
        var config = Settings.option();
        var url = config.url + endpoint;
        // I can't use Pebble's ajax library, because it doesn't allow for Basic auth
        var req = new XMLHttpRequest();
        console.log('Calling ' + method + ' ' + url);
        req.timeout = 5000;
        req.open(method, url, true, config.username, config.password);
        req.ontimeout = function(e) {
            console.log('Timeout!');
            reject('Timeout');
        };
        req.onload = function(e) {
            if (req.readyState == 4 && req.status == 200) {
                if(req.status == 200) {
                    console.log('OK!');
                    resolve(req.responseText);
                } else {
                    console.error('API error');
                    console.log(req);
                    reject(req.responseText);
                }
            }
        };
        req.onerror = function (e) {
            console.error('API error');
            console.log(e);
            reject(e);
        };
        req.send(null);
    });
}


function getContexts () {
    return new Promise(function(resolve, reject) {
        ajax('GET', 'contexts.xml').then(function (raw) {
            var tree = new xmldoc.XmlDocument(raw);
            var contexts = tree.childrenNamed('context');
            var result = [];
            for (var i=0; i<contexts.length; i++) {
                var item = contexts[i];
                result.push({
                    id: item.childNamed('id').val,
                    name: item.childNamed('name').val
                });
            }
            resolve(result);
        });
    });
}

function getTodos() {
    return new Promise(function(resolve, reject) {
        ajax('GET', 'todos.xml?limit_to_active_todos=1').then(function (raw) {
            var tree = new xmldoc.XmlDocument(raw);
            var todosTree = tree.childrenNamed('todo');
            var todos = [];
            for (var i=0; i<todosTree.length; i++) {
                var item = todosTree[i];
                todos.push({
                    id: parseInt(item.childNamed('id').val, 10),
                    contextId: parseInt(item.childNamed('context-id').val, 10),
                    name: item.childNamed('description').val,
                    due: item.childNamed('due').val,
                    description: item.childNamed('notes').val,
                    status: item.childNamed('state').val,
                });
            }
            resolve(todos);
        });
    });
}

function getAll() {
    // Initialize cache upon first call
    if (!CACHE.loaded) {
        CACHE.load();
    }
    return new Promise(function(resolve, reject) {
        var fromCache = CACHE.get();
        if (fromCache !== null) {
            return resolve(fromCache);
        }
        console.log('Cache not found!');
        Promise.all([getTodos(), getContexts()]).then(function(results) {
            var todos = results[0];
            var contexts = results[1];
            CACHE.save(todos, contexts);
            resolve(CACHE.get());
        }).catch(function(error) {
            console.error(error);
        });
    });
}

function toggle (todo) {
    return new Promise(function(resolve, reject) {
        var endpoint = 'todos/' + todo.id + '/toggle_check.xml';
        console.log('Trying to toggle');
        ajax('PUT', endpoint).then(function () {
            console.log('All good!');
            todo.toggle();
            CACHE.updateTodo(todo);
            resolve();
        }, function (e) {
            console.error(e);
            reject();
        });        
    });
}

module.exports = {
    getTodos: getAll,
    toggle: toggle,
};