var observe, roomid, next_batch
var rooms        = []
var colors       = []
var events       = []
var neo_version  = "0.01"
var homeserver   = "https://matrix.org"
var loading_elem = document.getElementById("loading")
var error_elem   = document.getElementById("error")
var login_elem   = document.getElementsByClassName("login")[0]
var main_elem    = document.getElementsByClassName("main")[0]
var msg_elem     = document.getElementById("message_window")

function init() {
    console.log("init")
    if (window.attachEvent) {
        observe = function (element, event, handler) {
            element.attachEvent('on'+event, handler)
        }
    } else {
        observe = function (element, event, handler) {
            element.addEventListener(event, handler, false)
        }
    }

    var textarea = document.getElementById('text')
    var list = document.getElementById('list')
    observe(textarea, 'change',  resize_textarea)
    observe(textarea, 'cut',     resize_textarea_delayed)
    observe(textarea, 'paste',   resize_textarea_delayed)
    observe(textarea, 'drop',    resize_textarea_delayed)
    observe(textarea, 'keydown', resize_textarea_delayed)
    observe(textarea, 'keyup', shift_enter)

    observe(list, 'change', roomSwitch)
    observe(list, 'click', roomSwitch)

    observe(document.getElementById('login'), 'submit', login)
    observe(document.getElementById('send'), 'click', send)

    roomSwitch()
    console.log("Neo " + neo_version)

    //If localstorage has info, use that, otherwise do nothing and wait for a login
    try {
        version = localStorage.getItem("version")
        if(version == neo_version) {
            token     = localStorage.getItem("token")
            homeserver = localStorage.getItem("homeserver")
            user      = localStorage.getItem("user")
            user_info = JSON.parse(localStorage.getItem('user_info'))

            hide(login_elem)
            loading_elem.style.top = "50%"
            loading_elem.style.marginTop = "-45px"
            show(loading_elem)
            initial_sync()
        }
    } catch(e) {
        //Couldn't load from localstorage
        console.log("creating new localstorage, waiting for login")
    }
}

function login(e) {
    console.log("login")
    e.preventDefault()
    hide(error_elem)
    user = document.getElementById("user").value
    pass = document.getElementById("pass").value
    console.log("logging in as " + user)

    var url = homeserver+"/_matrix/client/r0/login"
    var parameters = {
        "user": user,
        "password": pass,
        "type": "m.login.password",
        "initial_device_display_name": "Neo Webclient",
    }
    function login_return(status, response) {
        if(status == 200) {
            login_success(response)
        } else {
            try {
                show(error_elem)
                error = JSON.parse(response).error
                error_elem.textContent = error
            } catch(e) {
                console.log("error displaying login error: " + e)
            }
            hide(loading_elem)
        }
    }
    xml_request(url, "POST", true, parameters, login_return)
    show(loading_elem)
}

function login_success(response) {
    console.log("login_success")
    try {
        json = JSON.parse(response)
        token = json.access_token
        user_info = {}
        localStorage.setItem('token', json.access_token)
        localStorage.setItem('user', user)
        localStorage.setItem('homeserver', homeserver)
        localStorage.setItem('user_info', JSON.stringify(user_info))
        localStorage.setItem('version', neo_version)
        hide(login_elem)
        initial_sync()
    } catch(e) {
        console.log("fatal login error: " + e)
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
                    if(textfield.value == "") {
                        textfield.value = msg
                    }
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

function initial_sync() {
    console.log("initial_sync")
    var url = homeserver + "/_matrix/client/r0/joined_rooms?access_token=" + token
    xml_request(url, "GET", false, null, initial_sync_return)
    function initial_sync_return(status, response) {
        if(status == 200) {
            try {
                json = JSON.parse(response)
                parse_rooms(json.joined_rooms, true)
            } catch(e) {
                console.log("initial_sync decode error: " + e)
            }
        } else {
            console.log(status)
            console.log("failed initial_sync, retrying")
            initial_sync()
       }
    }
    hide(login_elem)
    hide(loading_elem)
    show(main_elem)
    sync()
}

function sync() {
    setTimeout(function() {
        console.log("sync")
        var url = homeserver + "/_matrix/client/r0/sync?access_token=" + token + "&timeout=30000"
        if(next_batch != undefined) {
            url += "&since=" + next_batch
        }
        xml_request(url, "GET", true, null, sync_return)
        function sync_return(status, response) {
            if(status == 200) {
                try {
                    json = JSON.parse(response)
                    parse_rooms(json.joined_rooms, true)
                    parse_messages(json.rooms.join) //TODO: do something with leave & invite
                    next_batch = json.next_batch //TODO: loading/storing to localstorage (only makes sense when messages themselves are kept too)
                } catch(e) {
                    console.log("sync decode error: " + e)
                }
            } else {
                console.log("sync error, status code: " + status)
            }
            sync()
        }
    }, 3000)
}

init()
