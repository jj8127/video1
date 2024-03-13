const socket = io();

const myFace = document.getElementById("myFace");
const peerFace = document.getElementById("peerFace");
const robotBtn = document.getElementById("robot");
const controlBtn = document.getElementById("control");

let isRobot = false;
let isControl = false;

// Robot 버튼 클릭 시 호출되는 함수
robotBtn.addEventListener("click", () => {
  isRobot = true;
  isControl = false; // Robot 모드로 전환 시 Control 모드 비활성화
  toggleCamera(true);
});

// Control 버튼 클릭 시 호출되는 함수
controlBtn.addEventListener("click", () => {
  isRobot = false;
  isControl = true; // Control 모드로 전환 시 Robot 모드 비활성화
  toggleCamera(false);
});

// 카메라 활성화 및 비활성화 함수
async function toggleCamera(useCamera) {
  const constraints = {
    video: useCamera ? { facingMode: "user" } : false,
    audio: !useCamera,
  };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (useCamera) {
      myFace.srcObject = stream;
    } else {
      myFace.srcObject = null;
      stream.getTracks().forEach((track) => track.stop());
    }
    if (isControl) {
      makeConnection(); // Control 모드일 때 Peer 연결 설정
    }
  } catch (error) {
    console.error("Error accessing media devices: ", error);
  }
}

// Socket Code

// Control 모드에서 Offer를 전송하는 함수
async function sendOffer() {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => console.log(event.data));
  console.log("made data channel");
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer);
}

// Offer 수신 시 처리하는 코드
socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) =>
      console.log(event.data)
    );
  });
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
  console.log("sent the answer");
});

// Answer 수신 시 처리하는 코드
socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

// ICE Candidate 수신 시 처리하는 코드
socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

// RTC Code

let myPeerConnection;
let myDataChannel;

// Peer 연결 설정하는 함수
function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", (event) => {
    peerFace.srcObject = event.stream;
  });
}

// ICE Candidate를 전송하는 함수
function handleIce(event) {
  console.log("sent candidate");
  socket.emit("ice", event.candidate);
}
