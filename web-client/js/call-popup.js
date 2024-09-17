let socket;
let videoTilesParent;
let meetingId;
let callSettingsData;
let intervalId;
let isIntervalActive = true;
let meetingDropped = false;

let apiUrl = "https://dev.db.degpeg.com/";
let imgAssetUrl = "https://cdn.jsdelivr.net/gh/degpeg-media/video-call-sdk-js@main/web-client/img";
let htmlAssetUrl = "https://cdn.jsdelivr.net/gh/degpeg-media/video-call-sdk-js@main/web-client/html";

document.addEventListener("DOMContentLoaded", () => {
  socket = io("https://dev.backend.degpeg.com", {
    query: {
      contentProviderId: contentProviderId,
    },
    transports: ["websocket"],
    reconnectionAttempts: 5,
  });
  socket.on("connect", async () => {
    console.log("Connected to server");

    await fetch(`${apiUrl}api/getcallsettings/${contentProviderId}`, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "1234",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        callSettingsData = data;
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    if (!document.getElementById("assistCard")) {
      fetch(htmlAssetUrl+"/assistCard.html")
        .then((response) => response.text())
        .then((data) => {
          const body = document.body;
          body.insertAdjacentHTML("beforeend", data);
        })
        .catch((error) =>
          console.error("Error fetching the assist card HTML:", error)
        );

      const url = new URL(window.location.href);
      const queryParams = new URLSearchParams(url.search);

      const outboundMeetingId = queryParams.get("meetingId");
      const qrStatus = queryParams.get("qr");

      if (qrStatus) {
        await showHeaderFooter();
      }

      if (outboundMeetingId) {
        console.log("Outbound Meeting ID: ", outboundMeetingId);

        userData = {
          meetingId: outboundMeetingId,
          contentProviderId: contentProviderId,
        };

        showOutboundMeetingPopup(userData);
      }
    }

    if (callSettingsData.welcomeVideoUrl !== "") {
      var welcomeVideoUrl = encodeURI(callSettingsData.welcomeVideoUrl);
      var welcomeVideoElement = document.getElementById("welcome-video");

      if (welcomeVideoElement) {
        welcomeVideoElement.src = welcomeVideoUrl;
      }
    }
  });
});

async function showOutboundMeetingPopup(userData) {
  await showHeaderFooter();
  showCallWaitingCard();
  joinMeeting(userData.meetingId, "");
  showVideoCallScreen();
}

function requestVideoCall(userData) {
  videoTilesParent = document.getElementById("video-tiles");
  console.log("videotiles: " + videoTilesParent);

  if (userData) {
    if (!videoTilesParent || videoTilesParent.childElementCount < 2) {
      localStorage.setItem("call-status", "calling");
      socket.emit("requestVideoCall", userData);
    } else {
      alert("Please close the ongoing call first!");
    }
  }
}

async function showHeaderFooter() {
  await fetch(htmlAssetUrl+"/showHeaderFooter.html")
    .then((response) => response.text())
    .then((data) => {
      const body = document.body;
      body.insertAdjacentHTML("beforeend", data);
    })
    .catch((error) =>
      console.error("Error fetching the full assist card HTML:", error)
    );

  if (callSettingsData.sdkLogo !== "") {
    var logoUrl = callSettingsData.sdkLogo;
    var headerImg = document.getElementById("header-img");
    var footerImg = document.getElementById("footer-img");

    if (headerImg) {
      headerImg.src = logoUrl;
    }
    if (footerImg) {
      footerImg.src = logoUrl;
    }
  }

  showAssistCardFull();
}

async function showAssistCardFull() {
  try {
    const response = await fetch(htmlAssetUrl+"/fullAssistCard.html");
    const assistCardHtml = await response.text();

    const targetDiv = document.querySelector("#header");
    if (targetDiv) {
      targetDiv.insertAdjacentHTML("afterend", assistCardHtml);
    } else {
      console.error("Target div not found to insert assist card");
    }
  } catch (error) {
    console.error("Error fetching the full assist card HTML:", error);
  }

  if (callSettingsData.allowScheduleCall === false) {
    var scheduleLeadElement = document.querySelector(
      "li button[name='schedule-lead']"
    );

    if (scheduleLeadElement && scheduleLeadElement.parentNode) {
      scheduleLeadElement.parentNode.remove();
    }
  }
}

async function showConnectingCallCard() {
  try {
    const response = await fetch(htmlAssetUrl+"/connectingCallCard.html");
    const assistCardHtml = await response.text();

    const targetDiv = document.querySelector("#videoCallWaitingCard");
    if (targetDiv) {
      targetDiv.insertAdjacentHTML("afterend", assistCardHtml);
    } else {
      console.error("Target div not found to insert assist card");
    }
  } catch (error) {
    console.error("Error fetching the full assist card HTML:", error);
  }
}

async function showLeadForm(event) {
  try {
    const response = await fetch(htmlAssetUrl+"/leadForm.html");
    const assistCardHtml = await response.text();

    const targetDiv = document.querySelector("#assistFullCard");
    if (targetDiv) {
      targetDiv.insertAdjacentHTML("afterend", assistCardHtml);
      targetDiv.style.display = "none";
    } else {
      console.error("Target div not found to insert assist card");
    }
  } catch (error) {
    console.error("Error fetching the full assist card HTML:", error);
  }

  const input = document.querySelector("#leadPhone");
  const iti = window.intlTelInput(input, {
    utilsScript:
      "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
    initialCountry: "auto",
    geoIpLookup: function (success, failure) {
      fetch("https://ipinfo.io/json?token=<your_token>")
        .then(function (resp) {
          return resp.json();
        })
        .then(function (data) {
          success(data.country);
        })
        .catch(function () {
          success("in");
        });
    },
  });

  document.getElementById("leadEmail").addEventListener("input", function (e) {
    e.target.value = e.target.value.toLowerCase();
  });

  var welcomeTitleText = callSettingsData.welcomeTitle;
  if (welcomeTitleText !== "") {
    var sdkTitle = document.getElementById("sdk-title");
    sdkTitle.innerHTML = welcomeTitleText;
  }

  const callMethod = event.name;

  var collectEmail = callSettingsData.acceptEmail;
  if (!collectEmail && collectEmail !== true) {
    document.getElementById("leadEmail").style.display = "none";
  }

  var collectLocation = callSettingsData.acceptLocation;
  if (!collectLocation && collectLocation !== true) {
    document.getElementById("leadLocationInput").style.display = "none";
  }

  var collectPhone = callSettingsData.acceptPhoneNumber;
  if (!collectPhone && collectPhone !== true) {
    document.getElementById("degpeg-onetoone-phone").style.display = "none";
  }

  var collectAdditionalField1 = callSettingsData.additionalField1Value;
  if (collectAdditionalField1 && collectAdditionalField1 === true) {
    let additionalFieldId = "additional-field-1";
    let additionalFieldName = "additional-field-1";
    let additionalFieldText =
      callSettingsData.additionalField1 !== ""
        ? callSettingsData.additionalField1
        : "Additional Field 1";

    await addInputFields(
      additionalFieldId,
      additionalFieldName,
      additionalFieldText
    );
  }

  var collectAdditionalField2 = callSettingsData.additionalField2Value;
  if (collectAdditionalField2 && collectAdditionalField2 === true) {
    let additionalFieldId = "additional-field-2";
    let additionalFieldName = "additional-field-2";
    let additionalFieldText =
      callSettingsData.additionalField2 !== ""
        ? callSettingsData.additionalField2
        : "Additional Field 2";

    await addInputFields(
      additionalFieldId,
      additionalFieldName,
      additionalFieldText
    );
  }

  localStorage.setItem("call-type", callMethod);
}

async function showCallWaitingCard() {
  try {
    const response = await fetch(htmlAssetUrl+"/callWaitingCard.html");
    const callWaitingCard = await response.text();

    const targetDiv = document.querySelector("#degpegLeadCard");
    const secondTargetDiv = document.querySelector("#header");
    if (targetDiv) {
      targetDiv.insertAdjacentHTML("afterend", callWaitingCard);
      targetDiv.style.display = "none";
    } else if (secondTargetDiv) {
      secondTargetDiv.insertAdjacentHTML("afterend", callWaitingCard);
    } else {
      console.error("Target div not found to insert assist card");
    }
  } catch (error) {
    console.error("Error fetching the full assist card HTML:", error);
  }
}

async function showVideoCallScreen() {
  try {
    const response = await fetch(htmlAssetUrl+"/videoCall.html");
    const videoCall = await response.text();

    const targetDiv = document.querySelector("#videoCallWaitingCard");
    if (targetDiv) {
      targetDiv.insertAdjacentHTML("afterend", videoCall);
      targetDiv.style.display = "none";
    } else {
      console.error("Target div not found to insert assist card");
    }
  } catch (error) {
    console.error("Error fetching the full assist card HTML:", error);
  }

  if (callSettingsData.acceptSnapshot === false) {
    document.getElementById("snapshot-btn").style.display = "none";
  }

  if (callSettingsData.recording === false) {
    document.getElementById("start-recording").style.display = "none";
  }

  if (callSettingsData.enableChat === false) {
    document.getElementById("chat-feature").style.display = "none";
  }

  if (callSettingsData.enableGuestScreenShare === false) {
    document.getElementById("start-screenshare").style.display = "none";
  }
}

async function showAudioCallScreen() {
  try {
    const response = await fetch(htmlAssetUrl+"/audioCall.html");
    const videoCall = await response.text();

    const targetDiv = document.querySelector("#videoCallWaitingCard");
    if (targetDiv) {
      targetDiv.insertAdjacentHTML("afterend", videoCall);
      targetDiv.style.display = "none";
    } else {
      console.error("Target div not found to insert assist card");
    }
  } catch (error) {
    console.error("Error fetching the full assist card HTML:", error);
  }

  if (callSettingsData.acceptSnapshot === false) {
    document.getElementById("snapshot-btn").style.display = "none";
  }

  if (callSettingsData.recording === false) {
    document.getElementById("start-recording").style.display = "none";
  }

  if (callSettingsData.enableChat === false) {
    document.getElementById("chat-feature").style.display = "none";
  }

  if (callSettingsData.enableGuestScreenShare === false) {
    document.getElementById("start-screenshare").style.display = "none";
  }
}

function unmutedVideo() {
  assistFullCardMuteOption = document.getElementById("assistCardMuteBtn");

  var video = document.getElementById("assistVideo");
  video.muted = !video.muted;
  if (video.muted) {
    assistFullCardMuteOption.innerHTML = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><g filter="url(#filter0_b_840:141)"><circle cx="22" cy="22" r="22" fill="black" fill-opacity="45%"></circle></g><path d="M13.2803 12.2197C12.9874 11.9268 12.5126 11.9268 12.2197 12.2197C11.9268 12.5126 11.9268 12.9874 12.2197 13.2803L16.4378 17.4986H14.25C13.0074 17.4986 12 18.5059 12 19.7486V24.2465C12 25.4891 13.0074 26.4965 14.25 26.4965H17.9296C18.1133 26.4965 18.2906 26.5639 18.4279 26.686L22.9194 30.6797C23.7255 31.3965 25 30.8242 25 29.7456V26.0609L30.7194 31.7805C31.0123 32.0734 31.4872 32.0734 31.7801 31.7805C32.073 31.4876 32.073 31.0127 31.7801 30.7198L13.2803 12.2197ZM23.5 24.5609V29.1888L19.4247 25.565C19.0128 25.1988 18.4807 24.9965 17.9296 24.9965H14.25C13.8358 24.9965 13.5 24.6607 13.5 24.2465V19.7486C13.5 19.3344 13.8358 18.9986 14.25 18.9986H17.9296C17.9323 18.9986 17.9351 18.9986 17.9378 18.9985L23.5 24.5609ZM23.5 14.8068V20.3182L25 21.8182V14.25C25 13.1714 23.7255 12.5991 22.9195 13.3158L19.52 16.3381L20.5825 17.4006L23.5 14.8068ZM27.141 23.9592L28.279 25.0973C28.7408 24.1628 29 23.1107 29 22C29 20.7968 28.6958 19.6624 28.1596 18.6718C27.9624 18.3076 27.5072 18.1721 27.143 18.3693C26.7787 18.5665 26.6432 19.0216 26.8404 19.3859C27.2609 20.1627 27.5 21.0523 27.5 22C27.5 22.691 27.3729 23.3512 27.141 23.9592ZM29.3881 26.2064L30.4815 27.2998C31.4437 25.7631 32 23.9457 32 22C32 19.7739 31.2717 17.7157 30.0407 16.0536C29.7941 15.7207 29.3244 15.6508 28.9916 15.8973C28.6587 16.1438 28.5888 16.6135 28.8353 16.9464C29.8815 18.3589 30.5 20.1062 30.5 22C30.5 23.5311 30.0958 24.9663 29.3881 26.2064Z" fill="white"></path><defs><filter id="filter0_b_840:141" x="-20" y="-20" width="84" height="84" filterUnits="userSpaceOnUse" color-interpolationfilters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood><feGaussianBlur in="BackgroundImage" stdDeviation="10"></feGaussianBlur><feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_840:141"></feComposite><feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_840:141" result="shape"></feBlend></filter></defs></svg>`;
  } else {
    assistFullCardMuteOption.innerHTML = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><g filter="url(#filter0_b_840:140)"><circle cx="22" cy="22" r="22" fill="black" fill-opacity="45%"></circle></g><path d="M25 14.25C25 13.1714 23.7255 12.5991 22.9195 13.3158L18.4279 17.3091C18.2906 17.4312 18.1133 17.4986 17.9296 17.4986H14.25C13.0074 17.4986 12 18.5059 12 19.7486V24.2465C12 25.4891 13.0074 26.4965 14.25 26.4965H17.9296C18.1133 26.4965 18.2906 26.5639 18.4279 26.686L22.9194 30.6797C23.7255 31.3965 25 30.8243 25 29.7456V14.25ZM19.4246 18.4301L23.5 14.8068V29.1888L19.4247 25.5651C19.0128 25.1988 18.4807 24.9965 17.9296 24.9965H14.25C13.8358 24.9965 13.5 24.6607 13.5 24.2465V19.7486C13.5 19.3344 13.8358 18.9986 14.25 18.9986H17.9296C18.4807 18.9986 19.0127 18.7963 19.4246 18.4301ZM28.9916 15.8973C29.3244 15.6508 29.7941 15.7208 30.0407 16.0536C31.2717 17.7157 32 19.7739 32 22C32 24.2261 31.2717 26.2843 30.0407 27.9464C29.7941 28.2793 29.3244 28.3492 28.9916 28.1027C28.6587 27.8562 28.5888 27.3865 28.8353 27.0536C29.8815 25.6411 30.5 23.8939 30.5 22C30.5 20.1062 29.8815 18.359 28.8353 16.9464C28.5888 16.6136 28.6587 16.1439 28.9916 15.8973ZM27.143 18.3693C27.5072 18.1721 27.9624 18.3076 28.1596 18.6718C28.6958 19.6624 29 20.7968 29 22C29 23.2032 28.6958 24.3376 28.1596 25.3282C27.9624 25.6924 27.5072 25.8279 27.143 25.6307C26.7787 25.4335 26.6432 24.9783 26.8404 24.6141C27.2609 23.8373 27.5 22.9477 27.5 22C27.5 21.0523 27.2609 20.1627 26.8404 19.3859C26.6432 19.0217 26.7787 18.5665 27.143 18.3693Z" fill="white"></path><defs><filter id="filter0_b_840:140" x="-20" y="-20" width="84" height="84" filterUnits="userSpaceOnUse" color-interpolationfilters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood><feGaussianBlur in="BackgroundImage" stdDeviation="10"></feGaussianBlur><feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_840:140"></feComposite><feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_840:140" result="shape"></feBlend></filter></defs></svg>`;
  }
}

function removeModal() {
  const modal = document.querySelector(".degpeg-onetoone-container");

  if (modal) {
    modal.remove();

    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    if (searchParams.has("meetingId")) {
      searchParams.delete("meetingId");

      window.history.replaceState(null, "", url.origin + url.pathname);
      location.reload();
    } else {
      location.reload();
    }
  }
}

async function submitUserData() {
  const name = document.getElementById("leadName").value.trim();
  const email = document.getElementById("leadEmail").value.trim();
  const phone = document.getElementById("leadPhone").value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9]{10}$/;

  if (!name) {
    showToast("Please fill in the Name field");
    return false;
  }
  if (!email) {
    showToast("Please fill in the Email field");
    return false;
  }
  if (!phone) {
    showToast("Please fill in the Phone field");
    return false;
  }

  if (!emailRegex.test(email)) {
    showToast("Please enter a valid Email address");
    return false;
  }

  if (!phoneRegex.test(phone)) {
    showToast("Please enter a valid Phone number");
    return false;
  }

  showToast("Form submitted successfully!");

  let userData,
    leadName,
    leadEmail,
    leadPhone,
    leadLocation,
    leadCoordinate,
    additionalField1,
    additionalField2;
  leadName = document.getElementById("leadName")
    ? document.getElementById("leadName").value
    : null;
  leadEmail = document.getElementById("leadEmail")
    ? document.getElementById("leadEmail").value
    : null;
  leadPhone = document.getElementById("leadPhone")
    ? document.getElementById("leadPhone").value
    : null;
  leadLocation = document.getElementById("leadLocationInput")
    ? document.getElementById("leadLocationInput").value
    : null;
  additionalField1 = document.getElementById("additional-field-1")
    ? document.getElementById("additional-field-1").value
    : null;
  additionalField2 = document.getElementById("additional-field-2")
    ? document.getElementById("additional-field-2").value
    : null;

  if (
    callSettingsData.acceptCoordinates &&
    callSettingsData.acceptCoordinates === true
  ) {
    try {
      leadCoordinate = await getUserLocation();
    } catch (error) {
      console.error("Error getting location: ", error);
      leadCoordinate = null;
    }
  }

  userData = {
    name: leadName,
    email: leadEmail,
    phone: leadPhone,
    location: leadLocation,
    coordinates: leadCoordinate,
    meetingId: await getMeetingId(),
    contentProviderId: contentProviderId,
    callType: localStorage.getItem("call-type"),
    additionalField1: additionalField1,
    additionalField2: additionalField2,
  };

  console.log("User Data: ", userData);

  if (userData.callType == "video-lead") {
    console.log("Make Video Call");
    showCallWaitingCard();
    await joinMeeting(userData.meetingId, "");
    showVideoCallScreen();
    requestVideoCall(userData);
  } else if (userData.callType == "audio-lead") {
    console.log("Make Audio Call");
    showCallWaitingCard();
    await joinMeeting(userData.meetingId, "");
    showAudioCallScreen();
    requestVideoCall(userData);
  } else if (userData.callType == "schedule-lead") {
    console.log("Schedule a Call");
    showCallScheduler(userData);
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.innerHTML = message;
  toast.className = "toast show";
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}

async function showCallScheduler(userData) {
  try {
    const response = await fetch(htmlAssetUrl+"/scheduleCall.html");
    const callSchedule = await response.text();

    const targetDiv = document.querySelector("#degpegLeadCard");
    if (targetDiv) {
      targetDiv.insertAdjacentHTML("afterend", callSchedule);
      targetDiv.style.display = "none";
    } else {
      console.error("Target div not found to insert assist card");
    }
  } catch (error) {
    console.error("Error fetching the full assist card HTML:", error);
  }

  var submitSlotBtn = document.getElementById("submit-slot-btn");
  submitSlotBtn.addEventListener("click", function () {
    var scheduledDate = document.getElementById("schedule-date").value;
    var scheduledTime = document.getElementById("schedule-time").value;

    if (scheduledDate && scheduledTime) {
      userData.dateScheduled = scheduledDate;
      userData.timeScheduled = scheduledTime;
    } else {
      alert("Please fill all the details");
    }

    submitSlot(userData);
  });
}

async function submitSlot(userData) {
  requestVideoCall(userData);
  var scheduledCallDetails = formatDateTime(
    userData.dateScheduled,
    userData.timeScheduled
  );

  try {
    const response = await fetch(htmlAssetUrl+"/scheduleSuccess.html");
    const scheduleSuccessHTML = await response.text();

    const targetDiv = document.querySelector("#oneToOneScheduleCall");
    if (targetDiv) {
      targetDiv.insertAdjacentHTML("afterend", scheduleSuccessHTML);
      targetDiv.style.display = "none";
    } else {
      console.error("Target div not found to insert assist card");
    }
  } catch (error) {
    console.error("Error fetching the full assist card HTML:", error);
  }

  document.getElementById("scheduled-call").innerHTML = scheduledCallDetails;
}

function formatDateTime(dateString, timeString) {
  const dateTimeString = `${dateString}T${timeString}:00`;

  const date = new Date(dateTimeString);

  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  let formattedDate = date.toLocaleDateString("en-US", dateOptions);

  formattedDate = formattedDate.replace(/(\d+)(?=\s)/, (day) => {
    if (day % 10 === 1 && day !== "11") return `${day}st`;
    if (day % 10 === 2 && day !== "12") return `${day}nd`;
    if (day % 10 === 3 && day !== "13") return `${day}rd`;
    return `${day}th`;
  });

  const timeOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  const formattedTime = date.toLocaleTimeString("en-US", timeOptions);

  return `${formattedDate}, ${formattedTime}`;
}

async function getMeetingId() {
  try {
    const response = await createMeeting();

    if (response.ok) {
      const data = await response.json();
      meetingId = data.MeetingId;

      return meetingId;
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function toggleMoreOption() {
  let moreOptionsToggle = document.getElementById("more-options");

  if (moreOptionsToggle.style.display == "flex") {
    moreOptionsToggle.style.display = "none";
  } else {
    moreOptionsToggle.style.display = "flex";
  }
}

function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

          fetch(url)
            .then((response) => response.json())
            .then((data) => {
              const city =
                data.address.city || data.address.town || data.address.village;
              resolve(city);
            })
            .catch((error) => {
              console.error("Error:", error);
              reject(error);
            });
        },
        function (error) {
          reject(error);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.error("User denied the request for Geolocation.");
              break;
            case error.POSITION_UNAVAILABLE:
              console.error("Location information is unavailable.");
              break;
            case error.TIMEOUT:
              console.error("The request to get user location timed out.");
              break;
            case error.UNKNOWN_ERROR:
              console.error("An unknown error occurred.");
              break;
          }
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      reject("Geolocation not supported");
    }
  });
}

