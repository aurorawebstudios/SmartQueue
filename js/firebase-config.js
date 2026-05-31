<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBlV2jQBstYWe0XTZLDbTY8XyVP-1xY0RE",
    authDomain: "smartqueue-2026.firebaseapp.com",
    projectId: "smartqueue-2026",
    storageBucket: "smartqueue-2026.firebasestorage.app",
    messagingSenderId: "619380541977",
    appId: "1:619380541977:web:d68416942a02c04d8db888",
    measurementId: "G-GWE9DNNHJQ"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>