/* Draw Initial Graph */
function drawChart() {

    /* Display bar chart */

    var data = google.visualization.arrayToDataTable(dataArray);

    var view = new google.visualization.DataView(data);
    view.setColumns([{ type: "string" }, { type: "string" }, { type: "string" }]);
    var numRows = data.getNumberOfRows();
    var heightMult = 60;
    if(numRows > 15){
        heightMult = 40;
    }

    var options = {
        chart: {
            title: 'Number Results',
            subtitle: 'RSA Factoring Challenge',
        },
        series: {
            0: { axis: 'count' },
            1: { axis: 'bits' }
        },
        axes: {
            x: {
                count: { label: 'Factor Count' },
                bits: { side: 'top', label: 'Bit Length' }
            }
        },
        bars: 'horizontal',             // Required for Material Bar Charts.
        hAxis: {format: 'decimal'},
        width: 1200,
        height: numRows * heightMult,
        colors: ['#1b9e77', '#fe9834']
    };

    var chart = new google.charts.Bar(document.getElementById('chart_div'));

    chart.draw(data, google.charts.Bar.convertOptions(options));

}

/* Sort and Redraw Graph */
function sortChart(type) {

    dataArray = insertionSort(dataArray, type);

    /* Display bar chart */

    var data = google.visualization.arrayToDataTable(dataArray);

    var newView = new google.visualization.DataView(data);
    newView.setColumns([{ type: "string" }, { type: "string" }, { type: "string" }]);
    var numRows = data.getNumberOfRows();
    var heightMult = 60;
    if(numRows > 15){
        heightMult = 40;
    }

    var options = {
        chart: {
            title: 'Number Results',
            subtitle: 'RSA Factoring Challenge',
        },
        series: {
            0: { axis: 'count' },
            1: { axis: 'bits' }
        },
        axes: {
            x: {
                count: { label: 'Factor Count' },
                bits: { side: 'top', label: 'Bit Length' }
            }
        },
        bars: 'horizontal', // Required for Material Bar Charts.
        hAxis: {format: 'decimal'},
        width: 1200,
        height: numRows * heightMult,
        colors: ['#1b9e77', '#fe9834']
    };

    var chart = new google.charts.Bar(document.getElementById('chart_div'));

    chart.draw(data, google.charts.Bar.convertOptions(options));
}

/* Create Student Data Table */
function createTable(data, tbl, email_num, alias){
    if(alias)
        alias = alias[0].alias;
    else
        alias = 'unknown';
    document.getElementById('alias').innerHTML = "Your alias is: " + alias;

    /*      Insert student data into table      */
    for(var i = 0; i < data.length; i++){
        if (data[i][0].type === 'student') {
            var row = tbl.insertRow(0);
            row.onclick = function (r, j) {
                return function () {
                    expand(r, j + 2);
                }
            }(row, i);
            row.insertCell(0).innerHTML = data[i][0].alias;
            row.insertCell(1).innerHTML = data[i][0].num_submit.slice(-10);
            row.insertCell(2).innerHTML = data[i][0].num_length;
            row.insertCell(3).innerHTML = data[i][0].num_prime;
            row.insertCell(4).innerHTML = data[i][0].factor_count;
            row.insertCell(5).innerHTML = data[i][0].first_factor_time;
            row.setAttribute("expanded", "false");

            // Highlight numbers you factored
            for (var key in data[email_num][0].factorized_by_me) {
                if (data[i][0].alias === key && !isNaN(data[email_num][0].factorized_by_me[key])) {
                    row.className = "ok"
                    break
                }
            }
        }
        else {
            for (var sub in data[i][0].nums) {
                var row = tbl.insertRow(0);
                row.onclick = function (r, j) {
                    return function () {
                        expand(r, j + 2);
                    }
                }(row, i);
                row.insertCell(0).innerHTML = data[i][0].nums[sub].alias;
                row.insertCell(1).innerHTML = data[i][0].nums[sub].num_submit.slice(-10);
                row.insertCell(2).innerHTML = data[i][0].nums[sub].num_length;
                row.insertCell(3).innerHTML = data[i][0].nums[sub].num_prime;
                row.insertCell(4).innerHTML = data[i][0].nums[sub].factor_count;
                row.insertCell(5).innerHTML = data[i][0].nums[sub].first_factor_time;
                row.setAttribute("expanded", "false");

                // Highlight numbers you factored
                for (var key in data[email_num][0].factorized_by_me){
                    if (data[i][0].nums[sub].alias === key && !isNaN(data[email_num][0].factorized_by_me[key])) {
                        row.className = "ok"
                        break
                    }
                }
            }
        }
    }
}

