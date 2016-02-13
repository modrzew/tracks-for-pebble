function Todo2MenuItem (todo) {
    return {
        title: todo.name,
        subtitle: todo.getDueString(),
        original: todo,
    };
}

module.exports = {
    Todo2MenuItem: Todo2MenuItem,
};
