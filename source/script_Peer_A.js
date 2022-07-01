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
			offerBox.value = JSON.stringify({
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
const sendChannel = localConnection.createDataChannel("sendChannel");

sendChannel.onmessage = (e) => {
	let chatBox = document.querySelector(".chat");
	chatBox.innerHTML += `Message Received From Device B : ${e.data}` + "<br />";
};

sendChannel.onopen = (e) => {
	let chatBox = document.querySelector(".chat");
	chatBox.innerHTML += "Communication Established Now you can Chat !!! <br />";
	document.querySelector(".send_response").disabled = false;
};

sendChannel.onclose = (e) => {
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
		.then(() => {});
};
confirmButton.onclick = () => {
	const { description, icecandidates } = JSON.parse(answerBox.value);

	// accepting the offer
	localConnection.setRemoteDescription(description);

	// adding proposed icecandidates
	icecandidates.forEach((candidate) => {
		localConnection.addIceCandidate(new RTCIceCandidate(candidate));
	});
};

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

let Monitor = require("../../sprinklr-monitor-webrtc/build/index");
let CONFIGURABLE_PARAMETERS = {
	SAMPLING_TIME_PERIOD: 1000,
	REPORT_MAX_LENGTH: 6,
	ANALYSIS_REPORT_LENGTH: 6,
	EVENT_EMIT_TIME_PERIOD: 3000,
	STRIKES_THRESHOLD: 3,
};
// creating new MonitorWebRTC instance
let monitor = new Monitor.MonitorWebRTCClass.MonitorWebRTC(localConnection, CONFIGURABLE_PARAMETERS);
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

function webRTC_dashboard() {
	var myChart1;
	var myChart2;
	var myChart3;
	var myChart4;
	var myChart5;
	var myChart6;
	var myChart7;
	var myChart8;
	var myChart9;
	var myChart10;
	var myChart11;
	var myChart12;
	var myChart13;

	window.setInterval(function () {
		if (monitor.checkIsConnection()) {
			let statsOutput = "";
			statsOutput += `<h2>Report: Media Source </h2>\n`;
			statsOutput += `<strong>Audio Level of Source :</strong> ${monitor.getAudioLevel()}<br>\n`;
			pushValue(myChart1, monitor.getAudioLevel());
			statsOutput += `<h2>Report: Remote Inbound Source </h2>\n`;
			statsOutput += `<strong>Jitter :</strong> ${monitor.getJitter()}<br>\n`;
			pushValue(myChart2, monitor.getJitter());
			statsOutput += `<strong>Round Trip Time :</strong> ${monitor.getRTTRemoteInbound()}<br>\n`;
			pushValue(myChart3, monitor.getRTTRemoteInbound());
			statsOutput += `<h2>Report: Inbound Source </h2>\n`;
			statsOutput += `<strong>Packets Lost :</strong> ${monitor.getPacketsLostInbound()}<br>\n`;
			pushValue(myChart4, monitor.getPacketsLostInbound());
			statsOutput += `<strong>Samples Inserted for Deceleration :</strong> ${monitor.getInsertedSamplesForDeceleration()}<br>\n`;
			pushValue(myChart5, monitor.getInsertedSamplesForDeceleration());
			statsOutput += `<strong>Samples Removed for Acceleration :</strong> ${monitor.getRemovedSamplesForAcceleration()}<br>\n`;
			pushValue(myChart6, monitor.getRemovedSamplesForAcceleration());
			statsOutput += `<h2>Report: Outbound Source </h2>\n`;
			statsOutput += `<strong>Packets Sent :</strong> ${monitor.getPacketsSentOutbound()}<br>\n`;
			pushValue(myChart7, monitor.getPacketsSentOutbound());
			statsOutput += `<strong>Retransmitted Packets Sent :</strong> ${monitor.getRetransmittedPacketsSentOutbound()}<br>\n`;
			pushValue(myChart8, monitor.getRetransmittedPacketsSentOutbound());
			statsOutput += `<h2>Report: Remote Outbound Source </h2>\n`;
			statsOutput += `<strong>Round Trip Time :</strong> ${monitor.getRTTRemoteOutbound()}<br>\n`;
			pushValue(myChart9, monitor.getRTTRemoteOutbound());
			statsOutput += `<h2>Report: ICE Candidate Pair </h2>\n`;
			statsOutput += `<strong>Availabe Outgoing Bitrate for the Connection :</strong> ${monitor.getAvailableOutgoingBitrateICECandidate()}<br>\n`;
			pushValue(myChart10, monitor.getAvailableOutgoingBitrateICECandidate());
			statsOutput += `<strong>Current Round Trip Time for the Connection :</strong> ${monitor.getCurrentRoundTripTimeICECandidate()}<br>\n`;
			pushValue(myChart11, monitor.getCurrentRoundTripTimeICECandidate());
			statsOutput += `<strong>Packets Recieved by the Connection :</strong> ${monitor.getPacketsRecievedICECandidate()}<br>\n`;
			pushValue(myChart12, monitor.getPacketsRecievedICECandidate());
			statsOutput += `<strong>Packets Sent by the Connection :</strong> ${monitor.getPacketsSentICECandidate()}<br>\n`;
			pushValue(myChart13, monitor.getPacketsSentICECandidate());

			document.querySelector(".stats-box").innerHTML = statsOutput;
		} else {
			document.querySelector(".stats-box").innerHTML = "";
		}
	}, 1000);

	setTimeout(function () {
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart1";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx1 = document.getElementById("myChart1").getContext("2d");
		myChart1 = new Chart(ctx1, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Audio Level of Source",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart2";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx2 = document.getElementById("myChart2").getContext("2d");
		myChart2 = new Chart(ctx2, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Remote Inbound Jitter",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart3";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx3 = document.getElementById("myChart3").getContext("2d");
		myChart3 = new Chart(ctx3, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Remote Inbound Round Trip Time",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart4";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx4 = document.getElementById("myChart4").getContext("2d");
		myChart4 = new Chart(ctx4, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Inbound Packets Lost",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart5";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx5 = document.getElementById("myChart5").getContext("2d");
		myChart5 = new Chart(ctx5, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Inbound Samples Inserted for Deceleration",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart6";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx6 = document.getElementById("myChart6").getContext("2d");
		myChart6 = new Chart(ctx6, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Inbound Samples Removed for Acceleration",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart7";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx7 = document.getElementById("myChart7").getContext("2d");
		myChart7 = new Chart(ctx7, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Outbound Packets Sent",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart8";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx8 = document.getElementById("myChart8").getContext("2d");
		myChart8 = new Chart(ctx8, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Outbound Retransmitted Packets Sent",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart9";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx9 = document.getElementById("myChart9").getContext("2d");
		myChart9 = new Chart(ctx9, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Round Trip Time Remote Outbound",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart10";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx10 = document.getElementById("myChart10").getContext("2d");
		myChart10 = new Chart(ctx10, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Availabe Outgoing Bitrate for the Connection",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart11";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx11 = document.getElementById("myChart11").getContext("2d");
		myChart11 = new Chart(ctx11, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Current Round Trip Time for the Connection",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart12";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx12 = document.getElementById("myChart12").getContext("2d");
		myChart12 = new Chart(ctx12, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Packets Recieved by the Connection",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
		var canvasDiv = document.createElement("div");
		var canvas = document.createElement("canvas");
		canvas.id = "myChart13";
		canvas.style.border = "1px solid";
		canvasDiv.appendChild(canvas);
		canvasDiv.style.width = "500px";
		canvasDiv.style.height = "260px";
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(canvasDiv);
		const ctx13 = document.getElementById("myChart13").getContext("2d");
		myChart13 = new Chart(ctx13, {
			type: "line",
			data: {
				labels: [],
				datasets: [
					{
						label: "Packets Sent by the Connection",
						data: [],
					},
				],
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
	}, 500);

	function pushValue(myChart, x) {
		myChart.data.datasets[0].data.push(x);
		// console.log(x);
		var currTime = new Date().toLocaleTimeString();
		myChart.data.labels.push(currTime);
		myChart.update();
		if (myChart.data.datasets[0].data.length == 20) {
			popValue(myChart);
		}
	}
	function popValue(myChart) {
		myChart.data.datasets[0].data.shift();
		myChart.data.labels.shift();
		myChart.update();
	}
}
webRTC_dashboard();

// export { localConnection };
