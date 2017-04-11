
function getUserToken() {
    return sessionStorage.getItem('userID');
}

function getUserEmail() {
    return sessionStorage.getItem('userEmail');
}

function adminLink() {
    var userToken = getUserToken();
    document.location.href = "/admin?token=" + userToken;
}


// Fake localStorage implementation.
// Mimics localStorage, including events.
// It will work just like localStorage, except for the persistant storage part.
//FROM: https://gist.github.com/engelfrost/fd707819658f72b42f55
var fakeSessionStorage = function() {
    var fakeSessionStorage = {};
    var storage;

    // If Storage exists we modify it to write to our fakeLocalStorage object instead.
    // If Storage does not exist we create an empty object.
    if (window.Storage && window.sessionStorage) {
        storage = window.Storage.prototype;
    } else {
        // We don't bother implementing a fake Storage object
        window.sessionStorage = {};
        storage = window.sessionStorage;
    }

    // For older IE
    if (!window.location.origin) {
        window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
    }

    var dispatchStorageEvent = function(key, newValue) {
        var oldValue = (key == null) ? null : storage.getItem(key); // `==` to match both null and undefined
        var url = location.href.substr(location.origin.length);
        var storageEvent = document.createEvent('StorageEvent'); // For IE, http://stackoverflow.com/a/25514935/1214183

        storageEvent.initStorageEvent('storage', false, false, key, oldValue, newValue, url, null);
        window.dispatchEvent(storageEvent);
    };

    storage.key = function(i) {
        var key = Object.keys(fakeSessionStorage)[i];
        return typeof key === 'string' ? key : null;
    };

    storage.getItem = function(key) {
        return typeof fakeSessionStorage[key] === 'string' ? fakeSessionStorage[key] : null;
    };

    storage.setItem = function(key, value) {
        dispatchStorageEvent(key, value);
        fakeSessionStorage[key] = String(value);
    };

    storage.removeItem = function(key) {
        dispatchStorageEvent(key, null);
        delete fakeSessionStorage[key];
    };

    storage.clear = function() {
        dispatchStorageEvent(null, null);
        fakeSessionStorage = {};
    };
};