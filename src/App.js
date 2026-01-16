import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("https://voting-backend.onrender.com"); // replace with your backend URL

function App() {
  const [roleSelected, setRoleSelected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [questionData, setQuestionData] = useState(null);
  const [timer, setTimer] = useState(15);
  const [showWinner, setShowWinner] = useState(false);
  const [previousWinners, setPreviousWinners] = useState([]);

  // Role selection
  const selectRole = (role) => {
    if (role === "host") setRoleSelected(true);
    else setRoleSelected(true); // normal player
  };

  // Host submits PIN
  const submitPin = () => {
    socket.emit("setHost", pinInput);
  };

  // Backend events
  useEffect(() => {
    socket.on("hostConfirmed", () => setIsHost(true));
    socket.on("hostDenied", () => alert("Incorrect PIN, you are a player."));
    socket.on("question", (data) => {
      setQuestionData(data);
      setTimer(15);
      setShowWinner(false);
    });
    socket.on("votesUpdate", (data) => setQuestionData({ ...data }));
    socket.on("gamePaused", () => alert("Host disconnected. Game paused."));
    return () => {
      socket.off("hostConfirmed");
      socket.off("hostDenied");
      socket.off("question");
      socket.off("votesUpdate");
      socket.off("gamePaused");
    };
  }, []);

  // Display winner
  const displayWinner = useCallback(() => {
    if (!questionData) return;
    const maxVotes = Math.max(...questionData.options.map(o => o.votes));
    const winner = questionData.options.find(o => o.votes === maxVotes);
    if (winner) setPreviousWinners(prev => [...prev, winner.name]);
    setShowWinner(true);
  }, [questionData]);

  // Countdown timer
  useEffect(() => {
    if (!questionData || showWinner) return;
    if (timer <= 0) {
      displayWinner();
      return;
    }
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer, questionData, showWinner, displayWinner]);

  const vote = (id) => socket.emit("vote", id);
  const nextQuestion = () => socket.emit("nextQuestion");

  // Initial role selection screen
  if (!roleSelected) {
    return (
      <div className="container">
        <h1>Select Role</h1>
        <button onClick={() => selectRole("host")}>I am Host</button>
        <button onClick={() => selectRole("player")}>I am Player</button>
      </div>
    );
  }

  // If host, prompt for PIN
  if (!isHost && roleSelected && !questionData) {
    return (
      <div className="container">
        <h2>Enter Host PIN</h2>
        <input type="text" value={pinInput} onChange={e => setPinInput(e.target.value)} />
        <button onClick={submitPin}>Submit PIN</button>
        <p>Waiting for host to start...</p>
      </div>
    );
  }

  if (!questionData) return <div>Waiting for host to start the game...</div>;

  const winnerOption = showWinner
    ? questionData.options.find(o => o.votes === Math.max(...questionData.options.map(v => v.votes)))
    : null;

  return (
    <div className="container">
      <h1>{questionData.question}</h1>
      <h3>Time Left: {timer}s</h3>

      <div className="options">
        {questionData.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => vote(opt.id)}
            className={winnerOption?.id === opt.id ? "winner" : ""}
            disabled={showWinner}
          >
            {opt.name} ({opt.votes})
          </button>
        ))}
      </div>

      {showWinner && <h2>Winner: {winnerOption?.name}</h2>}

      {isHost && showWinner && (
        <button className="next-btn" onClick={nextQuestion}>Next Question</button>
      )}

      <h3>Previous Winners:</h3>
      <ul>
        {previousWinners.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  );
}

export default App;
