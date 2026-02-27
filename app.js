"use strict";

import express from 'express';
import bodyParser from "body-parser";
import 'dotenv/config'

import { sendTypingIndicator, sendMessage } from './sunco.js';
import { aiAgentResponse } from "./ai.js";

// Express App
const PORT = 3000;
const app = express();
app.use(bodyParser.json());


app.post("/messages", async function (req, res) {
  if (req.headers["x-api-key"] !== process.env.SUNCO_WEBHOOK_SHARED_SECRET) {
    console.log("Received unauthenticated request");
    return res.sendStatus(401);
  } else {
    res.sendStatus(200);
  }

  const appId = req.body.app.id;
  const [event] = req.body.events;

  if (event.type === "conversation:message") {
    const { conversation, message } = event.payload;

    if (message.author.type === "user") {
      console.log("New message received");

      sendTypingIndicator(appId, conversation.id)

      const userId = message.author.user.id; // TODO review user ID
      const replyText = await aiAgentResponse(message.content.text, userId, conversation.id);
      await sendMessage(appId, conversation.id, replyText);
    }
  }

  res.end();
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`App listening on port ${PORT}`);
});
