var Settings = require('settings');

var xmldoc = require('xmldoc');
var Promise = require('p');

var CACHE_FOR = 900; // 15 minutes

function Cache () {
    var self = this;
    self.loaded = false;
    // Raw values
    var values = {
        todos: [],
        contexts: [],
        lastUpdated: null
    };
    // Prepared & normalized values
    var normalized = null;
    self.get = function () {
        console.log(values.lastUpdated);
        if (!values.lastUpdated) {
            return null;
        }
        var then = new Date();
        then.setSeconds(then.getSeconds() - CACHE_FOR);
        console.log(then);
        console.log(values.lastUpdated < then);
        if (values.lastUpdated < then) {
            return null;
        }
        return normalized;
    };
    self.load = function () {
        console.log('Loading cache');
        var contexts = Settings.data('contexts');
        var todos = Settings.data('todos');
        var lastUpdated = Settings.data('lastUpdated');
        console.log(contexts);
        console.log(todos);
        console.log(lastUpdated);
        if (!!contexts && !!todos && !!lastUpdated) {
            console.log('Assigning!');
            values.contexts = contexts;
            values.todos = todos;
            values.lastUpdated = new Date(lastUpdated);
            rehash();            
        }
        self.loaded = true;
        console.log('CAche loaded');
    };
    self.save = function (todos, contexts) {
        // Todos
        var toSave = [];
        for (var i=0; i<todos.length; i++) {
            toSave.push(todos[i].toDict());
        }
        Settings.data('todos', toSave);
        values.todos = toSave;
        // Contexts
        toSave = [];
        for (i=0; i<contexts.length; i++) {
            toSave.push(contexts[i].toDict());
        }
        Settings.data('contexts', toSave);
        values.contexts = toSave;
        // Date
        values.lastUpdated = new Date();
        Settings.data('lastUpdated', values.lastUpdated.toISOString());
        rehash();
    };
    
    function rehash () {
        normalized = [];
        var contextsDict = {};
        var i;
        for(i=0; i<values.contexts.length; i++) {
            var raw = values.contexts[i];
            var context = new Context(raw.id, raw.name);
            contextsDict[context.id] = context;
            context.todos = [];
            normalized.push(context);
        }
        console.log(JSON.stringify(contextsDict));
        for(i=0; i<values.todos.length; i++) {
            console.log('Raw: ' + JSON.stringify(values.todos[i]));
            var todo = new Todo(values.todos[i]);
            console.log('Todo ID: ' + todo.contextId);
            console.log('Context: ' + contextsDict[todo.contextId]);
            contextsDict[todo.contextId].todos.push(todo);
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
        req.open(method, url, true, config.username, config.password);
        req.onload = function(e) {
            if (req.readyState == 4 && req.status == 200) {
                if(req.status == 200) {
                    console.log('OK!');
                    resolve(req.responseText);
                } else {
                    console.error('API error');
                    console.log(req);
                    reject();
                }
            }
        };
        req.onerror = function (e) {
            console.error('API error');
            console.log(e);
            reject();
        };
        req.send(null);
    });
}

function Context (id, name) {
    var self = this;
    self.id = parseInt(id, 10);
    self.name = name;
    self.todos = [];

    self.toDict = function () {
        return {
            id: self.id,
            name: self.name
        };
    };
}

function Todo (data) {
    var self = this;
    self.id = parseInt(data.id, 10);
    self.contextId = parseInt(data.contextId, 10);
    self._name = data.name;
    setName();
    self.description = data.description;
    self.status = data.status;
    self.completed = self.status === 'completed';
    if (data.due !== '') {
        self.due = new Date(data.due);
    } else {
        self.due = null;
    }
    
    function setName () {
        if (self.completed) {
            self.name = '\uD83D\uDC4D ' + self._name;
        } else {
            self.name = self._name;
        }
    }
    
    self.getDueString = function getDueString () {
        var days, sAppendix = '';
        if (self.completed) {
            return 'done!';
        }
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
        setName();
    };
    
    self.toDict = function () {
        return {
            id: self.id,
            contextId: self.contextId,
            name: self._name,
            description: self.description,
            status: self.status,
            due: self.due !== null ? self.due.toISOString() : '',
        };
    };
}

function getContexts () {
    return new Promise(function(resolve, reject) {
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
                var todo = new Todo({
                    id: item.childNamed('id').val,
                    contextId: item.childNamed('context-id').val,
                    name: item.childNamed('description').val,
                    due: item.childNamed('due').val,
                    description: item.childNamed('notes').val,
                    status: item.childNamed('state').val,
                });
                todos.push(todo);
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
            console.log('Cache found!');
            console.log(JSON.stringify(fromCache));
            return resolve(fromCache);
        }
        console.log('Cache not found!');
        Promise.all([getTodos(), getContexts()]).then(function(results) {
            var todos = results[0];
            var contexts = results[1];
            CACHE.save(todos, contexts);
            resolve(CACHE.get());
        });
    });
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
    getTodos: getAll,
    toggle: toggle,
};