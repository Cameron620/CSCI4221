function animateNumber(element, finalValue, duration = 2000) {
  const decimals = finalValue % 1 !== 0;
  const stepCount = Math.ceil(duration / 20); 
  const increment = finalValue / stepCount;
  let current = 0;

  const interval = setInterval(() => {
    current += increment;
    if (current >= finalValue) {
      current = finalValue;
      clearInterval(interval);
    }
    element.textContent = (decimals ? current.toFixed(1) : Math.round(current)).toLocaleString() + " million";
  }, 20);
}

function observeTable() {
  const table = document.querySelector("table");
  if (!table) return;

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const rows = table.querySelectorAll("tbody tr");
        rows.forEach(row => {
          const cell = row.children[2]; 
          if (cell && cell.textContent.includes("million")) {
            const match = cell.textContent.trim().match(/([\d.]+)\s*million/i);
            if (match) {
              const value = parseFloat(match[1]);
              if (!isNaN(value)) {
                animateNumber(cell, value);
              }
            }
          }
        });
        observer.disconnect(); 
      }
    });
  }, { threshold: 0.4 }); 

  observer.observe(table);
}
function init(){
    observeTable();
    buttonClick()
}

function buttonClick() {
   const btn1 = document.getElementById("buy-nintendo");
   const btn2 = document.getElementById("buy-playstation");
   const btn3 = document.getElementById("buy-xbox");

  if (btn1) btn1.addEventListener("click", handleButton1Click);
  if (btn2) btn2.addEventListener("click", handleButton2Click);
  if (btn3) btn3.addEventListener("click", handleButton3Click);
}
function handleButton1Click() {
  window.open("https://www.nintendo.com/store/", "_blank");
}
function handleButton2Click() {
  window.open("https://direct.playstation.com/", "_blank");
}
function handleButton3Click() {
  window.open("https://www.xbox.com/en-US/consoles", "_blank");
}
function formSubmit(event) {
  event.preventDefault(); 
  const username = document.getElementById("username")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;
  const platformChoice = document.getElementById("platform")?.value;
  const feedback = document.getElementById("feedback");

  if (!username || !email || !password || !platformChoice) {
    feedback.textContent = "Please fill in all fields.";
    feedback.style.color = "red";
    return;
  }
  if(password.length < 8){
    feedback.textContent = "Password must be at least 8 characters long.";
    feedback.style.color = "red";
    return;
  }
  feedback.style.color = "green";
  feedback.innerHTML = `
  ✅ Thank you, <strong>${username}</strong>!<br>
    📧 We have your email as: <em>${email}</em><br>
    🎮 You selected: <strong>${platformChoice}</strong>;`;
}