/* Create Admin Data Table */
function createAdminTable(numData, adminTable){

    for(var key in numData) {
        if (numData[key][0].type === 'student') {
            var row = adminTable.insertRow(0);
            row.insertCell(0).innerHTML = numData[key][0].email;
            row.insertCell(1).innerHTML = numData[key][0].alias;
            row.insertCell(2).innerHTML = numData[key][0].num_submit.slice(-10);
            row.insertCell(3).innerHTML = numData[key][0].num_length;
            row.insertCell(4).innerHTML = numData[key][0].num_prime;
            row.insertCell(5).innerHTML = numData[key][0].factor_count;
            row.insertCell(6).innerHTML = numData[key][0].first_factor_time;
            row.className = "header"
        }
        else {
            for (var sub in numData[key][0].nums) {
                var row = adminTable.insertRow(0);
                row.insertCell(0).innerHTML = numData[key][0].email;
                row.insertCell(1).innerHTML = numData[key][0].nums[sub].alias;
                row.insertCell(2).innerHTML = numData[key][0].nums[sub].num_submit.slice(-10);
                row.insertCell(3).innerHTML = numData[key][0].nums[sub].num_length;
                row.insertCell(4).innerHTML = numData[key][0].nums[sub].num_prime;
                row.insertCell(5).innerHTML = numData[key][0].nums[sub].factor_count;
                row.insertCell(6).innerHTML = numData[key][0].nums[sub].first_factor_time;
                row.className = "header"
            }
        }
    }

    var table = $('#adminTable').DataTable();
    $('#adminTable tbody').on( 'click', 'tr', function () {
        if ($(this).hasClass('selected') && $(this).closest('tr').next('tr').hasClass('newRow')) {

            //if($(this).hasClass('selected'))
            $(this).removeClass('selected');

            /* Find expanded row */
            $(this).closest('tr').next('tr').find('td').removeClass('currRow').addClass('hideRow');

            /* Delete expanded row */
            $(this).closest('tr').next('tr').remove();
        }
        else if($(this).hasClass('header') && !$(this).closest('tr').next('tr').hasClass('newRow')){
            table.$('tr.selected').removeClass('selected');
            $('tr.newRow').remove();
            $(this).addClass('selected');

            var tr_idx=0;

            /* If row is header or content row */
            if ($(this).find("td:first").length > 0) {

                tr_idx++;       // row index increment to assign new row id everytime

                var email = $(this).find("td:first").text();
                var alias = $(this).find("td:eq(1)").text();

                var td;
                var tr = '<tr>';
                if(alias.indexOf("_") !== -1){
                    alias = alias.slice(0, alias.length - 2);
                }
                for(var key in numData){
                    if(numData[key][0].alias === alias){
                        if(Object.keys(numData[key][0].factorized_by_me).length > 0){
                            var count = 0;
                            for(var sub in numData[key][0].factorized_by_me){
                                if(numData[key][0].factorized_by_me[sub] > 2){
                                    td = '<td style="width:14%; color: #EE0000">' + sub + ': ' + numData[key][0].factorized_by_me[sub] + '</td>'
                                }
                                else{
                                    td = '<td style="width:14%">' + sub + ': ' + numData[key][0].factorized_by_me[sub] + '</td>';
                                }
                                tr += td;
                                count++;
                                if(count % 7 === 0) tr += '<tr>';
                            }
                            while(count % 7 !== 0){
                                tr += '<td style="width:14%"></td>';
                                count++;
                            }
                        }
                        else{
                            tr = '<tr><td>Currently no answer submissions</td></tr>';
                        }
                    }
                }

                /* Create a row with td colspan 7 to show factorized description */
                var row = '><td class="currRow" colspan="7"><table class="expand-table"><tr><td colspan="7">Factorized List: ' + email + '</td></tr>' + tr + '</tr></table></td></tr>';

                /* Add animation to row */
                var newRow = $("<tr class='newRow' id=tr"+ tr_idx + row).animate({
                    height: "70px",
                }, 500);

                /* Add row to existing table */
                $(this).after(newRow);
            }
        }
    });
}

/* Sorting Algorithm */
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

/* Table Search Funcionality */
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

/* Table Sort Funcionality */
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

/* Retrieve User Token */
function getUserToken() {
    try {
        sessionStorage.setItem('test',1);
        sessionStorage.removeItem('test');
        return sessionStorage.getItem('userID');
    } catch (err) {
        return getCookie('userID');
    }

}

/* Retrieve User Email */
function getUserEmail() {
    try {
        sessionStorage.setItem('test',1);
        sessionStorage.removeItem('test');
        return sessionStorage.getItem('userEmail');
    } catch (err) {
        return getCookie('userEmail');
    }
}

/* Set Cookies */
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

/* Retrieve Cookies */
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

/* Check Cookies */
function checkCookie(cname) {
    var user = getCookie(cname);
    if (user != "") {
        return true;
    } else {
        return false;
    }
}

/* Delete Cookies */
function deleteCookie(cname) {
    if(checkCookie(cname)) {
        var d = new Date();
        d.setTime(d.getTime()-100000);
        var expires = "expires="+d.toUTCString();
        document.cookie = cname + "=;" + expires + ";path=/";
    }
}

/* Admin Nav Link */
function adminLink(path) {
    var userToken = getUserToken();
    document.location.href = path+"token=" + userToken;
}

/* Student Nav Link */
function studentLink(path) {
    var userToken = getUserToken();
    var email = getUserEmail();
    document.location.href = path+"token=" + userToken + "&email=" + email;
}

/* Delete Submission */
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
