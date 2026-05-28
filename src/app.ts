import express from "express";
import cors from "cors";

const app = express();

app.use(cors());

app.get("/", (_, res) => {
  res.send("Realtime server running");
});

export default app;