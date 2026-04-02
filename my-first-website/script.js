// Change the greeting based on time of day
const hour = new Date().getHours();
let greeting;

if (hour < 12) {
  greeting = "Good Morning!";
} else if (hour < 17) {
  greeting = "Good Afternoon!";
} else {
  greeting = "Good Evening!";
}

document.querySelector("h1").textContent = greeting + " Welcome to My Website!";

// Make the cards bounce when you click them
document.querySelectorAll(".card").forEach(function (card) {
  card.style.cursor = "pointer";
  card.style.transition = "transform 0.2s";

  card.addEventListener("click", function () {
    card.style.transform = "scale(1.05)";
    setTimeout(function () {
      card.style.transform = "scale(1)";
    }, 200);
  });
});
