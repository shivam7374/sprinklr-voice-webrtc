const offerBox = document.querySelector("#local_address");
const answerBox = document.querySelector("#remote_address");
const inBox = document.querySelector("#incoming");
const outBox = document.querySelector("#outgoing");
const generateOffer = document.querySelector(".generate_offer");
const confirmButton = document.querySelector(".accept_answer");

var configuration = {
	iceServers: [
		{
			urls: "stun:stun.l.google.com:19302",
		},
		// {
		//   urls: "turn:openrelay.metered.ca:80",
		//   username: "openrelayproject",
		//   credential: "openrelayproject",
		// },
	],
};
let localConnection;
localConnection = new RTCPeerConnection(configuration);

// adding event listeners for icecandidate
const iceCandidates = [];
localConnection.addEventListener("icecandidate", (event) => {
	if (event.candidate) iceCandidates.push(event.candidate);
	else
		setTimeout(() => {
			// console.log("icecandidate search complete");
			offerBox.value = JSON.stringify({
				description: localConnection.localDescription,
				icecandidates: iceCandidates,
			});
			// offerBox.setAttribute("readonly", "true");
		}, 100);
});

// creating the local videochannel
const constraint = {
	audio: true,
	video: true,
};
navigator.mediaDevices
	.getUserMedia(constraint)
	.then((stream) => {
		outBox.srcObject = stream;
		// console.log(stream);
		stream.getTracks().forEach((track) => {
			localConnection.addTrack(track, stream);
		});
		// console.log("Stream ID : ");
		// console.log(stream.id);
	})
	.catch((err) => {
		// console.log(err);
		alert("Some error occured!!!");
	});

// capturing the remote videochannel
localConnection.addEventListener("track", async (event) => {
	// console.log("Sender: media channel opened");
	const [remoteStream] = event.streams;
	// console.log(event.streams);
	inBox.srcObject = remoteStream;
});
const sendChannel = localConnection.createDataChannel("sendChannel");
// console.log("channel made");

sendChannel.onmessage = (e) => {
	// console.log("Message Recieved From Device B : " + e.data);
	let chatBox = document.querySelector(".chat");
	chatBox.innerHTML += `Message Received From Device B : ${e.data}` + "<br />";
};

sendChannel.onopen = (e) => {
	// console.log("Communication Established Now you can Chat !!!");
	let chatBox = document.querySelector(".chat");
	chatBox.innerHTML += "Communication Established Now you can Chat !!! <br />";
	document.querySelector(".send_response").disabled = false;
};

sendChannel.onclose = (e) => {
	// console.log("closed!!!!!!");
	let chatBox = document.querySelector(".chat");
	chatBox.innerHTML += "closed!!!!!!";
};

generateOffer.onclick = () => {
	// creating an offer for the new datachannel

	localConnection
		.createOffer()
		.then((offer) => {
			localConnection.setLocalDescription(offer);
		})
		.then(() => {
			// console.log("Sender: offer initiated");
		});
};
confirmButton.onclick = () => {
	const { description, icecandidates } = JSON.parse(answerBox.value);
	// answerBox.setAttribute("readonly", "true");

	// accepting the offer
	localConnection.setRemoteDescription(description).then(() => {
		// console.log("Sender: answer accepted");
	});

	// adding proposed icecandidates
	icecandidates.forEach((candidate) => {
		localConnection.addIceCandidate(new RTCIceCandidate(candidate));
	});
};

// (function () {
// 	var old = console.log;
// 	var logger = document.querySelector(".chat");
// 	console.log = function (message) {
// 		if (typeof message == "object") {
// 			logger.innerHTML +=
// 				(JSON && JSON.stringify ? JSON.stringify(message) : message) +
// 				"<br />";
// 		} else {
// 			logger.innerHTML += message + "<br />";
// 		}
// 	};
// })();

document.querySelector(".send_response").addEventListener("click", async () => {
	const response = document.getElementById("chat_text").value;
	const text = document.createElement("div");
	text.innerHTML = "Message Sent By You : " + document.getElementById("chat_text").value;
	document.querySelector(".chat").appendChild(text);
	sendChannel.send(response);
});

