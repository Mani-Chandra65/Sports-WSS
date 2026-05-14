import express from "express";
import { matchRouter } from "./routes/matches.js";

const app = express();
const PORT = 8000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from Express" });
});

app.use('/matches',matchRouter);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