async function showCallEndedHTML() {
  try {
    const response = await fetch(htmlAssetUrl+"/callEnded.html");
    const callEndHTML = await response.text();

    const targetDiv = document.querySelector("#callConnected");
    if (targetDiv) {
      targetDiv.insertAdjacentHTML("afterend", callEndHTML);
      targetDiv.style.display = "none";
    } else {
      console.error("Target div not found to insert assist card");
    }
  } catch (error) {
    console.error("Error fetching the full assist card HTML:", error);
  }
}

async function dropMeeting() {
  if (meetingDropped) return;

  if(localStorage.getItem("executive-status") !== "busy") {
    const videoTilesParent = document.getElementById("video-tiles");
  var callEndedDiv = document.getElementById("degpeg-onetoone-thankyou");
  var assistFullCard = document.getElementById("assistFullCard");

  if (
    meetingId &&
    (!videoTilesParent || videoTilesParent.childElementCount <= 2)
  ) {
    await endMeeting(meetingId);
    if (!callEndedDiv) {
      showCallEndedHTML();
    }
    if (assistFullCard) {
      assistFullCard.style.display = "none";
    }
  } else {
    await leaveMeeting();
    if (!callEndedDiv) {
      showCallEndedHTML();
    }
    if (assistFullCard) {
      assistFullCard.style.display = "none";
    }
  }
  } else {
    endMeeting();
    localStorage.setItem('executive-status', 'refresh');
  }

  meetingDropped = true;
}

