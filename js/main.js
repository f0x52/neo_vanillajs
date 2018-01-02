$(".login").hide();
$(".main").show();
$("#login").submit(function() {
    var user = $("#user").val()
    var pass = $("#pass").val()
    console.log("Logging in: " + user);
    $(".login").hide();
    $(".main").show();
    return false;
});

var observe;
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
var prev = 0;
function resize () {
    text.style.height = 'auto';
    text.style.height = text.scrollHeight+'px';
}
function delayedResize () {
    window.setTimeout(resize, 0);
}
observe(text, 'change',  resize);
observe(text, 'cut',     delayedResize);
observe(text, 'paste',   delayedResize);
observe(text, 'drop',    delayedResize);
observe(text, 'keydown', delayedResize);

text.focus();
text.select();
resize();

console.log("Neo 0.01");
$("#room_2").insertBefore(".room_item:first");
