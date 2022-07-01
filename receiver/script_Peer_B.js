// import { webRTC_dashboard } from "./script_webrtc.js";

const offerBox = document.querySelector("#remote_address");
const answerBox = document.querySelector("#local_address");
const inBox = document.querySelector("#incoming");
const outBox = document.querySelector("#outgoing");
const confirmButton = document.querySelector(".offer_entered");

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
const localConnection = new RTCPeerConnection(configuration);

// adding event listeners for icecandidate
const iceCandidates = [];
localConnection.addEventListener("icecandidate", (event) => {
	if (event.candidate) iceCandidates.push(event.candidate);
	else
		setTimeout(() => {
			answerBox.value = JSON.stringify({
				description: localConnection.localDescription,
				icecandidates: iceCandidates,
			});
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
		stream.getTracks().forEach((track) => {
			localConnection.addTrack(track, stream);
		});
	})
	.catch((err) => {
		alert("Some error occured!!!");
	});

// capturing the remote videochannel
localConnection.addEventListener("track", async (event) => {
	const [remoteStream] = event.streams;
	inBox.srcObject = remoteStream;
});

confirmButton.onclick = (event) => {
	const { description, icecandidates } = JSON.parse(offerBox.value);
	// offerBox.setAttribute("readonly", "true");

	// accepting the offer
	localConnection.setRemoteDescription(description).then(() => {});

	// adding proposed icecandidates
	icecandidates.forEach((candidate) => {
		localConnection.addIceCandidate(new RTCIceCandidate(candidate));
	});
	var receiveChannel;
	localConnection.ondatachannel = (e) => {
		receiveChannel = e.channel;

		receiveChannel.onmessage = (e) => {
			let chatBox = document.querySelector(".chat");
			chatBox.innerHTML += `Message Recieved From Device A : ${e.data}` + "<br />";
		};

		receiveChannel.onopen = (e) => {
			let chatBox = document.querySelector(".chat");
			chatBox.innerHTML += "Communication Established Now you can Chat !!! <br />";
			document.querySelector(".send_response").disabled = false;
		};
		receiveChannel.onclose = (e) => {
			let chatBox = document.querySelector(".chat");
			chatBox.innerHTML += "closed!!!!!!!";
		};
		localConnection.channel = receiveChannel;
	};
	localConnection.createAnswer().then((answer) => localConnection.setLocalDescription(answer));
};

document.querySelector(".send_response").addEventListener("click", async () => {
	const response = document.getElementById("chat_text").value;
	const text = document.createElement("div");
	text.innerHTML = "Message Sent By You : " + document.getElementById("chat_text").value;
	document.querySelector(".chat").appendChild(text);
	localConnection.channel.send(response);
});

// send message on hitting enter
document.getElementById("chat_text").addEventListener("keypress", async (event) => {
	if (event.key == "Enter") {
		const response = document.getElementById("chat_text").value;
		const text = document.createElement("div");
		text.innerHTML = "Message Sent By You : " + document.getElementById("chat_text").value;
		document.querySelector(".chat").appendChild(text);
		localConnection.channel.send(response);
	}
});
// module.exports= { localConnection };
