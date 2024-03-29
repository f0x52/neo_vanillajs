var observe
var roomid
var checked = document.querySelector('input[name="room_radio"]:checked')
var homeserver = "https://matrix.org"
var user, token, next_batch, user_info
var rooms = []
var resumed = false
var colors = ["red", "green", "yellow", "blue", "purple", "cyan", "grey"]
var sent = []

if(checked != null) {
    roomid = checked.value
}

hashCode = function(s){
      return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
}

function show(element) {
    element.style.display="block"
}

function hide(element) {
    element.style.display="none"
}

function login(e) {
    e.preventDefault()
    user = document.getElementById("user").value
    pass = document.getElementById("pass").value
    console.log("logging in " + user)

    var xmlhttp = new XMLHttpRequest()
    var url = homeserver+"/_matrix/client/r0/login"
    xmlhttp.open("POST", url, true)
    xmlhttp.setRequestHeader("Content-type", "application/json")
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 ) {
            if(xmlhttp.status === 200) {
                console.log(xmlhttp.responseText)
                login_success(xmlhttp.responseText)
            } else {
                //something went wrong
                error = JSON.parse(xmlhttp.responseText).error
                if(error != undefined) {
                    document.getElementById("error").textContent = error
                    hide(document.getElementById("loading"))
                }
            }
        }
    }
    var parameters = {
        "user": user,
        "password": pass,
        "type": "m.login.password",
        "initial_device_display_name": "Neo Webclient",
    }
    xmlhttp.send(JSON.stringify(parameters))
    show(document.getElementById("loading"))
}

function login_success(data) {
    json = JSON.parse(data)
    token = json.access_token
    if(json.access_token) {
        user_info = {}
        localStorage.setItem('token', json.access_token)
        localStorage.setItem('user', user)
        localStorage.setItem('homeserver', homeserver)
        localStorage.setItem('user_info', JSON.stringify(user_info))
        hide(document.getElementById("login"))
        initial_sync()
    } else {
        //something went wrong
        console.log("fatal error")
    }
}

function resume(json) {
    hide(document.getElementById("loading"))
    hide(document.getElementsByClassName("login")[0])
    show(document.getElementsByClassName("main")[0])
    document.getElementById("loading").style.height = "40px";
    document.getElementById("loading").style.width = "40px";

    document.getElementById("loading").style.top = "5px";
    document.getElementById("loading").style.right = "5px";
    document.getElementById("loading").style.left = "auto";
    document.getElementById("loading").style.marginLeft = 0;
    document.getElementById("loading").style.marginRight = "10px";
    document.getElementById("loading").style.marginTop = "0";

    text.focus()
    text.select()
    resize_textarea()
    resumed=true
}

function initial_sync() {
    var xmlhttp = new XMLHttpRequest()
    var url = homeserver + "/_matrix/client/r0/joined_rooms?access_token=" + token
    console.log("initial_sync")
    xmlhttp.open("GET", url, true)
    xmlhttp.setRequestHeader("Content-type", "application/json")
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 ) {
            if(xmlhttp.status === 200) {
                json = JSON.parse(xmlhttp.responseText)
                for(var num in json.joined_rooms) {
                    var key = json.joined_rooms[num]
                    if(!rooms.includes(key)) {
                        wget(homeserver + "/_matrix/client/r0/rooms/" + key + "/state/m.room.name", function (result, key) {
                            var name = JSON.parse(result).name
                            if(name == undefined) {
                                name = key
                            }
                            //treat like a pm if the room has just one other person
                            wget(homeserver + "/_matrix/client/r0/rooms/" + key + "/state/m.room.avatar", function (result) {
                                var img = JSON.parse(result)
                                var url = "/img/blank.jpg";
                                if(img != undefined) {
                                    if(img.errcode == undefined) {
                                        url = homeserver + "/_matrix/media/r0/download/" + img.url.substring(6)
                                    }
                                }
                                new_room(key, url, name)
                            })
                        }, key)
                        rooms.push(key)
                    }
                    room_backlog(key, 100)
                }
                sync()
            } else {
                //something went wrong
                console.log("code: " + xmlhttp.status)
                sync()
            }
        }
    }
    xmlhttp.send()
    show(document.getElementById("loading"))
}

