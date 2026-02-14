"use strict";

import express from 'express';
import bodyParser from "body-parser";
import 'dotenv/config'

import SunshineConversationsClient from "sunshine-conversations-client";
import { getGPTResponse, classifyEscalation } from "./gpt.js";

// Express App
const PORT = 3000;
const app = express();
app.use(bodyParser.json());


// SUNCO Client
const defaultClient = SunshineConversationsClient.ApiClient.instance;
defaultClient.basePath = `https://${process.env.ZENDESK_BASEURL}/sc`;
var basicAuth = defaultClient.authentications['basicAuth'];
basicAuth.username = process.env.SUNCO_KEY_ID;
basicAuth.password = process.env.SUNCO_KEY_SECRET;

const messagesAPI = new SunshineConversationsClient.MessagesApi();
const switchboardAPI = new SunshineConversationsClient.SwitchboardActionsApi();
const activityAPI = new SunshineConversationsClient.ActivitiesApi();

const conversations = {};

app.post("/messages", async function (req, res) {
  if (req.headers["x-api-key"] !== process.env.SUNCO_WEBHOOK_SHARED_SECRET) {
    return res.sendStatus(401);
  } else {
    res.sendStatus(200);
  }

  const appId = req.body.app.id;
  const [event] = req.body.events;

  if (event.type === "conversation:message") {
    const { conversation, message } = event.payload;

    if (message.author.type === "user") {
      const history = conversations[conversation.id] || [];
      history.push({ role: "user", content: message.content.text });

      const decision = await classifyEscalation(history);
      if (decision.escalate && decision.confidence > 0.75) {
        await passControlToZendesk(appId, conversation.id);
        return res.sendStatus(200);
      }

      const typingEvent = { "author": { "type": "business" }, "type": "typing:start" };
      activityAPI.postActivity(appId, conversation.id, typingEvent);

      const gptReply = await getGPTResponse(history);
      if (typeof gptReply === "string") {
        history.push({ role: "assistant", content: gptReply });
        conversations[conversation.id] = history;

        await sendMessage(appId, conversation.id, gptReply);
      }
      else {
        console.log("gptReply", gptReply);
      }
    }
  }

  res.end();
});

async function sendMessage(appId, conversationId, text) {
  const messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.setAuthor({ type: "business" });
  messagePost.setContent({ type: "text", text });
  const response = await messagesAPI.postMessage(
    appId,
    conversationId,
    messagePost
  );
  console.log("Message sent successfully");
}

async function passControlToZendesk(appId, conversationId) {
  await sendMessage(appId, conversationId, "Sorry that I was not able to help. I am transferring you to a human agent now.")
  const passControlBody = new SunshineConversationsClient.PassControlBody("zd-agentWorkspace");
  const { data } = await switchboardAPI.passControl(appId, conversationId, passControlBody);
  console.log("Pass control data:", data);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`App listening on port ${PORT}`);
});
