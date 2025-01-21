const chatBox = document.getElementById('chat');
const messageInput = document.getElementById('message');
const sendButton = document.getElementById('send');

const socket = new WebSocket('ws://localhost:3000');

// WebRTC variables
let localConnection;
let remoteConnection;
let dataChannel;

// WebSocket signaling
socket.onopen = () => {
    console.log('Connected to signaling server');
};

socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'offer') {
        await remoteConnection.setRemoteDescription(data.offer);
        const answer = await remoteConnection.createAnswer();
        await remoteConnection.setLocalDescription(answer);
        socket.send(JSON.stringify({ type: 'answer', answer }));
    } else if (data.type === 'answer') {
        await localConnection.setRemoteDescription(data.answer);
    } else if (data.type === 'candidate') {
        const candidate = new RTCIceCandidate(data.candidate);
        await (localConnection || remoteConnection).addIceCandidate(candidate);
    }
};

// Create WebRTC connection
function createConnection() {
    localConnection = new RTCPeerConnection();
    dataChannel = localConnection.createDataChannel('chat');

    dataChannel.onmessage = (event) => {
        chatBox.value += `Peer: ${event.data}\n`;
    };

    localConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    // For remote connection setup
    remoteConnection = new RTCPeerConnection();

    remoteConnection.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        receiveChannel.onmessage = (event) => {
            chatBox.value += `Peer: ${event.data}\n`;
        };
    };

    remoteConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };
}

// Create WebRTC Offer
async function createOffer() {
    const offer = await localConnection.createOffer();
    await localConnection.setLocalDescription(offer);
    socket.send(JSON.stringify({ type: 'offer', offer }));
}

// Handle Send Message
sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    chatBox.value += `You: ${message}\n`;
    dataChannel.send(message);
    messageInput.value = '';
});

// Initialize connections
createConnection();
