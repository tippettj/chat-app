const socket = io();

//Elements - $ convention to indicate form element
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $message = document.querySelector("#messages");

//Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationMessageTemplate = document.querySelector(
  "#location-message-template"
).innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

//OPtions
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

// ------------------------------
//      margin-top
// ------------------------------      ---
//      border-top                      |
// ------------------------------       |
//      padding-top                     |
//                                      |
//   Stuff to display in the            |
//   element.                        offsetHeight
//                                      |
//                                      |
// ------------------------------       |
//      border-bottom                   |
// ------------------------------      ---
//      margin-bottom
// ------------------------------

// offsetHeight = measurement in pixels of the elements CSS height, including
// border, padding and horizontal scroll bar (if present)
//
// scrollHeight - equal to the minimum height the element would required to
// fit all the content without a vertical scrollbar
//
// See images:
// chat-app/playground/img/ElementGeometry.javascript.info.png
// chat-app/playground/img/ElementSizingAndScrolling.javascript.info.png

const autoscroll = () => {
  // New message element
  const $newMessage = $message.lastElementChild;

  // Height of the NEW message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // Visible height of MESSAGE
  const visibleHeight = $message.offsetHeight;

  // Height of messages container (includes the content that cannot be seen)
  const containerHeight = $message.scrollHeight;

  // How far have I scrolled?
  const scrollOffset = $message.scrollTop + visibleHeight;
  //console.log(
  //  `scrollOffset ${scrollOffset} = scrollTop ${$message.scrollTop} + visibleHeight ${visibleHeight}`
  //);

  // $message.scrollTop = $message.scrollHeight will take you to the last
  // added message. Without this scrollTop will always be 0 or pointing to the
  // top.
  // Setting scrollTop to $message.scrollHeight will point to the end of the
  // last element just added. ie scrollHeight increases each time an element
  // is added.
  // If the user scrolls up outside of the visibleHeight we don't want force
  // the user to the end of the list each time another chat is entered so
  // keep the scrolltop at the point where the user is until they scroll back
  // to the bottom

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $message.scrollTop = containerHeight;
  }
};

// logs a message to the console
socket.on("message", (message) => {
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $message.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

// print the url to the page
socket.on("locationMessage", (message) => {
  const html = Mustache.render(locationMessageTemplate, {
    username: message.username,
    url: message.url,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $message.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

// send a message to the server whenever the form send button is pressed
$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  // disable input field
  $messageFormButton.setAttribute("disabled", "disabled");

  // e.target - message form
  // 3rd arg run when the event is acknowledged
  const message = e.target.elements.message.value;
  socket.emit("sendMessage", message, (error) => {
    //enable input field
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();

    if (error) return console.log(error);

    console.log("delivered");
  });
});

// send the location back to the server when the Send Location button is pressed
$sendLocationButton.addEventListener("click", () => {
  // if user is using an old browser
  if (!navigator.geolocation)
    return alert("Geolocation is not supported by your browser");

  $sendLocationButton.setAttribute("disabled", "disabled");
  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        $sendLocationButton.removeAttribute("disabled");
        console.log("Location shared!");
      }
    );
  });
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
