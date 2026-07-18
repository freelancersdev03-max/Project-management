import React, { useEffect, useRef, useState, useCallback } from "react";
import Peer from "peerjs";
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff,
  PhoneOff, Users, Copy, Check, Loader2, UserPlus,
} from "lucide-react";

const VideoCall = ({ roomId, userName, onEnd }) => {
  const [peerId, setPeerId] = useState("");
  const [peers, setPeers] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [joinId, setJoinId] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);

  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const connectionsRef = useRef({});

  const localStreamRef = useRef(null);

  // Keep ref updated to avoid stale state in event handlers
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    let isCancelled = false;
    let createdStream = null;

    const uniqueId = `${roomId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const peer = new Peer(uniqueId, { debug: 0 });

    peer.on("open", (id) => { setPeerId(id); setConnecting(false); });

    peer.on("call", (call) => {
      const activeStream = localStreamRef.current;
      if (activeStream) {
        call.answer(activeStream);
        call.on("stream", (rs) => {
          setPeers((p) => ({ ...p, [call.peer]: { stream: rs, name: call.peer.split("-")[0] || "Peer", call } }));
        });
        call.on("close", () => { setPeers((p) => { const c = { ...p }; delete c[call.peer]; return c; }); });
      } else {
        // Fallback if local stream not ready
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
          if (isCancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          call.answer(stream);
          if (!localVideoRef.current?.srcObject) {
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            setLocalStream(stream);
          }
          call.on("stream", (rs) => {
            setPeers((p) => ({ ...p, [call.peer]: { stream: rs, name: call.peer.split("-")[0] || "Peer", call } }));
          });
          call.on("close", () => { setPeers((p) => { const c = { ...p }; delete c[call.peer]; return c; }); });
        }).catch(() => call.answer());
      }
    });

    peer.on("connection", (conn) => {
      conn.on("data", (data) => {
        if (data?.type === "name") {
          setPeers((p) => p[conn.peer] ? { ...p, [conn.peer]: { ...p[conn.peer], name: data.name } } : p);
        }
      });
      connectionsRef.current[conn.peer] = conn;
    });

    peer.on("error", (err) => console.error("PeerJS error:", err));
    peerRef.current = peer;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (isCancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      createdStream = stream;
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    }).catch(() => {
      navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        .then((stream) => {
          if (isCancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          createdStream = stream;
          setLocalStream(stream);
          setCamOn(false);
        })
        .catch(() => {
          setCamOn(false);
          setMicOn(false);
        });
    });

    return () => {
      isCancelled = true;
      peer.destroy();
      if (createdStream) {
        createdStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [roomId]);

  const connectToPeer = useCallback((remotePeerId) => {
    if (!peerRef.current || !localStream || remotePeerId === peerId || peers[remotePeerId]) return;
    const call = peerRef.current.call(remotePeerId, localStream);
    if (!call) return;
    call.on("stream", (rs) => {
      setPeers((p) => ({ ...p, [remotePeerId]: { stream: rs, name: remotePeerId.split("-")[0] || "Peer", call } }));
    });
    call.on("close", () => { setPeers((p) => { const c = { ...p }; delete c[remotePeerId]; return c; }); });
    const conn = peerRef.current.connect(remotePeerId);
    conn.on("open", () => conn.send({ type: "name", name: userName }));
    connectionsRef.current[remotePeerId] = conn;
  }, [localStream, peerId, peers, userName]);

  const toggleCamera = async () => {
    if (!localStream) return;

    if (camOn) {
      // Turn off camera: stop the track so the physical camera light goes off
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStream.removeTrack(videoTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      setCamOn(false);

      // Notify existing call senders
      Object.values(peers).forEach(({ call }) => {
        const sender = call?.peerConnection?.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(null);
        }
      });
    } else {
      // Turn on camera: get a fresh video track and add it to the stream
      try {
        const freshStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const freshTrack = freshStream.getVideoTracks()[0];
        if (freshTrack) {
          localStream.addTrack(freshTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
          setCamOn(true);

          // Update active peer calls with the new camera track
          Object.values(peers).forEach(({ call }) => {
            const sender = call?.peerConnection?.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(freshTrack);
            }
          });
        }
      } catch (err) {
        console.warn("Could not start camera track:", err);
      }
    }
  };

  const toggleMic = () => { if (!localStream) return; const t = localStream.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); } };

  const toggleScreen = async () => {
    if (screenOn && screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null); setScreenOn(false);
      if (localStream) {
        const vt = localStream.getVideoTracks()[0];
        Object.values(peers).forEach(({ call }) => {
          const s = call?.peerConnection?.getSenders().find((s) => s.track?.kind === "video");
          if (s && vt) s.replaceTrack(vt);
        });
      }
      return;
    }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(screen); setScreenOn(true);
      const st = screen.getVideoTracks()[0];
      Object.values(peers).forEach(({ call }) => {
        const s = call?.peerConnection?.getSenders().find((s) => s.track?.kind === "video");
        if (s) s.replaceTrack(st);
      });
      st.onended = () => {
        setScreenStream(null); setScreenOn(false);
        if (localStream) {
          const vt = localStream.getVideoTracks()[0];
          Object.values(peers).forEach(({ call }) => {
            const s = call?.peerConnection?.getSenders().find((s) => s.track?.kind === "video");
            if (s && vt) s.replaceTrack(vt);
          });
        }
      };
    } catch (err) { console.warn("Screen share cancelled:", err); }
  };

  const handleLeave = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    Object.values(peers).forEach(({ call }) => call?.close());
    peerRef.current?.destroy();
    onEnd?.();
  };

  const copyRoomId = () => { navigator.clipboard.writeText(peerId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  const handleJoin = () => { const id = joinId.trim(); if (id) { connectToPeer(id); setJoinId(""); setShowJoinInput(false); } };

  const peerEntries = Object.entries(peers);
  const totalVideos = 1 + peerEntries.length;

  // Google Meet grid: 1 person = 1 col, 2 = 2 cols, 3-4 = 2 cols, 5-6 = 3 cols, 7-9 = 3 cols
  const gridCols = totalVideos <= 1 ? 1 : totalVideos <= 4 ? 2 : 3;
  const gridRows = Math.ceil(totalVideos / gridCols);

  // Name label style
  const nameLabel = {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: "6px 12px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
    color: "#e8eaed", fontSize: 12, fontWeight: 600,
    display: "flex", alignItems: "center", gap: 4,
    borderRadius: "0 0 8px 8px",
  };

  // Avatar for cam-off
  const Avatar = ({ name }) => (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#3c4043",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "linear-gradient(135deg, #667eea, #764ba2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 28, fontWeight: 700,
      }}>
        {(name || "U").charAt(0).toUpperCase()}
      </div>
    </div>
  );



  // Dynamic tile styles to mimic Google Meet's layout behavior
  const getTileStyle = () => {
    const baseStyle = {
      position: "relative",
      borderRadius: "12px",
      overflow: "hidden",
      background: "#3c4043",
      aspectRatio: "16/9",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      transition: "all 0.25s ease",
      display: "flex",
      flexDirection: "column",
    };

    if (totalVideos === 1) {
      return {
        ...baseStyle,
        width: "100%",
        maxWidth: "min(90%, 960px)",
        maxHeight: "85%",
      };
    } else if (totalVideos === 2) {
      return {
        ...baseStyle,
        width: "48%",
        minWidth: "280px",
        maxWidth: "600px",
        maxHeight: "85%",
      };
    } else if (totalVideos <= 4) {
      return {
        ...baseStyle,
        width: "48%",
        minWidth: "280px",
        maxWidth: "500px",
        maxHeight: "45%",
      };
    } else {
      return {
        ...baseStyle,
        width: "31%",
        minWidth: "220px",
        maxWidth: "380px",
        maxHeight: "30%",
      };
    }
  };

  const tileStyle = getTileStyle();

  return (
    <div style={{
      width: "100%",
      height: "100%",
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      background: "#202124",
      position: "relative",
    }}>

      {/* ═══ FULL-SCREEN VIDEO GRID ═══ */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexWrap: "wrap",
        alignContent: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "16px",
        overflow: "hidden",
      }}>
        {/* Local video tile */}
        <div style={tileStyle}>
          <video
            ref={localVideoRef}
            autoPlay muted playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
              display: camOn && !screenOn ? "block" : "none",
            }}
          />
          {screenOn && screenStream && (
            <video
              autoPlay playsInline
              style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
              ref={(el) => { if (el && screenStream) el.srcObject = screenStream; }}
            />
          )}
          {!camOn && !screenOn && <Avatar name={userName} />}
          <div style={nameLabel}>
            {!micOn && <MicOff size={12} style={{ color: "#ea4335" }} />}
            You
          </div>
        </div>

        {/* Remote video tiles */}
        {peerEntries.map(([pid, { stream, name }]) => (
          <div key={pid} style={tileStyle}>
            <video
              autoPlay playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              ref={(el) => { if (el && stream) el.srcObject = stream; }}
            />
            <div style={nameLabel}>
              {name || "Participant"}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ GOOGLE MEET BOTTOM BAR ═══ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px 12px",
        background: "#202124",
        borderTop: "1px solid #3c4043",
      }}>
        {/* Left: Room info */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 10px", borderRadius: 8,
            background: "#3c4043", color: "#9aa0a6", fontSize: 11,
          }}>
            <Users size={12} />
            <span style={{
              fontFamily: "monospace", maxWidth: 140,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {connecting ? "..." : peerId}
            </span>
            <button onClick={copyRoomId} style={{
              background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex",
            }} title="Copy your ID">
              {copied ? <Check size={12} style={{ color: "#34a853" }} /> : <Copy size={12} style={{ color: "#9aa0a6" }} />}
            </button>
          </div>
          {showJoinInput ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                value={joinId} onChange={(e) => setJoinId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="Paste peer ID" autoFocus
                style={{
                  padding: "5px 10px", borderRadius: 8, fontSize: 11,
                  background: "#3c4043", color: "#e8eaed",
                  border: "1px solid #5f6368", outline: "none", width: 160,
                }}
              />
              <button onClick={handleJoin} disabled={!joinId.trim()} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                background: joinId.trim() ? "#8ab4f8" : "#3c4043",
                color: joinId.trim() ? "#202124" : "#666",
                border: "none", cursor: joinId.trim() ? "pointer" : "default",
              }}>Join</button>
              <button onClick={() => { setShowJoinInput(false); setJoinId(""); }} style={{
                background: "none", border: "none", cursor: "pointer", color: "#9aa0a6", fontSize: 14, padding: "2px 4px",
              }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowJoinInput(true)} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: "#3c4043", color: "#8ab4f8", border: "none", cursor: "pointer",
            }}>
              <UserPlus size={12} /> Add people
            </button>
          )}
        </div>

        {/* Center: Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleMic} title={micOn ? "Turn off mic" : "Turn on mic"} style={{
            width: 44, height: 44, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: micOn ? "#3c4043" : "#ea4335",
            color: "#e8eaed", border: "none", cursor: "pointer",
          }}>
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button onClick={toggleCamera} title={camOn ? "Turn off camera" : "Turn on camera"} style={{
            width: 44, height: 44, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: camOn ? "#3c4043" : "#ea4335",
            color: "#e8eaed", border: "none", cursor: "pointer",
          }}>
            {camOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button onClick={toggleScreen} title={screenOn ? "Stop presenting" : "Present now"} style={{
            width: 44, height: 44, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: screenOn ? "#8ab4f8" : "#3c4043",
            color: screenOn ? "#202124" : "#e8eaed",
            border: "none", cursor: "pointer",
          }}>
            {screenOn ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>

          <button onClick={handleLeave} title="Leave call" style={{
            width: 56, height: 44, borderRadius: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#ea4335", color: "#fff",
            border: "none", cursor: "pointer",
          }}>
            <PhoneOff size={20} />
          </button>
        </div>

        {/* Right: spacer for symmetry */}
        <div style={{ flex: 1 }} />
      </div>

      {/* Connecting overlay */}
      {connecting && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(32,33,36,0.92)", zIndex: 10,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "#8ab4f8" }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: "#9aa0a6" }}>Setting up your meeting...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
