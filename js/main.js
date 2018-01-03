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

    roomSwitch()
    console.log("Neo 0.01")

    new_room("room1", "/img/neo_full.png", "some room")
    new_room("room2", "/img/neo_full.png", "another one")
    new_room("room3", "/img/neo.png", "one more")
    new_room("room5", "/img/dark/file.svg", "cuts of long text seeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
    new_room("room6", "/img/dark/send.svg", "auto")
    new_room("room7", "/img/dark/send.svg", "scroll")
    new_room("room8", "/img/dark/send.svg", "bar")
    new_room("room9", "/img/dark/send.svg", "as")
    new_room("room10", "/img/dark/send.svg", "well")
    new_room("room11", "/img/dark/send.svg", "well")
    new_room("room12", "/img/dark/send.svg", "well")
    new_room("room13", "/img/dark/send.svg", "well")
    new_room("room14", "/img/dark/send.svg", "well")
    new_room("room15", "/img/dark/send.svg", "well")
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
    div.class="room_messages"
    div.id="messages_" + id

    var span = document.createElement('span')
    span.innerHTML = "Room: " + id
    div.append(span)
    div.style.display = "none"
    document.getElementById("message_window").append(div)
    document.getElementById("list").append(room_element)
    //bump_room(id)
}

start()
