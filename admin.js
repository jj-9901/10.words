import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, collection, getDocs, deleteDoc, doc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, getIdTokenResult, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Admin authentication
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showLoginButton();
    return;
  }

  try {
    const tokenResult = await getIdTokenResult(user);
    if (!tokenResult.claims.admin) {
      document.body.innerHTML = "<h2>Access denied: not an admin.</h2>";
      return;
    }

    // Load admin panel
    loadPendingQuestions();
    loadApprovedQuestions();
  } catch (err) {
    console.error("Error verifying admin status:", err);
    document.body.innerHTML = "<h2>Error checking admin status.</h2>";
  }
});

// Show login button
function showLoginButton() {
  const btn = document.createElement("button");
  btn.textContent = "Login as Admin";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "18px";
  btn.style.padding = "10px 20px";
  btn.style.margin = "20px";
  document.body.prepend(btn);

  btn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const tokenResult = await getIdTokenResult(result.user);

      if (!tokenResult.claims.admin) {
        alert("Access denied: not an admin.");
        await signOut(auth);
        return;
      }

      // Remove login button after successful login
      btn.remove();

      // Load the admin panel
      loadPendingQuestions();
      loadApprovedQuestions();
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed. Check console for details.");
    }
  });
}

// Answers popup
function showAnswersPopup(questionId, questionText) {
  const popup = document.createElement("div");
  popup.className = "popup fullscreen-popup";
  popup.innerHTML = `
    <div class="popup-content">
      <span class="close-popup" style="cursor:pointer;">&times;</span>
      <h2>${questionText}</h2>
      <div id="answersContainer">Loading answers...</div>
    </div>
  `;
  document.body.appendChild(popup);

  popup.querySelector(".close-popup").addEventListener("click", () => popup.remove());
  loadAnswers(questionId, popup.querySelector("#answersContainer"));
}

async function loadAnswers(questionId, container) {
  try {
    const snapshot = await getDocs(collection(db, "answers"));
    container.innerHTML = "";

    let found = false;
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.questionId === questionId) {
        found = true;
        const ansDiv = document.createElement("div");
        ansDiv.style.display = "flex";
        ansDiv.style.justifyContent = "space-between";
        ansDiv.style.alignItems = "center";
        ansDiv.style.marginBottom = "8px";
        ansDiv.innerHTML = `
          <span>${data.answer}</span>
          <button class="delete-answer" style="cursor:pointer;" data-id="${docSnap.id}">Delete</button>
        `;
        container.appendChild(ansDiv);
      }
    });

    if (!found) container.innerHTML = "<p>No answers yet.</p>";

    container.querySelectorAll(".delete-answer").forEach(btn => {
      btn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "answers", btn.dataset.id));
        loadAnswers(questionId, container);
      });
    });

  } catch (err) {
    container.innerHTML = "Error loading answers.";
    console.error(err);
  }
}

// Pending questions
async function loadPendingQuestions() {
  const container = document.getElementById("pendingQuestions");
  container.innerHTML = "";

  try {
    const snapshot = await getDocs(collection(db, "pendingQuestions"));
    if (snapshot.empty) {
      container.innerHTML = "<p>No pending questions.</p>";
      return;
    }

    snapshot.forEach(docSnap => {
      const qData = docSnap.data();
      const questionText = qData.text || qData.question || qData.title || JSON.stringify(qData);

      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.justifyContent = "space-between";
      div.style.alignItems = "center";
      div.style.borderBottom = "1px solid #ccc";
      div.style.padding = "8px 0";

      div.innerHTML = `
        <span>${questionText}</span>
        <div>
          <button data-id="${docSnap.id}" class="approve-btn" style="cursor:pointer;">Approve</button>
          <button data-id="${docSnap.id}" class="delete-pending" style="cursor:pointer;">Delete</button>
        </div>
      `;
      container.appendChild(div);
    });

    document.querySelectorAll(".approve-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const docRef = doc(db, "pendingQuestions", id);
        const qData = (await getDoc(docRef)).data();

        await setDoc(doc(db, "approvedQuestions", id), qData);
        await deleteDoc(docRef);
        loadPendingQuestions();
        loadApprovedQuestions();
      });
    });

    document.querySelectorAll(".delete-pending").forEach(btn => {
      btn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "pendingQuestions", btn.dataset.id));
        loadPendingQuestions();
      });
    });

  } catch (error) {
    container.innerHTML = "Error loading pending questions.";
    console.error(error);
  }
}

// Approved questions
async function loadApprovedQuestions() {
  const container = document.getElementById("approvedQuestions");
  container.innerHTML = "";

  try {
    const snapshot = await getDocs(collection(db, "approvedQuestions"));
    if (snapshot.empty) {
      container.innerHTML = "<p>No approved questions.</p>";
      return;
    }

    snapshot.forEach(docSnap => {
      const qData = docSnap.data();
      const questionText = qData.text || qData.question || qData.title || JSON.stringify(qData);

      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.justifyContent = "space-between";
      div.style.alignItems = "center";
      div.style.borderBottom = "1px solid #ccc";
      div.style.padding = "8px 0";

      div.innerHTML = `
        <span style="cursor:grab;" class="approved-question" data-id="${docSnap.id}" data-text="${questionText}">
          ${questionText}
        </span>
        <button data-id="${docSnap.id}" class="delete-btn" style="cursor:pointer;">Delete</button>
      `;
      container.appendChild(div);
    });

    document.querySelectorAll(".approved-question").forEach(span => {
      span.addEventListener("click", () => showAnswersPopup(span.dataset.id, span.dataset.text));
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "approvedQuestions", btn.dataset.id));
        loadApprovedQuestions();
      });
    });

  } catch (error) {
    container.innerHTML = "Error loading approved questions.";
    console.error(error);
  }
}
