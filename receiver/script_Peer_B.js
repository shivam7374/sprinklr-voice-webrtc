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
		}, 1500);
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
			// chatBox.innerHTML += "Communication Established Now you can Chat !!! <br />";
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

let cameraStatus = true;
let micStatus = true;
let remoteCameraStatus = true;

document.getElementById("video-pause-button").addEventListener("click", () => {
	toggleMediaOptionButtonColor(document.getElementById("video-pause-button"));

	outBox.srcObject.getTracks()[1].enabled = !outBox.srcObject.getTracks()[1].enabled;
	cameraStatus = !cameraStatus;
	if (cameraStatus === false) {
		notifyOnOffState("Info ", "Your camera is Off.");
	} else {
		notifySuccess("Info ", "Your camera is On.");
	}
});

document.getElementById("audio-pause-button").addEventListener("click", () => {
	toggleMediaOptionButtonColor(document.getElementById("audio-pause-button"));

	outBox.srcObject.getTracks()[0].enabled = !outBox.srcObject.getTracks()[0].enabled;
	micStatus = !micStatus;
	if (micStatus === false) {
		notifyOnOffState("Info ", "Your mic is Off.");
	} else {
		notifySuccess("Info ", "Your mic is On.");
	}
});
function toggleMediaOptionButtonColor(element) {
	if (element.style.backgroundColor == "#ea4335" || element.style.backgroundColor == hexToRGB("#ea4335"))
		element.style.backgroundColor = "#000";
	else element.style.backgroundColor = "#ea4335";
}
function hexToRGB(h) {
	let r = 0,
		g = 0,
		b = 0;

	// 3 digits
	if (h.length == 4) {
		r = "0x" + h[1] + h[1];
		g = "0x" + h[2] + h[2];
		b = "0x" + h[3] + h[3];

		// 6 digits
	} else if (h.length == 7) {
		r = "0x" + h[1] + h[2];
		g = "0x" + h[3] + h[4];
		b = "0x" + h[5] + h[6];
	}

	return "rgb(" + +r + ", " + +g + ", " + +b + ")";
}

// let Monitor = require("../../sprinklr-monitor-webrtc/build/index");
let Monitor = require("monitor-webrtc-connection");
let CONFIGURABLE_PARAMETERS = {
	SAMPLING_TIME_PERIOD: 1000,
	REPORT_MAX_LENGTH: 500,
	EVENT_EMIT_TIME_PERIOD: 5000,
	STRIKES_THRESHOLD: 5,
	LOGGER_FUNCTION: console.log,
};
// creating new MonitorWebRTC instance
let monitor = new Monitor.MonitorWebRTC(localConnection, CONFIGURABLE_PARAMETERS);
monitor.eventEmitter.on("LOW_AUDIO", function () {
	notifyInfo("Info ", "Are you speaking? Your audio is quite low.");
});

monitor.eventEmitter.on("REMOTE_PEER_VIDEO_STREAM_OFF", function () {
	if (remoteCameraStatus === true) {
		notifyOnOffState("Info ", "Remote Peer Video Quality very low/has turned off camera.");
	}
	remoteCameraStatus = false;
});
monitor.eventEmitter.on("REMOTE_PEER_VIDEO_STREAM_ON", function () {
	if (remoteCameraStatus === false) {
		notifySuccess("Info ", "Remote Peer Video Quality Improved/has turned on camera.");
	}
	remoteCameraStatus = true;
});

