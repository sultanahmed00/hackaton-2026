import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 HCM Lite Server running on http://localhost:${PORT}`);
  console.log(`📌 Saylani Hackathon · 24 October 2026`);
  console.log(`======================================================\n`);
});
