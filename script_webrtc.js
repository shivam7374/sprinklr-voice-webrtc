import { localConnection } from "./script_Peer_A.js";
// import { localConnection } from "./script_Peer_B.js";

export function webRTC_dashboard() {
  var myChart;
  var statsBox = document.createElement("div");
  document.body.appendChild(statsBox);
  statsBox.classList.add("stats-box");

  window.setInterval(function () {
    localConnection.getStats(null).then((stats) => {
      let statsOutput = "";
      // console.log(stats);
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
          if (
            report.type == "outbound-rtp" &&
            report.kind == "audio" &&
            statName == "packetsSent"
          ) {
            pushValue(myChart, report[statName]);
          }
        });
      });

      document.querySelector(".stats-box").innerHTML = statsOutput;
    });
  }, 1000);

  var chartLibrary = document.createElement("script");
  chartLibrary.setAttribute(
    "src",
    "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.8.0/chart.min.js"
  );
  document.head.appendChild(chartLibrary);

  setTimeout(function () {
    var canvasDiv = document.createElement("div");
    var canvas = document.createElement("canvas");
    canvas.id = "myChart";
    canvas.style.border = "1px solid";
    canvasDiv.appendChild(canvas);
    canvasDiv.style.width = "500px";
    canvasDiv.style.height = "500px";
    var body = document.getElementsByTagName("body")[0];
    body.appendChild(canvasDiv);
    const ctx = document.getElementById("myChart").getContext("2d");
    myChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Packets Sent Outbound RTP Audio",
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
    console.log(x);
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