function sync() {
    setTimeout(function () {
        show(document.getElementById("loading"))
        var xmlhttp = new XMLHttpRequest()
        var url = homeserver+"/_matrix/client/r0/sync?access_token=" + token + "&timeout=30000"
        if(next_batch != undefined) {
            url+="&since=" + next_batch
        }
        xmlhttp.open("GET", url, true)
        xmlhttp.setRequestHeader("Content-type", "application/json")
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 ) {
                if(xmlhttp.status === 200) {
                    json = JSON.parse(xmlhttp.responseText)
                    next_batch = json.next_batch
                    for(var key in json.rooms.join) {
                        if(!rooms.includes(key)) {
                            wget(homeserver + "/_matrix/client/r0/rooms/" + key + "/state/m.room.name", function (result) {
                                var name = JSON.parse(result).name
                                if(name == undefined) {
                                    name = key
                                }

                                wget(homeserver + "/_matrix/client/r0/rooms/" + key + "/state/m.room.avatar", function (result, key) {
                                    var img = JSON.parse(result)
                                    var url = "/img/blank.jpg";
                                    if(img != undefined) {
                                        if(img.errcode == undefined) {
                                            url = homeserver + "/_matrix/media/r0/download/" + img.url.substring(6)
                                        }
                                    }
                                    new_room(key, url, name)
                                })
                            }, key)
                            rooms.push(key)
                        }

                        for(var event_num in json.rooms.join[key].timeline.events) {
                            var event = json.rooms.join[key].timeline.events[event_num]
                            if(document.getElementById(event.event_id) == undefined) { //can 2 homeservers have the same event id for different events?
                                if(event.type == "m.room.message") {
                                    if(user_info[event.sender] == undefined || user_info[event.sender].color == undefined) {
                                        get_user_info(event.sender)
                                    }
                                    dir = "in";
                                    if(event.sender == "@" + user + ":" + homeserver.substring(8)) {
                                        dir = "out"
                                    }

                                    new_message(key, user_info[event.sender].url, user_info[event.sender].name, event.sender, event.content.body, event.event_id, dir, event.origin_server_ts, user_info[event.sender].color)
                                }
                            }
                        }
                    }

                    hide(document.getElementById("loading"))
                    if(!resumed) {
                        resume(json.rooms.join)
                    }
                    sync()
                } else {
                    //something went wrong
                    console.log("code: " + xmlhttp.status)
                    sync()
                }
            }
        }
        xmlhttp.send()
        show(document.getElementById("loading"))
    }, 3000);
}

function room_backlog(room, num, from) {
    show(document.getElementById("loading"))
    console.log("room backlog")
    var xmlhttp = new XMLHttpRequest()
    //var url = homeserver+"/_matrix/client/r0/rooms/" + room + "/messages?access_token=" + token + "&from=" + from + "&limit=" + num + '&filter={"type": "m.room.message"}&dir=b'
    var url = homeserver+"/_matrix/client/r0/rooms/" + room + "/messages?access_token=" + token + "&limit=" + num + '&filter={"type": "m.room.message"}&dir=b'
    xmlhttp.open("GET", url, true)
    xmlhttp.setRequestHeader("Content-type", "application/json")
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 ) {
            if(xmlhttp.status === 200) {
                json = JSON.parse(xmlhttp.responseText)
                for(var i=json.chunk.length; i>0; i--) {
                    var event = json.chunk[i-1]
                    if(event.type == "m.room.message") {
                        if(user_info[event.sender] == undefined || user_info[event.sender].color == undefined) {
                            get_user_info(event.sender)
                        }
                        dir = "in";
                        if(event.sender == "@" + user + ":" + homeserver.substring(8)) {
                            dir = "out"
                        }

                        new_message(room, user_info[event.sender].url, user_info[event.sender].name, event.sender, event.content.body, event.event_id, dir, event.origin_server_ts, user_info[event.sender].color)
                    }
                }
                hide(document.getElementById("loading"))
                if(!resumed) {
                    resume()
                }
                sync()
            } else {
                //something went wrong
                console.log("backlog for " + room + " failed with code: " + xmlhttp.status)
                room_backlog(room, num, from)
            }
        }
    }
    xmlhttp.send()
}

function process_sync(json) {
}

