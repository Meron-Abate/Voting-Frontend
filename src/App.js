import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("https://voting-backend-j0u5.onrender.com");

// Optional: debug connection
socket.on("connect", () => console.log("Socket connected!"));
socket.on("connect_error", (err) => console.log("Socket connection error:", err));

function App() {
  const [questionData, setQuestionData] = useState(null);
  const [timer, setTimer] = useState(15);
  const [showWinner, setShowWinner] = useState(false);
  const [previousWinners, setPreviousWinners] = useState([]);

  // Listen for backend events
  useEffect(() => {
    socket.on("question", (data) => {
      console.log("Received question:", data); // log for debugging
      setQuestionData(data);
      setTimer(15);
      setShowWinner(false);
    });

    socket.on("votesUpdate", (data) => {
      console.log("Votes updated:", data);
      setQuestionData({ ...data });
    });

    socket.on("gameOver", () => {
      console.log("Game over received");
      setQuestionData(null);
    });

    return () => {
      socket.off("question");
      socket.off("votesUpdate");
      socket.off("gameOver");
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

  // Auto-restart after Game Over
  useEffect(() => {
    if (questionData === null) {
      const timeout = setTimeout(() => {
        console.log("Restarting game...");
        socket.emit("nextQuestion"); // request a new question from backend
      }, 3000); // wait 3 seconds
      return () => clearTimeout(timeout);
    }
  }, [questionData]);

  // Next Question button
  const nextQuestion = () => {
    setShowWinner(false);
    setTimer(15);
    socket.emit("nextQuestion");
  };

  if (!questionData)
    return (
      <div className="container">
        <h1>Game Over!</h1>
        <h2>Previous Winners:</h2>
        <ul>
          {previousWinners.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
        <p>Restarting in 3 seconds...</p>
      </div>
    );

  const winnerOption = showWinner && questionData.options.find(o => o.votes === Math.max(...questionData.options.map(v => v.votes)));

  return (
    <div className="container">
      {!showWinner ? (
        <>
          <h1>{questionData.question}</h1>
          <h3>Time Left: {timer}s</h3>
          <div className="options">
            {questionData.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => socket.emit("vote", opt.id)}
              >
                {opt.name} ({opt.votes})
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1>{questionData.question}</h1>
          <h2>Winner: {winnerOption?.name}</h2>
          <div className="options">
            {questionData.options.map(opt => (
              <button
                key={opt.id}
                className={winnerOption?.id === opt.id ? "winner" : ""}
                disabled
              >
                {opt.name} ({opt.votes})
              </button>
            ))}
          </div>
          <button className="next-btn" onClick={nextQuestion}>Next Question</button>
        </>
      )}

      <h3>Previous Winners:</h3>
      <ul>
        {previousWinners.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  );
}

export default App;