function onShareScreen() {
  document.getElementById("start-screenshare").style.display = "none";
  document.getElementById("stop-screenshare").style.display = "flex";
  startScreenShare();
}

function offShareScreen() {
  document.getElementById("start-screenshare").style.display = "flex";
  document.getElementById("stop-screenshare").style.display = "none";
  stopScreenShare();
}

function toggleExpand() {
  var degpegWidgetExpand = document.getElementById("degpeg-widget");
  var oneToOneDegpegActionToggleExpandBtnImg =
    document.getElementById("toggle-expand-img");
  if (degpegWidgetExpand) {
    if (degpegWidgetExpand.classList.contains("expand")) {
      degpegWidgetExpand.classList.remove("expand");
      oneToOneDegpegActionToggleExpandBtnImg.src =
        imgAssetUrl + "/maximize.svg";
    } else {
      degpegWidgetExpand.classList.add("expand");
      oneToOneDegpegActionToggleExpandBtnImg.src =
        imgAssetUrl + "/minimize.svg";
    }
  }
}

async function startScreenRecording() {
  await startScreenRecord();
  var startRecordingButton = document.getElementById("start-recording");
  var stopRecordingButton = document.getElementById("stop-recording");

  if (startRecordingButton) {
    startRecordingButton.style.display = "none";
  }

  if (stopRecordingButton) {
    stopRecordingButton.style.display = "block";
  }
}

