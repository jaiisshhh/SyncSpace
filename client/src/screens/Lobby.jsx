import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);


  // ---- STYLES ----
  const lobbyContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '300px',
    padding: '2rem',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  };

  const inputStyle = {
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    fontSize: '1rem',
  };

  const buttonStyle = {
    padding: '10px',
    fontSize: '1rem',
    cursor: 'pointer',
    borderRadius: '5px',
    border: 'none',
    color: 'white',
    background: '#3498db',
  };

  return (
    <div style={lobbyContainerStyle}>
      <h1>Lobby</h1>
      <form onSubmit={handleSubmitForm} style={formStyle}>
        <label htmlFor="email">Email ID</label>
        <input
          style={inputStyle}
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="room">Room Number</label>
        <input
          style={inputStyle}
          type="text"
          id="room"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          required
        />
        <button style={buttonStyle}>Join</button>
      </form>
    </div>
  );
};

export default LobbyScreen;