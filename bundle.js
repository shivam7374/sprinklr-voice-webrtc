(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
let constants = require("./constants");
let SamplingDataQueueClass = require("./SamplingDataQueue");
let StrikerClass = require("./Striker");
let EventEmitter = require("../node_modules/events");
class MonitorWebRTC {
    constructor(peerConnection, configurableParameters = constants.DEFAULT_PARAMETERS_MONITOR_WEB_RTC) {
        // properties of class MonitorWebRTC
        this.peerConnection = peerConnection;
        this.configurableParameters = configurableParameters;
        this.samplingReport = new SamplingDataQueueClass.SamplingDataQueue(this.configurableParameters.REPORT_MAX_LENGTH);
        this.eventEmitter = new EventEmitter();
        // used in event trigger case handling
        this.FlagNoConnection = 0;
        this.FlagSlowConnection = 0;
        this.connectedAtleastOnce = false;
        // calling initialiser method
        this.initialiser(this.peerConnection);
    }
    initialiser(peerConnection) {
        this.strikerAudio = new StrikerClass.Striker(this.configurableParameters);
        this.strikerConnectionQuality = new StrikerClass.Striker(this.configurableParameters);
        this.strikerPacketsLostPercentageInbound = new StrikerClass.Striker(this.configurableParameters);
        this.strikerPacketsLostPercentageRemoteInbound = new StrikerClass.Striker(this.configurableParameters);
        this.strikerPacketsSentPerSecond = new StrikerClass.Striker(this.configurableParameters);
        this.strikerRetransmittedPacketsSentPerSecond = new StrikerClass.Striker(this.configurableParameters);
        this.strikerMOS = new StrikerClass.Striker(this.configurableParameters);
        this.strikerJitter = new StrikerClass.Striker(this.configurableParameters);
        this.strikerRTT = new StrikerClass.Striker(this.configurableParameters);
        // event listeners for connection state changes
        this.connectionStateChangeHandler();
        setInterval(() => {
            if (this.IsConnectedAtLeastOnce() === true) {
                peerConnection.getStats(null).then((stats) => {
                    this.samplingReport.push(stats);
                });
                this.checkAudioQuality();
                this.checkConnectionQuality();
                this.checkPacketsSentPerSecond();
                this.checkRetransmittedPacketsSentPerSecond();
                this.checkPacketsLostPercentageInbound();
                this.checkPacketsLostPercentageInbound();
                this.checkPacketsLostPercentageRemoteInbound();
                this.checkMOSValue();
                // to reset the repeated events trigger cycle
                this.FlagNoConnection = 0;
                this.FlagSlowConnection = 0;
            }
        }, this.configurableParameters.SAMPLING_TIME_PERIOD);
    }
    // event listeners for connection state changes
    connectionStateChangeHandler() {
        this.peerConnection.addEventListener(constants.CONNECTION_STATE_CHANGE, (event) => {
            if (event.currentTarget.connectionState === constants.DISCONNECTED) {
                this.triggerHandler(constants.EVENT.CONNECTION_PROBLEM);
            }
            else if (event.currentTarget.connectionState === constants.FAILED) {
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
                return constants.DATA_TYPES.GOOD;
            }
            else if (dataValue < DATA_THRESHOLD.HIGH_THRESHOLD) {
                return constants.DATA_TYPES.AVERAGE;
            }
            return constants.DATA_TYPES.POOR;
        }
        else {
            if (dataValue < DATA_THRESHOLD.LOW_THRESHOLD) {
                return constants.DATA_TYPES.POOR;
            }
            else if (dataValue < DATA_THRESHOLD.HIGH_THRESHOLD) {
                return constants.DATA_TYPES.AVERAGE;
            }
            return constants.DATA_TYPES.GOOD;
        }
    }
    // to classify data according to the threshold value
    // reverse parameter will reverse the classified data label
    classifyData(dataValue, DATA_TYPES, DATA_THRESHOLD, reverse = 0) {
        if (reverse) {
            if (dataValue < DATA_THRESHOLD.THRESHOLD) {
                return constants.DATA_TYPES.GOOD;
            }
            return constants.DATA_TYPES.POOR;
        }
        else {
            if (dataValue < DATA_THRESHOLD.THRESHOLD) {
                return constants.DATA_TYPES.POOR;
            }
            return constants.DATA_TYPES.GOOD;
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
        let category = this.checkDataValuesPerSecond("outbound-rtp", "audio", "packetsSent", constants.DATA_TYPES, constants.PACKETS_SENT_OUTBOUND_THRESHOLD, 0);
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
        let category = this.checkDataValuesPerSecond("outbound-rtp", "audio", "retransmittedPacketsSent", constants.DATA_TYPES, constants.RETRANSMITTED_PACKETS_SENT_OUTBOUND_THRESHOLD, 1);
        let flag = this.strikerRetransmittedPacketsSentPerSecond.updateEventStrikes(category);
        if (flag === 1) {
            this.triggerHandler(constants.EVENT.HIGH_RETRANSMITTED_PACKETS_SENT);
            this.triggerHandler(constants.EVENT.SLOW_CONNECTION);
        }
        return category;
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
        if (flag === 1) {
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
        let packetsReceived = this.getPacketsRecievedInbound();
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
    // method to get audio level of the input
    getAudioLevel() {
        return this.getRealTimeValue("media-source", "audio", "audioLevel");
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
    // method to get Round Trip Time from Remote Outbound audio stream
    getRTTRemoteOutbound() {
        return this.getRealTimeValue("remote-outbound-rtp", "audio", "totalRoundTripTime");
    }
    // method to get Round Trip Time from Remote Inbound audio stream
    getRTTRemoteInbound() {
        return this.getRealTimeValue("remote-inbound-rtp", "audio", "roundTripTime");
    }
    // method to get Jitter from Remote Inbound audio stream
    getJitter() {
        return this.getRealTimeValue("remote-inbound-rtp", "audio", "jitter");
    }
    // method to get number of Packets Lost from Inbound Audio stream
    getPacketsLostInbound() {
        return this.getRealTimeValue("inbound-rtp", "audio", "packetsLost");
    }
    // method to get number of Packets Recieved from Inbound Audio stream
    getPacketsRecievedInbound() {
        return this.getRealTimeValue("inbound-rtp", "audio", "packetsReceived");
    }
    // method to get number of Samples Inserted for Deceleration from Inbound Audio stream
    getInsertedSamplesForDeceleration() {
        return this.getRealTimeValue("inbound-rtp", "audio", "insertedSamplesForDeceleration");
    }
    // method to get number of Samples Removed for Acceleration from Inbound Audio stream
    getRemovedSamplesForAcceleration() {
        return this.getRealTimeValue("inbound-rtp", "audio", "removedSamplesForAcceleration");
    }
    // method to get number of Packets Lost from Remote Inbound Audio stream
    getPacketsLostRemoteInbound() {
        return this.getRealTimeValue("remote-inbound-rtp", "audio", "packetsLost");
    }
    // method to get number of Packets Sent from Outbound Audio stream
    getPacketsSentOutbound() {
        return this.getRealTimeValue("outbound-rtp", "audio", "packetsSent");
    }
    // method to get number of Retransmitted Packets Sent from Outbound Audio stream
    getRetransmittedPacketsSentOutbound() {
        return this.getRealTimeValue("outbound-rtp", "audio", "retransmittedPacketsSent");
    }
    // method to get number of Packets Sent for the Connection
    getPacketsSentICECandidate() {
        return this.getICECandidateRealTimeValue("candidate-pair", "packetsSent");
    }
    // method to get number of Packets Recieved for the Connection
    getPacketsRecievedICECandidate() {
        return this.getICECandidateRealTimeValue("candidate-pair", "packetsReceived");
    }
    // method to get Current Round Trip Time for the Connection
    getCurrentRoundTripTimeICECandidate() {
        return this.getICECandidateRealTimeValue("candidate-pair", "currentRoundTripTime");
    }
    // method to get Available Outgoing Bitrate for the Connection
    getAvailableOutgoingBitrateICECandidate() {
        return this.getICECandidateRealTimeValue("candidate-pair", "availableOutgoingBitrate");
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
        let packetsRecievedInbound = this.getPacketsRecievedInbound();
        let packetsLostPercentage = (packetsLostInbound / packetsRecievedInbound) * 100;
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

},{"../node_modules/events":6,"./SamplingDataQueue":2,"./Striker":3,"./constants":4}],2:[function(require,module,exports){
class SamplingDataQueue {
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
module.exports = { SamplingDataQueue };

},{}],3:[function(require,module,exports){
let constantsFile = require("./constants");
class Striker {
    constructor(configurableParameters = constantsFile.DEFAULT_PARAMETERS_MONITOR_WEB_RTC) {
        this.configurableParameters = configurableParameters;
        this.strikes = 0;
        this.eventStikerCoefficient = 1.1;
        this.lastTimeCalled = -1;
    }
    updateEventStrikes(category) {
        if (category === constantsFile.DATA_TYPES.POOR) {
            this.strikes++;
            if (this.strikes >= this.configurableParameters.STRIKES_THRESHOLD) {
                let today = new Date();
                let currentTime = today.getTime();
                let difference = this.eventStikerCoefficient * (currentTime - this.lastTimeCalled);
                if (this.lastTimeCalled === -1 ||
                    difference >= this.configurableParameters.EVENT_EMIT_TIME_PERIOD) {
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
module.exports = { Striker };

},{"./constants":4}],4:[function(require,module,exports){
const DATA_TYPES = { GOOD: "GOOD", AVERAGE: "AVERAGE", POOR: "POOR" };
const AUDIO_THRESHOLD = { LOW_THRESHOLD: 0.03, HIGH_THRESHOLD: 0.1 };
const JITTER_THRESHOLD = { LOW_THRESHOLD: 0.1, HIGH_THRESHOLD: 0.3 };
const RTT_THRESHOLD = { THRESHOLD: 0.5 };
const PACKETS_LOST_PERCENTAGE_THRESHOLD = { LOW_THRESHOLD: 10, HIGH_THRESHOLD: 15 };
const MOS_THRESHOLD = { LOW_THRESHOLD: 2, HIGH_THRESHOLD: 3 };
const PACKETS_SENT_OUTBOUND_THRESHOLD = { THRESHOLD: 10 };
const RETRANSMITTED_PACKETS_SENT_OUTBOUND_THRESHOLD = { THRESHOLD: 2 };
const PACKETS_SENT_OUTBOUND_THRESHOLD_ICE = { THRESHOLD: 10 };
const PACKETS_RECEIVED_OUTBOUND_THRESHOLD_ICE = { THRESHOLD: 10 };
const EVENT = {
    SLOW_CONNECTION: "SLOW_CONNECTION",
    LOW_AUDIO: "LOW_AUDIO",
    NO_CONNECTION: "NO_CONNECTION",
    LOW_PACKETS_SENT: "LOW_PACKETS_SENT",
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
    REPORT_MAX_LENGTH: 6,
    ANALYSIS_REPORT_LENGTH: 6,
    EVENT_EMIT_TIME_PERIOD: 3000,
    STRIKES_THRESHOLD: 3,
};
const BEING_PROCESSED = "being processed";
const NOT_ENOUGH_DATA = "Not enough data";
const CONNECTION_STATE_CHANGE = "connectionstatechange";
const CONNECTED = "connected";
const DISCONNECTED = "disconnected";
const FAILED = "failed";
module.exports = {
    AUDIO_THRESHOLD,
    JITTER_THRESHOLD,
    RTT_THRESHOLD,
    PACKETS_LOST_PERCENTAGE_THRESHOLD,
    DATA_TYPES,
    BEING_PROCESSED,
    NOT_ENOUGH_DATA,
    EVENT,
    PACKETS_SENT_OUTBOUND_THRESHOLD,
    RETRANSMITTED_PACKETS_SENT_OUTBOUND_THRESHOLD,
    PACKETS_SENT_OUTBOUND_THRESHOLD_ICE,
    PACKETS_RECEIVED_OUTBOUND_THRESHOLD_ICE,
    DEFAULT_PARAMETERS_MONITOR_WEB_RTC,
    MOS_THRESHOLD,
    CONNECTION_STATE_CHANGE,
    CONNECTED,
    DISCONNECTED,
    FAILED,
};

},{}],5:[function(require,module,exports){
let MonitorWebRTCClass = require("./MonitorWebRTC");
module.exports = { MonitorWebRTCClass };

},{"./MonitorWebRTC":1}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{"../sprinklr-monitor-webrtc/build/index":5}]},{},[7]);
