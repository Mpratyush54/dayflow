import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`DayFlow HRMS API listening on http://localhost:${PORT}`);
});
