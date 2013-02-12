var api = "http://s.weibo.com/weibo/";

var openedTabs = [];
var watchedKeys = [];
function startWatch() {
    // close previously opened tab, clear timer
    _.each(openedTabs, function(tab) {
        clearInterval(tab.timer);
        chrome.tabs.remove(tab.id);
    });
    openedTabs = [];

    // close other watching tab, laat opened tabs by chrome
    chrome.tabs.query({"pinned": true, "url": api + "*"}, function(tabs) {
        _.each(tabs, function(tab){chrome.tabs.remove(tab.id)});
    });
    
    // open one tab each keyword for monitoring tweets
    watchedKeys = JSON.parse(localStorage['keys'] || "[]");
    _.each(watchedKeys, function(key) {
        var url = api + encodeURIComponent(encodeURIComponent(key))
                + "&xsort=time&nodup=1";
        chrome.tabs.create({"url": url, "active": false, "pinned": true}, function(tab) {
            var timer = setInterval(function() {
                chrome.tabs.reload(tab.id);
            }, 10 * 60 * 1000);
            openedTabs.push({"id": tab.id, "timer": timer});
        });
    });
}


// map of (keyword, newestid) 
var newestids = {};

function init() {
    // get newest tweet id of each keyword
    DB.getTweets(null, 0, null, function(data) {
        //_.each(tweets, fuc)
        var keys = _.groupBy(data.tweets, "key");
        for (var key in keys) {
            newestids[key] = keys[key][0].id;
        }
        console.log(newestids);
    });
}

if ('webkitIndexedDB' in window) {
    window.indexedDB = webkitIndexedDB;
    window.IDBCursor = webkitIDBCursor;
    window.IDBKeyRange = webkitIDBKeyRange;
    window.IDBTransaction = webkitIDBTransaction;
}

var DB = {};
DB.db = null;

DB.open = function() {
    var request = indexedDB.open("weibo");
    request.onerror = DB.onerror;
    request.onsuccess = function(e) {
        var version = "1.1";
        DB.db = e.target.result;
        var db = DB.db;
        if (version != db.version) {
            var setVersionReq = db.setVersion(version);
            setVersionReq.onerror = DB.onerror;
            setVersionReq.onsuccess = function(e) {
                if(db.objectStoreNames.contains("tweets")) {
                    db.deleteObjectStore("tweets");
                }

                var store = db.createObjectStore("tweets", {"keyPath": "id"});
                e.target.transaction.oncomplete = function() {
                    init();
                };
            };
        } else {
            init();
        }
    };
}

// make sure all tweets are have same key
DB.addTweets = function(tweets) {
    DB.getTweets(null, 0, null, function(data) {
        var olds = data.tweets || [];
        var db = DB.db;
        var trans = db.transaction(["tweets"], "readwrite");
        var store = trans.objectStore("tweets");
        var popupCnt = 0;
        _.each(tweets, function(tweet) {
            var key = tweet.key;
            if (_.indexOf(watchedKeys, key) == -1) return;
            if (!/color:red/.test(tweet.content)) return;

            if (!newestids[key] || tweet.id > newestids[key]) { // new tweets
                newestids[key] = tweet.id;
                if (popupCnt ++ < 3) { // limit 3 notification per add at most
                    var notification = window.webkitNotifications
                        .createHTMLNotification("notification.html?html=" 
                            + encodeURIComponent(JSON.stringify(tweet)));
                    notification.show();
                }
            } else { // old tweets, maybe already added, 
                var old = _.find(olds, function(t) { return t.id == tweet.id; }) || {};
                if (!tweet.hasOwnProperty("read")) {
                    tweet.read = old.read || false;
                }
            }

            var request = store.put(tweet);
            request.onsuccess = function(e) { console.log("add ", tweet); };
            request.onerror = DB.onerror;
        });
    });
}

DB.getTweets = function(key, from, max, callback) {
    var db = DB.db;
    var trans = db.transaction(["tweets"], "readonly");
    var store = trans.objectStore("tweets");
    var cursorRequest = store.openCursor(null, "prev");

    var tweets = [];
    cursorRequest.onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor && from-- > 0) { cursor.continue(); return; }
        if (cursor && (!max || tweets.length < max)) {
            var tweet = cursor.value;
            if (_.indexOf(watchedKeys, tweet.key) != -1) {
                if ((!key || tweet.key === key) && /color:red/.test(tweet.content)) {
                    tweets.push(tweet);
                }
            }
            cursor.continue();
        } else {
            if (callback) {
                callback({"tweets": tweets});
            }
        }
    };

    cursorRequest.onerror = DB.onerror;
};


DB.statusTweet = function(id, read) {
    var db = DB.db;
    var trans = db.transaction(["tweets"], "readonly");
    var store = trans.objectStore("tweets");

    var request = store.get(id);
    request.onsuccess = function(e) {
        var tweet = e.target.result;
        tweet.read = read;
        DB.addTweets([tweet]);
    };

    request.onerror = DB.onerror;
};


DB.onerror = function(err) {
    console.log("error", err);
}

DB.open();
startWatch();

chrome.extension.onRequest.addListener(function(request, sender, callback) {
    console.log("request received: ", request);
    switch (request.cmd) {
        case "add":
            DB.addTweets(request.data);
            break;
        case "get":
            DB.getTweets(null, request.from, request.max, callback);
            break;
        case "status": 
            DB.statusTweet(request.id, request.read);
            break;
        case "reload": 
            startWatch();
            break;
        default: break;
    }
});




