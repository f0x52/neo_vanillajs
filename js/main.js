hide(document.getElementsByClassName("login")[0]);
show(document.getElementsByClassName("main")[0]);
var prev = 0;
var observe;
var roomid = document.querySelector('input[name="room_radio"]:checked').value

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

    hide(document.getElementsByClassName("login")[0]);
    show(document.getElementsByClassName("main")[0]);

    text.focus();
    text.select();
    resize();
}

function resize_textarea() {
    text.style.height = 'auto';
    text.style.height = text.scrollHeight+'px';
}
function resize_textarea_delayed () {
    window.setTimeout(resize_textarea, 0);
}

function start() {
    if (window.attachEvent) {
        observe = function (element, event, handler) {
            element.attachEvent('on'+event, handler);
        };
    } else {
        observe = function (element, event, handler) {
            element.addEventListener(event, handler, false);
        };
    }

    var text = document.getElementById('text');
    observe(text, 'change',  resize_textarea);
    observe(text, 'cut',     resize_textarea_delayed);
    observe(text, 'paste',   resize_textarea_delayed);
    observe(text, 'drop',    resize_textarea_delayed);
    observe(text, 'keydown', resize_textarea_delayed);
    observe(document.getElementById('login'), 'submit', login)
    observe(document.getElementById('list'), 'change', roomSwitch)

    roomSwitch()
    console.log("Neo 0.01");
}

function roomSwitch() {
    document.getElementById("messages_" + roomid).style.display="none"
    roomid = document.querySelector('input[name="room_radio"]:checked').value
    document.getElementById("messages_" + roomid).style.display="block"
}

function bump_room2() {
    document.getElementById("list").insertBefore(document.getElementById("room_2"), list.childNodes[0])
}

start()
window.setTimeout(bump_room2, 4000)
