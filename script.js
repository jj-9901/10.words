import { initDarkMode } from './darkmode.js';
import { firebaseConfig } from './config.js';
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import { 
  getFirestore, collection, addDoc, getDocs, query, orderBy, where, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Init Firebase once
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add("dark");
}

// ===== Create full-screen popup HTML dynamically =====
const popupHTML = `
<div id="popup" class="fullscreen-popup" style="display:none;">
  <div class="popup-content">
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--primary-color); padding-bottom:10px;">
      <h2 id="popupQuestion" style="margin:0;"></h2>
      <i id="closePopup" class="fas fa-times" style="cursor:pointer; font-size:1.5rem;"></i>
    </div>

    <div id="answersList" style="margin-top:20px;"></div>

    <textarea id="answerInput" placeholder="In not more than 10 words, મોટાભાઈ."></textarea>
    <button id="submitAnswer">Submit Answer</button>
  </div>
</div>
`;
document.body.insertAdjacentHTML("beforeend", popupHTML);

// ===== Submit question =====
document.getElementById("submitQuestion").addEventListener("click", async () => {
  const questionText = document.getElementById("questionInput").value.trim();
  if (!questionText) return alert("Enter a question!");

  try {
    await addDoc(collection(db, "pendingQuestions"), {
      question: questionText,
      createdAt: serverTimestamp()
    });
    document.getElementById("questionInput").value = "";
    alert("Question submitted for approval!");
  } catch (err) {
    console.error("Error adding question:", err);
    alert("Error submitting question.");
  }
});

// ===== Load approved questions =====
async function loadQuestions() {
  try {
    const q = query(collection(db, "approvedQuestions"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const container = document.getElementById("questionsContainer");
    container.innerHTML = "";

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("question");
      div.innerHTML = `${data.question}`;

      // Click opens popup
      div.addEventListener("click", () => openPopup(docSnap.id, data.question));

      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading questions:", err);
  }
}

// ===== Open popup =====
async function openPopup(questionId, questionText) {
  document.getElementById("popupQuestion").textContent = questionText;
  document.getElementById("popup").style.display = "flex";
  document.getElementById("answerInput").value = "";

  loadAnswers(questionId);

  // Submit answer handler
  document.getElementById("submitAnswer").onclick = () => submitAnswer(questionId);
}

// ===== Close popup =====
document.getElementById("closePopup").addEventListener("click", () => {
  document.getElementById("popup").style.display = "none";
});

// ===== Load answers =====
async function loadAnswers(questionId) {
  const answersContainer = document.getElementById("answersList");
  answersContainer.innerHTML = "<em>Loading...</em>";

  try {
    const q = query(
      collection(db, "answers"),
      where("questionId", "==", questionId)
    );
    const snapshot = await getDocs(q);

    answersContainer.innerHTML = "";
    if (snapshot.empty) {
      answersContainer.innerHTML = "<em>No answers yet.</em>";
      return;
    }

    let index = 1;
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.textContent = `${index++}. ${data.answer}`;
      div.classList.add("answer");
      answersContainer.appendChild(div);
      answersContainer.appendChild(document.createElement("hr"));
    });
  } catch (err) {
    console.error("Error loading answers:", err);
    answersContainer.innerHTML = "<em>Error loading answers.</em>";
  }
}

// ===== Submit answer =====
async function submitAnswer(questionId) {
  const answerText = document.getElementById("answerInput").value.trim();
  if (!answerText) return alert("Please write something.");
  if (answerText.split(/\s+/).length > 10) return alert("Max 10 words allowed!");

  try {
    await addDoc(collection(db, "answers"), {
      questionId: questionId,
      answer: answerText,
      createdAt: serverTimestamp()
    });
    document.getElementById("answerInput").value = "";
    loadAnswers(questionId);
  } catch (err) {
    console.error("Error submitting answer:", err);
    alert("Error submitting answer.");
  }
}

document.getElementById("about").addEventListener("click", () => {
    // Create popup container
    const popup = document.createElement("div");
    popup.className = "about";

    // Create close button
    const closeBtn = document.createElement("span");
    closeBtn.innerHTML = `<i class="fas fa-times"></i>`;
    closeBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 10px;
        cursor: pointer;
    `;

    // Create message
    const message = document.createElement("p");
    message.textContent = "કેમ છો, મોટાભાઈ! 10 Words is a lighthearted question-and-answer platform with one quirky twist: every answer must be exactly 10 words or less. Anyone can post a question for admin approval, and by clicking on it, anyone can answer completely anonymously — making it both fun and a little mysterious. You never know who might have written the witty, weird, or wise replies you’re reading. Switch between dark and light themes to match your mood while you browse. It’s perfect for quick bursts of creativity or harmless curiosity, whether you’re here to ask burning questions, share clever answers, or simply scroll through what others have written. More features are on the way, but even now, 10 Words is already a fun, unpredictable space to explore.";

    // Append elements
    popup.appendChild(closeBtn);
    popup.appendChild(message);
    document.body.appendChild(popup);

    // Close event
    closeBtn.addEventListener("click", () => {
        popup.remove();
    });
});

loadQuestions();
initDarkMode();
