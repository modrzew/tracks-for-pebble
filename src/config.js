var Settings = require('settings');

var Promise = require('p');

var CONFIG_URL = 'http://pebble.modriv.net/tracks/config';

var cachedConfig = Settings.option();

module.exports = {
    get: function() {
        var deferred = Promise.init();
        if (cachedConfig !== null) {
            // Apparently just resolving won't do
            setTimeout(function() {
                deferred.resolve(cachedConfig);
            });
        } else {
            Settings.config(
                { url: CONFIG_URL },
                function (e) {
                    cachedConfig = {
                        url: e.options.url,
                        username: e.options.username,
                        password: e.options.password,
                    };
                    deferred.resolve(cachedConfig);
                }
            );
        }
        return deferred;
    },
};
