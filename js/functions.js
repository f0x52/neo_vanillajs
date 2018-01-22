function xml_request(url, method, async, parameters, return_function, extra, delay) {
    if(extra == null) {
        extra = ""
    }
    if(delay == null) {
        delay = 0
    }
    var xmlhttp = new XMLHttpRequest()
    xmlhttp.open(method, url, async)
    xmlhttp.setRequestHeader("Content-type", "application/json")
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 ) {
            try {
                setTimeout(return_function(xmlhttp.status, xmlhttp.responseText, extra), delay)
            } catch(e) {
                console.log("url: " + url)
                console.log(e)
            }
        }
    }
    xmlhttp.send(JSON.stringify(parameters))
}

function parse_rooms(rooms_json, backlog) {
    for(var num in rooms_json) {
        var key = rooms_json[num]
        if(!rooms.includes(key)) {
            xml_request(homeserver + "/_matrix/client/r0/rooms/" + key + "/state/m.room.name?access_token=" + token, "GET", false, null, function(status, response, key) {
                if(status == 200) {
                    var name = JSON.parse(response).name
                    if(name == undefined) {
                        name = key
                    }
                }
                //TODO: treat like a pm if the room has just one other person
                xml_request(homeserver + "/_matrix/client/r0/rooms/" + key + "/state/m.room.avatar?access_token=" + token, "GET", false, null, function (status, response, key) {
                    var img = JSON.parse(response)
                    var url = "/img/blank.jpg"
                    if(img != undefined) {
                        if(img.errcode == undefined) {
                            url = homeserver + "/_matrix/media/r0/download/" + img.url.substring(6)
                        }
                    }
                    new_room(key, url, name)
                }, key)
            }, key)
            rooms.push(key)
        }
        if(backlog != undefined) {
            room_backlog(key, 50)
        }
    }
}

function parse_messages(rooms_json) {
    for(var room in rooms_json) {
        for(var event_num in rooms_json[room].timeline.events) {
            var event = rooms_json[room].timeline.events[event_num]
            if(event.type == "m.room.message") {
                if(user_info[event.sender] == undefined || user_info[event.sender].color == undefined) {
                    get_user_info(event.sender)
                }
                dir = "in"
                if(event.sender == "@" + user + ":" + homeserver.substring(8)) {
                    dir = "out"
                }
                new_message(room, user_info[event.sender].url, user_info[event.sender].name, event.sender, event.content.body, event.event_id, dir, event.origin_server_ts, user_info[event.sender].color)
            }
        }
    }
}

function room_backlog(room, num, from) {
    //var url = homeserver+"/_matrix/client/r0/rooms/" + room + "/messages?access_token=" + token + "&from=" + from + "&limit=" + num + '&filter={"type": "m.room.message"}&dir=b'
    var url = homeserver+"/_matrix/client/r0/rooms/" + room + "/messages?access_token=" + token + "&limit=" + num + '&filter={"type": "m.room.message"}&dir=b'
    xml_request(url, "GET", true, null, function (status, response, room) {
        if(status === 200) {
            json = JSON.parse(response)
            for(var i=json.chunk.length; i>0; i--) {
                var event = json.chunk[i-1]
                if(event.type == "m.room.message") {
                    if(user_info[event.sender] == undefined || user_info[event.sender].color == undefined) {
                        get_user_info(event.sender)
                    }
                    dir = "in"
                    if(event.sender == "@" + user + ":" + homeserver.substring(8)) {
                        dir = "out"
                    }
                    new_message(room, user_info[event.sender].url, user_info[event.sender].name, event.sender, event.content.body, event.event_id, dir, event.origin_server_ts, user_info[event.sender].color)
                }
            }
            //if(!resumed) {
            //    resume()
            //}
            //sync()
        } else {
            //something went wrong
            console.log("backlog for " + room + " failed with code: " + status)
            //room_backlog(room, num, from)
        }
    }, room)
}

function get_user_info(user_id) {
    user_info[user_id] = {name:user_id, url: "/img/blank.jpg", color: colors[Math.abs(hash(user_id))%6]}
    xml_request(homeserver + "/_matrix/client/r0/profile/" + user_id + "/displayname?access_token=" + token, "GET", true, null, function(status, response, user_id) {
        if(status == 200) {
            try {
                var name = JSON.parse(response).displayname
            } catch(e) {
                user_info[user_id].name = user_id
            }

            if(name != undefined) {
                user_info[user_id].name = name
            }

            var user_messages = document.getElementsByClassName(user_id)
            for(var i=0; i < user_messages.length; i++) {
                user_messages[i].getElementsByTagName("b")[0].textContent = user_info[user_id].name
            }
            localStorage.setItem('user_info', JSON.stringify(user_info))

            xml_request(homeserver + "/_matrix/client/r0/profile/" + user_id + "/avatar_url?access_token=" + token, "GET", true, null, function(status, response, user_id) {
                if(status == 200) {
                    try {
                        var img = JSON.parse(response)
                    } catch(e) {
                        console.log(response)
                        console.log(e)
                    }
                    if(img != undefined) {
                        if(img.errcode == undefined && img.avatar_url != undefined) {
                            var url = homeserver + "/_matrix/media/r0/thumbnail/" + img.avatar_url.substring(6) + "?width=64&height=64"
                            user_info[user_id].url = url

                            var user_messages = document.getElementsByClassName(user_id)
                            for(var i=0; i < user_messages.length; i++) {
                                user_messages[i].getElementsByTagName("img")[0].src = user_info[user_id].url
                            }
                            localStorage.setItem('user_info', JSON.stringify(user_info))
                        }
                    }
                } else {
                    if(status != 0) {
                        console.log(status)
                    }
                }
            }, user_id, 250)
        } else {
            if(status != 0) {
                console.log(status)
            }
        }
    }, user_id, 250)

}

function show(element) {
    element.style.display="block"
}

function hide(element) {
    element.style.display="none"
}

function resize_textarea() {
    text.style.height = 'auto'
    text.style.height = text.scrollHeight+'px'
}
function resize_textarea_delayed () {
    window.setTimeout(resize_textarea, 5)
}

function hash(s){
      return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)
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
    msg_elem.scrollTop = msg_elem.scrollHeight
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
    if(events.includes(event_id)) { //bit of a hack but it'll do for now
        return
    }
    events.push(event_id)
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

    var element = document.getElementById("message_window")
    console.log("t: " + element.scrollTop)
    console.log("h: " + element.scrollHeight)
    element.scrollTop = element.scrollHeight
    sort_roomlist()
}

function sort_roomlist() {
    var list = document.getElementById("list")

    var items = list.getElementsByClassName("room_item")
    var itemsArr = []
    for(var i = 0 ; i < items.length; i++){
        itemsArr.push(items[i])
    }
    itemsArr.sort(function(a, b) {
        return b.getElementsByClassName("ts")[0].textContent - a.getElementsByClassName("ts")[0].textContent
    })

    for (i = 0; i < itemsArr.length; ++i) {
        list.appendChild(itemsArr[i])
    }
}

function shift_enter(event) {
    if (event.keyCode == 13 && !event.shiftKey) {
        send()
    }
}

if(!String.linkify) {
    String.prototype.linkify = function() {
        var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim
        var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim
        var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim
        return this
            .replace(urlPattern, '<a href="$&">$&</a>')
            .replace(pseudoUrlPattern, '$1<a href="http://$2">$2</a>')
            .replace(emailAddressPattern, '<a href="mailto:$&">$&</a>')
    }
}


