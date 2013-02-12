var keys = [];

function addkey() {
    var key = $('#key').attr("value");
    if (key) {
        if (_.indexOf(keys, key) == -1) {
            keys.push(key);
            loadOptions();
        }
    }

}

function init() {
    $("#add").click(addkey);
    $("#save").click(save);
    $("#reset").click(reset);
    $(".del").live("click", function() {
        var key = $(this).parent().find(".key").text();
        var index = _.indexOf(keys, key);
        if (index >= 0) {
            keys.splice(index, 1);
            loadOptions();
        }

    });
    reset();
}

function save() {
    var json = localStorage['keys'] || "[]";
    var olds = JSON.parse(json);
    var deleted = _.difference(olds, keys);
    if (deleted.length != 0 || _.union(olds, keys).length != olds.length) {
        localStorage["keys"] = JSON.stringify(keys);
        chrome.extension.sendRequest({"cmd": "reload"});
        console.log(deleted);
    }
}

function reset() {
    var json = localStorage['keys'] || "[]";
    keys = JSON.parse(json);
    loadOptions();
}

function loadOptions() {
    $("#keys").empty();
    _.each(keys, function(key) {
        $("#keys").append("<div><button class='del'>删除</button><span class='key'>" + key +"<span></div>");
    });
}

document.addEventListener('DOMContentLoaded', init);
