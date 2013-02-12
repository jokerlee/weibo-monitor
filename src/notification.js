$(document).ready(function () {
    var pos = location.href.indexOf('=');
    var json = pos < 0 ? "" : location.href.substring(pos + 1);
    var tweet = JSON.parse(decodeURIComponent(json));
    $(".user").text("@" + tweet.user);
    $(".user").attr("href", tweet.url);
    $(".time").text(tweet.time);
    $("#content").html(tweet.content);
});