// send message on hitting enter
document.getElementById("chat_text").addEventListener("keypress", async (event) => {
	if (event.key == "Enter") {
		const response = document.getElementById("chat_text").value;
		const text = document.createElement("div");
		text.innerHTML = "Message Sent By You : " + document.getElementById("chat_text").value;
		document.querySelector(".chat").appendChild(text);
		sendChannel.send(response);
	}
});

// function giveDescription(elem) {
//   var x = document.getElementById("js-description");
//   var description = elem.getAttribute("data-description");
//   x.innerHTML = description;

//   var button = document.getElementsByClassName("js-button");

//   for (var i = 0; i < button.length; i++) {
//     button[i].classList.remove("active-button");
//   }

//   elem.classList.add("active-button");
// }
// function useStunServer(elem) {
//   giveDescription(elem);
//   configuration = {
//     iceServers: [
//       {
//         urls: "stun:stun.l.google.com:19302",
//       },
//     ],
//   };
// }

// function useTurnServer(elem) {
//   giveDescription(elem);
//   configuration = {
//     iceServers: [
//       {
//         urls: "turn:openrelay.metered.ca:80",
//         username: "openrelayproject",
//         credential: "openrelayproject",
//       },
//     ],
//   };
// }
// import { localConnection } from "./script_Peer_A.js";
// import { MonitorWebRTC } from "../sprinklr-monitor-webrtc/build/index.js";
let Monitor = require("../sprinklr-monitor-webrtc/build/index");
let CONFIGURABLE_PARAMETERS = {
	SAMPLING_TIME_PERIOD: 1000,
	REPORT_MAX_LENGTH: 6,
	ANALYSIS_REPORT_LENGTH: 6,
	EVENT_EMIT_TIME_PERIOD: 3000,
	STRIKES_THRESHOLD: 3,
};
// creating new MonitorWebRTC instance
let monitor = new Monitor.MonitorWebRTCClass.MonitorWebRTC(
	localConnection,
	CONFIGURABLE_PARAMETERS
);
monitor.eventEmitter.on("LOW_AUDIO", function (text) {
	notifyInfo("Info ", "Low Audio");
});
monitor.eventEmitter.on("LOW_PACKETS_SENT", function (text) {
	notifyInfo("Info ", "Low Packets Sent");
});
monitor.eventEmitter.on("HIGH_RETRANSMITTED_PACKETS_SENT", function (text) {
	notifyInfo("Info ", "High Retransmitted Packets Sent");
});
monitor.eventEmitter.on("HIGH_INBOUND_PACKET_LOSS", function (text) {
	notifyInfo("Info ", "High Inbound Packet Loss");
});
monitor.eventEmitter.on("HIGH_REMOTE_INBOUND_PACKET_LOSS", function (text) {
	notifyInfo("Info ", "High Remote Inbound Packet Loss");
});
monitor.eventEmitter.on("HIGH_JITTER", function (text) {
	notifyInfo("Info ", "High Jitter");
});
monitor.eventEmitter.on("HIGH_ROUND_TRIP_TIME", function (text) {
	notifyInfo("Info ", "High Round Trip Time");
});
monitor.eventEmitter.on("LOW_MOS_VALUE", function (text) {
	notifyInfo("Info ", "Low MOS Value");
});
monitor.eventEmitter.on("CONNECTION_PROBLEM", function (text) {
	notifyWarning("Warning !!!", "Connection Problem");
});
monitor.eventEmitter.on("CONNECTED", function (text) {
	notifySuccess("Sucess !!! ", "Connection Established");
});
monitor.eventEmitter.on("NO_CONNECTION", function (text) {
	notifyError("ALERT !!!", "No Connection");
});
monitor.eventEmitter.on("SLOW_CONNECTION", function (text) {
	notifyInfo("Slow Connection", "Your internet is slow :(");
});
// Toastr
function notifyInfo(title, msg) {
	// Display an info toast with no title
	toastr.info(msg, title, { timeOut: 1500 });
}
function notifySuccess(title, msg) {
	// Display a success toast with no title
	toastr.success(msg, title, { timeOut: 2500 });
}
function notifyWarning(title, msg) {
	// Display a warning toast with no title
	toastr.warning(msg, title, { timeOut: 5000 });
}
function notifyError(title, msg) {
	// Display a warning toast with no title
	toastr.error(msg, title, { timeOut: 0, extendedTimeOut: 0 });
}

// export { localConnection };