function get_user_info(user_id) {
    user_info[user_id] = {name:user_id, url: "/img/blank.jpg", color: colors[Math.abs(hashCode(user_id))%6]}
    wget(homeserver + "/_matrix/client/r0/profile/" + user_id + "/displayname", function (result, user_id) {
        var name = JSON.parse(result).displayname
        if(name != undefined) {
            user_info[user_id].name = name
        } else {
            user_info[user_id].name = user_id
        }

        var user_messages = document.getElementsByClassName(user_id)
        for(var i=0; i < user_messages.length; i++) {
            user_messages[i].getElementsByTagName("b")[0].textContent = user_info[user_id].name
        }
        localStorage.setItem('user_info', JSON.stringify(user_info))

        wget(homeserver + "/_matrix/client/r0/profile/" + user_id + "/avatar_url", function (result, user_id) {
            var img = JSON.parse(result)
            if(img != undefined) {
                if(img.errcode == undefined && img.avatar_url != undefined) {
                    var url = homeserver + "/_matrix/media/r0/download/" + img.avatar_url.substring(6)
                    user_info[user_id].url = url

                    var user_messages = document.getElementsByClassName(user_id)
                    for(var i=0; i < user_messages.length; i++) {
                        user_messages[i].getElementsByTagName("img")[0].src = user_info[user_id].url
                    }
                    localStorage.setItem('user_info', JSON.stringify(user_info))
                }
            }
        }, user_id)
    }, user_id)

}

function wget(url, done_func, key, event) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open( "GET", url + "?access_token=" + token, true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 ) {
            if(key != undefined) {
                if(event != undefined) {
                    done_func(xmlhttp.responseText, key, event)
                } else {
                    done_func(xmlhttp.responseText, key)
                }
            } else {
                done_func(xmlhttp.responseText)
            }
        }
    }
    xmlhttp.send(null);
}

function resize_textarea() {
    text.style.height = 'auto'
    text.style.height = text.scrollHeight+'px'
}
function resize_textarea_delayed () {
    window.setTimeout(resize_textarea, 5)
}

function start() {
    if (window.attachEvent) {
        observe = function (element, event, handler) {
            element.attachEvent('on'+event, handler)
        }
    } else {
        observe = function (element, event, handler) {
            element.addEventListener(event, handler, false)
        }
    }

    var text = document.getElementById('text')
    observe(text, 'change',  resize_textarea)
    observe(text, 'cut',     resize_textarea_delayed)
    observe(text, 'paste',   resize_textarea_delayed)
    observe(text, 'drop',    resize_textarea_delayed)
    observe(text, 'keydown', resize_textarea_delayed)
    observe(text, 'keyup', shift_enter)
    observe(document.getElementById('login'), 'submit', login)
    observe(document.getElementById('list'), 'change', roomSwitch)
    observe(document.getElementById('list'), 'click', roomSwitch)
    observe(document.getElementById('send'), 'click', send)

    roomSwitch()
    console.log("Neo 0.01")

    if(localStorage.getItem("token")) {
        token = localStorage.getItem("token")
        homserver = localStorage.getItem("homserver")
        user = localStorage.getItem("user")
        user_info = JSON.parse(localStorage.getItem('user_info'))
        if(user_info == undefined) {
            console.log("reset user_info")
            user_info = {}
        }

        console.log("read token from localstorage: " + token)
        hide(document.getElementById("login"))
        document.getElementById("loading").style.top = "50%";
        document.getElementById("loading").style.marginTop = "-45px";
        show(document.getElementById("loading"))
        console.log("start")
        initial_sync()
    }
}

function shift_enter(event) {
    if (event.keyCode == 13 && !event.shiftKey) {
        send()
    }
}

function send() {
    textfield = document.getElementById("text")
    if(textfield.value != "") {
        msg = textfield.value.replace(/^\s+|\s+$/g, '')
        textfield.value = ""
        unixtime = Date.now()

        var xmlhttp = new XMLHttpRequest()
        var url = homeserver+"/_matrix/client/r0/rooms/" + roomid + "/send/m.room.message/" + unixtime + "?access_token=" + token
        xmlhttp.open("PUT", url, true)
        xmlhttp.setRequestHeader("Content-type", "application/json")
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 ) {
                if(xmlhttp.status === 200) {
                } else {
                    //something went wrong
                    console.log(xmlhttp.responseText)
                    console.log("fatal error sending")
                }
            }
        }
        var body = {
            "msgtype": "m.text",
            "body": msg,
        }
        xmlhttp.send(JSON.stringify(body))
    }
    resize_textarea_delayed()
}

function roomSwitch() {
    current_view = document.getElementById("messages_" + roomid)
    if(current_view != null) {
        current_view.style.display="none"
    }
    checked = document.querySelector('input[name="room_radio"]:checked')
    if(checked != null) {
        roomid = checked.value
    }
    new_view = document.getElementById("messages_" + roomid)
    if(new_view != null) {
        new_view.style.display="block"
    }
    var element = document.getElementById("message_window");
    element.scrollTop = element.scrollHeight;
}

