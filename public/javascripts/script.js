
function searchTable() {
    // Declare variables
    var input, filter, table, tr, td, i;
    input = document.getElementById("tableSearch");
    filter = input.value.toUpperCase();
    table = document.getElementById("numTable");
    tr = table.getElementsByTagName("tr");

    // Loop through all table rows, and hide those who don't match the search query
    for (i = 0; i < tr.length; i++) {
        td = tr[i].getElementsByTagName("td")[0];
        if (td) {
            if (td.innerHTML.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}




function getUserToken() {
    try {
        sessionStorage.setItem('test',1);
        sessionStorage.removeItem('test');
        return sessionStorage.getItem('userID');
    } catch (err) {
        return getCookie('userID');
    }

}

function getUserEmail() {
    try {
        sessionStorage.setItem('test',1);
        sessionStorage.removeItem('test');
        return sessionStorage.getItem('userEmail');
    } catch (err) {
        return getCookie('userEmail');
    }
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function checkCookie(cname) {
    var user = getCookie(cname);
    if (user != "") {
        return true;
    } else {
        return false;
    }
}

function deleteCookie(cname) {
    if(checkCookie(cname)) {
        var d = new Date();
        d.setTime(d.getTime()-100000);
        var expires = "expires="+d.toUTCString();
        document.cookie = cname + "=;" + expires + ";path=/";
    }
}

function adminLink(path) {
    var userToken = getUserToken();
    document.location.href = path+"token=" + userToken;
}


function studentLink(path) {
    var userToken = getUserToken();
    document.location.href = path+"token=" + userToken;
}
