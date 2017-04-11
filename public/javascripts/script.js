


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
    return sessionStorage.getItem('userID');
}

function getUserEmail() {
    return sessionStorage.getItem('user').getBasicProfile().getEmail();
}

function adminLink() {
    var userToken = getUserToken();
    document.location.href = "/admin?token=" + userToken;
}