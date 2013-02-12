var key = /weibo\/([^&\/]+)/.exec(location.href)[1];
if (key) {
    key = decodeURIComponent(decodeURIComponent(key));
    setTimeout(parse, 20 * 1000);
}

function parse() {
    var tweets = [];
    $("dl[action-type=feed_list_item]").each(function() {
        var tweet = {
            "key":      key,
            "id":       parseInt($(this).attr("mid")),
            "user":     $(this).find("a[nick-name]:first").text(),
            "content":  $(this).find("em").html(),
            "url":      $(this).find("p a[node-type='feed_list_item_date']").attr("href"),
            "time":     $(this).find("p a[node-type='feed_list_item_date']").attr("title"),
        }
        tweets.push(tweet);
    });
    tweets = _.filter(tweets, function(tweet) {
        return /color:red/.test(tweet.content);
    });
    tweets = _.sortBy(tweets, "id");
    chrome.extension.sendRequest({"cmd": "add", "key": key, "data": tweets});
    console.log("send tweets", tweets);
}
