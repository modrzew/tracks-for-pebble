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


module.exports = {
    Context: Context,
    Todo: Todo,
};