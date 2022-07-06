(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const constants = require("./constants");
const WEBRTC_PARAMETERS = constants.RTC_PARAMETERS;
const SamplingDataQueueClassRequired = require("./SamplingDataQueue");
const SamplingDataQueue = SamplingDataQueueClassRequired.SamplingDataQueue;
const StrikerClassRequired = require("./Striker");
const Striker = StrikerClassRequired.Striker;
const EventEmitter = require("events");
class MonitorWebRTC {
    constructor(peerConnection, configurableParameters) {
        let defaultParameters = constants.DEFAULT_PARAMETERS_MONITOR_WEB_RTC;
        // Object Destructuring is used to merge the configurable Parameters object
        this.configurableParameters = Object.assign(Object.assign({}, defaultParameters), configurableParameters);
        // properties of class MonitorWebRTC
        this.peerConnection = peerConnection;
        this.samplingReport = new SamplingDataQueue(this.configurableParameters.REPORT_MAX_LENGTH);
        this.eventEmitter = new EventEmitter();
        // used in event trigger case handling
        this.FlagNoConnection = 0;
        this.FlagSlowConnection = 0;
        this.connectedAtleastOnce = false;
        // calling initialiser method
        this.initialiser(this.peerConnection);
    }
    initialiser(peerConnection) {
        // Striker for doing analysis using audio parameters
        this.strikerAudio = new Striker(this.configurableParameters);
        this.strikerConnectionQuality = new Striker(this.configurableParameters);
        this.strikerPacketsLostPercentageInbound = new Striker(this.configurableParameters);
        this.strikerPacketsLostPercentageRemoteInbound = new Striker(this.configurableParameters);
        this.strikerPacketsSentPerSecond = new Striker(this.configurableParameters);
        this.strikerRetransmittedPacketsSentPerSecond = new Striker(this.configurableParameters);
        this.strikerMOS = new Striker(this.configurableParameters);
        this.strikerJitter = new Striker(this.configurableParameters);
        this.strikerRTT = new Striker(this.configurableParameters);
        // Striker for doing analysis using video parameters
        this.strikerConnectionQualityVideo = new Striker(this.configurableParameters);
        this.strikerPacketsLostPercentageInboundVideo = new Striker(this.configurableParameters);
        this.strikerPacketsLostPercentageRemoteInboundVideo = new Striker(this.configurableParameters);
        this.strikerPacketsSentPerSecondVideo = new Striker(this.configurableParameters);
        this.strikerPacketsReceivedPerSecondVideo = new Striker(this.configurableParameters);
        this.strikerRetransmittedPacketsSentPerSecondVideo = new Striker(this.configurableParameters);
        this.strikerMOSVideo = new Striker(this.configurableParameters);
        this.strikerJitterVideo = new Striker(this.configurableParameters);
        this.strikerRTTVideo = new Striker(this.configurableParameters);
        // event listeners for connection state changes
        this.connectionStateChangeHandler();
        setInterval(() => {
            if (this.IsConnectedAtLeastOnce() === true) {
                peerConnection.getStats(null).then((stats) => {
                    this.samplingReport.push(stats);
                    // Logger Function
                    let current = new Date();
                    this.configurableParameters.LOGGER_FUNCTION(current.toLocaleString(), stats);
                });
                this.checkAudioQuality();
                this.checkConnectionQuality();
                this.checkPacketsSentPerSecond();
                this.checkRetransmittedPacketsSentPerSecond();
                this.checkPacketsLostPercentageInbound();
                this.checkPacketsLostPercentageInbound();
                this.checkPacketsLostPercentageRemoteInbound();
                this.checkMOSValue();
                this.checkConnectionQualityVideo();
                this.checkPacketsSentPerSecondVideo();
                this.checkRetransmittedPacketsSentPerSecondVideo();
                this.checkPacketsLostPercentageInboundVideo();
                this.checkPacketsLostPercentageInboundVideo();
                this.checkPacketsLostPercentageRemoteInboundVideo();
                this.checkMOSValueVideo();
                this.checkPacketsReceivedPerSecondVideo();
                // to reset the repeated events trigger cycle
                this.FlagNoConnection = 0;
                this.FlagSlowConnection = 0;
            }
        }, this.configurableParameters.SAMPLING_TIME_PERIOD);
    }
    // event listeners for connection state changes
    connectionStateChangeHandler() {
        this.peerConnection.addEventListener(constants.CONNECTION_STATE_CHANGE, (event) => {
            if (this.connectedAtleastOnce === true && event.currentTarget.connectionState === constants.DISCONNECTED) {
                this.triggerHandler(constants.EVENT.CONNECTION_PROBLEM);
            }
            else if (this.connectedAtleastOnce === true && event.currentTarget.connectionState === constants.FAILED) {
                this.triggerHandler(constants.EVENT.NO_CONNECTION);
            }
            else if (event.currentTarget.connectionState === constants.CONNECTED) {
                this.triggerHandler(constants.EVENT.CONNECTED);
            }
        });
    }
    // helper function to check if the connection is made at least once
    IsConnectedAtLeastOnce() {
        if (this.connectedAtleastOnce === false) {
            if (this.peerConnection.remoteDescription !== null) {
                this.connectedAtleastOnce = true;
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return true;
        }
    }
    // to check whether the connection exists with the remote peer
    checkIsConnection() {
        let isConnection = 0;
        if (this.peerConnection.connectionState === constants.CONNECTED) {
            isConnection = 1;
        }
        return isConnection;
    }
    eventHandlerForRepetition(flagEvent, event) {
        if (flagEvent === 0) {
            flagEvent = 1;
            this.eventEmitter.emit(event, event);
        }
    }
    defaultEventHandler(event) {
        this.FlagNoConnection = 0;
        this.FlagSlowConnection = 0;
        this.eventEmitter.emit(event, event);
    }
    // function for event trigger handling
    triggerHandler(event) {
        // priorityflag will ensure that repeated  NO_CONNECTION events are only triggered once
        switch (event) {
            case constants.EVENT.NO_CONNECTION:
                this.eventHandlerForRepetition(this.FlagNoConnection, constants.EVENT.NO_CONNECTION);
                break;
            case constants.EVENT.SLOW_CONNECTION:
                this.eventHandlerForRepetition(this.FlagSlowConnection, constants.EVENT.SLOW_CONNECTION);
                break;
            default:
                this.defaultEventHandler(event);
        }
    }
    // to categorize data by quality
    categorizeData(dataValue, DATA_TYPES, DATA_THRESHOLD, reverse = 0) {
        if (reverse) {
            if (dataValue < DATA_THRESHOLD.LOW_THRESHOLD) {
                return DATA_TYPES.GOOD;
            }
            else if (dataValue < DATA_THRESHOLD.HIGH_THRESHOLD) {
                return DATA_TYPES.AVERAGE;
            }
            return DATA_TYPES.POOR;
        }
        else {
            if (dataValue < DATA_THRESHOLD.LOW_THRESHOLD) {
                return DATA_TYPES.POOR;
            }
            else if (dataValue < DATA_THRESHOLD.HIGH_THRESHOLD) {
                return DATA_TYPES.AVERAGE;
            }
            return DATA_TYPES.GOOD;
        }
    }
    // to classify data according to the threshold value
    // reverse parameter will reverse the classified data label
    classifyData(dataValue, DATA_TYPES, DATA_THRESHOLD, reverse = 0) {
        if (reverse) {
            if (dataValue < DATA_THRESHOLD.THRESHOLD) {
                return DATA_TYPES.GOOD;
            }
            return DATA_TYPES.POOR;
        }
        else {
            if (dataValue < DATA_THRESHOLD.THRESHOLD) {
                return DATA_TYPES.POOR;
            }
            return DATA_TYPES.GOOD;
        }
    }
    getValueByReportIndex(index, reportItemType, reportItemKind, requiredParameter) {
        let samplingReport = this.samplingReport.getReportAtIndex(index);
        if (samplingReport === undefined) {
            return constants.BEING_PROCESSED;
        }
        let dataValue;
        samplingReport.forEach((reportItem) => {
            if (reportItem.type === reportItemType && reportItem.kind === reportItemKind) {
                dataValue = reportItem[requiredParameter];
            }
        });
        return dataValue;
    }
    // helper function to find specified parameters in per second [/s] form
    // and classify them according to threshold given
    checkDataValuesPerSecond(reportItemType, reportItemKind, requiredParameter, DATA_TYPES, DATA_THRESHOLD, reverse = 0) {
        let index = this.samplingReport.getCurrentIndex();
        let reportMaxLength = this.configurableParameters.REPORT_MAX_LENGTH;
        let currentDataValue = this.getValueByReportIndex(index, reportItemType, reportItemKind, requiredParameter);
        let previousDataValue = this.getValueByReportIndex((index - 1 + reportMaxLength) % reportMaxLength, reportItemType, reportItemKind, requiredParameter);
        if (currentDataValue === constants.BEING_PROCESSED || previousDataValue === constants.BEING_PROCESSED) {
            return constants.BEING_PROCESSED;
        }
        let samplingFreqInSeconds = this.configurableParameters.SAMPLING_TIME_PERIOD / 1000;
        let perSecondValue = (currentDataValue - previousDataValue) / samplingFreqInSeconds;
        let category = this.classifyData(perSecondValue, constants.DATA_TYPES, DATA_THRESHOLD, reverse);
        return category;
    }
    // function to check packets sent per second
    checkPacketsSentPerSecond() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let category = this.checkDataValuesPerSecond(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.PACKETS_SENT, constants.DATA_TYPES, constants.PACKETS_SENT_OUTBOUND_THRESHOLD, 0);
        let flag = this.strikerPacketsSentPerSecond.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.LOW_PACKETS_SENT);
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return category;
    }
    // function to check retransmitted packets per second
    checkRetransmittedPacketsSentPerSecond() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let category = this.checkDataValuesPerSecond(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.RETRANSMITTED_PACKETS_SENT, constants.DATA_TYPES, constants.RETRANSMITTED_PACKETS_SENT_OUTBOUND_THRESHOLD, 1);
        let flag = this.strikerRetransmittedPacketsSentPerSecond.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_RETRANSMITTED_PACKETS_SENT);
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return category;
    }
    // function to check whether input mic is working or not
    checkMicOn() {
        let audioLevel = this.getAudioLevel();
        if (audioLevel === 0) {
            return false;
        }
        return true;
    }
    // function to check audio quality
    checkAudioQuality() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        // returns the category - GOOD, POOR, AVERAGE
        let audioLevel = this.getAudioLevel();
        let category = this.categorizeData(audioLevel, constants.DATA_TYPES, constants.AUDIO_THRESHOLD);
        let flag = this.strikerAudio.updateEventStrikes(category);
        if (flag === 1 && audioLevel !== 0) {
            this.triggerHandler(constants.EVENT.LOW_AUDIO);
        }
        return category;
    }
    // function to check inbound packet loss
    checkPacketsLostPercentageInbound() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let packetsLost = this.getPacketsLostInbound();
        let packetsReceived = this.getPacketsReceivedInbound();
        let packetsLostPercentage = (packetsLost / packetsReceived) * 100;
        if (isNaN(packetsLostPercentage)) {
            packetsLostPercentage = 0;
        }
        // classifies on the basis of the packets lost percentage
        let category = this.categorizeData(packetsLostPercentage, constants.DATA_TYPES, constants.PACKETS_LOST_PERCENTAGE_THRESHOLD, 1);
        let flag = this.strikerPacketsLostPercentageInbound.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_INBOUND_PACKET_LOSS);
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return category;
    }
    // function to check remote inbound packet loss
    checkPacketsLostPercentageRemoteInbound() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let packetsLost = this.getPacketsLostRemoteInbound();
        let packetsSent = this.getPacketsSentOutbound();
        let packetsLostPercentage = packetsLost / packetsSent;
        if (isNaN(packetsLostPercentage)) {
            packetsLostPercentage = 0;
        }
        let category = this.categorizeData(packetsLostPercentage, constants.DATA_TYPES, constants.PACKETS_LOST_PERCENTAGE_THRESHOLD, 1);
        let flag = this.strikerPacketsLostPercentageRemoteInbound.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_REMOTE_INBOUND_PACKET_LOSS);
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return category;
    }
    categorizeUsingJitterRTT(jitterCategory, RTTCategory) {
        let category;
        if (RTTCategory === constants.DATA_TYPES.POOR) {
            if (jitterCategory === constants.DATA_TYPES.POOR || jitterCategory === constants.DATA_TYPES.AVERAGE) {
                category = constants.DATA_TYPES.POOR;
            }
            else {
                category = constants.DATA_TYPES.AVERAGE;
            }
        }
        else {
            if (jitterCategory === constants.DATA_TYPES.POOR) {
                category = constants.DATA_TYPES.POOR;
            }
            else if (jitterCategory === constants.DATA_TYPES.AVERAGE) {
                category = constants.DATA_TYPES.AVERAGE;
            }
            else {
                category = constants.DATA_TYPES.GOOD;
            }
        }
        return category;
    }
    // function to check internet speed using Jitter and Round trip time
    checkConnectionQuality() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let jitter = this.getJitter();
        let jitterCategory = this.categorizeData(jitter, constants.DATA_TYPES, constants.JITTER_THRESHOLD, 1);
        let jitterFlag = this.strikerJitter.updateEventStrikes(jitterCategory);
        if (jitterFlag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_JITTER);
        }
        let RTT = this.getRTTRemoteInbound();
        let RTTCategory = this.classifyData(RTT, constants.DATA_TYPES, constants.RTT_THRESHOLD, 1);
        let RTTFlag = this.strikerRTT.updateEventStrikes(RTTCategory);
        if (RTTFlag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_ROUND_TRIP_TIME);
        }
        let category = this.categorizeUsingJitterRTT(jitterCategory, RTTCategory);
        let flag = this.strikerConnectionQuality.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return category;
    }
    // helper function to get real time values using the item type, item kind and the required parameter
    getRealTimeValue(reportItemType, reportItemKind, requiredParameter) {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let output;
        let currentReportIndex = this.samplingReport.getCurrentIndex();
        let currentSamplingReport = this.samplingReport.getReportAtIndex(currentReportIndex);
        if (currentSamplingReport === undefined) {
            return 0;
        }
        currentSamplingReport.forEach((reportItem) => {
            if (reportItem.type === reportItemType && reportItem.kind === reportItemKind) {
                output = reportItem[requiredParameter];
            }
        });
        if (isNaN(output)) {
            output = 0;
        }
        return output;
    }
    // helper function for ICE Candidate Pair to get real time values using the item type, item kind and the required parameter
    getICECandidateRealTimeValue(reportItemType, requiredParameter) {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let output;
        let currentReportIndex = this.samplingReport.getCurrentIndex();
        let currentSamplingReport = this.samplingReport.getReportAtIndex(currentReportIndex);
        if (currentSamplingReport === undefined) {
            return 0;
        }
        currentSamplingReport.forEach((reportItem) => {
            if (reportItem.type === reportItemType && reportItem.availableOutgoingBitrate > 0) {
                output = reportItem[requiredParameter];
            }
        });
        if (isNaN(output)) {
            output = 0;
        }
        return output;
    }
    // method to get connection log
    getStatsLog() {
        return this.samplingReport.getSamplingReports();
    }
    // method to get real time connection log
    getRealtimeStats() {
        let currentReportIndex = this.samplingReport.getCurrentIndex();
        let currentSamplingReport = this.samplingReport.getReportAtIndex(currentReportIndex);
        return currentSamplingReport;
    }
    // Audio Analysis
    // method to get audio level of the input
    getAudioLevel() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.MEDIA_SOURCE, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.AUDIO_LEVEL);
    }
    getAudioLevelRemotePeer() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.AUDIO_LEVEL);
    }
    // method to get Round Trip Time from Remote Outbound audio stream
    getRTTRemoteOutbound() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.REMOTE_OUTBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.TOTAL_ROUND_TRIP_TIME);
    }
    // method to get Round Trip Time from Remote Inbound audio stream
    getRTTRemoteInbound() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.REMOTE_INBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.ROUND_TRIP_TIME);
    }
    // method to get Jitter from Remote Inbound audio stream
    getJitter() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.REMOTE_INBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.JITTER);
    }
    // method to get number of Packets Lost from Inbound Audio stream
    getPacketsLostInbound() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.PACKETS_LOST);
    }
    // method to get number of Packets Received from Inbound Audio stream
    getPacketsReceivedInbound() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.PACKETS_RECEIVED);
    }
    // method to get number of Samples Inserted for Deceleration from Inbound Audio stream
    getInsertedSamplesForDeceleration() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.INSERTED_SAMPLES_FOR_DECELERATION);
    }
    // method to get number of Samples Removed for Acceleration from Inbound Audio stream
    getRemovedSamplesForAcceleration() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.REMOVED_SAMPLES_FOR_ACCELERATION);
    }
    // method to get number of Packets Lost from Remote Inbound Audio stream
    getPacketsLostRemoteInbound() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.REMOTE_INBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.PACKETS_LOST);
    }
    // method to get number of Packets Sent from Outbound Audio stream
    getPacketsSentOutbound() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.PACKETS_SENT);
    }
    // method to get number of Retransmitted Packets Sent from Outbound Audio stream
    getRetransmittedPacketsSentOutbound() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.AUDIO, WEBRTC_PARAMETERS.RETRANSMITTED_PACKETS_SENT);
    }
    // method to get number of Packets Sent for the Connection
    getPacketsSentICECandidate() {
        return this.getICECandidateRealTimeValue(WEBRTC_PARAMETERS.CANDIDATE_PAIR, WEBRTC_PARAMETERS.PACKETS_SENT);
    }
    // method to get number of Packets Received for the Connection
    getPacketsReceivedICECandidate() {
        return this.getICECandidateRealTimeValue(WEBRTC_PARAMETERS.CANDIDATE_PAIR, WEBRTC_PARAMETERS.PACKETS_RECEIVED);
    }
    // method to get Current Round Trip Time for the Connection
    getCurrentRoundTripTimeICECandidate() {
        return this.getICECandidateRealTimeValue(WEBRTC_PARAMETERS.CANDIDATE_PAIR, WEBRTC_PARAMETERS.CURRENT_ROUND_TRIP_TIME);
    }
    // method to get Available Outgoing Bitrate for the Connection
    getAvailableOutgoingBitrateICECandidate() {
        return this.getICECandidateRealTimeValue(WEBRTC_PARAMETERS.CANDIDATE_PAIR, WEBRTC_PARAMETERS.AVAILABLE_OUTGOING_BITRATE);
    }
    // function for checking and classifying MOS value
    checkMOSValue() {
        let MOS_Value = this.getMeanOpinionScore();
        let category = this.categorizeData(MOS_Value, constants.DATA_TYPES, constants.MOS_THRESHOLD);
        let flag = this.strikerMOS.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.LOW_MOS_VALUE);
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return MOS_Value;
    }
    // function to find Mean Opinion Score at Particular instance
    getMeanOpinionScore() {
        let averageLatency = this.getCurrentRoundTripTimeICECandidate();
        let jitter = this.getJitter();
        let effectiveLatency = averageLatency + jitter * 2 + 10;
        let packetsLostInbound = this.getPacketsLostInbound();
        let packetsReceivedInbound = this.getPacketsReceivedInbound();
        let packetsLostPercentage = (packetsLostInbound / packetsReceivedInbound) * 100;
        let R;
        if (effectiveLatency < 160) {
            R = 93.2 - effectiveLatency / 40;
        }
        else {
            R = 93.2 - (effectiveLatency - 120) / 10;
        }
        R = R - packetsLostPercentage * 2;
        let MOS = 1 + 0.035 * R + 0.000007 * R * (R - 60) * (100 - R);
        return MOS;
    }
    // Video Analysis
    // function to check outbound video stream
    // function to check packets sent per second
    checkPacketsSentPerSecondVideo() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let category = this.checkDataValuesPerSecond(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.PACKETS_SENT, constants.DATA_TYPES, constants.PACKETS_SENT_OUTBOUND_THRESHOLD_VIDEO, 0);
        let flag = this.strikerPacketsSentPerSecondVideo.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.LOW_PACKETS_SENT_VIDEO);
            this.triggerHandler(constants.EVENT.REMOTE_PEER_VIDEO_STREAM_OFF);
        }
        return category;
    }
    // function to check inbound video stream
    // function to check packets received per second
    checkPacketsReceivedPerSecondVideo() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let category = this.checkDataValuesPerSecond(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.PACKETS_RECEIVED, constants.DATA_TYPES, constants.PACKETS_RECEIVED_INBOUND_THRESHOLD_VIDEO, 0);
        let flag = this.strikerPacketsReceivedPerSecondVideo.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.LOW_PACKETS_RECEIVED_VIDEO);
            this.triggerHandler(constants.EVENT.LOCAL_PEER_VIDEO_STREAM_OFF);
        }
        if (this.strikerPacketsReceivedPerSecondVideo.getStrikes() === 0) {
            this.triggerHandler(constants.EVENT.LOCAL_PEER_VIDEO_STREAM_ON);
        }
        return category;
    }
    // function to check retransmitted packets per second
    checkRetransmittedPacketsSentPerSecondVideo() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let category = this.checkDataValuesPerSecond(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.RETRANSMITTED_PACKETS_SENT, constants.DATA_TYPES, constants.RETRANSMITTED_PACKETS_SENT_OUTBOUND_THRESHOLD_VIDEO, 1);
        let flag = this.strikerRetransmittedPacketsSentPerSecondVideo.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_RETRANSMITTED_PACKETS_SENT);
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return category;
    }
    // function to check inbound packet loss
    checkPacketsLostPercentageInboundVideo() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let packetsLost = this.getPacketsLostInboundVideo();
        let packetsReceived = this.getPacketsReceivedInboundVideo();
        let packetsLostPercentage = (packetsLost / packetsReceived) * 100;
        if (isNaN(packetsLostPercentage)) {
            packetsLostPercentage = 0;
        }
        // classifies on the basis of the packets lost percentage
        let category = this.classifyData(packetsLostPercentage, constants.DATA_TYPES, constants.PACKETS_LOST_PERCENTAGE_THRESHOLD_VIDEO, 1);
        let flag = this.strikerPacketsLostPercentageInboundVideo.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_INBOUND_PACKET_LOSS);
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return category;
    }
    // function to check remote inbound packet loss
    checkPacketsLostPercentageRemoteInboundVideo() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let packetsLost = this.getPacketsLostRemoteInboundVideo();
        let packetsSent = this.getPacketsSentOutboundVideo();
        let packetsLostPercentage = packetsLost / packetsSent;
        if (isNaN(packetsLostPercentage)) {
            packetsLostPercentage = 0;
        }
        let category = this.classifyData(packetsLostPercentage, constants.DATA_TYPES, constants.PACKETS_LOST_PERCENTAGE_THRESHOLD_VIDEO, 1);
        let flag = this.strikerPacketsLostPercentageRemoteInboundVideo.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_REMOTE_INBOUND_PACKET_LOSS);
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return category;
    }
    // function to check internet speed using Jitter and Round trip time
    checkConnectionQualityVideo() {
        // to check if connection exsits or not
        // if no connection, then no need to calculate further
        let isConnected = this.checkIsConnection();
        if (isConnected === 0) {
            return;
        }
        let jitter = this.getJitterVideo();
        let jitterCategory = this.categorizeData(jitter, constants.DATA_TYPES, constants.JITTER_THRESHOLD, 1);
        let jitterFlag = this.strikerJitterVideo.updateEventStrikes(jitterCategory);
        if (jitterFlag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_JITTER);
        }
        let RTT = this.getRTTRemoteInboundVideo();
        let RTTCategory = this.classifyData(RTT, constants.DATA_TYPES, constants.RTT_THRESHOLD_VIDEO, 1);
        let RTTFlag = this.strikerRTTVideo.updateEventStrikes(RTTCategory);
        if (RTTFlag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_ROUND_TRIP_TIME);
        }
        let category = this.categorizeUsingJitterRTT(jitterCategory, RTTCategory);
        let flag = this.strikerConnectionQualityVideo.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return category;
    }
    // returns the total number of packets sent
    getPacketsSentOutboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.PACKETS_SENT);
    }
    // returns the total number of retransmitted packets sent
    getRetransmittedPacketsSentOutboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.RETRANSMITTED_PACKETS_SENT);
    }
    // method to get Jitter from Remote Inbound video stream
    getJitterVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.REMOTE_INBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.JITTER);
    }
    // method to get Round Trip Time from Remote Inbound video stream
    getRTTRemoteInboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.REMOTE_INBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.ROUND_TRIP_TIME);
    }
    // method to get number of Packets Lost from Remote Inbound Video stream
    getPacketsLostRemoteInboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.REMOTE_INBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.PACKETS_LOST);
    }
    getPacketsLostInboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.PACKETS_LOST);
    }
    // method to get number of Packets Received from Inbound Audio stream
    getPacketsReceivedInboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.PACKETS_RECEIVED);
    }
    // returns total frames sent during the WebRTC call
    getFramesSentOutboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.FRAMES_SENT);
    }
    // returns total frames received during the WebRTC call
    getFramesReceivedInboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.FRAMES_RECEIVED);
    }
    // returns the frame width of the video received during WebRTC call
    getFrameWidthInboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.FRAME_WIDTH);
    }
    // returns the frame height of the video received during WebRTC call
    getFrameHeightInboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.INBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.FRAME_HEIGHT);
    }
    // returns the frame width of the video sent during WebRTC call
    getFrameWidthOutboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.FRAME_WIDTH);
    }
    // returns the frame height of the video sent during WebRTC call
    getFrameHeightOutboundVideo() {
        return this.getRealTimeValue(WEBRTC_PARAMETERS.OUTBOUND_RTP, WEBRTC_PARAMETERS.VIDEO, WEBRTC_PARAMETERS.FRAME_HEIGHT);
    }
    // function for checking and classifying MOS value
    checkMOSValueVideo() {
        let MOS_Value = this.getMeanOpinionScoreVideo();
        let category = this.categorizeData(MOS_Value, constants.DATA_TYPES, constants.MOS_THRESHOLD);
        let flag = this.strikerMOSVideo.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.LOW_MOS_VALUE);
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return MOS_Value;
    }
    // function to find Mean Opinion Score of video at Particular instance
    getMeanOpinionScoreVideo() {
        let averageLatency = this.getCurrentRoundTripTimeICECandidate();
        let jitter = this.getJitterVideo();
        let effectiveLatency = averageLatency + jitter * 2 + 10;
        let packetsLostInbound = this.getPacketsLostInboundVideo();
        let packetsReceivedInbound = this.getPacketsReceivedInboundVideo();
        let packetsLostPercentage = (packetsLostInbound / packetsReceivedInbound) * 100;
        let R;
        if (effectiveLatency < 160) {
            R = 93.2 - effectiveLatency / 40;
        }
        else {
            R = 93.2 - (effectiveLatency - 120) / 10;
        }
        R = R - packetsLostPercentage * 2;
        let MOS = 1 + 0.035 * R + 0.000007 * R * (R - 60) * (100 - R);
        return MOS;
    }
}
module.exports = { MonitorWebRTC };

},{"./SamplingDataQueue":2,"./Striker":3,"./constants":4,"events":7}],2:[function(require,module,exports){
class SamplingDataQueueClass {
    constructor(size) {
        this.size = size;
        this.array = [];
        this.currentIndex = -1;
    }
    getCurrentIndex() {
        return this.currentIndex;
    }
    getSamplingReports() {
        return this.array;
    }
    getReportAtIndex(index) {
        return this.array[index];
    }
    push(val) {
        this.currentIndex = (this.currentIndex + 1) % this.size;
        this.array[this.currentIndex] = val;
    }
}
module.exports = { SamplingDataQueue: SamplingDataQueueClass };

},{}],3:[function(require,module,exports){
const constantsFile = require("./constants");
class StrikerClass {
    constructor(configurableParameters = constantsFile.DEFAULT_PARAMETERS_MONITOR_WEB_RTC) {
        this.configurableParameters = configurableParameters;
        this.strikes = 0;
        this.eventStikerCoefficient = 1.1;
        this.lastTimeCalled = -1;
    }
    getStrikes() {
        return this.strikes;
    }
    updateEventStrikes(category) {
        if (category === constantsFile.DATA_TYPES.POOR) {
            this.strikes++;
            if (this.strikes >= this.configurableParameters.STRIKES_THRESHOLD) {
                let today = new Date();
                let currentTime = today.getTime();
                let difference = this.eventStikerCoefficient * (currentTime - this.lastTimeCalled);
                if (this.lastTimeCalled === -1 || difference >= this.configurableParameters.EVENT_EMIT_TIME_PERIOD) {
                    this.lastTimeCalled = currentTime;
                    return 1;
                }
            }
        }
        else {
            this.strikes = 0;
        }
        return 0;
    }
}
module.exports = { Striker: StrikerClass };

},{"./constants":4}],4:[function(require,module,exports){
const DATA_TYPES = { GOOD: "GOOD", AVERAGE: "AVERAGE", POOR: "POOR" };
const AUDIO_THRESHOLD = { LOW_THRESHOLD: 0.03, HIGH_THRESHOLD: 0.1 };
const JITTER_THRESHOLD = { LOW_THRESHOLD: 0.1, HIGH_THRESHOLD: 0.3 };
const RTT_THRESHOLD = { THRESHOLD: 0.5 };
const RTT_THRESHOLD_VIDEO = { THRESHOLD: 84.2 };
const PACKETS_LOST_PERCENTAGE_THRESHOLD = { LOW_THRESHOLD: 10, HIGH_THRESHOLD: 15 };
const MOS_THRESHOLD = { LOW_THRESHOLD: 2, HIGH_THRESHOLD: 3 };
const PACKETS_SENT_OUTBOUND_THRESHOLD = { THRESHOLD: 10 };
const PACKETS_SENT_OUTBOUND_THRESHOLD_VIDEO = { THRESHOLD: 35 };
const PACKETS_RECEIVED_INBOUND_THRESHOLD_VIDEO = { THRESHOLD: 35 };
const PACKETS_LOST_PERCENTAGE_THRESHOLD_VIDEO = { THRESHOLD: 2.44 };
const RETRANSMITTED_PACKETS_SENT_OUTBOUND_THRESHOLD = { THRESHOLD: 2 };
const RETRANSMITTED_PACKETS_SENT_OUTBOUND_THRESHOLD_VIDEO = { THRESHOLD: 10 };
const PACKETS_SENT_OUTBOUND_THRESHOLD_ICE = { THRESHOLD: 10 };
const PACKETS_RECEIVED_OUTBOUND_THRESHOLD_ICE = { THRESHOLD: 10 };
const EVENT = {
    SLOW_CONNECTION: "SLOW_CONNECTION",
    LOCAL_PEER_VIDEO_STREAM_OFF: "LOCAL_PEER_VIDEO_STREAM_OFF",
    LOCAL_PEER_VIDEO_STREAM_ON: "LOCAL_PEER_VIDEO_STREAM_ON",
    REMOTE_PEER_VIDEO_STREAM_OFF: "REMOTE_PEER_VIDEO_STREAM_OFF",
    LOW_AUDIO: "LOW_AUDIO",
    NO_CONNECTION: "NO_CONNECTION",
    LOW_PACKETS_SENT: "LOW_PACKETS_SENT",
    LOW_PACKETS_SENT_VIDEO: "LOW_PACKETS_SENT_VIDEO",
    LOW_PACKETS_RECEIVED_VIDEO: "LOW_PACKETS_RECEIVED_VIDEO",
    HIGH_RETRANSMITTED_PACKETS_SENT: "HIGH_RETRANSMITTED_PACKETS_SENT",
    HIGH_INBOUND_PACKET_LOSS: "HIGH_INBOUND_PACKET_LOSS",
    HIGH_REMOTE_INBOUND_PACKET_LOSS: "HIGH_REMOTE_INBOUND_PACKET_LOSS",
    HIGH_JITTER: "HIGH_JITTER",
    HIGH_ROUND_TRIP_TIME: "HIGH_ROUND_TRIP_TIME",
    LOW_MOS_VALUE: "LOW_MOS_VALUE",
    CONNECTION_PROBLEM: "CONNECTION_PROBLEM",
    CONNECTED: "CONNECTED",
};
const DEFAULT_PARAMETERS_MONITOR_WEB_RTC = {
    SAMPLING_TIME_PERIOD: 1000,
    REPORT_MAX_LENGTH: 500,
    EVENT_EMIT_TIME_PERIOD: 3000,
    STRIKES_THRESHOLD: 3,
    LOGGER_FUNCTION: console.log,
};
const RTC_PARAMETERS = {
    AUDIO: "audio",
    VIDEO: "video",
    AUDIO_LEVEL: "audioLevel",
    JITTER: "jitter",
    REMOTE_INBOUND_RTP: "remote-inbound-rtp",
    REMOTE_OUTBOUND_RTP: "remote-outbound-rtp",
    INBOUND_RTP: "inbound-rtp",
    OUTBOUND_RTP: "outbound-rtp",
    PACKETS_LOST: "packetsLost",
    PACKETS_RECEIVED: "packetsReceived",
    RETRANSMITTED_PACKETS_SENT: "retransmittedPacketsSent",
    PACKETS_SENT: "packetsSent",
    INSERTED_SAMPLES_FOR_DECELERATION: "insertedSamplesForDeceleration",
    REMOVED_SAMPLES_FOR_ACCELERATION: "removedSamplesForAcceleration",
    CANDIDATE_PAIR: "candidate-pair",
    ROUND_TRIP_TIME: "roundTripTime",
    CURRENT_ROUND_TRIP_TIME: "currentRoundTripTime",
    AVAILABLE_OUTGOING_BITRATE: "availableOutgoingBitrate",
    MEDIA_SOURCE: "media-source",
    TOTAL_ROUND_TRIP_TIME: "totalRoundTripTime",
    FRAMES_RECEIVED: "framesReceived",
    FRAME_WIDTH: "frameWidth",
    FRAME_HEIGHT: "frameHeight",
    FRAMES_SENT: "framesSent",
};
const BEING_PROCESSED = "being processed";
const NOT_ENOUGH_DATA = "Not enough data";
const CONNECTION_STATE_CHANGE = "connectionstatechange";
const CONNECTED = "connected";
const DISCONNECTED = "disconnected";
const FAILED = "failed";
module.exports = {
    DATA_TYPES,
    AUDIO_THRESHOLD,
    JITTER_THRESHOLD,
    RTT_THRESHOLD,
    RTT_THRESHOLD_VIDEO,
    PACKETS_LOST_PERCENTAGE_THRESHOLD,
    BEING_PROCESSED,
    NOT_ENOUGH_DATA,
    EVENT,
    PACKETS_SENT_OUTBOUND_THRESHOLD,
    PACKETS_SENT_OUTBOUND_THRESHOLD_VIDEO,
    RETRANSMITTED_PACKETS_SENT_OUTBOUND_THRESHOLD,
    RETRANSMITTED_PACKETS_SENT_OUTBOUND_THRESHOLD_VIDEO,
    PACKETS_RECEIVED_INBOUND_THRESHOLD_VIDEO,
    PACKETS_SENT_OUTBOUND_THRESHOLD_ICE,
    PACKETS_RECEIVED_OUTBOUND_THRESHOLD_ICE,
    DEFAULT_PARAMETERS_MONITOR_WEB_RTC,
    PACKETS_LOST_PERCENTAGE_THRESHOLD_VIDEO,
    MOS_THRESHOLD,
    CONNECTION_STATE_CHANGE,
    CONNECTED,
    DISCONNECTED,
    FAILED,
    RTC_PARAMETERS,
};

},{}],5:[function(require,module,exports){
const MonitorWebRTCClass = require("./MonitorWebRTC");
module.exports = { MonitorWebRTC: MonitorWebRTCClass.MonitorWebRTC };

},{"./MonitorWebRTC":1}],6:[function(require,module,exports){
const offerBox = document.querySelector("#local_address");
const answerBox = document.querySelector("#remote_address");
const inBox = document.querySelector("#incoming");
const outBox = document.querySelector("#outgoing");
const generateOffer = document.querySelector(".generate_offer");
const confirmButton = document.querySelector(".accept_answer");

let configuration = {
	iceServers: [
		{
			urls: "stun:stun.l.google.com:19302",
		},
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
const sendChannel = localConnection.createDataChannel("sendChannel");

sendChannel.onmessage = (e) => {
	let chatBox = document.querySelector(".chat");
	chatBox.innerHTML += `Message Received From Device B : ${e.data}` + "<br />";
};

sendChannel.onopen = (e) => {
	let chatBox = document.querySelector(".chat");
	// chatBox.innerHTML += "Communication Established Now you can Chat !!! <br />";
	document.querySelector(".send_response").disabled = false;
};

sendChannel.onclose = (e) => {
	let chatBox = document.querySelector(".chat");
	chatBox.innerHTML += "closed!!!!!!";
};

generateOffer.onclick = () => {
	// creating an offer for the new datachannel

	localConnection.createOffer().then((offer) => {
		localConnection.setLocalDescription(offer);
	});
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
	EVENT_EMIT_TIME_PERIOD: 3000,
	STRIKES_THRESHOLD: 3,
	LOGGER_FUNCTION: console.log,
};
// creating new MonitorWebRTC instance
let monitor = new Monitor.MonitorWebRTC(localConnection, CONFIGURABLE_PARAMETERS);
monitor.eventEmitter.on("LOW_AUDIO", function () {
	notifyInfo("Info ", "Are you speaking? Your audio is quite low.");
});

monitor.eventEmitter.on("INPUT_VIDEO_STREAM_OFF", function () {
	if (remoteCameraStatus === true) {
		notifyOnOffState("Info ", "Remote Peer has turned off camera.");
	}
	remoteCameraStatus = false;
});
monitor.eventEmitter.on("INPUT_VIDEO_STREAM_ON", function () {
	if (remoteCameraStatus === false) {
		notifySuccess("Info ", "Remote Peer has turned on camera.");
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

},{"monitor-webrtc-connection":5}],7:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}]},{},[6]);