function sort_roomlist() {
    var list = document.getElementById("list");

    var items = list.getElementsByClassName("room_item");
    var itemsArr = []
    for(var i = 0 ; i < items.length; i++){
        itemsArr.push(items[i])
    }
    itemsArr.sort(function(a, b) {
        return b.getElementsByClassName("ts")[0].textContent - a.getElementsByClassName("ts")[0].textContent
    });

    for (i = 0; i < itemsArr.length; ++i) {
        list.appendChild(itemsArr[i]);
    }
}

function new_room(id, img, name) {
    var prototype = document.getElementById("prototypes").getElementsByClassName("room_item")[0]
    var room_element = prototype.cloneNode(true)
    room_element.id = id

    room_element.getElementsByClassName("room_radio")[0].id = id + "_radio"
    room_element.getElementsByClassName("room_radio")[0].name = "room_radio"
    room_element.getElementsByClassName("room_radio")[0].value = id

    room_element.getElementsByTagName("label")[0].htmlFor = id + "_radio"
    room_element.getElementsByTagName("label")[0].id = id
    room_element.getElementsByTagName("img")[0].src = img
    room_element.getElementsByTagName("span")[0].textContent = name

    var div = document.createElement('div')
    div.classList.add("room_messages")
    div.id="messages_" + id

    var span = document.createElement('span')
    span.innerHTML = "Room: " + id
    div.append(span)
    div.style.display = "none"
    document.getElementById("message_window").append(div)
    document.getElementById("list").append(room_element)
}

function new_message(id, img, name, user_id, text, event_id, dir, unixtime, color, unsent) {
    var prototype = document.getElementById("prototypes").getElementsByClassName("line")[0]
    var message = prototype.cloneNode(true)

    message.getElementsByClassName("message")[0].id = event_id
    message.getElementsByClassName("message")[0].classList.add(dir)
    message.getElementsByClassName("message")[0].classList.add(user_id)
    if(unsent != undefined) {
        message.getElementsByClassName("message")[0].classList.add("unsent")
    }

    message.getElementsByTagName("img")[0].src = img

    message.getElementsByTagName("b")[0].textContent = name

    message.getElementsByTagName("b")[0].classList.add(color)
    message.getElementsByTagName("p")[0].textContent = text
    message.getElementsByTagName("p")[0].innerHTML = message.getElementsByTagName("p")[0].innerHTML.linkify()

    message.getElementsByTagName("p")[0].innerHTML = message.getElementsByTagName("p")[0].innerHTML.replace(/\n/g, "<br>")
    now = new Date()
    time = new Date(unixtime)
    time_hours = time.getHours()
    time_mins = time.getMinutes()
    if (time_hours < 10) time_hours = "0" + time_hours
    if (time_mins < 10) time_mins = "0" + time_mins
    time_string = time_hours + ":" + time_mins
    date_string = time.toLocaleDateString()
    message.getElementsByClassName("timestamp")[0].textContent = time_string

    var room = document.getElementById(id)
    if(now.getFullYear() == time.getFullYear() && now.getMonth() == time.getMonth() && now.getDate() == time.getDate()) {
        room.getElementsByClassName("timestamp")[0].textContent = time_string
    } else {
        room.getElementsByClassName("timestamp")[0].textContent = date_string
    }
    room.getElementsByClassName("ts")[0].textContent = unixtime
    room.getElementsByClassName("last_msg")[0].textContent = name + ": " + text

    document.getElementById("messages_"+id).append(message)

    var element = document.getElementById("message_window");
    element.scrollTop = element.scrollHeight;
    sort_roomlist()
}

if(!String.linkify) {
    String.prototype.linkify = function() {
        var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
        var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
        var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;
        return this
            .replace(urlPattern, '<a href="$&">$&</a>')
            .replace(pseudoUrlPattern, '$1<a href="http://$2">$2</a>')
            .replace(emailAddressPattern, '<a href="mailto:$&">$&</a>');
    };
}

function get_caret(el) {
    if (el.selectionStart) {
        return el.selectionStart
    } else if (document.selection) {
        el.focus()
        var r = document.selection.createRange()
        if (r == null) {
            return 0
        }
        var re = el.createTextRange(), rc = re.duplicate()
        re.moveToBookmark(r.getBookmark())
        rc.setEndPoint('EndToStart', re)
        return rc.text.length
    }
    return 0
}

start()
