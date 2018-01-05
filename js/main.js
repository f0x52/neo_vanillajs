//hide(document.getElementsByClassName("login")[0])
//show(document.getElementsByClassName("main")[0])
var prev = 0
var observe
var roomid
var checked = document.querySelector('input[name="room_radio"]:checked')
var homeserver = "https://matrix.org"
var user, token, next_batch, user_info
var rooms = []
var resumed = false
var colors = ["red", "green", "yellow", "blue", "purple", "cyan", "grey"]

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
                console.log("fatal error")
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
        localStorage.setItem('token', json.access_token)
        localStorage.setItem('user', user)
        localStorage.setItem('homeserver', homeserver)
        localStorage.setItem('user_info', JSON.stringify(user_info))
        initial_sync()
    } else {
        //something went wrong
        console.log("fatal error")
    }
}

function resume() {
    hide(document.getElementById("loading"))
    hide(document.getElementsByClassName("login")[0])
    show(document.getElementsByClassName("main")[0])
    document.getElementById("loading").style.height = "40px";
    document.getElementById("loading").style.width = "40px";

    document.getElementById("loading").style.top = "5px";
    document.getElementById("loading").style.right = "5px";
    document.getElementById("loading").style.left = "auto";
    document.getElementById("loading").style.marginLeft = 0;

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
                }

                //hide(document.getElementById("loading"))
                //if(!resumed) {
                //    resume()
                //}
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
        console.log("sync")
        var xmlhttp = new XMLHttpRequest()
        var url = homeserver+"/_matrix/client/r0/sync?access_token=" + token
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
                            if(event.type == "m.room.message") {
                                if(user_info[event.sender] == undefined || user_info[event.sender].color == undefined) {
                                    get_user_info(event.sender)
                                }
								dir = "in";
								if(event.sender == "@" + user + ":" + homeserver.substring(8)) {
									dir = "out"
								}
                                new_message(key, user_info[event.sender].url, user_info[event.sender].name, event.sender, event.content.body, event.event_id, dir, " ", user_info[event.sender].color)
                            }
                        }
                    }

                    hide(document.getElementById("loading"))
                    if(!resumed) {
                        resume()
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

    //new_room("room2", "/img/neo_full.png", "a room")

    //new_message("room2", "/img/neo_full.png", "someone else", "me tooooo", "000", "in", "19:00")

    //window.setTimeout(function() {new_message("room1", "/img/neo.png", "f0x", "messages can be received at any time woo threading is easy here", "000", "out", "20:00")}, 3000)
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
        unixtime = Date.now()

        var xmlhttp = new XMLHttpRequest()
        var url = homeserver+"/_matrix/client/r0/rooms/" + roomid + "/send/m.room.message/" + unixtime + "?access_token=" + token
        xmlhttp.open("PUT", url, true)
        xmlhttp.setRequestHeader("Content-type", "application/json")
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 ) {
                if(xmlhttp.status === 200) {
                    textfield.value = ""
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
    resize_textarea()
}

function roomSwitch() {
    current_view = document.getElementById("messages_" + roomid)
    if(current_view != null) {
        current_view.style.display="none"
    }
    checked = document.querySelector('input[name="room_radio"]:checked')
    if(checked != null) {
        if(roomid == checked.value) {
            msg_window = document.getElementById("message_window")
            msg_window.scrollTop = msg_window.scrollHeight;
        }
        roomid = checked.value
    }
    new_view = document.getElementById("messages_" + roomid)
    if(new_view != null) {
        new_view.style.display="block"
    }
}

function bump_room(id) {
    document.getElementById("list").insertBefore(document.getElementById(id), list.childNodes[0])
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
    //bump_room(id)
}

function new_message(id, img, name, user_id, text, event_id, dir, time, color, unsent) {
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
    message.getElementsByTagName("p")[0].innerHTML = message.getElementsByTagName("p")[0].innerHTML.replace(/\n/g, "<br>")
    message.getElementsByClassName("timestamp")[0].textContent = time

    document.getElementById("messages_"+id).append(message)
    msg_window = document.getElementById("message_window")
    msg_window.scrollTop = msg_window.scrollHeight;
    bump_room(id)
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
