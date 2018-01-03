hide(document.getElementsByClassName("login")[0])
show(document.getElementsByClassName("main")[0])
var prev = 0
var observe
var roomid
var checked = document.querySelector('input[name="room_radio"]:checked')
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

    hide(document.getElementsByClassName("login")[0])
    show(document.getElementsByClassName("main")[0])

    text.focus()
    text.select()
    resize_textarea()
    //window.setTimeout(bump_room2, 4000)
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
    observe(document.getElementById('login'), 'submit', login)
    observe(document.getElementById('list'), 'change', roomSwitch)
    observe(document.getElementById('send'), 'click', send)

    roomSwitch()
    console.log("Neo 0.01")

    new_room("room1", "/img/neo_full.png", "new messages soon(tm)")
    new_room("room2", "/img/neo_full.png", "a room")

    new_message("room2", "/img/light/file.svg", "f0x", "look I sent a message", "000", "out", "18:53")
    new_message("room2", "/img/neo_full.png", "someone else", "me tooooo", "000", "in", "19:00")

    window.setTimeout(function() {new_message("room1", "/img/neo.png", "f0x", "messages can be received at any time woo threading is easy here", "000", "out", "20:00")}, 3000);
}

function send() {
    textfield = document.getElementById("text")
    if(textfield.value != "") {
        new_message(roomid, "/img/neo.png", "you", document.getElementById("text").value, "000", "out", "19:00")
        textfield.value = ""
    }
}

function roomSwitch() {
    console.log(roomid)
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
    console.log(id)
    document.getElementById("list").insertBefore(document.getElementById(id), list.childNodes[0])
}

function new_room(id, img, name) {
    var prototype = document.getElementById("prototypes").getElementsByClassName("room_item")[0]
    var room_element = prototype.cloneNode(true)
    room_element.id = id

    var html = room_element.innerHTML
    html = html.replace(/%id%/g, id)
    html = html.replace(/%img%/g, img)
    html = html.replace(/%name%/g, name)
    html = html.replace("%room_radio%", "room_radio")
    room_element.innerHTML = html

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
    // REEE BETTER WATCH OUT FOR XSS
    var prototype = document.getElementById("prototypes").getElementsByClassName("line")[0]
    var message = prototype.cloneNode(true)

    var html = message.innerHTML
    text = text.replace(/%/g, "%%")
    name = name.replace(/%/g, "%%")
    img = img.replace(/%/g, "%%")

    html = html.replace(/%dir%/g, dir)
    html = html.replace(/%event_id%/g, event_id)
    html = html.replace(/%img%/g, img)
    html = html.replace(/%name%/g, name)
    html = html.replace(/%text%/g, text)
    html = html.replace(/%time%/g, time)
    html = html.replace(/%%/g, "%")
    message.innerHTML = html

    document.getElementById("messages_"+id).append(message)
    bump_room(id)
}

start()
