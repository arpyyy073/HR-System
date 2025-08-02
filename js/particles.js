
// Create floating particles
document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('particles');
  const particleCount = 20;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Random size between 8px and 25px
    const size = Math.random() * 17 + 8;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Random position
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.top = `${Math.random() * 100}vh`;
    
    // Random animation duration and delay
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 5;
    particle.style.animation = `float ${duration}s ease-in-out ${delay}s infinite`;
    particle.style.opacity = Math.random() * 0.5 + 0.3;
    
    container.appendChild(particle);
  }
});

// Simple loader animation for login button
document.getElementById('login-button').addEventListener('click', function() {
  const loader = document.createElement('span');
  loader.style.width = '18px';
  loader.style.height = '18px';
  loader.style.border = '3px solid rgba(255,255,255,0.3)';
  loader.style.borderRadius = '50%';
  loader.style.borderTopColor = 'white';
  loader.style.animation = 'spin 1s ease-in-out infinite';
  loader.style.display = 'inline-block';
  loader.style.marginLeft = '8px';
  
  this.appendChild(loader);
  setTimeout(() => loader.remove(), 2000);
});

// Add spin animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
