var userToken = null;      //So we have 'global' access to user's data and not just in the scope of the login function

String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length == 0) return hash;
    for (i = 0; i < this.length; i++) {
        char = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

function getUserToken() {
    return userToken;
}

function adminLink() {
    return "/admin?token=" + userToken;
}