function insertionSort(dataArray, type){
    // Insertion Sort Alias - params(dataArray)
    for(var i = 2; i < dataArray.length; i++){
        var key = dataArray[i];
        var j = i - 1;

        while(j > 0 && dataArray[j][type] > key[type]){
            dataArray[j + 1] = dataArray[j];
            j--;
        }
        dataArray[j + 1] = key;
    }
    return dataArray;
}

function searchTable(searchID, tableID, col) {
    var input, filter, table, tr, td, i;
    input = document.getElementById(searchID);
    filter = input.value.toUpperCase();
    table = document.getElementById(tableID);
    tr = table.getElementsByTagName("tr");

    for (i = 1; i < tr.length; i++) {
        td = tr[i].getElementsByTagName("td")[col];
        if (td) {
            if (td.innerHTML.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

function sortTable(col, tableID) {
    var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    table = document.getElementById(tableID);
    switching = true;
    dir = "asc";
    while (switching) {
        switching = false;
        rows = table.getElementsByTagName("tr");
        for (i = 2; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("td")[col];
            y = rows[i + 1].getElementsByTagName("td")[col];
            if (dir == "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    shouldSwitch= true;
                    break;
                }
            } else if (dir == "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    shouldSwitch= true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount ++;
        } else {
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
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
    var email = getUserEmail();
    document.location.href = path+"token=" + userToken + "&email=" + email;
}

function deleteSelection() {
    var token = getUserToken();
    var table = $('#adminTable').DataTable();
    var email = table.row('.selected').data()[0];
    var alias = table.row('.selected').data()[1];
    var num = table.row('.selected').data()[2];
    table.row('.selected').remove().draw( false );
    $.get('/delete-num?email='+email+'&alias='+alias+'&num='+num+'&token='+token, function() {

    });
}
