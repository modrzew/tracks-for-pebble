function Todo2MenuItem (todo) {
    var title;
    if (todo.completed) {
        title = '[x] ' + todo.name;
    } else {
        title = '[ ] ' + todo.name;
    }
    return {
        title: title,
        subtitle: todo.getDueString(),
        original: todo,
    };
}

module.exports = {
    Todo2MenuItem: Todo2MenuItem,
};
