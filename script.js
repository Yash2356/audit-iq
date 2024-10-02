const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const fileInput = document.querySelector("#file-upload");

let userMessage = null;
let pdfText = ''; // Store the extracted PDF text globally
let isResponseGenerating = false;
let isPDFUploaded = false; // Flag to check if a PDF is uploaded

// API configuration
const API_KEY = "AIzaSyD5bZgmA5-AsuupoEwUvP_HYxKWJalJjqM"; // Replace with your actual API key
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyD5bZgmA5-AsuupoEwUvP_HYxKWJalJjqM";

// Load theme and chat data from local storage on page load
const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const isLightMode = localStorage.getItem("themeColor") === "light_mode";

  // Apply the stored theme
  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

  // Restore saved chats or clear the chat container
  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", savedChats);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
};

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' ');
  let currentWordIndex = 0;

  const typingInterval = setInterval(() => {
    textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    incomingMessageDiv.querySelector(".icon").classList.add("hide");

    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
      localStorage.setItem("saved-chats", chatContainer.innerHTML); // Save chats to local storage
    }

    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
  }, 75);
};

// Function to extract text from PDF file using PDF.js
const extractTextFromPDF = async (file) => {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        const typedArray = new Uint8Array(reader.result);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let extractedText = '';

        // Loop through each page of the PDF
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          extractedText += pageText + '\n';
        }

        resolve(extractedText);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read the PDF file"));

    reader.readAsArrayBuffer(file);
  });
};

// File upload event listener
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      pdfText = await extractTextFromPDF(file);
      isPDFUploaded = true; // Set the flag to true once a PDF is uploaded
      alert('PDF uploaded and text extracted successfully!');
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      pdfText = '';
      isPDFUploaded = false; // Reset flag if extraction fails
    }
  }
});

// Fetch response from the API based on user message and PDF text
const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text");

  try {
    const messageToSend = userMessage + "\n\n" + pdfText; // Combine user message and extracted PDF text

    // Send a POST request to the API with the user's message and PDF text
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: messageToSend }]
        }],
        systemInstruction: {
          role: "user",
          parts: [{
            text: "Act as a cybersecurity expert and you are tasked with analyzing cybersecurity audit reports, which may be long, unstructured, and technical.\nExtract important sections such as risks, vulnerabilities, recommendations, remediation steps, and compliance gaps.\nYour answers should be concise and to the point. Just answer the questions what the user has asked you no need to escalate it without further instructions by the user.\nIdentify any potential critical issues, security breaches, or non-compliance elements.\nSummarize the whole audit report in 10-12 sentences only.\nCompliance status with relevant standards (e.g., ISO, NIST) only repsond when the user asks you about this.\nProvide concise, actionable summaries that highlight the most important points for decision-makers only when the user ask you to tell.\nUse Named Entity Recognition (NER) to extract relevant entities such as:\nVulnerability types (e.g., SQL injection, XSS).\nAffected systems or components.\nCompliance-related issues (e.g., GDPR, HIPAA violations).\nHighlight any unusual findings, trends, or repeated vulnerabilities across multiple reports only when the user asks you.\n\nAnswer decision-related questions based on the content of the report. The answers should be:\nAccurate and based on the findings in the report.\nConcise and direct, focusing on what the decision-maker needs to know.\n\nPrioritize findings based on risk levels (e.g., low, medium, high).\nHighlight the most urgent actions required to mitigate high-risk vulnerabilities when the user ask you then only.\nIndicate the potential impact of unresolved vulnerabilities or non-compliance only when the user asks you.\nProvide insights and recommendations tailored for decision-making only when the user asks you.\nWhen providing answers, suggest data-driven actions based on the report'\''s findings.\nIf the decision-maker asks for guidance (e.g., \"What should be done first?\"), recommend the most critical steps based on the report'\''s contents.\nYou will interact with users via a chat-based interface. Ensure responses are:\nClear, easy to understand, and free of unnecessary jargon.\nDirect and to the point, especially for decision-related questions.\nBe responsive and ensure the answers you provide are based strictly on the information available in the uploaded reports.\nIf a report lacks information or is incomplete, acknowledge this.\nProvide suggestions for how to address any gaps (e.g., \"The report does not specify the remediation steps for this vulnerability. Additional follow-up is recommended.\").\n\nAs new audit reports are uploaded, continuously improve your understanding of cybersecurity reports.\nLearn from feedback provided by users to improve the relevance and accuracy of your responses over time.\nWhen making decisions or summarizing findings, provide clear explanations for your conclusions.\nOffer reasoning behind why certain risks or vulnerabilities are classified as high priority." // Omitted for brevity
          }]
        },
        generationConfig: {
          temperature: 0.5,
          topK: 64,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "text/plain"
        }
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const apiResponse = data?.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
    showTypingEffect(apiResponse, textElement, incomingMessageDiv);
  } catch (error) {
    isResponseGenerating = false;
    textElement.innerText = error.message;
    textElement.parentElement.closest(".message").classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading");
  }
};

// Show a loading animation while waiting for the API response
const showLoadingAnimation = () => {
  const html = `<div class="message-content">
                  <img class="avatar" src="images/gemini.svg" alt="Gemini avatar">
                  <p class="text"></p>
                  <div class="loading-indicator">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                  </div>
                </div>
                <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatContainer.appendChild(incomingMessageDiv);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
  generateAPIResponse(incomingMessageDiv);
};

// Copy message text to the clipboard
const copyMessage = (copyButton) => {
  const messageText = copyButton.parentElement.querySelector(".text").innerText;
  navigator.clipboard.writeText(messageText);
  copyButton.innerText = "done"; // Show confirmation icon
  setTimeout(() => copyButton.innerText = "content_copy", 1000); // Revert icon after 1 second
};

// Handle sending outgoing chat messages
const handleOutgoingChat = () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if (!userMessage || isResponseGenerating) return; // Exit if there is no message or response is generating

  isResponseGenerating = true;

  const html = `<div class="message-content">
                  <img class="avatar" src="images/user.jpg" alt="User avatar">
                  <p class="text"></p>
                </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  outgoingMessageDiv.querySelector(".text").innerText = userMessage;
  chatContainer.appendChild(outgoingMessageDiv);

  typingForm.reset(); // Clear input field
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
  setTimeout(showLoadingAnimation, 500); // Show loading animation after a delay
};

// Toggle between light and dark themes
toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Delete all chats from local storage when button is clicked
deleteChatButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all the chats?")) {
    localStorage.removeItem("saved-chats");
    loadDataFromLocalstorage();
  }
});

// Set userMessage and handle outgoing chat when a suggestion is clicked
suggestions.forEach(suggestion => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText;
    handleOutgoingChat();
  });
});

// Prevent default form submission and handle outgoing chat
typingForm.addEventListener("submit", (e) => {
  e.preventDefault(); 
  handleOutgoingChat();
});

loadDataFromLocalstorage();
