function requestServer() {
    var request = new XMLHttpRequest();
    request.open('GET', '/request', true);
    request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
            var data = JSON.parse(this.response);
            var textField = document.getElementById('response_server');
            textField.value = data.key + ' : ' + data.value;
        }
        else {
            console.log('we reached our target server, but it returned an error');
        }
    };
    request.onerror = function() {
        console.log('there was a connection error of some sort');
    };
    request.send();
}
