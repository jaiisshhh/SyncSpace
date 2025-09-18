import React, { useEffect, useCallback, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const RoomPage = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [receivedOffer, setReceivedOffer] = useState(null);
  const remoteVideoRef = useRef();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Gets our camera ready as soon as we land on the page
  const getMyMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMyStream(stream);
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  }, []);

  useEffect(() => {
    getMyMedia();
  }, [getMyMedia]);

  // Logic for the person already in the room (the caller)
  const handleUserJoined = useCallback(async ({ email, id }) => {
    console.log(`User ${email} joined. Creating offer for ${id}`);
    setRemoteSocketId(id);
    if (myStream) {
      for (const track of myStream.getTracks()) {
        peer.peer.addTrack(track, myStream);
      }
    }
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: id, offer });
  }, [myStream, socket]);

  // Logic for the person who just joined (the callee) - Step 1: Save the offer
  const handleIncommingCall = useCallback(async ({ from, offer }) => {
    console.log(`Incoming Call from`, from);
    setRemoteSocketId(from);
    setReceivedOffer(offer);
  }, []);

  // Logic for the caller to finalize the connection
  const handleCallAccepted = useCallback(({ from, ans }) => {
    peer.setRemoteDescription(ans);
    console.log("Call Accepted!");
  }, []);

  // Logic for handling when a user leaves
  const handleUserLeft = useCallback(() => {
    console.log("Remote user left");
    setRemoteStream(null);
    setRemoteSocketId(null);
    setReceivedOffer(null);
    peer.createPeer();
  }, []);

  // Main useEffect for setting up all socket event listeners
  useEffect(() => {
    peer.peer.addEventListener("track", (ev) => {
      const streams = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(streams[0]);
    });

    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("user:left", handleUserLeft);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("user:left", handleUserLeft);
    };
  }, [socket, handleUserJoined, handleIncommingCall, handleCallAccepted, handleUserLeft]);
  
  // New useEffect to solve the race condition by answering only when ready
  useEffect(() => {
    const answerCall = async () => {
      if (myStream && receivedOffer) {
        console.log("Answering call now that stream is ready...");
        const ans = await peer.getAnswer(receivedOffer);
        socket.emit("call:accepted", { to: remoteSocketId, ans });

        console.log("Sending my stream back");
        for (const track of myStream.getTracks()) {
          peer.peer.addTrack(track, myStream);
        }
        setReceivedOffer(null); // Clean up after answering
      }
    };
    answerCall();
  }, [myStream, receivedOffer, remoteSocketId, socket]);

  // useEffect to safely attach the remote stream to the video element
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // --- Controls and Styles ---
  const toggleMute = useCallback(() => {
    if (myStream) {
      const isMuted = !myStream.getAudioTracks()[0].enabled;
      myStream.getAudioTracks()[0].enabled = !isMuted;
      setIsMuted(isMuted);
    }
  }, [myStream]);

  const toggleVideo = useCallback(() => {
    if (myStream) {
      const isVideoOff = !myStream.getVideoTracks()[0].enabled;
      myStream.getVideoTracks()[0].enabled = !isVideoOff;
      setIsVideoOff(isVideoOff);
    }
  }, [myStream]);
  
  const handleLeaveCall = useCallback(() => {
    if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
    }
    if (peer.peer) {
        peer.peer.close();
        peer.createPeer();
    }
    socket.emit('user:leave', { roomId });
    navigate('/');
  }, [myStream, navigate, roomId, socket]);
  
  const containerStyle = { display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a1a', color: 'white' };
  const videoContainerStyle = { flexGrow: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#2c3e50', overflow: 'hidden' };
  const remoteVideoStyle = { objectFit: 'cover', width: '100%', height: '100%' };
  const myVideoStyle = { position: 'absolute', bottom: '20px', right: '20px', width: '240px', height: '180px', borderRadius: '10px', border: '2px solid #3498db', objectFit: 'cover' };
  const controlsContainerStyle = { display: 'flex', justifyContent: 'center', padding: '1rem', background: '#232323', gap: '1rem' };
  const buttonStyle = { padding: '10px 20px', fontSize: '1rem', cursor: 'pointer', borderRadius: '5px', border: 'none', color: 'white' };
  const blueButton = { ...buttonStyle, background: '#3498db' };
  const redButton = { ...buttonStyle, background: '#e74c3c' };

  return (
    <div style={containerStyle}>
      <div style={videoContainerStyle}>
        {remoteStream ? (
          <video ref={remoteVideoRef} style={remoteVideoStyle} autoPlay playsInline />
        ) : remoteSocketId ? (
          <h2>Connecting...</h2>
        ) : (
          <h2>Waiting for others to join Room: {roomId}</h2>
        )}
        
        {myStream && (
          <ReactPlayer style={myVideoStyle} playing muted url={myStream} />
        )}
      </div>
      <div style={controlsContainerStyle}>
        {myStream && (
          <>
            <button style={blueButton} onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
            <button style={blueButton} onClick={toggleVideo}>{isVideoOff ? "Video On" : "Video Off"}</button>
          </>
        )}
        <button style={redButton} onClick={handleLeaveCall}>Leave Call</button>
      </div>
    </div>
  );
};

export default RoomPage;