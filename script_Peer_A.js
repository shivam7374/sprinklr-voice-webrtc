const offerBox = document.querySelector("#local_address");
const answerBox = document.querySelector("#remote_address");
const inBox = document.querySelector("#incoming");
const outBox = document.querySelector("#outgoing");
const generateOffer = document.querySelector(".generate_offer");
const confirmButton = document.querySelector(".accept_answer");

const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};
const localConnection = new RTCPeerConnection(configuration);

// adding event listeners for icecandidate
const iceCandidates = [];
localConnection.addEventListener("icecandidate", (event) => {
  if (event.candidate) iceCandidates.push(event.candidate);
  else
    setTimeout(() => {
      console.log("icecandidate search complete");
      offerBox.value = JSON.stringify({
        description: localConnection.localDescription,
        icecandidates: iceCandidates,
      });
      offerBox.setAttribute("readonly", "true");
    }, 100);
});

// creating the local videochannel
const constraint = {
  audio: false,
  video: true,
};
navigator.mediaDevices
  .getUserMedia(constraint)
  .then((stream) => {
    outBox.srcObject = stream;
    stream.getTracks().forEach((track) => {
      localConnection.addTrack(track, stream);
    });
  })
  .catch((err) => {
    console.log(err);
    alert("Some error occured!!!");
  });

// capturing the remote videochannel
localConnection.addEventListener("track", async (event) => {
  console.log("Sender: media channel opened");
  const [remoteStream] = event.streams;
  inBox.srcObject = remoteStream;
});
const sendChannel = localConnection.createDataChannel("sendChannel");
console.log("channel made");
sendChannel.onmessage = (e) =>
  console.log("Message Recieved From Device B : " + e.data);
sendChannel.onopen = (e) => {
  console.log("Communication Established Now you can Chat !!!");
  document.querySelector(".send_response").disabled = false;
};
sendChannel.onclose = (e) => console.log("closed!!!!!!");

generateOffer.onclick = (event) => {
  // creating an offer for the new datachannel

  localConnection
    .createOffer()
    .then((offer) => {
      localConnection.setLocalDescription(offer);
    })
    .then(() => {
      console.log("Sender: offer initiated");
    });
};
confirmButton.onclick = (event) => {
  const { description, icecandidates } = JSON.parse(answerBox.value);
  answerBox.setAttribute("readonly", "true");

  // accepting the offer
  localConnection.setRemoteDescription(description).then(() => {
    console.log("Sender: answer accepted");
  });

  // adding proposed icecandidates
  icecandidates.forEach((candidate) => {
    localConnection.addIceCandidate(new RTCIceCandidate(candidate));
  });
};

(function () {
  var old = console.log;
  var logger = document.querySelector(".chat");
  console.log = function (message) {
    if (typeof message == "object") {
      logger.innerHTML +=
        (JSON && JSON.stringify ? JSON.stringify(message) : message) + "<br />";
    } else {
      logger.innerHTML += message + "<br />";
    }
  };
})();
document.querySelector(".send_response").addEventListener("click", async () => {
  const response = document.getElementById("chat_text").value;
  const text = document.createElement("div");
  text.innerHTML =
    "Message Sent By You : " + document.getElementById("chat_text").value;
  document.querySelector(".chat").appendChild(text);
  sendChannel.send(response);
});
