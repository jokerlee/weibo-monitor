var index = 0;

window.addEventListener('DOMContentLoaded', function() {

    $("#option").click(function() {
        chrome.tabs.create({ "url": "options.html" });
    });

    // reload monitor pages
    $("#reload").click(function() {
        chrome.extension.sendRequest({"cmd": "reload"});
    });

    // mark all as read button
    $("#readall").click(function() {
        $(".tweet").each(function() { toggleTweetStatus($(this), true); });
    });

    $("#next").click(function() {
        if ($("#nomore").length === 0) {
            index += 20;
            loadTweets(index);
        }
    });

    $("#prev").click(function() {
        index = index - 20 >= 0 ? index - 20 : 0;
        loadTweets(index);
    });

    loadTweets(0);

}, false);

function toggleTweetStatus($tweet, current) {
    var prev = !$tweet.hasClass("unread");
    if (current == undefined) {
        current = !prev;
    }
    
    if (current != prev) {
        $tweet.find(".status").text(current ? "已处理" : "未处理");
        if (current) $tweet.removeClass("unread");
        else  $tweet.addClass("unread");
        var id = $tweet.data("id");
        chrome.extension.sendRequest({"cmd": "status", "id": id, "read": current});
    }
}

function loadTweets(fromIndex) {
    var msg = {"cmd": "get", "max": 20, "from": fromIndex};
    chrome.extension.sendRequest(msg, function(data) {
        $("#tweet-list").empty();
        console.log("receive tweets", data);
        
        // no more tweets
        if (data.tweets.length === 0) {
            $("#tweet-list").append($(
                    "<div id='nomore' class='tweet'>没有更多了</div>"));
            return;
        }
        _.each(data.tweets, function(t) {
            var rclass = t.read ? "" : "unread";
            var statusText = t.read ? "已处理" : "待处理";
            $("#tweet-list").append($(
                "<div class='tweet " + rclass + "' data-id='" + t.id + "'>" + 
                "<div class='header'>" + 
                    "<a class='user' target='_blank' href='" + t.url + "'>@" + t.user + "</a>" +
                    "<span class='status'>" + statusText + "</span>" + 
                    "<span class='time'>" + t.time + "</span>" + 
                "</div>" +
                "<div>" + t.content + "</div>" +
                "</div>"
            ));
        });

        // toggle tweet status
        $(".status").click(function() {
            toggleTweetStatus($(this).closest(".tweet"));
        });
    });
}

