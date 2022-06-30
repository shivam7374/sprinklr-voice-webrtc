import { localConnection } from "./script_Peer_A.js";
import { MonitorWebRTC } from "../sprinklr-monitor-webrtc/build/index.js";
let CONFIGURABLE_PARAMETERS = {
	SAMPLING_TIME_PERIOD: 1000,
	REPORT_MAX_LENGTH: 6,
	ANALYSIS_REPORT_LENGTH: 6,
	EVENT_EMIT_TIME_PERIOD: 3000,
	STRIKES_THRESHOLD: 3,
};
// creating new MonitorWebRTC instance
let monitor = new MonitorWebRTC(localConnection, CONFIGURABLE_PARAMETERS);
// monitor.eventEmitter.on("LOW_AUDIO", function (text) {
// 	notifyInfo("Info ", "Low Audio");
// });
// monitor.eventEmitter.on("LOW_PACKETS_SENT", function (text) {
// 	notifyInfo("Info ", "Low Packets Sent");
// });
// monitor.eventEmitter.on("HIGH_RETRANSMITTED_PACKETS_SENT", function (text) {
// 	notifyInfo("Info ", "High Retransmitted Packets Sent");
// });
// monitor.eventEmitter.on("HIGH_INBOUND_PACKET_LOSS", function (text) {
// 	notifyInfo("Info ", "High Inbound Packet Loss");
// });
// monitor.eventEmitter.on("HIGH_REMOTE_INBOUND_PACKET_LOSS", function (text) {
// 	notifyInfo("Info ", "High Remote Inbound Packet Loss");
// });
// monitor.eventEmitter.on("HIGH_JITTER", function (text) {
// 	notifyInfo("Info ", "High Jitter");
// });
// monitor.eventEmitter.on("HIGH_ROUND_TRIP_TIME", function (text) {
// 	notifyInfo("Info ", "High Round Trip Time");
// });
// monitor.eventEmitter.on("LOW_MOS_VALUE", function (text) {
// 	notifyInfo("Info ", "Low MOS Value");
// });
// monitor.eventEmitter.on("CONNECTION_PROBLEM", function (text) {
// 	notifyWarning("Warning !!!", "Connection Problem");
// });
// monitor.eventEmitter.on("CONNECTED", function (text) {
// 	notifySuccess("Sucess !!! ", "Connection Established");
// });
// monitor.eventEmitter.on("NO_CONNECTION", function (text) {
// 	notifyError("ALERT !!!", "No Connection");
// });
// monitor.eventEmitter.on("SLOW_CONNECTION", function (text) {
// 	notifyInfo("Slow Connection", "Your internet is slow :(");
// });
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
// fetch data every second
// setInterval(() => {
// console.log("Audio Level of Source = " + monitor.getAudioLevel());
// console.log("Remote Inbound Jitter = " + monitor.getJitter());
// console.log("Remote Inbound RTT = " + monitor.getRTTRemoteInbound());
// console.log("Remote Outbound RTT = " + monitor.getRTTRemoteOutbound());
// console.log("Inbound Packets Lost = " + monitor.getPacketsLostInbound());
// console.log(
//     "Inbound Samples Inserted for Deceleration = " + monitor.getInsertedSamplesForDeceleration()
// );
// console.log(
//     "Inbound Samples Removed for Acceleration  = " + monitor.getRemovedSamplesForAcceleration()
// );
// console.log("Outbound Packets Sent = " + monitor.getPacketsSentOutbound());
// console.log(
//     "Outbound Retransmitted Packets Sent = " + monitor.getRetransmittedPacketsSentOutbound()
// );
// // console.log("Connection Stats Log");
// // console.log(monitor.getStatsLog());
// // console.log("Realtime Connection Stats Log");
// // console.log(monitor.getRealtimeStats());
// console.log(
//     "Availabe Outgoing Bitrate for the Connection = " +
//         monitor.getAvailableOutgoingBitrateICECandidate()
// );
// console.log(
//     "Current Round Trip Time for the Connection =  = " +
//         monitor.getCurrentRoundTripTimeICECandidate()
// );
// console.log(
//     "Packets Recieved by the Connection =  = " + monitor.getPacketsRecievedICECandidate()
// );
// console.log("Packets Sent by the Connection =  = " + monitor.getPacketsSentICECandidate());
// }, 1000);
// console.log("hrtr");
// monitor.checkAudioQuality();
//# sourceMappingURL=test.js.map