async function stopScreenRecording() {
  await stopScreenRecord();
  const downloadLink = document.getElementById("download-link");
  var startRecordingButton = document.getElementById("start-recording");
  var stopRecordingButton = document.getElementById("stop-recording");

  if (startRecordingButton) {
    startRecordingButton.style.display = "block";
  }

  if (stopRecordingButton) {
    stopRecordingButton.style.display = "none";
  }
}

function getAllVideos(videoTilesParent) {
  const connectingCallCard = document.getElementById("connectingCallCard");
  const videoHostDiv = document.getElementById("host-video");

  var multicallDiv = videoTilesParent.parentElement;

  videoTilesParent.style.height = "100%";
  videoTilesParent.style.overflow = "hidden";

  const observerCallback = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        var numberOfVideos = videoTilesParent.childElementCount;
        var videoTilesChildren = videoTilesParent.children;

        if (mutation.removedNodes.length > 0 && numberOfVideos === 1) {
          console.log(
            "One of the two videos was removed, calling dropMeeting."
          );
          dropMeeting();
        }

        if (numberOfVideos === 0) {
          console.log("All videos were removed, calling dropMeeting.");
          dropMeeting();
        }

        if (numberOfVideos === 1 || videoTilesChildren[0]) {
          var hostVideo = videoTilesChildren[0];
          if (hostVideo) {
            hostVideo.classList.remove("degpegVideoCallVideoHost", "movable");
            hostVideo.classList.add("degpegVideoCallVideoGuest");
            hostVideo.style.height = "100%";
          }

          if (connectingCallCard) connectingCallCard.style.display = "block";
          if (videoHostDiv) videoHostDiv.style.display = "none";
        }

        if (numberOfVideos >= 2) {
          if (videoTilesChildren[0]) {
            var hostVideo = videoTilesChildren[0];
            if (hostVideo) {
              hostVideo.classList.remove("degpegVideoCallVideoGuest");
              hostVideo.classList.add("degpegVideoCallVideoHost", "movable");
              hostVideo.style.objectFit = "cover";
              hostVideo.style.height = "";
            }
          }

          if (connectingCallCard) connectingCallCard.style.display = "none";
          if (videoHostDiv) videoHostDiv.style.display = "";
        }

        for (let i = 1; i < numberOfVideos; i++) {
          if (videoTilesChildren[i]) {
            videoTilesChildren[i].classList.add("degpegVideoCallVideoGuest");

            if (numberOfVideos < 3) {
              videoTilesChildren[i].style.height = "100%";
            }
          }
          if (numberOfVideos === 3) {
            videoTilesChildren[i].style.height = "";
            videoTilesParent.classList.add(
              "oneToOneDegpegMultiCall",
              "fullwidth",
              "halfHeight"
            );
            videoTilesParent.classList.remove("threerowheight");
          } else if (numberOfVideos > 3 && numberOfVideos < 6) {
            videoTilesChildren[i].style.height = "";
            multicallDiv.classList.remove("fullwidth");
            videoTilesParent.classList.add(
              "oneToOneDegpegMultiCall",
              "halfHeight"
            );
            videoTilesParent.classList.remove("fullwidth", "threerowheight");
          } else if (numberOfVideos >= 6) {
            videoTilesChildren[i].style.height = "";
            multicallDiv.classList.remove("fullwidth");
            videoTilesParent.classList.add(
              "oneToOneDegpegMultiCall",
              "threerowheight"
            );
            videoTilesParent.classList.remove("fullwidth", "halfHeight");
          } else {
            multicallDiv.classList.add("fullwidth");
            videoTilesParent.classList.remove(
              "oneToOneDegpegMultiCall",
              "fullwidth",
              "halfHeight",
              "threerowheight"
            );
          }
        }
      }
    }
  };

  const observer = new MutationObserver(observerCallback);

  const config = {
    attributes: false,
    childList: true,
    subtree: false,
    characterData: false,
  };

  if (videoTilesParent) {
    observer.observe(videoTilesParent, config);
  } else {
    console.error("Target node not found.");
  }
}

