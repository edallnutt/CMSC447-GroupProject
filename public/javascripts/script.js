
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
