# Video Conferencing and Chat

## Overview

This is the application repository for the WebRTC Communication. In this, we have implemented WebRTC Peer to Peer Communication from Scratch. We have used the **self-made** npm package **monitor-webrtc-connection** to analyse the WebRTC communication.

Using the library as analysis tool, we have created user-friendly and interactive application through which user can analyse ongoing WebRTC Video Conferencing call and can view the important parameters. Using this, user can get the visual understanding of the parameters via dynamically changing charts.

Along with this, user also gets the prompts on top right side of the screen of the important events happening in WebRTC video call.

## Implementation

1. First install the npm dependencies using `npm install` . This will automatically install **monitor-webrtc-connection** package manager.

2. To run the application, use the following command:

    `browserify ./source/script_Peer_A.js -o ./source/bundle.js; `

## Steps to initiate communication

1. Initially open both Peer A and Peer B html file in different devices or different browsers but the devices must be connected over same network.
2. Copy the local address of Peer A and paste in the Remote Description of Peer B.
3. Now submit the offer and then the local address of Peer B is generated which needs to be copied in the Remote address of Peer A.
4. The connection is successfully established and video conferencing and text chat can be done easily.

## Features provided

1. Option to turn ON/OFF Mic and Camera.
2. Option to communicate using text message.
3. WebRTC call related parameters are gets displayed in the page once communication is established.
4. Charts are displaced corresponding to important parameters to get the visual understanding of the WebRTC communication data.
5. Following prompts are displayed related to the communication to get better understanding of potential issues during the communication.
    1. Info based
        - Local Peer Camera OFF
        - Local Peer Mic OFF
        - Local Peer Low input audio
        - Remote Peer Camera OFF
        - Low Packets Sent
        - Mean Opinion Score (MOS)
        - High Jitter
        - High Round Trip Time & many more....
    2. Success based
        - Connection established
        - Local Peer Camera ON
        - Local Peer Mic ON
        - Remote Peer Camera ON
    3. Warning/Alert based
        - Connection establishment
        - Slow Connection
        - Connection lost/No connection
