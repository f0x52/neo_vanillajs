//hide(document.getElementsByClassName("login")[0])
//show(document.getElementsByClassName("main")[0])
var prev = 0
var observe
var roomid
var checked = document.querySelector('input[name="room_radio"]:checked')
var homeserver = "https://matrix.org"
var user, token, next_batch
var rooms = []

if(checked != null) {
    roomid = checked.value
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

    xmlhttp = new XMLHttpRequest()
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
    if(json.access_token) {
        localStorage.setItem('token', json.access_token)
        localStorage.setItem('user', user)
        localStorage.setItem('homeserver', homeserver)
        resume()
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
    sync()
}

function sync() {
    setTimeout(function () {
        xmlhttp = new XMLHttpRequest()
        var url = homeserver+"/_matrix/client/r0/sync?access_token=" + token
        if(next_batch != undefined) {
            url+="&since=" + next_batch
        }
        xmlhttp.open("GET", url, true)
        xmlhttp.setRequestHeader("Content-type", "application/json")
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 ) {
                if(xmlhttp.status === 200) {
                    //console.log(xmlhttp.responseText)
                    json = JSON.parse(xmlhttp.responseText)
                    next_batch = json.next_batch

                    for(var key in json.rooms.join) {
                        if(!rooms.includes(key)) {
                            name = JSON.parse(wget(homeserver + "/_matrix/client/r0/rooms/" + key + "/state/m.room.name")).name
                            if(name == undefined) {
                                name = key
                            }

                            img = JSON.parse(wget(homeserver + "/_matrix/client/r0/rooms/" + key + "/state/m.room.avatar"))
                            url = "/img/blank.jpg";
                            if(img != undefined) {
                                if(img.errcode == undefined) {
                                    url = homeserver + "/_matrix/media/r0/download/" + img.url.substring(6)
                                }
                            }
                            new_room(key, url, name)
                            rooms.push(key)
                        }

                        for(var event_num in json.rooms.join[key].timeline.events) {
                            event = json.rooms.join[key].timeline.events[event_num]
                            if(event.type == "m.room.message") {
                            name = JSON.parse(wget(homeserver + "/_matrix/client/r0/profile/" + event.sender + "/displayname")).displayname
                            if(name == undefined) {
                                name = event.sender
                            }

                            img = JSON.parse(wget(homeserver + "/_matrix/client/r0/profile/" + event.sender + "/avatar_url"))
                            url = "/img/blank.jpg";
                            if(img != undefined) {
                                if(img.errcode == undefined && img.avatar_url != undefined) {
                                    url = homeserver + "/_matrix/media/r0/download/" + img.avatar_url.substring(6)
                                }
                            }

                                new_message(key, url, name, event.content.body, event.event_id, "in", " ")
                            }
                        }
                    }


                    hide(document.getElementById("loading"))
                    sync();
                } else {
                    //something went wrong
                    console.log("code: " + xmlhttp.status)
                }
            }
        }
        xmlhttp.send()
        show(document.getElementById("loading"))
    }, 1000);
}

function wget(url) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open( "GET", url + "?access_token=" + token, false );
    xmlhttp.send( null );
    return xmlhttp.responseText;
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
    observe(document.getElementById('send'), 'click', send)

    roomSwitch()
    console.log("Neo 0.01")

    if(localStorage.getItem("token")) {
        token = localStorage.getItem("token")
        homserver = localStorage.getItem("homserver")
        user = localStorage.getItem("user")
        console.log("read token from localstorage: " + token)
        resume()
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
        new_message(roomid, "/img/neo.png", "you", msg, "000", "out", "19:00")
        textfield.value = ""
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

function new_message(id, img, name, text, event_id, dir, time) {
    var prototype = document.getElementById("prototypes").getElementsByClassName("line")[0]
    var message = prototype.cloneNode(true)

    message.getElementsByClassName("message")[0].id = event_id
    document.getElementsByClassName("message")[0].classList.add(dir)

    message.getElementsByTagName("img")[0].src = img

    message.getElementsByTagName("b")[0].textContent = name
    message.getElementsByTagName("p")[0].textContent = text
    message.getElementsByTagName("p")[0].innerHTML = message.getElementsByTagName("p")[0].innerHTML.replace(/\n/g, "<br>")
    message.getElementsByClassName("timestamp")[0].textContent = time


    document.getElementById("messages_"+id).append(message)
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
