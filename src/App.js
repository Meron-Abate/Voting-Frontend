import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import "./App.css";

// Connect to your backend
const socket = io("https://voting-backend.onrender.com"); // replace with your backend URL

function App() {
  // --- Roles and Host ---
  const [role, setRole] = useState(""); // "", "host", "player"
  const [pinInput, setPinInput] = useState("");
  const [isHost, setIsHost] = useState(false);

  // --- Game State ---
  const [questionData, setQuestionData] = useState(null);
  const [timer, setTimer] = useState(15);
  const [showWinner, setShowWinner] = useState(false);
  const [previousWinners, setPreviousWinners] = useState([]);

  // --- Backend Events ---
  useEffect(() => {
    // Host confirmed
    socket.on("hostConfirmed", () => setIsHost(true));

    // Host denied
    socket.on("hostDenied", () => alert("Incorrect PIN. You are a player."));

    // New question
    socket.on("question", (data) => {
      setQuestionData(data);
      setTimer(15);
      setShowWinner(false);
    });

    // Votes updated
    socket.on("votesUpdate", (data) => setQuestionData({ ...data }));

    // Host disconnected
    socket.on("gamePaused", () => alert("Host disconnected. Game paused."));

    return () => {
      socket.off("hostConfirmed");
      socket.off("hostDenied");
      socket.off("question");
      socket.off("votesUpdate");
      socket.off("gamePaused");
    };
  }, []);

  // --- Display Winner ---
  const displayWinner = useCallback(() => {
    if (!questionData) return;

    const maxVotes = Math.max(...questionData.options.map(o => o.votes));
    const winner = questionData.options.find(o => o.votes === maxVotes);
    if (winner) setPreviousWinners(prev => [...prev, winner.name]);

    setShowWinner(true);
  }, [questionData]);

  // --- Countdown Timer ---
  useEffect(() => {
    if (!questionData || showWinner) return;

    if (timer <= 0) {
      displayWinner();
      return;
    }

    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer, questionData, showWinner, displayWinner]);

  // --- Voting ---
  const vote = (id) => socket.emit("vote", id);

  // --- Next Question (Host only) ---
  const nextQuestion = () => socket.emit("nextQuestion");

  // --- Role Selection Screen ---
  if (role === "") {
    return (
      <div className="container">
        <h1>Select Role</h1>
        <button onClick={() => setRole("host")}>I am Host</button>
        <button onClick={() => setRole("player")}>I am Player</button>
      </div>
    );
  }

  // --- Host PIN Screen ---
  if (role === "host" && !isHost) {
    return (
      <div className="container">
        <h2>Enter Host PIN</h2>
        <input
          type="text"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          placeholder="Enter PIN"
        />
        <button
          onClick={() => {
            if (pinInput.trim() === "") {
              alert("Please enter PIN");
              return;
            }
            socket.emit("setHost", pinInput);
          }}
        >
          Submit PIN
        </button>
      </div>
    );
  }

  // --- Player waiting for host ---
  if (role === "player" && !questionData) {
    return <div className="container"><h2>Waiting for host to start the game...</h2></div>;
  }

  // --- Game Screen ---
  if (!questionData) return <div className="container">Loading...</div>;

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

      {/* Next Question button only visible to host */}
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
