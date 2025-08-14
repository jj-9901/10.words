import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, collection, getDocs, deleteDoc, doc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getAuth, setPersistence, browserSessionPersistence, onAuthStateChanged, signInWithPopup, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Force session-only persistence (cleared on refresh)
setPersistence(auth, browserSessionPersistence).catch(console.error);

// Containers
const pendingContainer = document.getElementById("pendingQuestions");
const approvedContainer = document.getElementById("approvedQuestions");

let loginBtnCreated = false;

// Admin authentication
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (!loginBtnCreated) showLoginButton();
    return;
  }

  try {
    const tokenResult = await user.getIdTokenResult();
    if (!tokenResult.claims.admin) {
      document.body.innerHTML = "<h2>Access denied: not an admin.</h2>";
      return;
    }

    // Remove login button if present
    const btn = document.getElementById("adminLoginBtn");
    if (btn) btn.remove();

    // Load questions
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
  btn.id = "adminLoginBtn";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "18px";
  btn.style.padding = "10px 20px";
  btn.style.margin = "20px";
  document.body.prepend(btn);

  btn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const tokenResult = await result.user.getIdTokenResult();

      if (!tokenResult.claims.admin) {
        alert("Access denied: not an admin.");
        return;
      }

      btn.remove();
      loadPendingQuestions();
      loadApprovedQuestions();
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed. Check console for details.");
    }
  });

  loginBtnCreated = true;
}

// Clear and load pending questions
async function loadPendingQuestions() {
  pendingContainer.innerHTML = "";
  try {
    const snapshot = await getDocs(collection(db, "pendingQuestions"));
    if (snapshot.empty) {
      pendingContainer.innerHTML = "<p>No pending questions.</p>";
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
      pendingContainer.appendChild(div);
    });

    pendingContainer.querySelectorAll(".approve-btn").forEach(btn => {
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

    pendingContainer.querySelectorAll(".delete-pending").forEach(btn => {
      btn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "pendingQuestions", btn.dataset.id));
        loadPendingQuestions();
      });
    });

  } catch (error) {
    pendingContainer.innerHTML = "Error loading pending questions.";
    console.error(error);
  }
}

// Clear and load approved questions
async function loadApprovedQuestions() {
  approvedContainer.innerHTML = "";
  try {
    const snapshot = await getDocs(collection(db, "approvedQuestions"));
    if (snapshot.empty) {
      approvedContainer.innerHTML = "<p>No approved questions.</p>";
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
      approvedContainer.appendChild(div);
    });

    approvedContainer.querySelectorAll(".approved-question").forEach(span => {
      span.addEventListener("click", () => alert(`Show answers for: ${span.dataset.text}`));
    });

    approvedContainer.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "approvedQuestions", btn.dataset.id));
        loadApprovedQuestions();
      });
    });

  } catch (error) {
    approvedContainer.innerHTML = "Error loading approved questions.";
    console.error(error);
  }
}
