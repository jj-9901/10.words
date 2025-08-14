
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

// ===== Create full-screen popup HTML dynamically =====
const popupHTML = `
<div id="popup" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%;
    background:white; z-index:1000; padding:20px; box-sizing:border-box; overflow-y:auto;">
  
  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ccc; padding-bottom:10px;">
    <h2 id="popupQuestion" style="margin:0;"></h2>
    <i id="closePopup" class="fas fa-times" style="cursor:pointer; font-size:1.5rem;"></i>
  </div>

  <div id="answersList" style="margin-top:20px;"></div>
  
  <textarea id="answerInput" placeholder="In not more than 10 words, sweetie"
    style="width:100%; margin-top:20px; height:80px; resize:none;"></textarea>
  <button id="submitAnswer" style="margin-top:10px;">Submit Answer</button>
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
      div.innerHTML = `<strong>${data.question}</strong>`;

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
  document.getElementById("popup").style.display = "block";
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

loadQuestions();