monitor.eventEmitter.on("LOW_PACKETS_SENT", function () {
	notifyInfo("Info ", "Low Packets Sent");
});
monitor.eventEmitter.on("HIGH_RETRANSMITTED_PACKETS_SENT", function () {
	notifyInfo("Info ", "High Retransmitted Packets Sent");
});
monitor.eventEmitter.on("HIGH_INBOUND_PACKET_LOSS", function () {
	notifyInfo("Info ", "High Inbound Packet Loss");
});
monitor.eventEmitter.on("HIGH_REMOTE_INBOUND_PACKET_LOSS", function () {
	notifyInfo("Info ", "High Remote Inbound Packet Loss");
});
monitor.eventEmitter.on("HIGH_JITTER", function () {
	notifyInfo("Info ", "High Jitter");
});
monitor.eventEmitter.on("HIGH_ROUND_TRIP_TIME", function () {
	notifyInfo("Info ", "High Round Trip Time");
});
monitor.eventEmitter.on("LOW_MOS_VALUE", function () {
	notifyInfo("Info ", "Low MOS Value");
});
monitor.eventEmitter.on("CONNECTION_PROBLEM", function () {
	notifyWarning("Warning !!!", "Connection Problem");
});
monitor.eventEmitter.on("CONNECTED", function () {
	notifySuccess("Sucess !!! ", "Connection Established");
});
monitor.eventEmitter.on("NO_CONNECTION", function () {
	notifyError("ALERT !!!", "No Connection");
});
monitor.eventEmitter.on("SLOW_CONNECTION", function () {
	notifyWarning("Slow Connection", "Your internet is slow :(");
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
function notifyOnOffState(title, msg) {
	// Display a warning toast with no title
	toastr.warning(msg, title, { timeOut: 3000 });
}
function notifyWarning(title, msg) {
	// Display a warning toast with no title
	toastr.warning(msg, title, { timeOut: 5000 });
}
function notifyError(title, msg) {
	// Display a warning toast with no title
	toastr.error(msg, title, { timeOut: 0, extendedTimeOut: 0 });
}

function createAndPlotChart(chardId, chartLabel) {
	let canvasDiv = document.createElement("div");
	canvasDiv.className = "individualChart";
	let canvas = document.createElement("canvas");
	canvas.id = chardId;

	canvas.style.border = "1px solid";
	canvasDiv.appendChild(canvas);
	canvasDiv.style.width = "450px";
	canvasDiv.style.height = "260px";
	let chartsDiv = document.getElementsByClassName("charts")[0];
	chartsDiv.appendChild(canvasDiv);
	const ctx = document.getElementById(chardId).getContext("2d");
	let myChart = new Chart(ctx, {
		type: "line",
		data: {
			labels: [],
			datasets: [
				{
					label: chartLabel,
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
	return myChart;
}

function webRTC_dashboard() {
	let myChart1,
		myChart2,
		myChart3,
		myChart4,
		myChart5,
		myChart6,
		myChart7,
		myChart8,
		myChart9,
		myChart10,
		myChart11,
		myChart12,
		myChart13,
		myChart14,
		myChart15,
		myChart16,
		myChart17,
		myChart18,
		myChart19,
		myChart20,
		myChart21,
		myChart22,
		myChart23,
		myChart24,
		myChart25,
		myChart26,
		myChart27,
		myChart28;

	window.setInterval(function () {
		if (monitor.checkIsConnection()) {
			let selfMic = monitor.checkMicOn();

			let statsOutput = "";
			statsOutput += `<h1>Parameters for Audio </h1>\n`;
			statsOutput += `<h2>Report: Media Source </h2>\n`;
			statsOutput += `<strong>Audio Level of Source :</strong> ${monitor.getAudioLevel()}<br>\n`;
			statsOutput += `<strong>Your Mic status :</strong> ${selfMic ? "ON" : "OFF"}<br>\n`;
			pushValue(myChart1, monitor.getAudioLevel());
			statsOutput += `<h2>Report: Remote Inbound Stream </h2>\n`;
			statsOutput += `<strong>Jitter :</strong> ${monitor.getJitter()}<br>\n`;
			pushValue(myChart2, monitor.getJitter());
			statsOutput += `<strong>Round Trip Time :</strong> ${monitor.getRTTRemoteInbound()}<br>\n`;
			pushValue(myChart3, monitor.getRTTRemoteInbound());
			statsOutput += `<h2>Report: Inbound Stream </h2>\n`;
			statsOutput += `<strong>Packets Lost :</strong> ${monitor.getPacketsLostInbound()}<br>\n`;
			pushValue(myChart4, monitor.getPacketsLostInbound());
			statsOutput += `<strong>Samples Inserted for Deceleration :</strong> ${monitor.getInsertedSamplesForDeceleration()}<br>\n`;
			pushValue(myChart5, monitor.getInsertedSamplesForDeceleration());
			statsOutput += `<strong>Samples Removed for Acceleration :</strong> ${monitor.getRemovedSamplesForAcceleration()}<br>\n`;
			pushValue(myChart6, monitor.getRemovedSamplesForAcceleration());
			statsOutput += `<h2>Report: Outbound Stream </h2>\n`;
			statsOutput += `<strong>Packets Sent :</strong> ${monitor.getPacketsSentOutbound()}<br>\n`;
			pushValue(myChart7, monitor.getPacketsSentOutbound());
			statsOutput += `<strong>Retransmitted Packets Sent :</strong> ${monitor.getRetransmittedPacketsSentOutbound()}<br>\n`;
			pushValue(myChart8, monitor.getRetransmittedPacketsSentOutbound());
			statsOutput += `<h2>Report: Remote Outbound Stream </h2>\n`;
			statsOutput += `<strong>Round Trip Time :</strong> ${monitor.getRTTRemoteOutbound()}<br>\n`;
			pushValue(myChart9, monitor.getRTTRemoteOutbound());

			statsOutput += `<h1>Realtime Connection Parameters</h2>\n`;
			statsOutput += `<h2>Report: ICE Candidate Pair </h2>\n`;
			statsOutput += `<strong>Availabe Outgoing Bitrate for the Connection :</strong> ${monitor.getAvailableOutgoingBitrateICECandidate()}<br>\n`;
			pushValue(myChart10, monitor.getAvailableOutgoingBitrateICECandidate());
			statsOutput += `<strong>Current Round Trip Time for the Connection :</strong> ${monitor.getCurrentRoundTripTimeICECandidate()}<br>\n`;
			pushValue(myChart11, monitor.getCurrentRoundTripTimeICECandidate());
			statsOutput += `<strong>Packets Received by the Connection :</strong> ${monitor.getPacketsReceivedICECandidate()}<br>\n`;
			pushValue(myChart12, monitor.getPacketsReceivedICECandidate());
			statsOutput += `<strong>Packets Sent by the Connection :</strong> ${monitor.getPacketsSentICECandidate()}<br>\n`;
			pushValue(myChart13, monitor.getPacketsSentICECandidate());
			statsOutput += `<strong>Mean Opinion Score Video :</strong> ${monitor.getMeanOpinionScoreVideo()}<br>\n`;
			pushValue(myChart14, monitor.getMeanOpinionScoreVideo());
			statsOutput += `<strong>Mean Opinion Score Audio :</strong> ${monitor.getMeanOpinionScore()}<br>\n`;
			pushValue(myChart15, monitor.getMeanOpinionScore());

			statsOutput += `<h1>Video Parameters</h2>\n`;
			statsOutput += `<h2>Report: Inbound Stream </h2>\n`;
			statsOutput += `<strong>Frame height of Inbound stream :</strong> ${monitor.getFrameHeightInboundVideo()}<br>\n`;
			pushValue(myChart16, monitor.getFrameHeightInboundVideo());
			statsOutput += `<strong>Frame width of Inbound stream :</strong> ${monitor.getFrameWidthInboundVideo()}<br>\n`;
			pushValue(myChart17, monitor.getFrameWidthInboundVideo());
			statsOutput += `<strong>Number of frames recieved in inbound stream :</strong> ${monitor.getFramesReceivedInboundVideo()}<br>\n`;
			pushValue(myChart18, monitor.getFramesReceivedInboundVideo());
			statsOutput += `<strong>Number of packets lost in inbound stream :</strong> ${monitor.getPacketsLostInboundVideo()}<br>\n`;
			pushValue(myChart19, monitor.getPacketsLostInboundVideo());
			statsOutput += `<strong>>Number of packets received in inbound stream :</strong> ${monitor.getPacketsReceivedInboundVideo()}<br>\n`;
			pushValue(myChart20, monitor.getPacketsReceivedInboundVideo());
			statsOutput += `<h2>Report: Outbound Stream </h2>\n`;
			statsOutput += `<strong>Frame height of Outbound stream :</strong> ${monitor.getFrameHeightOutboundVideo()}<br>\n`;
			pushValue(myChart21, monitor.getFrameHeightOutboundVideo());
			statsOutput += `<strong>Frame width of Outbound stream :</strong> ${monitor.getFrameWidthOutboundVideo()}<br>\n`;
			pushValue(myChart22, monitor.getFrameWidthOutboundVideo());
			statsOutput += `<strong>Number of frames sent by outbound stream :</strong> ${monitor.getFramesSentOutboundVideo()}<br>\n`;
			pushValue(myChart23, monitor.getFramesSentOutboundVideo());
			statsOutput += `<strong>Number of packets Sent by the outbound stream :</strong> ${monitor.getPacketsSentOutboundVideo()}<br>\n`;
			pushValue(myChart24, monitor.getPacketsSentOutboundVideo());
			statsOutput += `<strong>Number of retransmitted packets Sent by the outbound stream :</strong> ${monitor.getRetransmittedPacketsSentOutboundVideo()}<br>\n`;
			pushValue(myChart25, monitor.getRetransmittedPacketsSentOutboundVideo());
			statsOutput += `<h2>Report: Remote Inbound Stream </h2>\n`;
			statsOutput += `<strong>Jitter from Remote inbound stream :</strong> ${monitor.getJitterVideo()}<br>\n`;
			pushValue(myChart26, monitor.getJitterVideo());
			statsOutput += `<strong>Number of packets lost by remote inbound stream :</strong> ${monitor.getPacketsLostRemoteInboundVideo()}<br>\n`;
			pushValue(myChart27, monitor.getPacketsLostRemoteInboundVideo());
			statsOutput += `<strong>Round trip time from remote inbound stream :</strong> ${monitor.getRTTRemoteInboundVideo()}<br>\n`;
			pushValue(myChart28, monitor.getRTTRemoteInboundVideo());

			document.querySelector(".stats-box").innerHTML = statsOutput;
		} else {
			document.querySelector(".stats-box").innerHTML = "";
		}
	}, 1000);

	setTimeout(function () {
		myChart1 = createAndPlotChart("myChart1", "Audio Level of Stream");
		myChart2 = createAndPlotChart("myChart2", "Remote Inbound Jitter");
		myChart3 = createAndPlotChart("myChart3", "Remote Inbound Round Trip Time");
		myChart4 = createAndPlotChart("myChart4", "Inbound Packets Lost");
		myChart5 = createAndPlotChart("myChart5", "Inbound Samples Inserted for Deceleration");
		myChart6 = createAndPlotChart("myChart6", "Inbound Samples Removed for Acceleration");
		myChart7 = createAndPlotChart("myChart7", "Outbound Packets Sent");
		myChart8 = createAndPlotChart("myChart8", "Outbound Retransmitted Packets Sent");
		myChart9 = createAndPlotChart("myChart9", "Round Trip Time Remote Outbound");

		myChart10 = createAndPlotChart("myChart10", "Availabe Outgoing Bitrate for the Connection");
		myChart11 = createAndPlotChart("myChart11", "Current Round Trip Time for the Connection");
		myChart12 = createAndPlotChart("myChart12", "Packets Received by the Connection");
		myChart13 = createAndPlotChart("myChart13", "Packets Sent by the Connection");
		myChart14 = createAndPlotChart("myChart14", "Mean Opinion Score Video");
		myChart15 = createAndPlotChart("myChart15", "Mean Opinion Score Audio");
		myChart16 = createAndPlotChart("myChart16", "Frame height of Inbound stream");
		myChart17 = createAndPlotChart("myChart17", "Number of frames recieved in inbound stream");
		myChart18 = createAndPlotChart("myChart18", "Number of frames recieved in inbound stream");
		myChart19 = createAndPlotChart("myChart19", "Number of packets lost in inbound stream");
		myChart20 = createAndPlotChart("myChart20", "Number of packets received in inbound stream");
		myChart21 = createAndPlotChart("myChart21", "Frame height of Outbound stream");
		myChart22 = createAndPlotChart("myChart22", "Frame width of Outbound stream");
		myChart23 = createAndPlotChart("myChart23", "Number of frames sent by outbound stream");
		myChart24 = createAndPlotChart("myChart24", "Number of packets Sent by the outbound stream");
		myChart25 = createAndPlotChart("myChart25", "Number of retransmitted packets Sent by the outbound stream");
		myChart26 = createAndPlotChart("myChart26", "Jitter from Remote inbound stream");
		myChart27 = createAndPlotChart("myChart27", "Number of packets lost by remote inbound stream");
		myChart28 = createAndPlotChart("myChart28", "Round trip time from remote inbound stream");
	}, 500);

	function pushValue(myChart, x) {
		myChart.data.datasets[0].data.push(x);
		// console.log(x);
		let currTime = new Date().toLocaleTimeString();
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