function clickSnapshot() {
  const videoTiles = document.querySelectorAll("#video-tiles video");

  if (videoTiles.length === 0) return;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  const videoWidth = videoTiles[0].videoWidth;
  const videoHeight = videoTiles[0].videoHeight;
  const columns = 2;
  const rows = Math.ceil(videoTiles.length / columns);

  canvas.width = columns * videoWidth;
  canvas.height = rows * videoHeight;

  videoTiles.forEach((video, index) => {
    const x = (index % columns) * videoWidth;
    const y = Math.floor(index / columns) * videoHeight;
    context.drawImage(video, x, y, videoWidth, videoHeight);
  });

  const snapshot = canvas.toDataURL("image/png");

  const link = document.createElement("a");
  link.href = snapshot;
  link.download = `snapshot-all-participants.png`;
  link.click();
}

async function addInputFields(
  additionalFieldId,
  additionalFieldName,
  additionalFieldText
) {
  var newFormGroup = document.createElement("div");
  newFormGroup.classList.add("degpeg-onetoone-formgroup", "fieldSeperator");

  var newInput = document.createElement("input");
  newInput.id = additionalFieldId;
  newInput.name = additionalFieldName;
  newInput.placeholder = additionalFieldText;

  newFormGroup.appendChild(newInput);

  var submitButton = document.getElementById("submit-lead-btn");

  submitButton.parentNode.insertBefore(newFormGroup, submitButton);
}

function toggleVideoStatus() {
  toggleVideo();
}

const startDivCheckInterval = () => {
  intervalId = setInterval(() => {
    if (isIntervalActive) {
      checkDivLoaded();
    }
  }, 100);
};

const checkDivLoaded = () => {
  const videoTilesParent = document.getElementById("video-tiles");
  if (videoTilesParent) {
    console.log("Div is loaded.");
    isIntervalActive = false;
    getAllVideos(videoTilesParent);
  }
};

const stopInterval = () => {
  isIntervalActive = false;
};

const resumeInterval = () => {
  isIntervalActive = true;
};

startDivCheckInterval();
