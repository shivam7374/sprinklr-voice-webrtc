import { localConnection } from "./script_Peer_A.js";
// import { localConnection } from "./script_Peer_B.js";

export function webRTC_dashboard() {
  var statsBox = document.createElement("div");
  document.body.appendChild(statsBox);
  statsBox.classList.add("stats-box");

  window.setInterval(function () {
    localConnection.getStats(null).then((stats) => {
      let statsOutput = "";

      stats.forEach((report) => {
        statsOutput +=
          `<h2>Report: ${report.type}</h2>\n<strong>ID:</strong> ${report.id}<br>\n` +
          `<strong>Timestamp:</strong> ${report.timestamp}<br>\n`;

        // Now the statistics for this report; we intentionally drop the ones we
        // sorted to the top above

        Object.keys(report).forEach((statName) => {
          if (
            statName !== "id" &&
            statName !== "timestamp" &&
            statName !== "type"
          ) {
            statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
          }
        });
      });

      document.querySelector(".stats-box").innerHTML = statsOutput;
    });
  }, 1000);
}
